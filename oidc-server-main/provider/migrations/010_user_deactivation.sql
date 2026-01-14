-- Migration 010: User Deactivation and Company Validation
-- Change foreign key constraint to prevent cascade delete
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE RESTRICT;

-- Add function to check if company has users before deletion
CREATE OR REPLACE FUNCTION check_company_has_users(company_id_param VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users WHERE company_id = company_id_param;
    RETURN user_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to deactivate user and revoke all access
CREATE OR REPLACE FUNCTION deactivate_user_cascade(user_id_param INTEGER)
RETURNS void AS $$
BEGIN
    -- Deactivate user
    UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = user_id_param;
    
    -- Invalidate all active sessions
    UPDATE user_sessions SET is_active = FALSE WHERE user_id = user_id_param;
    
    -- Log to audit
    INSERT INTO audit_logs (user_id, action, details, success)
    VALUES (user_id_param, 'user_deactivated_cascade', 
            jsonb_build_object('revoked_sessions', true), 
            true);
END;
$$ LANGUAGE plpgsql;

-- Add function to reactivate user
CREATE OR REPLACE FUNCTION reactivate_user(user_id_param INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = user_id_param;
    
    INSERT INTO audit_logs (user_id, action, details, success)
    VALUES (user_id_param, 'user_reactivated', jsonb_build_object('action', 'manual_reactivation'), true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_company_has_users IS 'Returns the number of users associated with a company';
COMMENT ON FUNCTION deactivate_user_cascade IS 'Deactivates a user and revokes all their access and sessions';
COMMENT ON FUNCTION reactivate_user IS 'Reactivates a previously deactivated user';

