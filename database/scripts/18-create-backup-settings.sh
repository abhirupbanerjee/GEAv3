#!/bin/bash
# ============================================================================
# GEA Portal - Backup & Restore Settings Migration
# ============================================================================
# Creates tables for backup audit logging and backup schedule settings
# Run: ./database/scripts/18-create-backup-settings.sh
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
echo "  Backup & Restore Settings Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- BACKUP AUDIT LOG TABLE
-- ============================================================================
-- Tracks all backup/restore operations for audit trail

CREATE TABLE IF NOT EXISTS backup_audit_log (
    audit_id SERIAL PRIMARY KEY,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'download', 'restore', 'delete', 'scheduled')),
    filename VARCHAR(255) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    safety_backup_filename VARCHAR(255),
    tables_restored INTEGER,
    rows_restored INTEGER,
    file_size BIGINT,
    duration_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'in_progress')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for backup_audit_log
CREATE INDEX IF NOT EXISTS idx_backup_audit_action ON backup_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_backup_audit_date ON backup_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_audit_user ON backup_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_backup_audit_status ON backup_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_backup_audit_filename ON backup_audit_log(filename);

-- ============================================================================
-- SEED BACKUP SETTINGS (add to system_settings if not exists)
-- ============================================================================

-- Category: DATABASE - Schedule Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('BACKUP_SCHEDULE_ENABLED', 'false', 'boolean', 'DATABASE', 'Schedule', 'Enable Scheduled Backups', 'Automatically create backups on schedule', 'false', true, 1),
    ('BACKUP_SCHEDULE_TYPE', 'daily', 'select', 'DATABASE', 'Schedule', 'Backup Schedule Type', 'How often to create automatic backups', 'daily', true, 2),
    ('BACKUP_SCHEDULE_TIME', '02:00', 'string', 'DATABASE', 'Schedule', 'Backup Time', 'Time to run scheduled backup (24-hour format HH:MM)', '02:00', true, 3),
    ('BACKUP_SCHEDULE_DAY', '0', 'number', 'DATABASE', 'Schedule', 'Backup Day', 'Day of week (0-6, Sun-Sat) for weekly, or day of month (1-31) for monthly', '0', true, 4)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'BACKUP_SCHEDULE_ENABLED');

-- Add options for BACKUP_SCHEDULE_TYPE
UPDATE system_settings
SET options = '{"values": [{"value": "daily", "label": "Daily"}, {"value": "weekly", "label": "Weekly"}, {"value": "monthly", "label": "Monthly"}]}'::jsonb
WHERE setting_key = 'BACKUP_SCHEDULE_TYPE' AND options IS NULL;

-- Category: DATABASE - Retention Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('BACKUP_RETENTION_DAYS', '30', 'number', 'DATABASE', 'Retention', 'Retention Period (days)', 'Auto-delete backups older than this many days', '30', 1, 365, true, 10),
    ('BACKUP_RETENTION_COUNT', '10', 'number', 'DATABASE', 'Retention', 'Minimum Backup Count', 'Always keep at least this many recent backups', '10', 1, 100, true, 11),
    ('BACKUP_RETENTION_ENABLED', 'true', 'boolean', 'DATABASE', 'Retention', 'Enable Auto-Cleanup', 'Automatically delete old backups based on retention policy', 'true', NULL, NULL, true, 12)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'BACKUP_RETENTION_DAYS');

-- Category: DATABASE - Configuration (read-only display)
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('BACKUP_DIRECTORY', '/tmp/gea_backups', 'string', 'DATABASE', 'Configuration', 'Backup Directory', 'Server directory where backups are stored (read-only)', '/tmp/gea_backups', false, 20),
    ('BACKUP_DATABASE_NAME', 'feedback', 'string', 'DATABASE', 'Configuration', 'Database Name', 'PostgreSQL database name (read-only)', 'feedback', false, 21),
    ('BACKUP_POSTGRES_VERSION', '16', 'string', 'DATABASE', 'Configuration', 'PostgreSQL Version', 'Current PostgreSQL major version (read-only)', '16', false, 22)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'BACKUP_DIRECTORY');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'backup_audit_log table' AS table_name, COUNT(*) AS row_count FROM backup_audit_log
UNION ALL
SELECT 'DATABASE settings' AS table_name, COUNT(*) AS row_count FROM system_settings WHERE category = 'DATABASE';

EOF

echo ""
echo "=============================================="
echo "  Migration Complete!"
echo "=============================================="
echo ""
echo "Tables created:"
echo "  - backup_audit_log"
echo ""
echo "Settings added to system_settings:"
echo "  - BACKUP_SCHEDULE_ENABLED"
echo "  - BACKUP_SCHEDULE_TYPE"
echo "  - BACKUP_SCHEDULE_TIME"
echo "  - BACKUP_SCHEDULE_DAY"
echo "  - BACKUP_RETENTION_DAYS"
echo "  - BACKUP_RETENTION_COUNT"
echo "  - BACKUP_RETENTION_ENABLED"
echo "  - BACKUP_DIRECTORY"
echo "  - BACKUP_DATABASE_NAME"
echo "  - BACKUP_POSTGRES_VERSION"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c \"SELECT setting_key, setting_value FROM system_settings WHERE category = 'DATABASE';\""
echo ""
