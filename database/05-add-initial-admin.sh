#!/bin/bash

# ============================================================================
# GEA PORTAL - ADD INITIAL ADMIN USER
# ============================================================================
# Purpose: Add the first admin user for OAuth authentication
# Date: November 22, 2025
#
# IMPORTANT: Update the EMAIL variable below with your actual admin email
# This email must match the Google/Microsoft account you'll use to sign in
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

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
    echo "  ADMIN_EMAIL=your@email.com ADMIN_NAME=\"Your Name\" ./database/05-add-initial-admin.sh"
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
USER_EXISTS=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM users WHERE email = '$ADMIN_EMAIL';" | tr -d ' ')

if [ "$USER_EXISTS" -gt 0 ]; then
    echo "  ℹ️  User already exists with email: $ADMIN_EMAIL"
    echo ""
    echo "  Current user details:"
    docker exec feedback_db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    u.email,
    u.name,
    u.is_active,
    r.role_name,
    u.entity_id,
    u.created_at
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.email = '$ADMIN_EMAIL';
EOF
    echo ""
    read -p "Update this user to admin role? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker exec feedback_db psql -U $DB_USER -d $DB_NAME << EOF
UPDATE users
SET
    role_id = (SELECT role_id FROM user_roles WHERE role_code = 'admin_dta'),
    is_active = true,
    entity_id = 'DTA-001',
    updated_at = CURRENT_TIMESTAMP
WHERE email = '$ADMIN_EMAIL';
EOF
        echo "  ✓ User updated to admin role"
    else
        echo "  Skipped update"
    fi
    exit 0
fi

# ============================================================================
# INSERT ADMIN USER
# ============================================================================
echo "  ▶ Creating new admin user..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << EOF
INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
VALUES (
    '$ADMIN_EMAIL',
    '$ADMIN_NAME',
    (SELECT role_id FROM user_roles WHERE role_code = 'admin_dta'),
    'DTA-001',
    true,
    'google'
);
EOF

echo "  ✓ Admin user created successfully"
echo ""

# ============================================================================
# VERIFY USER CREATED
# ============================================================================
echo "▶ Verifying admin user:"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << EOF
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
WHERE u.email = '$ADMIN_EMAIL';
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ ADMIN USER CREATED SUCCESSFULLY                            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Admin User Details:"
echo "  Email: $ADMIN_EMAIL"
echo "  Name: $ADMIN_NAME"
echo "  Role: DTA Administrator (admin_dta)"
echo "  Entity: DTA-001"
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
