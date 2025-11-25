#!/bin/bash

# ============================================================================
# GEA PORTAL - LOAD MASTER DATA v2.1
# ============================================================================
# Version: 2.1
# Purpose: Load cleaned master data from CSV files
# Date: November 25, 2025
#
# WHAT THIS SCRIPT DOES:
# ✓ Loads entity_master (66 government entities)
# ✓ Loads service_master (167 government services)
# ✓ Loads service_attachments (177 document requirements)
# ✓ Auto-detects and clears default sample data
# ✓ Auto-migrates schema if contact columns missing (NEW in v2.1)
# ✓ Validates foreign key relationships
# ✓ Verifies data integrity after load
#
# CHANGES IN v2.1:
# - Added automatic schema migration for contact_email and contact_phone columns
# - Fixes Azure VM schema mismatch issue transparently
# - No user interaction needed for schema updates
#
# USAGE:
#   ./database/scripts/11-load-master-data.sh            # Interactive (prompts if data exists)
#   ./database/scripts/11-load-master-data.sh --clear    # Auto-clear existing data
#   ./database/scripts/11-load-master-data.sh --skip     # Skip if data exists
#
# ============================================================================

set -e

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ROOT="$(dirname "$SCRIPT_DIR")"
source "$DB_ROOT/config.sh"
source "$LIB_DIR/csv-loader.sh"

# Parse command line arguments
CLEAR_FLAG=false
SKIP_FLAG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clear)
            CLEAR_FLAG=true
            shift
            ;;
        --skip)
            SKIP_FLAG=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--clear|--skip]"
            exit 1
            ;;
    esac
done

echo ""
log_section "GEA PORTAL - LOAD MASTER DATA v2.1"
echo "  Loading: Entities, Services, Service Attachments"
echo ""

# ============================================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================================
echo "▶ Step 1: Verifying prerequisites..."

check_container
check_db_connection
log_success "Database connection successful"

# Check if cleaned data files exist
if [ ! -f "$MASTER_DATA_DIR/entity-master.txt" ]; then
    log_error "Missing file: $MASTER_DATA_DIR/entity-master.txt"
    exit 1
fi
if [ ! -f "$MASTER_DATA_DIR/service-master.txt" ]; then
    log_error "Missing file: $MASTER_DATA_DIR/service-master.txt"
    exit 1
fi
if [ ! -f "$MASTER_DATA_DIR/service-attachments.txt" ]; then
    log_error "Missing file: $MASTER_DATA_DIR/service-attachments.txt"
    exit 1
fi
log_success "All cleaned data files found"

# Check SQL templates
if [ ! -f "$SQL_DIR/load-entities.sql" ]; then
    log_error "Missing SQL template: $SQL_DIR/load-entities.sql"
    exit 1
fi
if [ ! -f "$SQL_DIR/load-services.sql" ]; then
    log_error "Missing SQL template: $SQL_DIR/load-services.sql"
    exit 1
fi
if [ ! -f "$SQL_DIR/load-attachments.sql" ]; then
    log_error "Missing SQL template: $SQL_DIR/load-attachments.sql"
    exit 1
fi
log_success "All SQL templates found"
echo ""

# ============================================================================
# STEP 2: HANDLE EXISTING DATA
# ============================================================================
echo "▶ Step 2: Checking existing data..."

ENTITY_COUNT=$(get_row_count "entity_master")
SERVICE_COUNT=$(get_row_count "service_master")

# Handle based on flags and data state
if [ "$ENTITY_COUNT" -gt 0 ] || [ "$SERVICE_COUNT" -gt 0 ]; then
    log_info "Found existing data: $ENTITY_COUNT entities, $SERVICE_COUNT services"

    # Auto-clear if default sample data detected
    if [ "$ENTITY_COUNT" = "$DEFAULT_ENTITY_COUNT" ] && [ "$SERVICE_COUNT" = "$DEFAULT_SERVICE_COUNT" ]; then
        log_info "Detected default sample data - auto-clearing..."
        clear_master_data
    elif [ "$CLEAR_FLAG" = true ]; then
        log_info "Clear flag specified - clearing existing data..."
        clear_master_data
    elif [ "$SKIP_FLAG" = true ]; then
        log_warn "Skip flag specified - keeping existing data"
        log_info "Data load skipped. Current counts: $ENTITY_COUNT entities, $SERVICE_COUNT services"
        exit 0
    else
        log_warn "Master tables contain data ($ENTITY_COUNT entities, $SERVICE_COUNT services)"
        read -p "  Clear existing data before loading? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            clear_master_data
        else
            log_info "Keeping existing data. Using ON CONFLICT DO NOTHING for duplicates."
        fi
    fi
else
    log_success "Master tables are empty - ready to load"
fi
echo ""

# ============================================================================
# STEP 2.5: VERIFY ENTITY_MASTER SCHEMA (AUTO-MIGRATION)
# ============================================================================
echo "▶ Step 2.5: Verifying entity_master schema..."

# Check if contact_email and contact_phone columns exist
CONTACT_EMAIL_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name='entity_master' AND column_name='contact_email';" 2>/dev/null | tr -d ' ')

CONTACT_PHONE_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name='entity_master' AND column_name='contact_phone';" 2>/dev/null | tr -d ' ')

# Auto-migrate if columns are missing
if [ "$CONTACT_EMAIL_EXISTS" = "0" ] || [ "$CONTACT_PHONE_EXISTS" = "0" ]; then
    log_warn "Schema migration required: Adding contact columns to entity_master"

    if [ "$CONTACT_EMAIL_EXISTS" = "0" ]; then
        if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "ALTER TABLE entity_master ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);" > /dev/null 2>&1; then
            log_success "Added contact_email column"
        else
            log_error "Failed to add contact_email column"
            exit 1
        fi
    fi

    if [ "$CONTACT_PHONE_EXISTS" = "0" ]; then
        if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "ALTER TABLE entity_master ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);" > /dev/null 2>&1; then
            log_success "Added contact_phone column"
        else
            log_error "Failed to add contact_phone column"
            exit 1
        fi
    fi

    log_success "Schema migration completed successfully"
else
    log_success "Schema is up to date (contact columns present)"
fi
echo ""

# ============================================================================
# STEP 3: LOAD ENTITY MASTER
# ============================================================================
echo "▶ Step 3: Loading entity_master..."

if ! load_entity_master; then
    log_error "Failed to load entity master"
    exit 1
fi
echo ""

# ============================================================================
# STEP 4: LOAD SERVICE MASTER
# ============================================================================
echo "▶ Step 4: Loading service_master..."

if ! load_service_master; then
    log_error "Failed to load service master"
    exit 1
fi
echo ""

# ============================================================================
# STEP 5: LOAD SERVICE ATTACHMENTS
# ============================================================================
echo "▶ Step 5: Loading service_attachments..."

if ! load_service_attachments; then
    log_error "Failed to load service attachments"
    exit 1
fi
echo ""

# ============================================================================
# STEP 6: VALIDATE DATA INTEGRITY
# ============================================================================
echo "▶ Step 6: Validating data integrity..."

if ! validate_foreign_keys; then
    log_error "Foreign key validation failed"
    exit 1
fi
echo ""

# ============================================================================
# STEP 7: DISPLAY SUMMARY
# ============================================================================
log_section "DATA LOAD SUMMARY"

run_sql << 'EOF'
SELECT
    'Record counts' AS section,
    (SELECT COUNT(*) FROM entity_master) AS entities,
    (SELECT COUNT(*) FROM service_master) AS services,
    (SELECT COUNT(*) FROM service_attachments) AS attachments;

SELECT
    'Entities by type' AS section,
    entity_type,
    COUNT(*) AS count
FROM entity_master
GROUP BY entity_type
ORDER BY entity_type;

SELECT
    'Services by category (top 10)' AS section,
    service_category,
    COUNT(*) AS count
FROM service_master
GROUP BY service_category
ORDER BY COUNT(*) DESC
LIMIT 10;

SELECT
    'Service attachment requirements' AS section,
    COUNT(DISTINCT service_id) AS services_with_attachments,
    COUNT(*) AS total_attachment_requirements
FROM service_attachments;

SELECT
    'Services without attachments' AS section,
    COUNT(*) AS count
FROM service_master s
WHERE NOT EXISTS (
    SELECT 1 FROM service_attachments sa WHERE sa.service_id = s.service_id
);
EOF

echo ""
log_section "✓ MASTER DATA LOAD COMPLETE"

echo "📊 Summary:"
echo "  ✓ Entity master loaded and validated"
echo "  ✓ Service master loaded and validated"
echo "  ✓ Service attachments loaded and validated"
echo "  ✓ Foreign key integrity verified"
echo "  ✓ No orphaned records detected"
echo ""
echo "🎯 Next Step:"
echo "  Run: $SCRIPTS_DIR/12-generate-synthetic-data.sh"
echo ""
