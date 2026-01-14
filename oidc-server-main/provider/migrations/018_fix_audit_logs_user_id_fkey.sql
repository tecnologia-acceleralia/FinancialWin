-- Migration 018: Fix audit_logs user_id foreign key to allow user deletion
-- This migration changes the audit_logs.user_id foreign key to ON DELETE SET NULL
-- to allow user deletion while preserving audit trail
--
-- Problem: When deleting users during company deletion, the foreign key constraint
-- audit_logs_user_id_fkey prevents deletion because audit_logs references the user.
--
-- Solution: Change constraint to ON DELETE SET NULL so user_id becomes NULL
-- when user is deleted, preserving audit trail with user_email

-- Step 1: Drop existing foreign key constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Step 2: Recreate foreign key constraint with ON DELETE SET NULL
-- This allows user deletion while preserving audit trail
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Add comment explaining the change
COMMENT ON CONSTRAINT audit_logs_user_id_fkey ON audit_logs IS 
'Audit logs reference user_id for tracking purposes. When user is deleted, user_id becomes NULL but audit trail is preserved with user_email for historical record.';

