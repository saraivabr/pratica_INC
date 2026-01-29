-- Migration 028: Add password authentication
-- Adds password_hash column and password reset functionality

BEGIN;

-- Add password_hash column (nullable - OTP is primary method)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index on email for fast lookup during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Add password reset columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN users.password_hash IS 
  'Bcrypt hash of password (optional - OTP via phone is primary method)';

COMMENT ON COLUMN users.password_reset_token IS 
  'Unique token for password reset via email';

COMMENT ON COLUMN users.password_reset_expires IS 
  'Expiration timestamp for password reset token (24 hours)';

COMMIT;
