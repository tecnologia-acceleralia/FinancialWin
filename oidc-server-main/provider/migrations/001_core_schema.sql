-- Companies (Organizations)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);

-- OIDC Users (for protected applications)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- OIDC Clients (Protected Systems)
CREATE TABLE IF NOT EXISTS oidc_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_description TEXT,
    redirect_uris TEXT[] NOT NULL,
    post_logout_redirect_uris TEXT[],
    response_types TEXT[] NOT NULL DEFAULT ARRAY['code'],
    grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code'],
    allowed_scopes TEXT[] DEFAULT ARRAY['openid', 'profile', 'email'],
    token_endpoint_auth_method VARCHAR(50) DEFAULT 'client_secret_post',
    access_token_lifetime INTEGER DEFAULT 3600,
    refresh_token_lifetime INTEGER DEFAULT 86400,
    frontend_url VARCHAR(512),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oidc_clients_client_id ON oidc_clients(client_id);

-- Company-to-Client Access
CREATE TABLE IF NOT EXISTS company_client_access (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL REFERENCES oidc_clients(client_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_company_client_access_company ON company_client_access(company_id);
CREATE INDEX IF NOT EXISTS idx_company_client_access_client ON company_client_access(client_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    admin_user_id INTEGER,
    user_email VARCHAR(255),
    client_id VARCHAR(255) REFERENCES oidc_clients(client_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

COMMENT ON TABLE users IS 'OIDC users who authenticate to protected applications';
COMMENT ON TABLE oidc_clients IS 'Protected systems/applications (e.g., WriteHub, CRM, Dashboard)';
COMMENT ON TABLE company_client_access IS 'Admin-managed: which companies can access which protected systems';
