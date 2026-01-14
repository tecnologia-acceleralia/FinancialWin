-- Migration 015: Seed WriteHub Client for Local Development
-- This migration creates the WriteHub OIDC client with all necessary configuration
-- for local development mode, allowing immediate use without manual setup

-- Insert WriteHub client configuration
INSERT INTO oidc_clients (
    client_id, 
    client_secret, 
    client_name, 
    client_description,
    redirect_uris, 
    post_logout_redirect_uris, 
    response_types, 
    grant_types, 
    allowed_scopes,
    token_endpoint_auth_method,
    access_token_lifetime,
    refresh_token_lifetime,
    frontend_url, 
    is_active
) VALUES (
    'writehub-client', 
    'writehub-secret-super-seguro-al-azar-32chars', 
    'WriteHub MVPP',
    'Cliente OIDC para la aplicación WriteHub MVP en modo desarrollo local',
    ARRAY[
        'http://localhost:4009/auth/callback'
    ],
    ARRAY['http://localhost:3010'],
    ARRAY['code'], 
    ARRAY['authorization_code'],
    ARRAY['openid', 'email', 'profile'],
    'client_secret_post',
    3600,  -- 1 hour access token lifetime
    86400, -- 24 hours refresh token lifetime
    'http://localhost:3010', 
    TRUE
) ON CONFLICT (client_id) DO UPDATE SET
    client_secret = EXCLUDED.client_secret,
    client_name = EXCLUDED.client_name,
    client_description = EXCLUDED.client_description,
    redirect_uris = EXCLUDED.redirect_uris,
    post_logout_redirect_uris = EXCLUDED.post_logout_redirect_uris,
    response_types = EXCLUDED.response_types,
    grant_types = EXCLUDED.grant_types,
    allowed_scopes = EXCLUDED.allowed_scopes,
    token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
    access_token_lifetime = EXCLUDED.access_token_lifetime,
    refresh_token_lifetime = EXCLUDED.refresh_token_lifetime,
    frontend_url = EXCLUDED.frontend_url,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Grant all active companies access to writehub-client
INSERT INTO company_client_access (company_id, client_id, is_active)
SELECT company_id, 'writehub-client', TRUE
FROM companies
WHERE is_active = TRUE
ON CONFLICT (company_id, client_id) DO UPDATE SET
    is_active = TRUE,
    granted_at = CURRENT_TIMESTAMP;

