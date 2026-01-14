-- Migration 016: Normalize existing emails in users and admin_users tables
-- This migration normalizes all existing emails to lowercase and trims whitespace
-- Execute this BEFORE deploying the code changes to ensure consistency

-- Normalize emails in users table
UPDATE users 
SET email = LOWER(TRIM(email)) 
WHERE email != LOWER(TRIM(email));

-- Normalize emails in admin_users table
UPDATE admin_users 
SET email = LOWER(TRIM(email)) 
WHERE email != LOWER(TRIM(email));

-- Create unique indexes for case-insensitive email uniqueness
-- These indexes prevent duplicate emails regardless of case or whitespace
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower 
ON users(LOWER(TRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_lower 
ON admin_users(LOWER(TRIM(email)));

-- Verify normalization (should return 0 rows if all emails are normalized)
-- Uncomment to verify:
-- SELECT email FROM users WHERE email != LOWER(TRIM(email));
-- SELECT email FROM admin_users WHERE email != LOWER(TRIM(email));

