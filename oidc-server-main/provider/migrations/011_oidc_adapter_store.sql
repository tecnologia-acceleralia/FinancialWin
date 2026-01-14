-- OIDC generic adapter store (single table for all models)
CREATE TABLE IF NOT EXISTS oidc_adapter (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  grant_id TEXT,
  user_code TEXT,
  uid TEXT,
  expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oidc_adapter_kind ON oidc_adapter(kind);
CREATE INDEX IF NOT EXISTS idx_oidc_adapter_grant_id ON oidc_adapter(grant_id);
CREATE INDEX IF NOT EXISTS idx_oidc_adapter_user_code ON oidc_adapter(user_code);
CREATE INDEX IF NOT EXISTS idx_oidc_adapter_uid ON oidc_adapter(uid);
CREATE INDEX IF NOT EXISTS idx_oidc_adapter_expires_at ON oidc_adapter(expires_at);

COMMENT ON TABLE oidc_adapter IS 'Generic store for oidc-provider models (sessions, grants, tokens, codes)';

