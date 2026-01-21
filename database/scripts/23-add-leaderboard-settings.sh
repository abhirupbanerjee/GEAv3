#!/bin/bash
# ============================================================================
# GEA Portal - Add Leaderboard Weight Settings
# ============================================================================
# Adds configurable scoring weights for Service Performance Leaderboard.
# These settings control how the overall service score is calculated.
#
# Run: ./database/scripts/23-add-leaderboard-settings.sh
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
echo "Adding Leaderboard Weight Settings"
echo "============================================"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- ADD LEADERBOARD WEIGHT SETTINGS
-- ============================================================================
-- These settings control the Service Performance Leaderboard scoring formula:
-- Overall Score = (satisfaction/5 × W1) + (ticket_resolution/100 × W2) + ((1 - grievance_rate) × W3)
-- Where W1 + W2 + W3 = 10 (weights as percentages / 10)

-- Insert Satisfaction Weight setting if it doesn't exist
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
    min_value,
    max_value,
    sort_order,
    is_active
)
SELECT
    'LEADERBOARD_SATISFACTION_WEIGHT',
    '40',
    'number',
    'BUSINESS_RULES',
    'Leaderboard',
    'Satisfaction Weight (%)',
    'Weight for customer satisfaction in leaderboard score (0-100). Default: 40%',
    false,
    true,
    '40',
    0,
    100,
    50,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings WHERE setting_key = 'LEADERBOARD_SATISFACTION_WEIGHT'
);

-- Insert Ticket Resolution Weight setting if it doesn't exist
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
    min_value,
    max_value,
    sort_order,
    is_active
)
SELECT
    'LEADERBOARD_TICKET_RESOLUTION_WEIGHT',
    '25',
    'number',
    'BUSINESS_RULES',
    'Leaderboard',
    'Ticket Resolution Weight (%)',
    'Weight for ticket resolution rate in leaderboard score (0-100). Default: 25%',
    false,
    true,
    '25',
    0,
    100,
    51,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings WHERE setting_key = 'LEADERBOARD_TICKET_RESOLUTION_WEIGHT'
);

-- Insert Grievance Weight setting if it doesn't exist
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
    min_value,
    max_value,
    sort_order,
    is_active
)
SELECT
    'LEADERBOARD_GRIEVANCE_WEIGHT',
    '35',
    'number',
    'BUSINESS_RULES',
    'Leaderboard',
    'Grievance Penalty Weight (%)',
    'Weight for grievance penalty in leaderboard score (0-100). Default: 35%',
    false,
    true,
    '35',
    0,
    100,
    52,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_settings WHERE setting_key = 'LEADERBOARD_GRIEVANCE_WEIGHT'
);

-- Verify the settings exist
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count
    FROM system_settings
    WHERE setting_key IN (
        'LEADERBOARD_SATISFACTION_WEIGHT',
        'LEADERBOARD_TICKET_RESOLUTION_WEIGHT',
        'LEADERBOARD_GRIEVANCE_WEIGHT'
    );

    IF settings_count = 3 THEN
        RAISE NOTICE 'All 3 leaderboard weight settings are configured';
    ELSE
        RAISE WARNING 'Expected 3 settings, found %', settings_count;
    END IF;
END $$;

-- Show current values
SELECT setting_key, setting_value, display_name
FROM system_settings
WHERE subcategory = 'Leaderboard'
ORDER BY sort_order;

EOF

echo ""
echo "Migration complete!"
echo ""
echo "Leaderboard scoring formula:"
echo "  Overall Score = (satisfaction/5 x W1) + (ticket_resolution/100 x W2) + ((1 - grievance_rate) x W3)"
echo "  Default weights: Satisfaction=40%, Ticket Resolution=25%, Grievance=35%"
echo ""
