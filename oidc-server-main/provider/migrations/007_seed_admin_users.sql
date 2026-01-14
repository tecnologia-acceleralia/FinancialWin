-- Seed default admin users
-- Passwords will be generated using generate-password-hashes.ts script
-- admin: admin123

INSERT INTO admin_users (username, password_hash, full_name, email, is_super_admin, is_active) VALUES
    ('admin', '$2b$10$ad0oojkVpGS05ZXWxMlTceUqCM32ImK9zeyma5UlfAS1Ez.bs69PW', 'System Administrator', 'admin@oidc.local', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;
