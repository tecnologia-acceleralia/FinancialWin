-- System Configuration
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default system config
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('session_timeout_minutes', '30', 'number', 'Default session timeout in minutes'),
('admin_session_timeout_hours', '8', 'number', 'Admin session timeout in hours'),
('max_login_attempts', '5', 'number', 'Maximum failed login attempts before lockout'),
('lockout_duration_minutes', '15', 'number', 'Account lockout duration in minutes'),
('password_min_length', '8', 'number', 'Minimum password length'),
('require_email_verification', 'false', 'boolean', 'Require email verification for new users'),
('enable_rate_limiting', 'true', 'boolean', 'Enable rate limiting'),
('rate_limit_window_seconds', '60', 'number', 'Rate limit time window'),
('rate_limit_max_attempts', '10', 'number', 'Max attempts per time window'),
('token_access_lifetime_seconds', '3600', 'number', 'Access token lifetime'),
('token_refresh_lifetime_seconds', '86400', 'number', 'Refresh token lifetime');
