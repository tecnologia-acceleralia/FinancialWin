-- Migration 017: Convert company_id to UUID for enhanced security
-- This migration converts company_id from VARCHAR(numeric) to UUID format
-- to prevent enumeration attacks and ensure IDs are never reused, even after company deletion.
--
-- Benefits:
-- 1. UUIDs are non-predictable and cannot be enumerated
-- 2. UUIDs are globally unique and never reused
-- 3. Prevents information leakage (doesn't reveal company count)
-- 4. Enhanced security for multi-tenant systems

-- Step 1: Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create mapping table for audit trail (tracks old IDs to new UUIDs)
CREATE TABLE IF NOT EXISTS company_id_mapping (
    old_id VARCHAR(255) PRIMARY KEY,
    new_uuid UUID UNIQUE NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_id_mapping_new_uuid ON company_id_mapping(new_uuid);

COMMENT ON TABLE company_id_mapping IS 'Maps old company_ids to new UUIDs for audit and migration purposes';

-- Step 2.5: Create temporary function to fix duplicate UUIDs
-- This function will be called from within the main DO block to avoid nested DO blocks
CREATE OR REPLACE FUNCTION fix_duplicate_company_uuids() RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER := 0;
    iteration_count INTEGER := 0;
    max_iterations INTEGER := 10;
BEGIN
    -- Fix duplicates iteratively until none remain or max iterations reached
    LOOP
        iteration_count := iteration_count + 1;
        
        -- Fix duplicates: keep first occurrence (lowest id), regenerate UUID for others
        UPDATE companies c1
        SET company_id_new = uuid_generate_v4()::VARCHAR
        WHERE company_id_new IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM companies c2
              WHERE c2.company_id_new = c1.company_id_new
                AND c2.id < c1.id
          );
        
        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        
        -- Exit if no more duplicates found or max iterations reached
        EXIT WHEN fixed_count = 0 OR iteration_count >= max_iterations;
    END LOOP;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- Step 2.6: Create function to generate UUID as VARCHAR for future insertions
-- This function must be created before the DO block that uses it
CREATE OR REPLACE FUNCTION generate_company_uuid() RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN uuid_generate_v4()::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Check if migration already started (idempotent migration)
DO $$
DECLARE
    has_new_column BOOLEAN;
    companies_count INTEGER;
BEGIN
    -- Check if company_id_new column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'company_id_new'
    ) INTO has_new_column;
    
    SELECT COUNT(*) INTO companies_count FROM companies;
    
    -- Only proceed if migration hasn't been completed
    IF NOT has_new_column AND companies_count > 0 THEN
        -- Step 4: Generate UUIDs for existing companies and store mapping
        -- Only generate for companies that don't already have UUIDs
        INSERT INTO company_id_mapping (old_id, new_uuid)
        SELECT company_id, uuid_generate_v4()
        FROM companies
        WHERE company_id IS NOT NULL 
          AND company_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        ON CONFLICT (old_id) DO NOTHING;
        
        -- Step 5: Drop foreign key constraints temporarily
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
        ALTER TABLE company_client_access DROP CONSTRAINT IF EXISTS company_client_access_company_id_fkey;
        
        -- Step 6: Add temporary UUID column in companies (if not exists)
        ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_id_new VARCHAR(255);
        
        -- Step 6.5: Clean up any existing duplicates in company_id_new (in case of partial migration)
        UPDATE companies c1
        SET company_id_new = uuid_generate_v4()::VARCHAR
        WHERE company_id_new IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM companies c2
              WHERE c2.company_id_new = c1.company_id_new
                AND c2.id < c1.id
          );
        
        -- Step 7: Update companies table with new UUIDs from mapping table
        -- Only update companies that have a mapping entry
        UPDATE companies c
        SET company_id_new = m.new_uuid::VARCHAR
        FROM company_id_mapping m
        WHERE c.company_id = m.old_id
          AND c.company_id_new IS NULL;
        
        -- Handle companies that already have UUIDs (but weren't in mapping)
        UPDATE companies
        SET company_id_new = company_id
        WHERE company_id_new IS NULL 
          AND company_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
        
        -- Step 7.5: Ensure all companies have UUIDs (generate for any remaining NULLs)
        UPDATE companies
        SET company_id_new = uuid_generate_v4()::VARCHAR
        WHERE company_id_new IS NULL;
        
        -- Step 7.6: Detect and fix any duplicate UUIDs before creating constraint
        -- Use the temporary function to fix duplicates iteratively
        PERFORM fix_duplicate_company_uuids();
        
        -- Step 8: Update users with new UUIDs from company_id_new (after duplicates are fixed)
        -- This ensures references point to the correct UUID even after duplicate cleanup
        UPDATE users u
        SET company_id = c.company_id_new
        FROM companies c
        WHERE u.company_id = c.company_id
          AND c.company_id_new IS NOT NULL;
        
        -- Also update users that reference old IDs via mapping table (for IDs not in companies table)
        UPDATE users u
        SET company_id = m.new_uuid::VARCHAR
        FROM company_id_mapping m
        WHERE u.company_id = m.old_id
          AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.company_id = m.old_id);
        
        -- Step 9: Update company_client_access with new UUIDs from company_id_new
        UPDATE company_client_access cca
        SET company_id = c.company_id_new
        FROM companies c
        WHERE cca.company_id = c.company_id
          AND c.company_id_new IS NOT NULL;
        
        -- Also update company_client_access that reference old IDs via mapping table
        UPDATE company_client_access cca
        SET company_id = m.new_uuid::VARCHAR
        FROM company_id_mapping m
        WHERE cca.company_id = m.old_id
          AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.company_id = m.old_id);
        
        -- Step 10: Update audit_logs that reference company_id in details JSONB
        -- First update from companies table (most reliable after duplicate cleanup)
        UPDATE audit_logs al
        SET details = jsonb_set(
            details,
            '{company_id}',
            to_jsonb(c.company_id_new),
            true
        )
        FROM companies c
        WHERE al.details->>'company_id' = c.company_id
          AND c.company_id_new IS NOT NULL;
        
        -- Then update remaining references via mapping table
        UPDATE audit_logs al
        SET details = jsonb_set(
            details,
            '{company_id}',
            to_jsonb(m.new_uuid::VARCHAR),
            true
        )
        FROM company_id_mapping m
        WHERE al.details->>'company_id' = m.old_id
          AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.company_id = m.old_id);
        
        -- Step 11: Replace old column with new UUID column
        -- Convert UUID to VARCHAR for compatibility with Write and existing foreign keys
        ALTER TABLE companies DROP COLUMN company_id CASCADE;
        
        -- Rename new column to company_id
        ALTER TABLE companies RENAME COLUMN company_id_new TO company_id;
        
        -- Step 12: Add constraints and indexes
        ALTER TABLE companies ALTER COLUMN company_id SET NOT NULL;
        ALTER TABLE companies ADD CONSTRAINT companies_company_id_unique UNIQUE (company_id);
        
        -- Recreate index on company_id
        CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);
        
        -- Step 13: Recreate foreign key constraints
        ALTER TABLE users ADD CONSTRAINT users_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL;
        
        ALTER TABLE company_client_access ADD CONSTRAINT company_client_access_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Migration completed: companies migrated to UUIDs';
    ELSE
        RAISE NOTICE 'Migration already completed or no companies to migrate';
    END IF;
    
    -- Set DEFAULT for future insertions (only if not already set)
    -- This is done within the main block to avoid multiple DO blocks
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'company_id' 
        AND column_default LIKE '%generate_company_uuid%'
    ) THEN
        ALTER TABLE companies ALTER COLUMN company_id SET DEFAULT generate_company_uuid();
    END IF;
END $$;

-- Step 14: Clean up temporary function
DROP FUNCTION IF EXISTS fix_duplicate_company_uuids();

-- Step 16: Add comments
COMMENT ON COLUMN companies.company_id IS 'Company ID as UUID v4 (stored as VARCHAR) - Non-predictable, globally unique identifier that prevents enumeration attacks';
COMMENT ON TABLE company_id_mapping IS 'Mapping table for migration: tracks old IDs to new UUIDs for audit purposes';
