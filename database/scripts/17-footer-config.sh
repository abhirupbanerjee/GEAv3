#!/bin/bash
# ============================================================================
# GEA Portal - Footer Configuration Settings
# ============================================================================
# Adds 11 new settings to allow full footer configuration through admin UI
# Run: ./database/scripts/17-footer-config.sh
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

echo "=============================================="
echo "  Footer Configuration Settings Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- FOOTER CONFIGURATION SETTINGS
-- ============================================================================

-- Category: CONTENT - Footer Configuration
-- Add 11 new settings for complete footer customization

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('FOOTER_GOVERNMENT_TEXT', '', 'string', 'CONTENT', 'Footer Configuration', 'Government Section Text', 'Text displayed below Government of Grenada header in footer', '', true, 1),
    ('QUICK_LINK_1_LABEL', 'GoG', 'string', 'CONTENT', 'Footer Configuration', 'Quick Link 1 Label', 'Label for first quick link (URL configured separately)', 'GoG', true, 2),
    ('QUICK_LINK_2_LABEL', 'eServices', 'string', 'CONTENT', 'Footer Configuration', 'Quick Link 2 Label', 'Label for second quick link (URL configured separately)', 'eServices', true, 3),
    ('QUICK_LINK_3_LABEL', 'Constitution', 'string', 'CONTENT', 'Footer Configuration', 'Quick Link 3 Label', 'Label for third quick link (URL configured separately)', 'Constitution', true, 4),
    ('GENERAL_INFO_1_LABEL', 'About Grenada', 'string', 'CONTENT', 'Footer Configuration', 'General Info 1 Label', 'Label for first general information link', 'About Grenada', true, 8),
    ('GENERAL_INFO_1_URL', 'https://www.gov.gd/grenada', 'url', 'CONTENT', 'Footer Configuration', 'General Info 1 URL', 'URL for first general information link', 'https://www.gov.gd/grenada', true, 9),
    ('GENERAL_INFO_2_LABEL', 'Facts', 'string', 'CONTENT', 'Footer Configuration', 'General Info 2 Label', 'Label for second general information link', 'Facts', true, 10),
    ('GENERAL_INFO_2_URL', 'https://www.gov.gd/', 'url', 'CONTENT', 'Footer Configuration', 'General Info 2 URL', 'URL for second general information link', 'https://www.gov.gd/', true, 11),
    ('GENERAL_INFO_3_LABEL', 'Emergency Info', 'string', 'CONTENT', 'Footer Configuration', 'General Info 3 Label', 'Label for third general information link', 'Emergency Info', true, 12),
    ('GENERAL_INFO_3_URL', '#', 'url', 'CONTENT', 'Footer Configuration', 'General Info 3 URL', 'URL for third general information link', '#', true, 13),
    ('FOOTER_COPYRIGHT_TEXT', '© 2026 Digital Transformation Agency (DTA) All rights reserved.', 'string', 'CONTENT', 'Footer Configuration', 'Copyright Text', 'Footer copyright text displayed at bottom of page', '© 2026 Digital Transformation Agency (DTA) All rights reserved.', true, 14)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = v.setting_key);

-- Update existing Quick Link URL settings to group with new settings
-- Move them to Footer Configuration subcategory with appropriate sort_order
UPDATE system_settings
SET
    subcategory = 'Footer Configuration',
    sort_order = CASE setting_key
        WHEN 'GOG_URL' THEN 5
        WHEN 'ESERVICES_URL' THEN 6
        WHEN 'CONSTITUTION_URL' THEN 7
    END,
    display_name = CASE setting_key
        WHEN 'GOG_URL' THEN 'Quick Link 1 URL'
        WHEN 'ESERVICES_URL' THEN 'Quick Link 2 URL'
        WHEN 'CONSTITUTION_URL' THEN 'Quick Link 3 URL'
    END,
    description = CASE setting_key
        WHEN 'GOG_URL' THEN 'URL for first quick link (GoG)'
        WHEN 'ESERVICES_URL' THEN 'URL for second quick link (eServices)'
        WHEN 'CONSTITUTION_URL' THEN 'URL for third quick link (Constitution)'
    END
WHERE setting_key IN ('GOG_URL', 'ESERVICES_URL', 'CONSTITUTION_URL');

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Footer configuration settings added successfully"
    echo "  - Added 11 new settings to CONTENT > Footer Configuration"
    echo "  - Updated 3 existing URL settings to group with new settings"
    echo "  - All settings are runtime (no restart required)"
    echo ""
else
    echo "✗ Failed to add footer configuration settings"
    exit 1
fi

echo "=============================================="
echo "  Migration Complete"
echo "=============================================="
