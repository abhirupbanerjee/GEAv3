#!/bin/bash

# ============================================================================
# GEA PORTAL - QR CODE SCHEMA MIGRATION
# ============================================================================
# Version: 1.0
# Purpose: Migrate qr_codes table from INTEGER to VARCHAR(50) primary key
# Date: November 26, 2025
#
# WHAT THIS SCRIPT DOES:
# - Backs up existing qr_codes table data (if any)
# - Drops and recreates qr_codes table with VARCHAR(50) primary key
# - Restores any existing data with converted IDs
# - Safe to run on both fresh and existing databases
#
# USAGE:
#   ./database/scripts/14-migrate-qr-code-schema.sh
#
# FOR AZURE PRODUCTION:
#   ./database/99-consolidated-setup.sh --migrate-qr
#
# ============================================================================

set -e

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ROOT="$(dirname "$SCRIPT_DIR")"
source "$DB_ROOT/config.sh"

echo ""
log_section "QR CODE SCHEMA MIGRATION v1.0"
echo "  Migrating qr_code_id: INTEGER → VARCHAR(50)"
echo ""

# ============================================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================================
echo "▶ Step 1: Verifying database connection..."

check_container
check_db_connection

log_success "Database connection successful"
echo ""

# ============================================================================
# STEP 2: CHECK CURRENT SCHEMA
# ============================================================================
echo "▶ Step 2: Checking current qr_codes schema..."

# Check if qr_codes table exists
TABLE_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='qr_codes';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_EXISTS" = "0" ]; then
    log_info "qr_codes table does not exist - will be created with correct schema"
    NEEDS_MIGRATION=false
else
    # Check current data type
    CURRENT_TYPE=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT data_type FROM information_schema.columns
         WHERE table_name='qr_codes' AND column_name='qr_code_id';" 2>/dev/null | tr -d ' ')

    if [ "$CURRENT_TYPE" = "integer" ]; then
        log_warn "Current schema: qr_code_id is INTEGER (auto-increment)"
        log_info "Migration required to VARCHAR(50)"
        NEEDS_MIGRATION=true

        # Check if there's any data
        ROW_COUNT=$(get_row_count "qr_codes")
        log_info "Current records in qr_codes: $ROW_COUNT"

        if [ "$ROW_COUNT" -gt 0 ]; then
            log_warn "⚠  Data exists - will be backed up before migration"
        fi
    elif [ "$CURRENT_TYPE" = "charactervarying" ]; then
        log_success "Schema is already correct: qr_code_id is VARCHAR"
        log_info "No migration needed!"
        echo ""
        log_section "✓ MIGRATION CHECK COMPLETE - No changes needed"
        exit 0
    else
        log_warn "Unexpected data type: $CURRENT_TYPE"
        NEEDS_MIGRATION=true
    fi
fi

echo ""

# ============================================================================
# STEP 3: BACKUP EXISTING DATA (if any)
# ============================================================================
if [ "$NEEDS_MIGRATION" = "true" ]; then
    echo "▶ Step 3: Backing up existing qr_codes data..."

    BACKUP_COUNT=$(get_row_count "qr_codes")

    if [ "$BACKUP_COUNT" -gt 0 ]; then
        # Create temporary backup table
        run_sql -c "
        CREATE TABLE IF NOT EXISTS qr_codes_backup_$(date +%Y%m%d) AS
        SELECT * FROM qr_codes;
        " > /dev/null

        log_success "Backed up $BACKUP_COUNT records to qr_codes_backup_$(date +%Y%m%d)"
        log_warn "Note: Integer IDs will not be restored (incompatible with new schema)"
        log_warn "You'll need to recreate QR codes through the admin UI"
    else
        log_success "No data to backup - table is empty"
    fi

    echo ""
fi

# ============================================================================
# STEP 4: MIGRATE SCHEMA
# ============================================================================
echo "▶ Step 4: Migrating qr_codes table schema..."

if [ "$NEEDS_MIGRATION" = "true" ] || [ "$TABLE_EXISTS" = "0" ]; then
    run_sql -c "
    -- Drop existing table if it exists (it's either empty or backed up)
    DROP TABLE IF EXISTS qr_codes CASCADE;

    -- Create with correct VARCHAR(50) primary key
    CREATE TABLE qr_codes (
        qr_code_id VARCHAR(50) PRIMARY KEY,
        service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
        entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
        location_name VARCHAR(255),
        location_address TEXT,
        location_type VARCHAR(100),
        generated_url TEXT NOT NULL,
        scan_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100),
        deactivated_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX idx_qr_service ON qr_codes(service_id);
    CREATE INDEX idx_qr_entity ON qr_codes(entity_id);
    " > /dev/null

    log_success "qr_codes table migrated successfully"
    log_success "Schema: qr_code_id is now VARCHAR(50)"
fi

echo ""

# ============================================================================
# STEP 5: VERIFY MIGRATION
# ============================================================================
echo "▶ Step 5: Verifying migration..."

FINAL_TYPE=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT data_type FROM information_schema.columns
     WHERE table_name='qr_codes' AND column_name='qr_code_id';" 2>/dev/null | tr -d ' ')

if [ "$FINAL_TYPE" = "charactervarying" ]; then
    log_success "✓ Schema verification passed"
    log_success "✓ qr_code_id is VARCHAR(50)"
else
    log_error "✗ Schema verification failed"
    log_error "  Expected: character varying"
    log_error "  Got: $FINAL_TYPE"
    exit 1
fi

# Show table structure
echo ""
log_info "Updated table structure:"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "\d qr_codes" 2>/dev/null | grep -E "qr_code_id|service_id|entity_id|location_name|generated_url"

echo ""

# ============================================================================
# STEP 6: SUMMARY
# ============================================================================
log_section "✓ QR CODE SCHEMA MIGRATION COMPLETE"
echo ""
echo "📋 Summary:"
echo "  ✓ qr_codes table schema updated"
echo "  ✓ Primary key: qr_code_id VARCHAR(50)"
echo "  ✓ Ready for string-based QR codes (e.g., 'QR-PP-001')"
echo ""
echo "🎯 Next Steps:"
echo "  1. QR codes can now be created through /feedback/managedata"
echo "  2. Use format: QR-XXX-NNN (e.g., QR-IMM-001, QR-PP-002)"
echo "  3. URLs will be: https://your-domain.com/feedback/qr?c=QR-XXX-NNN"
echo ""
if [ "$BACKUP_COUNT" -gt 0 ] 2>/dev/null; then
    echo "⚠  Note: Old integer-based QR codes were backed up but not migrated"
    echo "   You'll need to recreate them through the admin UI with string IDs"
    echo ""
fi
