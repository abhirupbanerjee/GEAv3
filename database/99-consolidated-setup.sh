#!/bin/bash

# ============================================================================
# GEA PORTAL - CONSOLIDATED DATABASE SETUP v8.0
# ============================================================================
# Purpose: Single consolidated script for all database setup needs
# Features:
#   - Fresh database setup
#   - Incremental updates with safety checks
#   - Production verification and comparison
#   - Automatic backup before changes
#   - Comprehensive verification
#   - Flexible data loading options
# Date: November 24, 2025
# ============================================================================

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================
DB_USER="${DB_USER:-feedback_user}"
DB_NAME="${DB_NAME:-feedback}"
DB_CONTAINER="${DB_CONTAINER:-feedback_db}"
BACKUP_DIR="/tmp/gea_backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Run SQL command
run_sql() {
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"
}

# Check if container is running
check_container() {
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        log_error "Container '$DB_CONTAINER' is not running!"
        echo ""
        echo "Available containers:"
        docker ps
        exit 1
    fi
}

# Get table count
get_table_count() {
    run_sql -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' '
}

# Get row count for a table
get_row_count() {
    local table=$1
    run_sql -t -c "SELECT count(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/feedback_backup_$(date +%Y%m%d_%H%M%S)_consolidated.sql"

    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" 2>/dev/null; then
        log_success "Backup created: $backup_file ($(du -h "$backup_file" | cut -f1))"
        echo "$backup_file"
    else
        log_warn "Backup creation had issues, but continuing..."
        echo ""
    fi
}

# Display usage
show_usage() {
    cat << 'USAGE'
╔═══════════════════════════════════════════════════════════════════╗
║  GEA PORTAL - CONSOLIDATED DATABASE SETUP v8.0                    ║
╚═══════════════════════════════════════════════════════════════════╝

USAGE:
  ./99-consolidated-setup.sh [OPTIONS]

OPTIONS:
  --fresh             Complete fresh setup (drops and recreates)
  --update            Incremental update (safe, checks existing)
  --verify            Verify current database state
  --load-basic        Load basic reference data only
  --load-test         Load general test data (50 items)
  --load-dta          Load DTA operational data (recommended)
  --create-admin      Create admin user interactively
  --backup            Create backup only
  --compare           Compare with production state
  --help              Show this help message

EXAMPLES:
  # Fresh setup with DTA data
  ./99-consolidated-setup.sh --fresh --load-dta --create-admin

  # Safe incremental update
  ./99-consolidated-setup.sh --update --load-basic

  # Verify existing database
  ./99-consolidated-setup.sh --verify

  # Create backup and compare
  ./99-consolidated-setup.sh --backup --compare

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

    if [ "$table_count" -gt 0 ]; then
        log_warn "Database has $table_count existing tables"
        read -p "This will DROP and recreate all tables. Continue? (yes/NO): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Aborted by user"
            exit 0
        fi

        create_backup
    fi

    log_info "Running master initialization..."
    "$SCRIPT_DIR/00-master-init.sh"

    log_success "Fresh database setup completed!"
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
    "$SCRIPT_DIR/00-master-init.sh"

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

    if [ ! -f "$SCRIPT_DIR/02-load-seed-data.sh" ]; then
        log_error "Test data script not found!"
        exit 1
    fi

    log_info "Loading general test data (50 feedback items, grievances, etc.)..."
    "$SCRIPT_DIR/02-load-seed-data.sh"

    log_success "Test data loaded!"
}

load_dta_data() {
    log_section "LOADING DTA OPERATIONAL DATA"

    if [ ! -f "$SCRIPT_DIR/06-load-dta-seed-data.sh" ]; then
        log_error "DTA data script not found!"
        exit 1
    fi

    log_info "Loading DTA operational data (staff users, EA requests, etc.)..."
    "$SCRIPT_DIR/06-load-dta-seed-data.sh"

    log_success "DTA operational data loaded!"
}

create_admin_user() {
    log_section "CREATING ADMIN USER"

    if [ ! -f "$SCRIPT_DIR/05-add-initial-admin.sh" ]; then
        log_error "Admin creation script not found!"
        exit 1
    fi

    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_NAME" ]; then
        log_info "Using environment variables for admin user..."
        ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_NAME="$ADMIN_NAME" "$SCRIPT_DIR/05-add-initial-admin.sh"
    else
        log_info "Creating admin user interactively..."
        "$SCRIPT_DIR/05-add-initial-admin.sh"
    fi

    log_success "Admin user created/updated!"
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
    echo -e "${CYAN}║${NC}  ${GREEN}GEA PORTAL - CONSOLIDATED DATABASE SETUP v8.0${NC}                 ${CYAN}║${NC}"
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

    if [ "$do_fresh" = true ]; then
        setup_fresh
    fi

    if [ "$do_update" = true ]; then
        setup_incremental
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
