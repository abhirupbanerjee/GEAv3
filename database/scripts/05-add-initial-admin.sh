#!/bin/bash

# ============================================================================
# GEA PORTAL - ADD INITIAL ADMIN USER v2.0
# ============================================================================
# Purpose: Add the first admin user for OAuth authentication
# Date: November 25, 2025
#
# CHANGES IN v2.0:
# - Removed `set -e` for better error control
# - Replaced HEREDOC with -c flag for explicit error detection
# - Added error checking after database operations
# - Fixed silent INSERT failures
#
# IMPORTANT: Update the EMAIL variable below with your actual admin email
# This email must match the Google/Microsoft account you'll use to sign in
# ============================================================================

# NOTE: Do NOT use `set -e` - we handle errors explicitly
DB_USER="feedback_user"
DB_NAME="feedback"
DB_CONTAINER="feedback_db"

# ============================================================================
# CONFIGURE YOUR ADMIN EMAIL HERE
# ============================================================================
# Update this with your actual admin email address
# This email must match your Google or Microsoft account
ADMIN_EMAIL="${ADMIN_EMAIL:-gogdtaservices@gmail.com}"
ADMIN_NAME="${ADMIN_NAME:-System Administrator}"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - ADD INITIAL ADMIN USER                             ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# VERIFY EMAIL PROVIDED
# ============================================================================
if [ "$ADMIN_EMAIL" = "gogdtaservices@gmail.com" ]; then
    echo "⚠️  WARNING: Using default email (gogdtaservices@gmail.com)"
    echo ""
    echo "To use a different email, run:"
    echo "  ADMIN_EMAIL=your@email.com ADMIN_NAME=\"Your Name\" ./database/scripts/05-add-initial-admin.sh"
    echo ""
    read -p "Continue with default email? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. Please set ADMIN_EMAIL environment variable."
        exit 1
    fi
fi

echo "▶ Adding admin user: $ADMIN_EMAIL ($ADMIN_NAME)"
echo ""

# ============================================================================
# CHECK IF USER EXISTS
# ============================================================================
USER_EXISTS=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM users WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' ')

# Check if command succeeded
if [ $? -ne 0 ]; then
    echo "  ✗ Failed to check if user exists"
    echo "  ERROR: Could not query users table"
    exit 1
fi

if [ -z "$USER_EXISTS" ]; then
    echo "  ✗ Failed to check user existence (empty result)"
    exit 1
fi

if [ "$USER_EXISTS" -gt 0 ]; then
    echo "  ℹ️  User already exists with email: $ADMIN_EMAIL"
    echo ""
    echo "  Current user details:"

    # Show user details with -c flag
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT
    u.email,
    u.name,
    u.is_active,
    r.role_name,
    u.entity_id,
    u.created_at
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.email = '$ADMIN_EMAIL';"

    echo ""
    read -p "Update this user to admin role? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
UPDATE users
SET
    role_id = (SELECT role_id FROM user_roles WHERE role_code = 'admin_dta'),
    is_active = true,
    entity_id = 'AGY-002',
    updated_at = CURRENT_TIMESTAMP
WHERE email = '$ADMIN_EMAIL';" > /dev/null 2>&1; then
            echo "  ✓ User updated to admin role"
        else
            echo "  ✗ Failed to update user"
            exit 1
        fi
    else
        echo "  Skipped update"
    fi
    exit 0
fi

# ============================================================================
# INSERT ADMIN USER
# ============================================================================
echo "  ▶ Creating new admin user..."

# Use -c flag instead of HEREDOC for proper error detection
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
VALUES (
    '$ADMIN_EMAIL',
    '$ADMIN_NAME',
    (SELECT role_id FROM user_roles WHERE role_code = 'admin_dta'),
    'AGY-002',
    true,
    'google'
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create admin user"
    echo "  ERROR: INSERT command failed"
    echo ""
    echo "  Possible causes:"
    echo "  - users table does not exist (run: ./database/scripts/04-nextauth-users.sh)"
    echo "  - user_roles table is empty (run: ./database/scripts/04-nextauth-users.sh)"
    echo "  - entity 'AGY-002' does not exist (run: ./database/scripts/11-load-master-data.sh)"
    exit 1
fi

echo "  ✓ Admin user created successfully"
echo ""

# ============================================================================
# VERIFY USER CREATED
# ============================================================================
echo "▶ Verifying admin user:"
echo ""

# Verify using -c flag
if ! docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT
    u.id,
    u.email,
    u.name,
    r.role_name,
    r.role_type,
    u.entity_id,
    u.is_active,
    u.created_at
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.email = '$ADMIN_EMAIL';"; then
    echo ""
    echo "  ✗ Failed to verify admin user (but user may still have been created)"
    exit 1
fi

# Double-check that user was actually created
USER_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM users WHERE email = '$ADMIN_EMAIL';" 2>/dev/null | tr -d ' ')

if [ "$USER_COUNT" != "1" ]; then
    echo ""
    echo "  ✗ Admin user verification failed"
    echo "  ERROR: User was not created in database"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ ADMIN USER CREATED SUCCESSFULLY                            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Admin User Details:"
echo "  Email: $ADMIN_EMAIL"
echo "  Name: $ADMIN_NAME"
echo "  Role: DTA Administrator (admin_dta)"
echo "  Entity: AGY-002"
echo "  Status: Active"
echo ""
echo "🔑 Next Steps:"
echo ""
echo "  1. Configure OAuth providers in frontend/.env.local:"
echo "     - Set up Google OAuth in Google Cloud Console"
echo "     - Set up Microsoft OAuth in Azure Portal"
echo "     - Add credentials to .env.local"
echo ""
echo "  2. Implement NextAuth configuration files:"
echo "     - src/lib/auth.ts"
echo "     - src/app/api/auth/[...nextauth]/route.ts"
echo "     - src/app/auth/signin/page.tsx"
echo ""
echo "  3. Test OAuth login:"
echo "     - Sign in with: $ADMIN_EMAIL"
echo "     - Provider: Google OAuth"
echo ""
echo "✓ Ready for NextAuth implementation!"
echo ""

# Exit with success
exit 0
