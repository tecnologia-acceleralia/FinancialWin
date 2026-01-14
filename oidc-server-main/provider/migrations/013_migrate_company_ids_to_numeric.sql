-- Migration 013: Convert company_id from COMP-XXX format to numeric format
-- This migration ensures consistency by converting all COMP-XXX format IDs to numeric IDs
-- 
-- IMPORTANT: Since old data is not required, we'll clean up orphaned references first,
-- then migrate the companies, ensuring referential integrity throughout.

-- Step 1: Delete orphaned users that reference non-existent companies
-- (Keep users with COMP-XXX companies - they will be migrated)
DELETE FROM users 
WHERE company_id NOT IN (SELECT company_id FROM companies);

-- Step 2: Delete orphaned company_client_access records
-- (Keep records with COMP-XXX companies - they will be migrated)
DELETE FROM company_client_access 
WHERE company_id NOT IN (SELECT company_id FROM companies);

-- Step 3: Create mapping table for COMP-XXX -> numeric conversion
CREATE TEMP TABLE IF NOT EXISTS company_id_mapping (
    old_id VARCHAR(255),
    new_id VARCHAR(255)
);

-- Step 4: Extract mappings from existing COMP-XXX companies
INSERT INTO company_id_mapping (old_id, new_id)
SELECT 
    company_id as old_id,
    SUBSTRING(company_id FROM 'COMP-0*(\d+)') as new_id
FROM companies
WHERE company_id ~* '^COMP-\d+$'
  AND SUBSTRING(company_id FROM 'COMP-0*(\d+)') IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: For each mapping, create the new company first, then migrate references, then delete old
DO $$
DECLARE
    mapping_record RECORD;
    target_exists BOOLEAN;
    old_company_name VARCHAR(255);
    old_is_active BOOLEAN;
BEGIN
    FOR mapping_record IN SELECT old_id, new_id FROM company_id_mapping LOOP
        -- Check if target ID already exists
        SELECT EXISTS(SELECT 1 FROM companies WHERE company_id = mapping_record.new_id) INTO target_exists;
        
        IF NOT target_exists THEN
            -- Get old company data
            SELECT company_name, is_active INTO old_company_name, old_is_active
            FROM companies
            WHERE company_id = mapping_record.old_id
            LIMIT 1;
            
            -- Create new company with numeric ID (if it doesn't exist)
            INSERT INTO companies (company_id, company_name, is_active, created_at, updated_at)
            VALUES (mapping_record.new_id, 
                    COALESCE(old_company_name, 'Migrated Company ' || mapping_record.new_id),
                    COALESCE(old_is_active, TRUE),
                    NOW(),
                    NOW())
            ON CONFLICT (company_id) DO NOTHING;
            
            -- Now update all references (foreign keys will be valid)
            UPDATE users 
            SET company_id = mapping_record.new_id 
            WHERE company_id = mapping_record.old_id;
            
            UPDATE company_client_access 
            SET company_id = mapping_record.new_id 
            WHERE company_id = mapping_record.old_id;
            
            -- Delete the old company record
            DELETE FROM companies WHERE company_id = mapping_record.old_id;
            
            RAISE NOTICE 'Migrated company_id: % -> %', mapping_record.old_id, mapping_record.new_id;
        ELSE
            -- If target exists, just migrate references and delete old
            UPDATE users 
            SET company_id = mapping_record.new_id 
            WHERE company_id = mapping_record.old_id;
            
            UPDATE company_client_access 
            SET company_id = mapping_record.new_id 
            WHERE company_id = mapping_record.old_id;
            
            DELETE FROM companies WHERE company_id = mapping_record.old_id;
            
            RAISE NOTICE 'Merged company_id: % -> % (target already existed)', mapping_record.old_id, mapping_record.new_id;
        END IF;
    END LOOP;
END $$;

-- Step 6: Clean up any remaining orphaned references (safety measure)
DELETE FROM users WHERE company_id NOT IN (SELECT company_id FROM companies);
DELETE FROM company_client_access WHERE company_id NOT IN (SELECT company_id FROM companies);

-- Step 7: Clean up temporary table
DROP TABLE IF EXISTS company_id_mapping;

-- Step 8: Log migration completion
DO $$
DECLARE
    remaining_count INTEGER;
    numeric_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count 
    FROM companies 
    WHERE company_id ~* '^COMP-\d+$';
    
    SELECT COUNT(*) INTO numeric_count
    FROM companies
    WHERE company_id ~ '^\d+$';
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'Migration completed with % companies still in COMP-XXX format', remaining_count;
    END IF;
    
    RAISE NOTICE 'Migration completed: % companies now have numeric IDs', numeric_count;
END $$;

COMMENT ON TABLE companies IS 'Companies table: company_id is now numeric only (no COMP-XXX format)';

