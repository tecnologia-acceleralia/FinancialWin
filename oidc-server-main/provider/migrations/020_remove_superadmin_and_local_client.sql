-- Migration 020: Remove superadmin user and local-client
-- This migration removes redundant seed data:
-- 1. superadmin user (identical to admin, both are super_admin)
-- 2. local-client OIDC client (redundant, writehub-client is used for local development)

-- Step 1: Delete superadmin user sessions
DELETE FROM admin_sessions 
WHERE admin_user_id IN (
    SELECT id FROM admin_users WHERE username = 'superadmin'
);

-- Step 2: Delete superadmin user
-- Note: We can delete superadmin because admin also has is_super_admin = TRUE
DELETE FROM admin_users 
WHERE username = 'superadmin';

-- Step 3: Delete company_client_access records for local-client
DELETE FROM company_client_access 
WHERE client_id = 'local-client';

-- Step 4: Delete local-client OIDC client
DELETE FROM oidc_clients 
WHERE client_id = 'local-client';

-- Step 5: Verify deletions (optional, for logging)
DO $$
DECLARE
    superadmin_count INTEGER;
    local_client_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO superadmin_count 
    FROM admin_users 
    WHERE username = 'superadmin';
    
    SELECT COUNT(*) INTO local_client_count 
    FROM oidc_clients 
    WHERE client_id = 'local-client';
    
    IF superadmin_count > 0 THEN
        RAISE WARNING 'superadmin user still exists after deletion attempt';
    ELSE
        RAISE NOTICE 'superadmin user successfully deleted';
    END IF;
    
    IF local_client_count > 0 THEN
        RAISE WARNING 'local-client still exists after deletion attempt';
    ELSE
        RAISE NOTICE 'local-client successfully deleted';
    END IF;
END $$;
