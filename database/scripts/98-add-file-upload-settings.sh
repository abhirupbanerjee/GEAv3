#!/bin/bash
set -e

echo "Adding missing file upload settings to system_settings table..."

psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    -- Add MAX_TOTAL_UPLOAD_SIZE setting
    INSERT INTO system_settings
    (setting_key, setting_value, setting_type, category, subcategory,
     display_name, description, default_value, min_value, max_value,
     is_runtime, is_sensitive, sort_order, is_active)
    VALUES
    ('MAX_TOTAL_UPLOAD_SIZE', '5242880', 'number', 'BUSINESS_RULES', 'File Upload',
     'Max Total Upload Size (bytes)', 'Maximum total size for all files in one upload (5MB default)',
     '5242880', 1048576, 52428800, true, false, 31, true)
    ON CONFLICT (setting_key) DO NOTHING;

    -- Add ALLOWED_FILE_TYPES setting
    INSERT INTO system_settings
    (setting_key, setting_value, setting_type, category, subcategory,
     display_name, description, default_value, is_runtime, is_sensitive, sort_order, is_active)
    VALUES
    ('ALLOWED_FILE_TYPES', 'pdf,jpg,jpeg,png,doc,docx,xlsx,xls', 'string', 'BUSINESS_RULES', 'File Upload',
     'Allowed File Types', 'Comma-separated list of allowed file extensions',
     'pdf,jpg,jpeg,png,doc,docx,xlsx,xls', true, false, 32, true)
    ON CONFLICT (setting_key) DO NOTHING;

    -- Verify settings were added
    SELECT setting_key, setting_value, display_name
    FROM system_settings
    WHERE setting_key IN ('MAX_FILE_SIZE', 'MAX_TOTAL_UPLOAD_SIZE', 'ALLOWED_FILE_TYPES')
    ORDER BY setting_key;
EOSQL

echo "✅ File upload settings migration complete"
