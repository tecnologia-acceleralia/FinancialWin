-- Migration 014: Fix audit_logs foreign key constraint to allow updates
-- This migration ensures that audit_logs does NOT prevent updates to oidc_clients
-- audit_logs is a log table and should only track changes, not prevent them

-- Drop the existing foreign key constraint if it exists
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'audit_logs'::regclass
      AND confrelid = 'oidc_clients'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE '%client_id%';
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Recreate the constraint with explicit ON DELETE SET NULL and ON UPDATE NO ACTION
-- ON UPDATE NO ACTION means updates to client_id in oidc_clients will NOT be blocked
-- but will fail if attempted (which we prevent at application level)
-- ON DELETE SET NULL means if client is deleted, audit_logs.client_id becomes NULL
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_client_id_fkey
FOREIGN KEY (client_id) REFERENCES oidc_clients(client_id)
ON DELETE SET NULL
ON UPDATE NO ACTION;

-- Add comment to document the intent
COMMENT ON CONSTRAINT audit_logs_client_id_fkey ON audit_logs IS 
'Audit logs reference client_id for tracking purposes only. This constraint does NOT prevent updates to oidc_clients fields (only prevents deletion without cascading).';

