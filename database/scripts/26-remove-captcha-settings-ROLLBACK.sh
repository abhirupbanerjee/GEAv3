#!/bin/bash

# ============================================
# Rollback Script: Restore Captcha Settings
# ============================================
#
# Purpose: Restore captcha settings if removal was done in error
#
# Usage: ./26-remove-captcha-settings-ROLLBACK.sh <backup_directory>
#
# Example: ./26-remove-captcha-settings-ROLLBACK.sh /tmp/captcha_backup_20260120_143000
# ============================================

set -e  # Exit on error

# Check if backup directory is provided
if [ -z "$1" ]; then
    echo "Error: Backup directory not specified"
    echo ""
    echo "Usage: $0 <backup_directory>"
    echo "Example: $0 /tmp/captcha_backup_20260120_143000"
    exit 1
fi

BACKUP_DIR="$1"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory does not exist: $BACKUP_DIR"
    exit 1
fi

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
echo "Captcha Settings Rollback Script"
echo "=========================================="
echo ""
echo "Backup directory: $BACKUP_DIR"
echo "Database: $DB_NAME"
echo ""

# Confirm before proceeding
read -p "Are you sure you want to restore captcha settings? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Aborted by user${NC}"
    exit 0
fi

echo ""
echo "=========================================="
echo "Step 1: Restoring captcha_challenges table"
echo "=========================================="

# Restore table structure
if [ -f "$BACKUP_DIR/captcha_challenges_schema.sql" ]; then
    echo "Restoring table structure..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_DIR/captcha_challenges_schema.sql"
    echo -e "${GREEN}✓ Table structure restored${NC}"
else
    echo -e "${RED}✗ Schema backup file not found${NC}"
fi

# Restore table data
if [ -f "$BACKUP_DIR/captcha_challenges.csv" ]; then
    echo "Restoring table data..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\COPY captcha_challenges FROM '$BACKUP_DIR/captcha_challenges.csv' WITH CSV HEADER"
    echo -e "${GREEN}✓ Table data restored${NC}"
else
    echo "No table data to restore (file not found or table was empty)"
fi

echo ""
echo "=========================================="
echo "Step 2: Restoring captcha settings"
echo "=========================================="

if [ -f "$BACKUP_DIR/captcha_settings.csv" ]; then
    echo "Restoring settings..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\COPY system_settings FROM '$BACKUP_DIR/captcha_settings.csv' WITH CSV HEADER"
    echo -e "${GREEN}✓ Settings restored${NC}"
else
    echo -e "${RED}✗ Settings backup file not found${NC}"
fi

echo ""
echo "=========================================="
echo "Rollback Complete"
echo "=========================================="
echo ""
echo -e "${GREEN}✓ Captcha settings and table have been restored${NC}"
echo ""
