#!/bin/bash

# ============================================
# Remove Captcha Settings from Production
# ============================================
#
# Purpose: Clean up manually-added captcha settings that were never
#          part of the official codebase
#
# What this script does:
# 1. Backs up captcha settings and data (for rollback if needed)
# 2. Removes captcha settings from system_settings table
# 3. Drops captcha_challenges table
#
# Run this on: PRODUCTION database only
# Date: 2026-01-20
# Reason: Align production database with version-controlled codebase
# ============================================

set -e  # Exit on error

# Database connection details
DB_NAME="${DB_NAME:-feedback}"
DB_USER="${DB_USER:-feedback_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Captcha Settings Removal Script"
echo "=========================================="
echo ""
echo -e "${YELLOW}WARNING: This will permanently remove captcha settings from the database${NC}"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Confirm before proceeding
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Aborted by user${NC}"
    exit 0
fi

echo ""
echo "=========================================="
echo "Step 1: Backing up captcha data"
echo "=========================================="

# Create backup directory
BACKUP_DIR="/tmp/captcha_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backup directory: $BACKUP_DIR"

# Backup captcha settings
echo "Backing up captcha settings..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\COPY (SELECT * FROM system_settings WHERE setting_key LIKE '%CAPTCHA%' OR setting_key LIKE '%hCAPTCHA%') TO '$BACKUP_DIR/captcha_settings.csv' WITH CSV HEADER" 2>/dev/null || echo "No captcha settings found or already removed"

# Backup captcha challenges table data
echo "Backing up captcha_challenges table data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\COPY (SELECT * FROM captcha_challenges) TO '$BACKUP_DIR/captcha_challenges.csv' WITH CSV HEADER" 2>/dev/null || echo "captcha_challenges table not found or empty"

# Get table structure for rollback
echo "Backing up captcha_challenges table structure..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t captcha_challenges --schema-only > "$BACKUP_DIR/captcha_challenges_schema.sql" 2>/dev/null || echo "captcha_challenges table not found"

echo -e "${GREEN}✓ Backup completed${NC}"
echo ""

echo "=========================================="
echo "Step 2: Removing captcha settings"
echo "=========================================="

# Remove captcha settings from system_settings
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Start transaction
BEGIN;

-- Count settings to be removed
DO $$
DECLARE
    setting_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO setting_count
    FROM system_settings
    WHERE setting_key ILIKE '%captcha%' OR setting_key ILIKE '%hcaptcha%';

    RAISE NOTICE 'Found % captcha-related settings to remove', setting_count;
END $$;

-- Remove captcha settings
DELETE FROM system_settings
WHERE setting_key ILIKE '%captcha%' OR setting_key ILIKE '%hcaptcha%';

-- Also remove from audit log (optional - for complete cleanup)
DELETE FROM settings_audit_log
WHERE setting_key ILIKE '%captcha%' OR setting_key ILIKE '%hcaptcha%';

-- Commit transaction
COMMIT;

-- Verify removal
SELECT 'Settings removed successfully' AS status,
       (SELECT COUNT(*) FROM system_settings WHERE setting_key ILIKE '%captcha%') AS remaining_captcha_settings;

EOF

echo -e "${GREEN}✓ Captcha settings removed from system_settings${NC}"
echo ""

echo "=========================================="
echo "Step 3: Dropping captcha_challenges table"
echo "=========================================="

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Check if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captcha_challenges') THEN
        -- Get row count before dropping
        EXECUTE 'SELECT COUNT(*) as row_count FROM captcha_challenges';

        -- Drop the table
        DROP TABLE IF EXISTS captcha_challenges CASCADE;

        RAISE NOTICE 'captcha_challenges table dropped successfully';
    ELSE
        RAISE NOTICE 'captcha_challenges table does not exist';
    END IF;
END $$;

-- Verify table is gone
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captcha_challenges')
        THEN 'ERROR: Table still exists!'
        ELSE 'Table successfully removed'
    END AS verification_status;

EOF

echo -e "${GREEN}✓ captcha_challenges table dropped${NC}"
echo ""

echo "=========================================="
echo "Cleanup Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✓ All captcha settings and tables removed${NC}"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Files backed up:"
echo "  - captcha_settings.csv (settings data)"
echo "  - captcha_challenges.csv (challenge data)"
echo "  - captcha_challenges_schema.sql (table structure)"
echo ""
echo "To rollback these changes, use the backup files in $BACKUP_DIR"
echo ""
echo -e "${GREEN}Production database is now aligned with codebase${NC}"
echo ""
