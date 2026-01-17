#!/bin/bash
# ============================================================================
# GEA Portal - Add Admin Allowed Entities Setting
# ============================================================================
# Adds ADMIN_ALLOWED_ENTITIES setting to control which entities can have
# admin users assigned to them.
#
# Run: ./database/scripts/19-add-admin-entities-setting.sh
# ============================================================================

set -e

# Load environment
source "$(dirname "$0")/../lib/common.sh" 2>/dev/null || {
    # Fallback if common.sh not available
    DB_USER="${DB_USER:-feedback_user}"
    DB_NAME="${DB_NAME:-feedback}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
}

echo "============================================"
echo "Adding ADMIN_ALLOWED_ENTITIES Setting"
echo "============================================"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- ADD ADMIN_ALLOWED_ENTITIES SETTING
-- ============================================================================
-- This setting controls which entities can have admin users assigned to them.
-- Default: Only DTA (AGY-005) can have admins.

-- Insert the setting if it doesn't exist
INSERT INTO system_settings (
    setting_key,
    setting_value,
    setting_type,
    category,
    subcategory,
    display_name,
    description,
    is_sensitive,
    is_runtime,
    default_value,
    sort_order,
    is_active
)
SELECT
    'ADMIN_ALLOWED_ENTITIES',
    '["AGY-005"]',
    'multiselect',
    'USER_MANAGEMENT',
    'Roles',
    'Entities Allowed to Have Admins',
    'Select which entities can have admin users assigned to them. Admins from these entities will have full system access.',
    false,
    true,
    '["AGY-005"]',
    10,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings WHERE setting_key = 'ADMIN_ALLOWED_ENTITIES'
);

-- Verify the setting exists
DO $$
DECLARE
    setting_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM system_settings WHERE setting_key = 'ADMIN_ALLOWED_ENTITIES'
    ) INTO setting_exists;

    IF setting_exists THEN
        RAISE NOTICE 'ADMIN_ALLOWED_ENTITIES setting is configured';
    ELSE
        RAISE WARNING 'Failed to create ADMIN_ALLOWED_ENTITIES setting';
    END IF;
END $$;

-- Show current value
SELECT setting_key, setting_value, display_name
FROM system_settings
WHERE setting_key = 'ADMIN_ALLOWED_ENTITIES';

EOF

echo ""
echo "Migration complete!"
