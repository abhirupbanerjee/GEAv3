#!/bin/bash
set -e

echo "=================================================="
echo "Migration: Remove unused COPYRIGHT_YEAR setting"
echo "=================================================="

# Connect to database and remove the setting
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Remove COPYRIGHT_YEAR setting from system_settings
    DELETE FROM system_settings WHERE setting_key = 'COPYRIGHT_YEAR';

    -- Log the removal in audit log (if the setting existed)
    INSERT INTO settings_audit_log (
        setting_key,
        old_value,
        new_value,
        changed_by,
        changed_at,
        change_reason
    )
    SELECT
        'COPYRIGHT_YEAR',
        setting_value,
        NULL,
        'system_migration',
        CURRENT_TIMESTAMP,
        'Removed unused setting - COPYRIGHT_YEAR is not used in the application. Footer uses FOOTER_COPYRIGHT_TEXT instead.'
    FROM system_settings
    WHERE setting_key = 'COPYRIGHT_YEAR'
    ON CONFLICT DO NOTHING;

    COMMIT;
EOSQL

echo "✓ COPYRIGHT_YEAR setting removed successfully"
echo "✓ Audit log entry created"
echo "=================================================="
