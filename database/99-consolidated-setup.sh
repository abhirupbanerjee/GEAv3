#!/bin/bash

# ============================================================================
# GEA PORTAL - CONSOLIDATED DATABASE SETUP v9.0
# ============================================================================
# Purpose: Single consolidated script for all database setup needs
# Features:
#   - Fresh database setup
#   - Incremental updates with safety checks
#   - Production verification and comparison
#   - Automatic backup before changes
#   - Comprehensive verification
#   - Flexible data loading options
#   - NEW: Master data management (--load-master, --clear-data, --reload)
# Date: November 25, 2025
# ============================================================================

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/lib/csv-loader.sh"

# Flag to track if admin was created during fresh setup
ADMIN_CREATED=false

# ============================================================================
# SCRIPT-SPECIFIC FUNCTIONS
# ============================================================================
# Note: Common helper functions are now in config.sh

# Create backup
create_backup() {
    local mandatory="${1:-false}"  # First argument: is backup mandatory?

    log_info "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/feedback_backup_$(date +%Y%m%d_%H%M%S)_consolidated.sql"

    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>/dev/null; then
        log_success "Backup created: $backup_file ($(du -h "$backup_file" | cut -f1))"
        echo "$backup_file"
        return 0
    else
        if [ "$mandatory" = "true" ]; then
            log_error "Backup creation FAILED! Cannot proceed with destructive operation."
            log_error "Fix the backup issue before running --fresh"
            exit 1
        else
            log_warn "Backup creation had issues, but continuing..."
            echo ""
            return 1
        fi
    fi
}

# Restore from backup
restore_backup() {
    log_section "DATABASE RESTORE"

    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi

    # List available backups (most recent first)
    local backups=($(ls -t "$BACKUP_DIR"/feedback_backup_*.sql 2>/dev/null))

    if [ ${#backups[@]} -eq 0 ]; then
        log_error "No backup files found in $BACKUP_DIR"
        exit 1
    fi

    log_info "Available backups (most recent first):"
    echo ""

    # Display backups with numbers
    local i=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local filesize=$(du -h "$backup" | cut -f1)
        local timestamp=$(echo "$filename" | grep -oP '\d{8}_\d{6}')
        local formatted_date=$(date -d "${timestamp:0:8} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$timestamp")

        printf "  %2d) %s  [%s]  (%s)\n" "$i" "$formatted_date" "$filesize" "$filename"
        i=$((i+1))
    done

    echo ""
    echo -e "${YELLOW}⚠ WARNING: Restoring will OVERWRITE the current database!${NC}"
    echo ""

    # Get user selection
    local selection
    read -p "Select backup number to restore (1-${#backups[@]}) or 'q' to quit: " selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        log_info "Restore cancelled by user"
        exit 0
    fi

    # Validate selection
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#backups[@]} ]; then
        log_error "Invalid selection. Must be between 1 and ${#backups[@]}"
        exit 1
    fi

    # Get selected backup file
    local selected_backup="${backups[$((selection-1))]}"
    local selected_filename=$(basename "$selected_backup")

    echo ""
    log_info "Selected backup: $selected_filename"
    echo ""

    # Final confirmation
    read -p "Are you sure you want to restore this backup? This will OVERWRITE current data! (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled by user"
        exit 0
    fi

    echo ""
    log_info "Creating safety backup of current database before restore..."

    # Create a safety backup before restoring
    local safety_backup="$BACKUP_DIR/feedback_backup_$(date +%Y%m%d_%H%M%S)_pre_restore.sql"
    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$safety_backup" 2>/dev/null; then
        log_success "Safety backup created: $safety_backup"
    else
        log_warn "Could not create safety backup"
        read -p "Continue without safety backup? (yes/no): " continue_anyway
        if [ "$continue_anyway" != "yes" ]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi

    echo ""
    log_info "Restoring database from backup..."

    # Drop existing database and recreate
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
EOF

    # Restore from backup file
    if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$selected_backup" > /dev/null 2>&1; then
        log_success "Database restored successfully!"
        echo ""

        # Show summary of restored data
        log_info "Restored database summary:"
        echo ""
        run_sql -c "SELECT
            (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
            (SELECT count(*) FROM users) as users,
            (SELECT count(*) FROM ea_service_requests) as ea_requests,
            (SELECT count(*) FROM grievance_tickets) as grievances,
            (SELECT count(*) FROM service_feedback) as feedback;"

        echo ""
        log_success "Restore complete!"

        if [ -f "$safety_backup" ]; then
            echo ""
            log_info "Your previous database was backed up to:"
            echo "  $safety_backup"
        fi
    else
        log_error "Failed to restore database!"
        echo ""
        log_info "Attempting to restore from safety backup..."

        if [ -f "$safety_backup" ]; then
            docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
EOF
            docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$safety_backup" > /dev/null 2>&1
            log_success "Restored from safety backup"
        else
            log_error "No safety backup available!"
        fi

        exit 1
    fi
}

# Display usage
show_usage() {
    cat << 'USAGE'
╔═══════════════════════════════════════════════════════════════════╗
║  GEA PORTAL - CONSOLIDATED DATABASE SETUP v9.0                    ║
╚═══════════════════════════════════════════════════════════════════╝

USAGE:
  ./99-consolidated-setup.sh [OPTIONS]

SCHEMA & SETUP OPTIONS:
  --fresh             Complete fresh setup (drops and recreates)
  --update            Incremental update (safe, checks existing)

DATA MANAGEMENT OPTIONS (NEW):
  --reload            Complete data reload (clear → load master → generate → verify)
  --clear-data        Clear all master and transactional data
  --load-master       Load production master data (entities, services, attachments)
  --generate-data     Generate synthetic transactional data for testing

LEGACY DATA OPTIONS:
  --load-basic        Load basic reference data only
  --load-test         Load general test data (50 items)
  --load-dta          Load DTA operational data (recommended)

BACKUP & VERIFICATION:
  --backup            Create backup only
  --restore           Restore from a backup (interactive)
  --verify            Verify current database state
  --compare           Compare with production state

OTHER:
  --create-admin      Create admin user interactively
  --help              Show this help message

COMMON WORKFLOWS:

  🔄 First Time Setup:
  ./99-consolidated-setup.sh --fresh --load-master --generate-data --create-admin

  🔄 Quick Data Reload:
  ./99-consolidated-setup.sh --reload

  🔄 Update Schema Only:
  ./99-consolidated-setup.sh --update

  🔄 Load Fresh Master Data:
  ./99-consolidated-setup.sh --clear-data --load-master

  💾 Backup Before Changes:
  ./99-consolidated-setup.sh --backup

  ✅ Verify Database:
  ./99-consolidated-setup.sh --verify

ENVIRONMENT VARIABLES:
  DB_USER             Database user (default: feedback_user)
  DB_NAME             Database name (default: feedback)
  DB_CONTAINER        Container name (default: feedback_db)
  ADMIN_EMAIL         Admin email for user creation
  ADMIN_NAME          Admin name for user creation

USAGE
}

# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

verify_database() {
    log_section "DATABASE VERIFICATION REPORT"

    run_sql <<'EOF'
\pset border 2
\timing off

\echo '==================================================================='
\echo 'DATABASE OVERVIEW'
\echo '==================================================================='

SELECT
    current_database() as database,
    current_user as user,
    version() as postgres_version,
    pg_size_pretty(pg_database_size(current_database())) as size,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
    (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as indexes;

\echo ''
\echo '==================================================================='
\echo 'TABLE INVENTORY WITH ROW COUNTS'
\echo '==================================================================='

SELECT
    t.tablename,
    (xpath('/row/cnt/text()', query_to_xml(format('SELECT count(*) AS cnt FROM %I', t.tablename), true, true, '')))[1]::text::int AS rows,
    pg_size_pretty(pg_total_relation_size(t.tablename::regclass)) AS size
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY pg_total_relation_size(t.tablename::regclass) DESC;

\echo ''
\echo '==================================================================='
\echo 'DATA SUMMARY BY CATEGORY'
\echo '==================================================================='

SELECT 'Reference Data' as category, 'Entities' as metric, count(*)::text as value FROM entity_master
UNION ALL SELECT 'Reference Data', 'Services', count(*)::text FROM service_master
UNION ALL SELECT 'Reference Data', 'Service Attachments', count(*)::text FROM service_attachments
UNION ALL SELECT 'Auth & Users', 'Total Users', count(*)::text FROM users
UNION ALL SELECT 'Auth & Users', 'User Roles', count(*)::text FROM user_roles
UNION ALL SELECT 'Auth & Users', 'Active Sessions', count(*)::text FROM sessions WHERE expires > now()
UNION ALL SELECT 'Operational', 'EA Service Requests', count(*)::text FROM ea_service_requests
UNION ALL SELECT 'Operational', 'Grievance Tickets', count(*)::text FROM grievance_tickets
UNION ALL SELECT 'Operational', 'Support Tickets', count(*)::text FROM tickets
UNION ALL SELECT 'Operational', 'Service Feedback', count(*)::text FROM service_feedback
ORDER BY category, metric;

\echo ''
\echo '==================================================================='
\echo 'SCHEMA HEALTH CHECKS'
\echo '==================================================================='

SELECT
    'Tables without PKs' as check_name,
    count(*)::text as count,
    CASE WHEN count(*) = 0 THEN 'PASS ✓' ELSE 'WARN ⚠' END as status
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
    ON t.table_name = tc.table_name AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND tc.constraint_name IS NULL

UNION ALL

SELECT
    'Missing Indexes on FKs',
    count(distinct kcu.column_name)::text,
    CASE WHEN count(*) < 5 THEN 'PASS ✓' ELSE 'REVIEW ⚠' END
FROM information_schema.key_column_usage kcu
WHERE kcu.table_schema = 'public' AND kcu.constraint_name LIKE '%fkey%';

\echo ''
\echo 'Verification complete!'
\echo ''
EOF
}

# ============================================================================
# SETUP FUNCTIONS
# ============================================================================

setup_fresh() {
    log_section "FRESH DATABASE SETUP"

    local table_count=$(get_table_count)
    local safety_backup=""

    if [ "$table_count" -gt 0 ]; then
        log_warn "Database has $table_count existing tables"
        read -p "This will DROP and recreate all tables. Continue? (yes/NO): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Aborted by user"
            exit 0
        fi

        # Create mandatory backup before destructive operation
        safety_backup=$(create_backup "true")  # "true" makes backup mandatory

        if [ -z "$safety_backup" ]; then
            log_error "Backup failed. Aborting fresh setup for safety."
            exit 1
        fi

        log_info "Safety backup created successfully"
        echo ""
    fi

    log_info "Running master initialization..."

    # Run fresh setup with error handling
    if "$SCRIPT_DIR/scripts/00-master-init.sh"; then
        log_success "Fresh database setup completed!"
        echo ""

        # ========================================================================
        # LOAD PRODUCTION MASTER DATA
        # ========================================================================
        log_section "LOADING PRODUCTION MASTER DATA"
        log_info "Loading entities, services, and attachments from CSV files..."
        echo ""

        if "$SCRIPTS_DIR/11-load-master-data.sh" --clear; then
            log_success "Production master data loaded successfully!"
            echo ""
        else
            log_error "Failed to load production master data"
            log_warn "You can load it manually later with:"
            echo "  ./database/scripts/11-load-master-data.sh"
            echo ""
        fi

        # ========================================================================
        # CREATE ADMIN USER
        # ========================================================================
        log_section "ADMIN USER SETUP"

        # Check if admin user already exists
        local existing_admin_count=$(run_sql -t -c "SELECT count(*) FROM users u JOIN user_roles r ON u.role_code = r.role_code WHERE r.role_type = 'admin';" 2>/dev/null | tr -d ' ')

        if [ "$existing_admin_count" -gt 0 ]; then
            log_success "Admin user already exists ($existing_admin_count admin(s) found)"
            log_info "Skipping admin creation - use --create-admin to add more admins"
            echo ""
        else
            log_info "At least one admin user is required to log in to the system"
            echo ""

            read -p "Do you want to create an admin user now? (yes/NO): " create_admin_choice
            echo ""

            if [[ $create_admin_choice =~ ^[Yy][Ee][Ss]$ ]]; then
                # Prompt for admin details
                read -p "Enter admin email: " admin_email
                read -p "Enter admin name: " admin_name

                if [ -n "$admin_email" ] && [ -n "$admin_name" ]; then
                    log_info "Creating admin user..."
                    if ADMIN_EMAIL="$admin_email" ADMIN_NAME="$admin_name" "$SCRIPTS_DIR/05-add-initial-admin.sh"; then
                        log_success "Admin user created successfully!"
                        log_info "Email: $admin_email"
                        echo ""
                        # Set flag to skip later admin creation
                        ADMIN_CREATED=true
                    else
                        log_error "Failed to create admin user"
                        log_warn "You can create it manually later with:"
                        echo "  ADMIN_EMAIL=\"your@email.com\" ADMIN_NAME=\"Your Name\" ./database/scripts/05-add-initial-admin.sh"
                        echo ""
                    fi
                else
                    log_warn "Admin email or name is empty. Skipping admin creation."
                    echo ""
                fi
            else
                log_info "Skipping admin user creation"
                log_warn "You can create an admin user later with:"
                echo "  ADMIN_EMAIL=\"your@email.com\" ADMIN_NAME=\"Your Name\" ./database/scripts/05-add-initial-admin.sh"
                echo ""
            fi
        fi

    else
        log_error "Fresh database setup FAILED!"

        # If we have a safety backup, offer to restore
        if [ -n "$safety_backup" ] && [ -f "$safety_backup" ]; then
            echo ""
            log_warn "A safety backup was created before the operation"
            read -p "Do you want to restore from safety backup? (yes/no): " restore_choice

            if [ "$restore_choice" = "yes" ]; then
                log_info "Restoring from safety backup: $(basename "$safety_backup")"

                # Drop and recreate database
                docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
EOF

                # Restore from safety backup
                if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$safety_backup" > /dev/null 2>&1; then
                    log_success "Database restored from safety backup"
                    log_info "Your database is back to the state before fresh setup was attempted"
                else
                    log_error "Failed to restore from safety backup!"
                    log_error "Backup file location: $safety_backup"
                fi
            else
                log_info "Database left in current state"
                log_info "To restore manually, run:"
                echo "  ./database/99-consolidated-setup.sh --restore"
                echo "  Then select: $(basename "$safety_backup")"
            fi
        fi

        exit 1
    fi
}

setup_incremental() {
    log_section "INCREMENTAL DATABASE UPDATE"

    local table_count=$(get_table_count)

    if [ "$table_count" -eq 0 ]; then
        log_info "Database is empty, performing fresh setup instead..."
        setup_fresh
        return
    fi

    log_info "Current state: $table_count tables"
    create_backup

    log_info "Running incremental updates..."
    "$SCRIPT_DIR/scripts/00-master-init.sh"

    log_success "Incremental update completed!"
}

load_basic_data() {
    log_section "LOADING BASIC REFERENCE DATA"

    log_info "Basic reference data is loaded by master init script"
    log_info "Checking current data..."

    local entities=$(get_row_count "entity_master")
    local services=$(get_row_count "service_master")
    local attachments=$(get_row_count "service_attachments")

    echo ""
    log_success "Entities: $entities"
    log_success "Services: $services"
    log_success "Service Attachments: $attachments"
    echo ""
}

load_test_data() {
    log_section "LOADING TEST DATA"

    if [ ! -f "$SCRIPT_DIR/scripts/02-load-seed-data.sh" ]; then
        log_error "Test data script not found!"
        exit 1
    fi

    log_info "Loading general test data (50 feedback items, grievances, etc.)..."
    "$SCRIPT_DIR/scripts/02-load-seed-data.sh"

    log_success "Test data loaded!"
}

load_dta_data() {
    log_section "LOADING DTA OPERATIONAL DATA"

    if [ ! -f "$SCRIPT_DIR/scripts/06-load-dta-seed-data.sh" ]; then
        log_error "DTA data script not found!"
        exit 1
    fi

    log_info "Loading DTA operational data (staff users, EA requests, etc.)..."
    "$SCRIPT_DIR/scripts/06-load-dta-seed-data.sh"

    log_success "DTA operational data loaded!"
}

create_admin_user() {
    log_section "CREATING ADMIN USER"

    # Skip if admin was already created during fresh setup
    if [ "$ADMIN_CREATED" = true ]; then
        log_info "Admin user was already created during setup - skipping"
        return 0
    fi

    if [ ! -f "$SCRIPT_DIR/scripts/05-add-initial-admin.sh" ]; then
        log_error "Admin creation script not found!"
        exit 1
    fi

    # Check if admin already exists (unless explicitly adding another)
    local existing_admin_count=$(run_sql -t -c "SELECT count(*) FROM users u JOIN user_roles r ON u.role_code = r.role_code WHERE r.role_type = 'admin';" 2>/dev/null | tr -d ' ')

    if [ "$existing_admin_count" -gt 0 ] && [ -z "$ADMIN_EMAIL" ]; then
        log_info "Admin user already exists ($existing_admin_count admin(s))"
        read -p "Do you still want to add another admin? (yes/NO): " add_another
        if [[ ! $add_another =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Skipping admin creation"
            return 0
        fi
    fi

    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_NAME" ]; then
        log_info "Using environment variables for admin user..."
        ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_NAME="$ADMIN_NAME" "$SCRIPT_DIR/scripts/05-add-initial-admin.sh"
    else
        log_info "Creating admin user interactively..."
        "$SCRIPT_DIR/scripts/05-add-initial-admin.sh"
    fi

    log_success "Admin user created/updated!"
}

# NEW: Clear all data (master + transactional)
do_clear_data() {
    log_section "CLEARING ALL DATA"

    if [ ! -f "$SCRIPT_DIR/scripts/10-clear-all-data.sh" ]; then
        log_error "Clear data script not found!"
        exit 1
    fi

    log_info "Running data clearing script..."
    "$SCRIPT_DIR/scripts/10-clear-all-data.sh" --yes

    log_success "All data cleared!"
}

# NEW: Load master data
do_load_master() {
    log_section "LOADING MASTER DATA"

    if [ ! -f "$SCRIPT_DIR/scripts/11-load-master-data.sh" ]; then
        log_error "Load master data script not found!"
        exit 1
    fi

    log_info "Loading master data (entities, services, attachments)..."
    "$SCRIPT_DIR/scripts/11-load-master-data.sh" --clear

    log_success "Master data loaded!"
}

# NEW: Generate synthetic data
do_generate_data() {
    log_section "GENERATING SYNTHETIC DATA"

    if [ ! -f "$SCRIPT_DIR/scripts/12-generate-synthetic-data.sh" ]; then
        log_error "Generate data script not found!"
        exit 1
    fi

    log_info "Generating synthetic transactional data..."
    "$SCRIPT_DIR/scripts/12-generate-synthetic-data.sh"

    log_success "Synthetic data generated!"
}

# NEW: Complete reload workflow
do_reload() {
    log_section "COMPLETE DATA RELOAD WORKFLOW"

    log_info "This will: clear data → load master → generate synthetic → verify"
    echo ""

    # Step 1: Clear data
    do_clear_data
    echo ""

    # Step 2: Load master data
    do_load_master
    echo ""

    # Step 3: Generate synthetic data
    do_generate_data
    echo ""

    # Step 4: Verify
    if [ -f "$SCRIPT_DIR/scripts/13-verify-master-data.sh" ]; then
        log_info "Running verification..."
        "$SCRIPT_DIR/scripts/13-verify-master-data.sh"
    fi

    log_section "✓ COMPLETE RELOAD FINISHED"
    log_success "Database reloaded with fresh master and synthetic data!"
}

compare_with_current() {
    log_section "DATABASE STATE COMPARISON"

    log_info "Current database statistics:"
    echo ""

    run_sql <<'EOF'
\pset border 2
SELECT
    'Tables' as metric,
    count(*)::text as count
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 'Indexes', count(*)::text FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'Foreign Keys', count(*)::text
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
UNION ALL
SELECT 'Total Rows (Est)', sum((xpath('/row/cnt/text()', query_to_xml(format('SELECT count(*) AS cnt FROM %I', tablename), true, true, '')))[1]::text::int)::text
FROM pg_tables WHERE schemaname = 'public';
EOF

    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    # Check if no arguments provided
    if [ $# -eq 0 ]; then
        show_usage
        exit 0
    fi

    # Parse arguments
    local do_fresh=false
    local do_update=false
    local do_verify=false
    local do_load_basic=false
    local do_load_test=false
    local do_load_dta=false
    local do_create_admin=false
    local do_backup=false
    local do_compare=false
    local do_reload=false
    local do_clear_data=false
    local do_load_master=false
    local do_generate_data=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --fresh)
                do_fresh=true
                shift
                ;;
            --update)
                do_update=true
                shift
                ;;
            --verify)
                do_verify=true
                shift
                ;;
            --reload)
                do_reload=true
                shift
                ;;
            --clear-data)
                do_clear_data=true
                shift
                ;;
            --load-master)
                do_load_master=true
                shift
                ;;
            --generate-data)
                do_generate_data=true
                shift
                ;;
            --load-basic)
                do_load_basic=true
                shift
                ;;
            --load-test)
                do_load_test=true
                shift
                ;;
            --load-dta)
                do_load_dta=true
                shift
                ;;
            --create-admin)
                do_create_admin=true
                shift
                ;;
            --backup)
                do_backup=true
                shift
                ;;
            --restore)
                do_restore=true
                shift
                ;;
            --compare)
                do_compare=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo ""
                show_usage
                exit 1
                ;;
        esac
    done

    # Display header
    clear
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}GEA PORTAL - CONSOLIDATED DATABASE SETUP v9.0${NC}                 ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check prerequisites
    log_info "Checking prerequisites..."
    check_container
    log_success "Container '$DB_CONTAINER' is running"

    # Execute requested operations
    if [ "$do_backup" = true ]; then
        create_backup
    fi

    if [ "$do_restore" = true ]; then
        restore_backup
        exit 0  # Exit after restore (don't run other operations)
    fi

    # NEW: Complete reload workflow (exit after completion)
    if [ "$do_reload" = true ]; then
        do_reload
        exit 0
    fi

    if [ "$do_fresh" = true ]; then
        setup_fresh
    fi

    if [ "$do_update" = true ]; then
        setup_incremental
    fi

    # NEW: Data management operations
    if [ "$do_clear_data" = true ]; then
        do_clear_data
    fi

    if [ "$do_load_master" = true ]; then
        do_load_master
    fi

    if [ "$do_generate_data" = true ]; then
        do_generate_data
    fi

    if [ "$do_load_basic" = true ]; then
        load_basic_data
    fi

    if [ "$do_load_test" = true ]; then
        load_test_data
    fi

    if [ "$do_load_dta" = true ]; then
        load_dta_data
    fi

    if [ "$do_create_admin" = true ]; then
        create_admin_user
    fi

    if [ "$do_compare" = true ]; then
        compare_with_current
    fi

    if [ "$do_verify" = true ]; then
        verify_database
    fi

    # Final summary
    log_section "SETUP COMPLETE"
    log_success "All requested operations completed successfully!"
    echo ""
    log_info "Quick verification:"
    echo ""

    run_sql -c "SELECT
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
        (SELECT count(*) FROM users) as users,
        (SELECT count(*) FROM ea_service_requests) as ea_requests,
        (SELECT count(*) FROM grievance_tickets) as grievances,
        (SELECT count(*) FROM service_feedback) as feedback;"

    echo ""
    log_info "For detailed verification, run: $0 --verify"
    echo ""
}

# Run main function
main "$@"
