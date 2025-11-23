#!/bin/bash

# ============================================================================
# GEA PORTAL - RUN NEXTAUTH MIGRATION (FIXED)
# ============================================================================
# This script properly runs the NextAuth migration on the Docker database
# ============================================================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - RUNNING NEXTAUTH MIGRATION (FIXED)                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "▶ Executing migration SQL..."

docker exec -i feedback_db psql -U feedback_user -d feedback << 'EOSQL'

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('admin', 'staff', 'public')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_roles (role_code, role_name, role_type, description) VALUES
    ('admin_dta', 'DTA Administrator', 'admin', 'Full system access'),
    ('staff_mda', 'MDA Staff Officer', 'staff', 'Entity-specific access'),
    ('public_user', 'Public User', 'public', 'Limited public access')
ON CONFLICT (role_code) DO NOTHING;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    email_verified TIMESTAMP,
    role_id INTEGER NOT NULL REFERENCES user_roles(role_id),
    entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT true,
    provider VARCHAR(50),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_entity ON users(entity_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 3. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(50),
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- 4. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- 5. VERIFICATION TOKENS TABLE
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);

-- 6. ENTITY USER ASSIGNMENTS
CREATE TABLE IF NOT EXISTS entity_user_assignments (
    assignment_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_assignments_user ON entity_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_assignments_entity ON entity_user_assignments(entity_id);

-- 7. USER PERMISSIONS
CREATE TABLE IF NOT EXISTS user_permissions (
    permission_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255),
    expires_at TIMESTAMP,
    UNIQUE(user_id, permission_code, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_code ON user_permissions(permission_code);

-- 8. USER AUDIT LOG
CREATE TABLE IF NOT EXISTS user_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON user_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON user_audit_log(action);

-- 9. TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

EOSQL

echo ""
echo "✓ Migration SQL executed"
echo ""
echo "▶ Verifying tables created..."
echo ""

docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'user_roles', 'accounts', 'sessions', 'verification_tokens')
ORDER BY table_name;
"

echo ""
echo "▶ Verifying roles created..."
echo ""

docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT role_code, role_name, role_type FROM user_roles ORDER BY role_id;"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ NEXTAUTH MIGRATION COMPLETED SUCCESSFULLY                  ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next step: Add admin user with:"
echo "  ADMIN_EMAIL=your@email.com ADMIN_NAME=\"Your Name\" ./05-add-initial-admin.sh"
echo ""
