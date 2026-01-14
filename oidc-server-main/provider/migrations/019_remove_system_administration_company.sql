-- Migration 019: Remove System Administration company
-- This migration removes the "System Administration" company that was created as seed data
-- in migration 006. This company was not used for any special functionality and was just
-- example data.

-- Step 1: Delete company_client_access records for System Administration company
-- First, find all company_ids that match "System Administration" (could be numeric '1' or UUID)
DELETE FROM company_client_access 
WHERE company_id IN (
    SELECT company_id FROM companies WHERE company_name = 'System Administration'
);

-- Step 2: Delete users associated with System Administration company
-- Set company_id to NULL first (ON DELETE SET NULL ensures this happens automatically)
-- But we'll delete them explicitly to be safe
DELETE FROM users 
WHERE company_id IN (
    SELECT company_id FROM companies WHERE company_name = 'System Administration'
);

-- Step 3: Delete the System Administration company
DELETE FROM companies 
WHERE company_name = 'System Administration';

-- Step 4: Verify deletion (optional, for logging)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO deleted_count 
    FROM companies 
    WHERE company_name = 'System Administration';
    
    IF deleted_count > 0 THEN
        RAISE WARNING 'System Administration company still exists after deletion attempt';
    ELSE
        RAISE NOTICE 'System Administration company successfully deleted';
    END IF;
END $$;
