#!/bin/bash

# ============================================================================
# GEA PORTAL - NEXTAUTH USER MANAGEMENT MIGRATION v1.0
# ============================================================================
# Purpose: Add NextAuth authentication and user management tables
# Architecture: OAuth-based authentication with entity-based authorization
# Date: November 22, 2025
# Database: feedback_db (using existing database)
#
# Features:
# - NextAuth tables (accounts, sessions, verification_tokens)
# - User roles (admin_dta, staff_mda, public_user)
# - Entity-based user assignments
# - Audit logging for user actions
# - Fine-grained permissions system
#
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - NEXTAUTH USER MANAGEMENT MIGRATION v1.0            ║"
echo "║   Adding OAuth Authentication + Role-Based Access Control         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: VERIFY CONNECTION
# ============================================================================
echo "▶ Step 1: Verifying database connection..."

if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database."
    exit 1
fi

echo "  ✓ Database connection successful"
echo ""

# ============================================================================
# STEP 2: ENABLE UUID EXTENSION
# ============================================================================
echo "▶ Step 2: Enabling UUID extension..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

echo "  ✓ UUID extension enabled"
echo ""

# ============================================================================
# STEP 3: CREATE USER ROLES TABLE
# ============================================================================
echo "▶ Step 3: Creating user_roles table..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('admin', 'staff', 'public')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO user_roles (role_code, role_name, role_type, description) VALUES
    ('admin_dta', 'DTA Administrator', 'admin', 'Full system access - Digital Transformation Agency administrators'),
    ('staff_mda', 'MDA Staff Officer', 'staff', 'Entity-specific access - Ministry/Department/Agency officers'),
    ('public_user', 'Public User', 'public', 'Limited public access - Future use for citizen portal')
ON CONFLICT (role_code) DO NOTHING;
EOF

echo "  ✓ user_roles table created with default roles"
echo ""

# ============================================================================
# STEP 4: CREATE USERS TABLE
# ============================================================================
echo "▶ Step 4: Creating users table..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_entity ON users(entity_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
EOF

echo "  ✓ users table created with indexes"
echo ""

# ============================================================================
# STEP 5: CREATE NEXTAUTH ACCOUNTS TABLE
# ============================================================================
echo "▶ Step 5: Creating accounts table (NextAuth OAuth data)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
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
EOF

echo "  ✓ accounts table created"
echo ""

# ============================================================================
# STEP 6: CREATE NEXTAUTH SESSIONS TABLE
# ============================================================================
echo "▶ Step 6: Creating sessions table (NextAuth session management)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
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
EOF

echo "  ✓ sessions table created"
echo ""

# ============================================================================
# STEP 7: CREATE VERIFICATION TOKENS TABLE
# ============================================================================
echo "▶ Step 7: Creating verification_tokens table..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
EOF

echo "  ✓ verification_tokens table created"
echo ""

# ============================================================================
# STEP 8: CREATE ENTITY USER ASSIGNMENTS TABLE
# ============================================================================
echo "▶ Step 8: Creating entity_user_assignments table (many-to-many)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS entity_user_assignments (
    assignment_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(entity_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_assignments_user ON entity_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_assignments_entity ON entity_user_assignments(entity_id);
EOF

echo "  ✓ entity_user_assignments table created"
echo ""

# ============================================================================
# STEP 9: CREATE USER PERMISSIONS TABLE
# ============================================================================
echo "▶ Step 9: Creating user_permissions table (fine-grained access)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
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
EOF

echo "  ✓ user_permissions table created"
echo ""

# ============================================================================
# STEP 10: CREATE USER AUDIT LOG TABLE
# ============================================================================
echo "▶ Step 10: Creating user_audit_log table..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
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
EOF

echo "  ✓ user_audit_log table created"
echo ""

# ============================================================================
# STEP 11: CREATE TRIGGERS FOR UPDATED_AT
# ============================================================================
echo "▶ Step 11: Creating triggers for automatic timestamp updates..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for accounts table
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EOF

echo "  ✓ Triggers created"
echo ""

# ============================================================================
# STEP 12: GRANT PERMISSIONS
# ============================================================================
echo "▶ Step 12: Granting permissions to feedback_user..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO feedback_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO feedback_user;
EOF

echo "  ✓ Permissions granted"
echo ""

# ============================================================================
# STEP 13: VERIFICATION
# ============================================================================
echo "▶ Step 13: Verifying tables created..."
echo ""

echo "✓ Created tables:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'user_roles',
    'accounts',
    'sessions',
    'verification_tokens',
    'entity_user_assignments',
    'user_permissions',
    'user_audit_log'
  )
ORDER BY table_name;
EOF

echo ""
echo "✓ User roles created:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT role_code, role_name, role_type FROM user_roles ORDER BY role_id;
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ NEXTAUTH USER MANAGEMENT MIGRATION COMPLETE v1.0           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Migration Summary:"
echo ""
echo "  ✓ 8 new tables created:"
echo "    - users (central auth/authz)"
echo "    - user_roles (admin/staff/public)"
echo "    - accounts (OAuth provider data)"
echo "    - sessions (active sessions)"
echo "    - verification_tokens (email verification)"
echo "    - entity_user_assignments (many-to-many)"
echo "    - user_permissions (fine-grained access)"
echo "    - user_audit_log (activity tracking)"
echo ""
echo "  ✓ 3 default roles created:"
echo "    - admin_dta (Full system access)"
echo "    - staff_mda (Entity-specific access)"
echo "    - public_user (Limited public access)"
echo ""
echo "🔐 Security Features:"
echo "  ✓ UUID-based user IDs"
echo "  ✓ Cascade delete for data integrity"
echo "  ✓ Automatic timestamp updates"
echo "  ✓ Audit logging ready"
echo "  ✓ Entity-based filtering"
echo ""
echo "⚠️  IMPORTANT: NEXT STEPS"
echo ""
echo "  1. Add your first admin user to the database:"
echo "     Run: ./database/05-add-initial-admin.sh"
echo "     OR manually: INSERT INTO users (email, name, role_id, entity_id, is_active)"
echo ""
echo "  2. Configure OAuth providers in .env.local:"
echo "     - GOOGLE_CLIENT_ID"
echo "     - GOOGLE_CLIENT_SECRET"
echo "     - MICROSOFT_CLIENT_ID"
echo "     - MICROSOFT_CLIENT_SECRET"
echo "     - NEXTAUTH_SECRET"
echo ""
echo "  3. Implement NextAuth configuration:"
echo "     - src/lib/auth.ts"
echo "     - src/app/api/auth/[...nextauth]/route.ts"
echo ""
echo "✓ Database migration complete - Ready for NextAuth implementation!"
echo ""
