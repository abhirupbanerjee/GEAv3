#!/bin/bash

# ============================================================================
# GEA PORTAL - CSV LOADER LIBRARY
# ============================================================================
# Purpose: Shared functions for loading CSV data into PostgreSQL
# Usage: Source this file: source "$LIB_DIR/csv-loader.sh"
# Date: November 25, 2025
# ============================================================================

# Load entity master data from CSV
load_entity_master() {
    local csv_file="$MASTER_DATA_DIR/entity-master.txt"
    local sql_template="$SQL_DIR/load-entities.sql"

    log_info "Loading entity_master..."

    # Copy CSV to container
    if ! docker cp "$csv_file" "$DB_CONTAINER:/tmp/entity-master.txt"; then
        log_error "Failed to copy entity master file to container"
        return 1
    fi

    # Copy SQL template to container and execute
    if ! docker cp "$sql_template" "$DB_CONTAINER:/tmp/load-entities.sql"; then
        log_error "Failed to copy SQL template to container"
        return 1
    fi

    # Execute SQL with error output visible
    local output=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/load-entities.sql 2>&1)
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local count=$(get_row_count "entity_master")
        log_success "Entity master loaded ($count entities)"
        return 0
    else
        log_error "Failed to load entity master"
        echo "$output" | head -20  # Show first 20 lines of error
        return 1
    fi
}

# Load service master data from CSV
load_service_master() {
    local csv_file="$MASTER_DATA_DIR/service-master.txt"
    local sql_template="$SQL_DIR/load-services.sql"

    log_info "Loading service_master..."

    # Copy CSV to container
    if ! docker cp "$csv_file" "$DB_CONTAINER:/tmp/service-master.txt"; then
        log_error "Failed to copy service master file to container"
        return 1
    fi

    # Copy SQL template to container and execute
    if ! docker cp "$sql_template" "$DB_CONTAINER:/tmp/load-services.sql"; then
        log_error "Failed to copy SQL template to container"
        return 1
    fi

    # Execute SQL with error output visible
    local output=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/load-services.sql 2>&1)
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local count=$(get_row_count "service_master")
        log_success "Service master loaded ($count services)"
        return 0
    else
        log_error "Failed to load service master"
        echo "$output" | head -20  # Show first 20 lines of error
        return 1
    fi
}

# Load service attachments data from CSV
load_service_attachments() {
    local csv_file="$MASTER_DATA_DIR/service-attachments.txt"
    local sql_template="$SQL_DIR/load-attachments.sql"

    log_info "Loading service_attachments..."

    # Copy CSV to container
    if ! docker cp "$csv_file" "$DB_CONTAINER:/tmp/service-attachments.txt"; then
        log_error "Failed to copy service attachments file to container"
        return 1
    fi

    # Copy SQL template to container and execute
    if ! docker cp "$sql_template" "$DB_CONTAINER:/tmp/load-attachments.sql"; then
        log_error "Failed to copy SQL template to container"
        return 1
    fi

    # Execute SQL with error output visible
    local output=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/load-attachments.sql 2>&1)
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local count=$(get_row_count "service_attachments")
        log_success "Service attachments loaded ($count attachments)"
        return 0
    else
        log_error "Failed to load service attachments"
        echo "$output" | head -20  # Show first 20 lines of error
        return 1
    fi
}

# Validate foreign key integrity
validate_foreign_keys() {
    log_info "Validating foreign key integrity..."

    local orphaned=$(run_sql -t -c "
        SELECT COUNT(*)
        FROM service_master s
        LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
        WHERE e.unique_entity_id IS NULL;
    " | tr -d ' ')

    if [ "$orphaned" = "0" ]; then
        log_success "Foreign key integrity verified (0 orphaned records)"
        return 0
    else
        log_error "Found $orphaned orphaned service records"
        return 1
    fi
}

# Clear master data tables
clear_master_data() {
    log_info "Clearing master data tables..."

    run_sql << 'EOF'
TRUNCATE TABLE service_attachments CASCADE;
TRUNCATE TABLE service_master CASCADE;
TRUNCATE TABLE entity_master CASCADE;
EOF

    if [ $? -eq 0 ]; then
        log_success "Master data tables cleared"
        return 0
    else
        log_error "Failed to clear master data tables"
        return 1
    fi
}

# Detect and handle default sample data
handle_default_sample_data() {
    local entity_count=$(get_row_count "entity_master")
    local service_count=$(get_row_count "service_master")

    # Auto-clear if default sample data detected
    if [ "$entity_count" = "$DEFAULT_ENTITY_COUNT" ] && [ "$service_count" = "$DEFAULT_SERVICE_COUNT" ]; then
        log_info "Detected default sample data ($entity_count entities, $service_count services)"
        log_info "Auto-clearing default sample data..."
        clear_master_data
        return 0
    fi

    # Warn if non-default data exists
    if [ "$entity_count" -gt 0 ] || [ "$service_count" -gt 0 ]; then
        log_warn "Master tables contain data ($entity_count entities, $service_count services)"
        return 1
    fi

    return 0
}
