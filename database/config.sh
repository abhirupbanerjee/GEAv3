#!/bin/bash

# ============================================================================
# GEA PORTAL - SHARED DATABASE CONFIGURATION
# ============================================================================
# Purpose: Centralized configuration for all database scripts
# Usage: Source this file in other scripts: source "$(dirname "$0")/config.sh"
# Date: November 25, 2025
# ============================================================================

# Database Configuration
export DB_USER="${DB_USER:-feedback_user}"
export DB_NAME="${DB_NAME:-feedback}"
export DB_CONTAINER="${DB_CONTAINER:-feedback_db}"

# Directory Paths
export DB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export SCRIPTS_DIR="$DB_ROOT/scripts"
export LIB_DIR="$DB_ROOT/lib"
export DOCS_DIR="$DB_ROOT/docs"
export SQL_DIR="$DB_ROOT/sql"
export MASTER_DATA_DIR="$DB_ROOT/master-data/cleaned"
export BACKUP_DIR="${BACKUP_DIR:-/tmp/gea_backups}"

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Default Sample Data (for auto-detection)
export DEFAULT_ENTITY_COUNT=4
export DEFAULT_SERVICE_COUNT=14

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
    printf "${CYAN}║${NC} %-66s${CYAN}║${NC}\n" "$1"
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
        echo "Start it with: docker-compose up -d $DB_CONTAINER"
        exit 1
    fi
}

# Check database connection
check_db_connection() {
    if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        log_error "Cannot connect to database."
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
