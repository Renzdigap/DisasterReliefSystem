-- Non-destructive migration to add Email OTP Verification support
-- Safe to run multiple times on an existing Supabase PostgreSQL database.

ALTER TABLE UserAccount
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE UserAccount
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_useraccount_email_unique
    ON UserAccount (LOWER(email))
    WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS PendingVerification (
    verification_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    payload_json TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
