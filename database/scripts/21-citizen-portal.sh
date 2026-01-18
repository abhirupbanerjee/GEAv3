#!/bin/bash
# ==============================================================================
# 21-citizen-portal.sh - Citizen Portal Database Tables
# ==============================================================================
# Creates tables for citizen authentication and portal functionality:
# - citizens: Phone-based user accounts
# - citizen_otp: OTP tracking for SMS verification
# - citizen_sessions: Short-lived session tokens
# - citizen_trusted_devices: Long-lived device trust cookies
# ==============================================================================

set -e

# Get database connection from environment or use defaults
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-geaportal}"
DB_USER="${POSTGRES_USER:-geaportal}"

echo "=============================================="
echo "Creating Citizen Portal Tables..."
echo "=============================================="

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'

-- ==============================================================================
-- Citizens Table - Phone-based user accounts
-- ==============================================================================
CREATE TABLE IF NOT EXISTS citizens (
    citizen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,  -- E.164 format (+14731234567)
    phone_verified BOOLEAN DEFAULT false,
    name VARCHAR(100),
    email VARCHAR(255),
    password_hash VARCHAR(255),  -- bcrypt hash
    registration_complete BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Indexes for citizens table
CREATE INDEX IF NOT EXISTS idx_citizens_phone ON citizens(phone);
CREATE INDEX IF NOT EXISTS idx_citizens_email ON citizens(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_citizens_active ON citizens(is_active) WHERE is_active = true;

COMMENT ON TABLE citizens IS 'Citizen user accounts for the citizen portal (phone-based authentication)';
COMMENT ON COLUMN citizens.phone IS 'Phone number in E.164 format (e.g., +14731234567)';
COMMENT ON COLUMN citizens.phone_verified IS 'Whether the phone number has been verified via OTP';
COMMENT ON COLUMN citizens.password_hash IS 'bcrypt hashed password for login';
COMMENT ON COLUMN citizens.registration_complete IS 'Whether the citizen has completed registration (name, email, password)';

-- ==============================================================================
-- Citizen OTP Table - SMS verification codes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS citizen_otp (
    otp_id SERIAL PRIMARY KEY,
    citizen_id UUID REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,  -- E.164 format
    otp_code VARCHAR(6) NOT NULL,  -- 6-digit OTP code
    purpose VARCHAR(20) DEFAULT 'login',  -- 'login', 'register', 'reset_password'
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for citizen_otp table
CREATE INDEX IF NOT EXISTS idx_citizen_otp_phone ON citizen_otp(phone, expires_at);
CREATE INDEX IF NOT EXISTS idx_citizen_otp_citizen ON citizen_otp(citizen_id) WHERE citizen_id IS NOT NULL;

-- Clean up expired OTPs automatically (can be called via cron or pg_cron)
-- DELETE FROM citizen_otp WHERE expires_at < NOW() - INTERVAL '1 hour';

COMMENT ON TABLE citizen_otp IS 'OTP codes for citizen SMS verification';
COMMENT ON COLUMN citizen_otp.purpose IS 'Purpose: login, register, or reset_password';
COMMENT ON COLUMN citizen_otp.attempts IS 'Number of verification attempts (max 3)';

-- ==============================================================================
-- Citizen Sessions Table - Short-lived session tokens
-- ==============================================================================
CREATE TABLE IF NOT EXISTS citizen_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,  -- Secure random token
    user_agent TEXT,  -- Browser/device info
    ip_address VARCHAR(45),  -- IPv4 or IPv6
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for citizen_sessions table
CREATE INDEX IF NOT EXISTS idx_citizen_sessions_token ON citizen_sessions(token);
CREATE INDEX IF NOT EXISTS idx_citizen_sessions_citizen ON citizen_sessions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_citizen_sessions_expires ON citizen_sessions(expires_at);

-- Clean up expired sessions automatically
-- DELETE FROM citizen_sessions WHERE expires_at < NOW();

COMMENT ON TABLE citizen_sessions IS 'Active citizen sessions (configurable duration via CITIZEN_SESSION_HOURS)';
COMMENT ON COLUMN citizen_sessions.token IS 'Secure random token stored in httpOnly cookie';

-- ==============================================================================
-- Citizen Trusted Devices Table - Long-lived device trust
-- ==============================================================================
CREATE TABLE IF NOT EXISTS citizen_trusted_devices (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    device_token VARCHAR(255) UNIQUE NOT NULL,  -- Secure random token
    device_name VARCHAR(100),  -- User agent or custom name
    device_fingerprint VARCHAR(255),  -- Browser fingerprint hash
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for citizen_trusted_devices table
CREATE INDEX IF NOT EXISTS idx_citizen_devices_token ON citizen_trusted_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_citizen_devices_citizen ON citizen_trusted_devices(citizen_id);
CREATE INDEX IF NOT EXISTS idx_citizen_devices_expires ON citizen_trusted_devices(expires_at);

-- Clean up expired device tokens automatically
-- DELETE FROM citizen_trusted_devices WHERE expires_at < NOW();

COMMENT ON TABLE citizen_trusted_devices IS 'Trusted devices for "Remember Me" functionality (configurable via CITIZEN_DEVICE_TRUST_DAYS)';
COMMENT ON COLUMN citizen_trusted_devices.device_token IS 'Secure random token stored in long-lived httpOnly cookie';
COMMENT ON COLUMN citizen_trusted_devices.device_fingerprint IS 'Optional browser fingerprint for additional security';

-- ==============================================================================
-- Trigger: Update updated_at timestamp for citizens
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_citizens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_citizens_updated_at ON citizens;
CREATE TRIGGER trigger_citizens_updated_at
    BEFORE UPDATE ON citizens
    FOR EACH ROW
    EXECUTE FUNCTION update_citizens_updated_at();

-- ==============================================================================
-- Grant permissions
-- ==============================================================================
-- (Adjust these based on your PostgreSQL role setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON citizens TO geaportal_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON citizen_otp TO geaportal_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON citizen_sessions TO geaportal_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON citizen_trusted_devices TO geaportal_app;
-- GRANT USAGE, SELECT ON SEQUENCE citizen_otp_otp_id_seq TO geaportal_app;

EOF

echo "=============================================="
echo "Citizen Portal Tables Created Successfully!"
echo "=============================================="
echo ""
echo "Tables created:"
echo "  - citizens: Phone-based user accounts"
echo "  - citizen_otp: OTP tracking for SMS verification"
echo "  - citizen_sessions: Short-lived session tokens"
echo "  - citizen_trusted_devices: Long-lived device trust"
echo ""
echo "Note: Run periodic cleanup for expired records:"
echo "  DELETE FROM citizen_otp WHERE expires_at < NOW() - INTERVAL '1 hour';"
echo "  DELETE FROM citizen_sessions WHERE expires_at < NOW();"
echo "  DELETE FROM citizen_trusted_devices WHERE expires_at < NOW();"
