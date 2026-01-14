-- Migration 016: Allow company deletion with user deactivation
-- This migration allows companies to be deleted by:
-- 1. Allowing NULL in company_id (for orphaned users after company deletion)
-- 2. Changing foreign key constraint to ON DELETE SET NULL (automatically sets company_id to NULL when company is deleted)
-- 
-- This enables the company deletion workflow where users are deactivated and their company_id is cleared
-- before the company is deleted, preserving user records for audit purposes.

-- Step 1: Allow NULL in company_id column
ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;

-- Step 2: Drop existing foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey;

-- Step 3: Recreate foreign key constraint with ON DELETE SET NULL
-- This allows company deletion while preserving user records
ALTER TABLE users ADD CONSTRAINT users_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL;

-- Step 4: Add comment explaining the change
COMMENT ON COLUMN users.company_id IS 'Company ID - Can be NULL for users whose company was deleted. Users with NULL company_id are deactivated.';

