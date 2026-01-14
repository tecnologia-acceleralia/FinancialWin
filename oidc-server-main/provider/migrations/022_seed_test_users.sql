-- Migration 022: Seed Test Users for Development
-- This migration creates test users (alice and bob) with test companies
-- for local development and testing purposes

-- Step 1: Create test companies if they don't exist
INSERT INTO companies (company_id, company_name, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Test Company 1', TRUE),
    ('550e8400-e29b-41d4-a716-446655440002', 'Test Company 2', TRUE)
ON CONFLICT (company_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- Step 2: Create test users
-- Password hash for 'password123' (generated with bcrypt, rounds=10)
-- Password hash for 'password456' (generated with bcrypt, rounds=10)
INSERT INTO users (email, password_hash, name, company_id, is_active, email_verified) VALUES
    ('alice@example.com', '$2b$10$2irdn19HkrLf0c9jMS3eMuvwRDd.p204ME.2k3pDlzouQCsYeagGS', 'Alice Test User', '550e8400-e29b-41d4-a716-446655440001', TRUE, TRUE),
    ('bob@example.com', '$2b$10$.KH4FAnmOdlwyQ4L6katwuc7nDjDaSdxZvYIs1gtha/.D8YsT11WO', 'Bob Test User', '550e8400-e29b-41d4-a716-446655440002', TRUE, TRUE)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    company_id = EXCLUDED.company_id,
    is_active = TRUE,
    email_verified = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- Step 3: Grant access to writehub-client for test companies
INSERT INTO company_client_access (company_id, client_id, is_active)
SELECT company_id, 'writehub-client', TRUE
FROM companies
WHERE company_id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (company_id, client_id) DO UPDATE SET
    is_active = TRUE,
    granted_at = CURRENT_TIMESTAMP;
