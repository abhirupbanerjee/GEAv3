#!/bin/bash
# ============================================================================
# GEA Portal - Add Backup Timezone Setting
# ============================================================================
# Adds BACKUP_SCHEDULE_TIMEZONE setting for configurable scheduler timezone
# Run: ./database/scripts/19-add-backup-timezone.sh
# ============================================================================

set -e

# Load environment
source "$(dirname "$0")/../lib/common.sh" 2>/dev/null || {
    # Fallback if common.sh not available
    DB_USER="${DB_USER:-feedback_user}"
    DB_NAME="${DB_NAME:-feedback}"
}

echo "=============================================="
echo "  Adding Backup Timezone Setting"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- ADD BACKUP_SCHEDULE_TIMEZONE SETTING
-- ============================================================================
-- Allows users to select timezone for scheduled backup execution
-- Default: America/Grenada (current hardcoded value)

INSERT INTO system_settings (
    setting_key,
    setting_value,
    setting_type,
    category,
    subcategory,
    display_name,
    description,
    default_value,
    is_runtime,
    sort_order,
    options
)
SELECT
    'BACKUP_SCHEDULE_TIMEZONE',
    'America/Grenada',
    'select',
    'DATABASE',
    'Schedule',
    'Backup Timezone',
    'Timezone for scheduled backup execution. Select your local timezone to ensure backups run at the expected time.',
    'America/Grenada',
    true,
    5,
    '{"values": [
        {"value": "UTC", "label": "UTC (Coordinated Universal Time)"},
        {"value": "America/New_York", "label": "America/New York (EST/EDT)"},
        {"value": "America/Chicago", "label": "America/Chicago (CST/CDT)"},
        {"value": "America/Denver", "label": "America/Denver (MST/MDT)"},
        {"value": "America/Los_Angeles", "label": "America/Los Angeles (PST/PDT)"},
        {"value": "America/Grenada", "label": "America/Grenada (AST)"},
        {"value": "America/Toronto", "label": "America/Toronto (EST/EDT)"},
        {"value": "America/Sao_Paulo", "label": "America/Sao Paulo (BRT)"},
        {"value": "America/Jamaica", "label": "America/Jamaica (EST)"},
        {"value": "America/Puerto_Rico", "label": "America/Puerto Rico (AST)"},
        {"value": "Europe/London", "label": "Europe/London (GMT/BST)"},
        {"value": "Europe/Paris", "label": "Europe/Paris (CET/CEST)"},
        {"value": "Europe/Berlin", "label": "Europe/Berlin (CET/CEST)"},
        {"value": "Europe/Moscow", "label": "Europe/Moscow (MSK)"},
        {"value": "Asia/Dubai", "label": "Asia/Dubai (GST)"},
        {"value": "Asia/Kolkata", "label": "Asia/Kolkata (IST)"},
        {"value": "Asia/Singapore", "label": "Asia/Singapore (SGT)"},
        {"value": "Asia/Hong_Kong", "label": "Asia/Hong Kong (HKT)"},
        {"value": "Asia/Tokyo", "label": "Asia/Tokyo (JST)"},
        {"value": "Asia/Shanghai", "label": "Asia/Shanghai (CST)"},
        {"value": "Australia/Sydney", "label": "Australia/Sydney (AEST/AEDT)"},
        {"value": "Australia/Perth", "label": "Australia/Perth (AWST)"},
        {"value": "Pacific/Auckland", "label": "Pacific/Auckland (NZST/NZDT)"},
        {"value": "Africa/Johannesburg", "label": "Africa/Johannesburg (SAST)"},
        {"value": "Africa/Cairo", "label": "Africa/Cairo (EET)"},
        {"value": "Africa/Lagos", "label": "Africa/Lagos (WAT)"}
    ]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'BACKUP_SCHEDULE_TIMEZONE');

-- Verify
SELECT setting_key, setting_value, display_name
FROM system_settings
WHERE setting_key = 'BACKUP_SCHEDULE_TIMEZONE';

EOF

echo ""
echo "=============================================="
echo "  Migration Complete!"
echo "=============================================="
echo ""
echo "Setting added:"
echo "  - BACKUP_SCHEDULE_TIMEZONE (26 timezone options)"
echo ""
echo "The timezone dropdown will now appear in:"
echo "  Admin > Settings > Database > Schedule"
echo ""
echo "After changing timezone, click 'Save Changes' then 'Restart Scheduler'"
echo ""
