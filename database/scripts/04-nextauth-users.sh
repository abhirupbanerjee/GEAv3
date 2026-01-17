#!/bin/bash

# ============================================================================
# GEA PORTAL - NEXTAUTH USER MANAGEMENT MIGRATION v2.0
# ============================================================================
# Purpose: Add NextAuth authentication and user management tables
# Architecture: OAuth-based authentication with entity-based authorization
# Date: November 25, 2025
# Database: feedback_db (using existing database)
#
# Features:
# - NextAuth tables (accounts, sessions, verification_tokens)
# - User roles (admin_dta, staff_mda, public_user)
# - Entity-based user assignments
# - Audit logging for user actions
# - Fine-grained permissions system
#
# CHANGES IN v2.0:
# - Removed `set -e` for better error control
# - Replaced HEREDOC with -c flag for explicit error detection
# - Added error checking after each database operation
# - Improved error messages with actionable guidance
# ============================================================================

# NOTE: Do NOT use `set -e` - we handle errors explicitly
DB_USER="feedback_user"
DB_NAME="feedback"
DB_CONTAINER="feedback_db"

# Error flag to track failures
HAS_ERROR=0

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - NEXTAUTH USER MANAGEMENT MIGRATION v2.0            ║"
echo "║   Adding OAuth Authentication + Role-Based Access Control         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: VERIFY CONNECTION
# ============================================================================
echo "▶ Step 1: Verifying database connection..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "  ✗ Cannot connect to database."
    echo "  ERROR: Database connection failed"
    exit 1
fi

echo "  ✓ Database connection successful"
echo ""

# ============================================================================
# STEP 2: ENABLE UUID EXTENSION
# ============================================================================
echo "▶ Step 2: Enabling UUID extension..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' > /dev/null 2>&1; then
    echo "  ✗ Failed to enable UUID extension"
    HAS_ERROR=1
fi

echo "  ✓ UUID extension enabled"
echo ""

# ============================================================================
# STEP 3: CREATE USER ROLES TABLE
# ============================================================================
echo "▶ Step 3: Creating user_roles table..."

# Create user_roles table
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('admin', 'staff', 'public')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create user_roles table"
    HAS_ERROR=1
fi

# Insert default roles
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO user_roles (role_code, role_name, role_type, description) VALUES
    ('admin_dta', 'Admin', 'admin', 'Full system access - administrators with entity association'),
    ('staff_mda', 'MDA Staff Officer', 'staff', 'Entity-specific access - Ministry/Department/Agency officers'),
    ('public_user', 'Public User', 'public', 'Limited public access - Future use for citizen portal')
ON CONFLICT (role_code) DO NOTHING;" > /dev/null 2>&1; then
    echo "  ✗ Failed to insert default roles"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ user_roles table created with default roles"
fi
echo ""

# ============================================================================
# STEP 4: CREATE USERS TABLE
# ============================================================================
echo "▶ Step 4: Creating users table..."

# Create users table
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create users table"
    HAS_ERROR=1
fi

# Create indexes
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_entity ON users(entity_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create users table indexes"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ users table created with indexes"
fi
echo ""

# ============================================================================
# STEP 5: CREATE NEXTAUTH ACCOUNTS TABLE
# ============================================================================
echo "▶ Step 5: Creating accounts table (NextAuth OAuth data)..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create accounts table"
    HAS_ERROR=1
fi

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create accounts table index"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ accounts table created"
fi
echo ""

# ============================================================================
# STEP 6: CREATE NEXTAUTH SESSIONS TABLE
# ============================================================================
echo "▶ Step 6: Creating sessions table (NextAuth session management)..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create sessions table"
    HAS_ERROR=1
fi

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create sessions table indexes"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ sessions table created"
fi
echo ""

# ============================================================================
# STEP 7: CREATE VERIFICATION TOKENS TABLE
# ============================================================================
echo "▶ Step 7: Creating verification_tokens table..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create verification_tokens table"
    HAS_ERROR=1
fi

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create verification_tokens index"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ verification_tokens table created"
fi
echo ""

# ============================================================================
# STEP 8: CREATE ENTITY USER ASSIGNMENTS TABLE
# ============================================================================
echo "▶ Step 8: Creating entity_user_assignments table (many-to-many)..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS entity_user_assignments (
    assignment_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, entity_id)
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create entity_user_assignments table"
    HAS_ERROR=1
fi

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_entity_assignments_user ON entity_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_assignments_entity ON entity_user_assignments(entity_id);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create entity_user_assignments indexes"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ entity_user_assignments table created"
fi
echo ""

# ============================================================================
# STEP 9: CREATE USER PERMISSIONS TABLE
# ============================================================================
echo "▶ Step 9: Creating user_permissions table (fine-grained access)..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create user_permissions table"
    HAS_ERROR=1
fi

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_code ON user_permissions(permission_code);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create user_permissions indexes"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ user_permissions table created"
fi
echo ""

# ============================================================================
# STEP 10: CREATE USER AUDIT LOG TABLE
# ============================================================================
echo "▶ Step 10: Creating user_audit_log table..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create user_audit_log table"
    HAS_ERROR=1
fi

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE INDEX IF NOT EXISTS idx_audit_user ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON user_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON user_audit_log(action);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create user_audit_log indexes"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ user_audit_log table created"
fi
echo ""

# ============================================================================
# STEP 11: CREATE TRIGGERS FOR UPDATED_AT
# ============================================================================
echo "▶ Step 11: Creating triggers for automatic timestamp updates..."

# Create function
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;" > /dev/null 2>&1; then
    echo "  ✗ Failed to create update_updated_at_column function"
    HAS_ERROR=1
fi

# Create triggers
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
    EXECUTE FUNCTION update_updated_at_column();" > /dev/null 2>&1; then
    echo "  ✗ Failed to create triggers"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ Triggers created"
fi
echo ""

# ============================================================================
# STEP 12: GRANT PERMISSIONS
# ============================================================================
echo "▶ Step 12: Granting permissions to $DB_USER..."

if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" > /dev/null 2>&1; then
    echo "  ✗ Failed to grant permissions"
    HAS_ERROR=1
fi

if [ $HAS_ERROR -eq 0 ]; then
    echo "  ✓ Permissions granted"
fi
echo ""

# ============================================================================
# STEP 13: VERIFICATION
# ============================================================================
echo "▶ Step 13: Verifying tables created..."
echo ""

# Check if all required tables exist
EXPECTED_TABLES=("users" "user_roles" "accounts" "sessions" "verification_tokens" "entity_user_assignments" "user_permissions" "user_audit_log")
MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
    if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "\dt $table" > /dev/null 2>&1; then
        MISSING_TABLES+=("$table")
        HAS_ERROR=1
    fi
done

if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
    echo "✗ Missing tables:"
    for table in "${MISSING_TABLES[@]}"; do
        echo "  - $table"
    done
    echo ""
    echo "ERROR: Not all required tables were created"
    exit 1
fi

echo "✓ Created tables:"
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
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
ORDER BY table_name;"

echo ""
echo "✓ User roles created:"
docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT role_code, role_name, role_type FROM user_roles ORDER BY role_id;"

# Check for any errors that occurred
if [ $HAS_ERROR -ne 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║     ✗ NEXTAUTH MIGRATION COMPLETED WITH ERRORS                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "⚠️  Some steps failed during migration"
    echo "Please review the error messages above"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ NEXTAUTH USER MANAGEMENT MIGRATION COMPLETE v2.0           ║"
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
echo "    - admin_dta / Admin (Full system access)"
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
echo "     Run: ./database/scripts/05-add-initial-admin.sh"
echo "     OR: ADMIN_EMAIL=\"...\" ADMIN_NAME=\"...\" ./database/scripts/05-add-initial-admin.sh"
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

# Exit with success only if no errors occurred
exit 0
