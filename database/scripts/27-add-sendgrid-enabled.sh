#!/bin/bash
# ============================================================================
# GEA Portal - Add SendGrid Enabled Setting
# ============================================================================
# Adds SENDGRID_ENABLED boolean setting to allow disabling email notifications
# at runtime without removing API key configuration.
#
# Run: ./database/scripts/27-add-sendgrid-enabled.sh
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
echo "Adding SendGrid Enabled Setting"
echo "============================================"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- ADD SENDGRID_ENABLED SETTING
-- ============================================================================
-- Controls whether email notifications are sent via SendGrid.
-- When disabled, email sending gracefully fails without errors.

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
    'SENDGRID_ENABLED',
    'true',
    'boolean',
    'INTEGRATIONS',
    'Email',
    'Enable SendGrid',
    'Enable or disable email notifications. When disabled, emails will not be sent but the system will continue to function.',
    false,
    true,
    'true',
    0,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings WHERE setting_key = 'SENDGRID_ENABLED'
);

-- Verify the setting exists
DO $$
DECLARE
    setting_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM system_settings WHERE setting_key = 'SENDGRID_ENABLED'
    ) INTO setting_exists;

    IF setting_exists THEN
        RAISE NOTICE 'SENDGRID_ENABLED setting configured successfully';
    ELSE
        RAISE WARNING 'Failed to create SENDGRID_ENABLED setting';
    END IF;
END $$;

-- Show current Email settings
SELECT setting_key, setting_value, display_name, sort_order
FROM system_settings
WHERE category = 'INTEGRATIONS' AND subcategory = 'Email'
ORDER BY sort_order;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SENDGRID_ENABLED setting added successfully"
    echo "   Default: enabled (true)"
    echo "   Location: Admin → Settings → Integrations → Email"
    echo ""
else
    echo "✗ Failed to add SENDGRID_ENABLED setting"
    exit 1
fi

echo "============================================"
echo "Migration Complete"
echo "============================================"
