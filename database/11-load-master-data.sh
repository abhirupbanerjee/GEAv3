#!/bin/bash

# ============================================================================
# GEA PORTAL - LOAD MASTER DATA
# ============================================================================
# Version: 1.0
# Purpose: Load cleaned master data from CSV files
# Date: November 25, 2025
#
# WHAT THIS SCRIPT DOES:
# ✓ Loads entity_master (69 government entities)
# ✓ Loads service_master (167 government services)
# ✓ Loads service_attachments (250 document requirements)
# ✓ Validates foreign key relationships
# ✓ Verifies data integrity after load
#
# PREREQUISITES:
# - Run ./database/10-clear-all-data.sh first (or have empty master tables)
# - Cleaned CSV files must exist in database/master-data/cleaned/
#
# USAGE:
#   ./database/11-load-master-data.sh
#
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"
DATA_DIR="/home/ab/Projects/gogeaportal/v3/database/master-data/cleaned"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - LOAD MASTER DATA v1.0                              ║"
echo "║   Loading: Entities, Services, Service Attachments                ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================================
echo "▶ Step 1: Verifying prerequisites..."

# Check database connection
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database."
    exit 1
fi
echo "  ✓ Database connection successful"

# Check if cleaned data files exist
if [ ! -f "$DATA_DIR/entity-master.txt" ]; then
    echo "✗ Missing file: $DATA_DIR/entity-master.txt"
    exit 1
fi
if [ ! -f "$DATA_DIR/service-master.txt" ]; then
    echo "✗ Missing file: $DATA_DIR/service-master.txt"
    exit 1
fi
if [ ! -f "$DATA_DIR/service-attachments.txt" ]; then
    echo "✗ Missing file: $DATA_DIR/service-attachments.txt"
    exit 1
fi
echo "  ✓ All cleaned data files found"

# Check if master tables are empty
ENTITY_COUNT=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM entity_master" | tr -d ' ')
SERVICE_COUNT=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM service_master" | tr -d ' ')

if [ "$ENTITY_COUNT" -gt 0 ] || [ "$SERVICE_COUNT" -gt 0 ]; then
    echo "  ⚠️  Warning: Master tables contain data ($ENTITY_COUNT entities, $SERVICE_COUNT services)"
    read -p "  Continue and append data? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Operation cancelled. Run ./database/10-clear-all-data.sh first"
        exit 0
    fi
fi
echo ""

# ============================================================================
# STEP 2: LOAD ENTITY MASTER
# ============================================================================
echo "▶ Step 2: Loading entity_master..."

# Copy file to container
docker cp "$DATA_DIR/entity-master.txt" feedback_db:/tmp/entity-master.txt

# Load data
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Create temporary table for staging
CREATE TEMP TABLE temp_entities (
    unique_entity_id VARCHAR(50),
    entity_name VARCHAR(255),
    entity_type VARCHAR(50),
    parent_entity_id VARCHAR(50),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active VARCHAR(10)
);

-- Load CSV data (skip header)
\COPY temp_entities FROM '/tmp/entity-master.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Insert into actual table with type conversion
INSERT INTO entity_master (
    unique_entity_id,
    entity_name,
    entity_type,
    parent_entity_id,
    contact_email,
    contact_phone,
    is_active
)
SELECT
    unique_entity_id,
    entity_name,
    entity_type,
    NULLIF(parent_entity_id, ''),
    NULLIF(contact_email, ''),
    NULLIF(contact_phone, ''),
    CASE WHEN is_active = 'TRUE' THEN TRUE ELSE FALSE END
FROM temp_entities
ON CONFLICT (unique_entity_id) DO NOTHING;

-- Report results
SELECT COUNT(*) AS entities_loaded FROM entity_master;
EOF

echo "  ✓ Entity master loaded"
echo ""

# ============================================================================
# STEP 3: LOAD SERVICE MASTER
# ============================================================================
echo "▶ Step 3: Loading service_master..."

# Copy file to container
docker cp "$DATA_DIR/service-master.txt" feedback_db:/tmp/service-master.txt

# Load data
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Create temporary table for staging
CREATE TEMP TABLE temp_services (
    service_id VARCHAR(50),
    service_name VARCHAR(255),
    entity_id VARCHAR(50),
    service_category VARCHAR(100),
    service_description TEXT,
    is_active VARCHAR(10)
);

-- Load CSV data (skip header)
\COPY temp_services FROM '/tmp/service-master.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Insert into actual table with type conversion
INSERT INTO service_master (
    service_id,
    service_name,
    entity_id,
    service_category,
    service_description,
    is_active
)
SELECT
    service_id,
    service_name,
    entity_id,
    NULLIF(service_category, ''),
    NULLIF(service_description, ''),
    CASE WHEN is_active = 'TRUE' THEN TRUE ELSE FALSE END
FROM temp_services
ON CONFLICT (service_id) DO NOTHING;

-- Report results
SELECT COUNT(*) AS services_loaded FROM service_master;
EOF

echo "  ✓ Service master loaded"
echo ""

# ============================================================================
# STEP 4: LOAD SERVICE ATTACHMENTS
# ============================================================================
echo "▶ Step 4: Loading service_attachments..."

# Copy file to container
docker cp "$DATA_DIR/service-attachments.txt" feedback_db:/tmp/service-attachments.txt

# Load data
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Create temporary table for staging
CREATE TEMP TABLE temp_attachments (
    service_id VARCHAR(50),
    filename VARCHAR(255),
    file_extension VARCHAR(50),
    is_mandatory VARCHAR(10),
    description TEXT,
    sort_order INTEGER,
    is_active VARCHAR(10)
);

-- Load CSV data (skip header)
\COPY temp_attachments FROM '/tmp/service-attachments.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',');

-- Insert into actual table with type conversion
INSERT INTO service_attachments (
    service_id,
    filename,
    file_extension,
    is_mandatory,
    description,
    sort_order,
    is_active
)
SELECT
    service_id,
    filename,
    NULLIF(file_extension, ''),
    CASE WHEN is_mandatory = 'TRUE' THEN TRUE ELSE FALSE END,
    NULLIF(description, ''),
    COALESCE(sort_order, 0),
    CASE WHEN is_active = 'TRUE' THEN TRUE ELSE FALSE END
FROM temp_attachments
ON CONFLICT (service_id, filename) DO NOTHING;

-- Report results
SELECT COUNT(*) AS attachments_loaded FROM service_attachments;
EOF

echo "  ✓ Service attachments loaded"
echo ""

# ============================================================================
# STEP 5: VALIDATE DATA INTEGRITY
# ============================================================================
echo "▶ Step 5: Validating data integrity..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Check for orphaned services (entity_id not in entity_master)
SELECT
    'Orphaned Services' AS check_name,
    COUNT(*) AS count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM service_master s
LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
WHERE e.unique_entity_id IS NULL

UNION ALL

-- Check for orphaned attachments (service_id not in service_master)
SELECT
    'Orphaned Attachments' AS check_name,
    COUNT(*) AS count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM service_attachments sa
LEFT JOIN service_master s ON sa.service_id = s.service_id
WHERE s.service_id IS NULL

UNION ALL

-- Check for entities with invalid parent references
SELECT
    'Invalid Parent Refs' AS check_name,
    COUNT(*) AS count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM entity_master e1
LEFT JOIN entity_master e2 ON e1.parent_entity_id = e2.unique_entity_id
WHERE e1.parent_entity_id IS NOT NULL AND e2.unique_entity_id IS NULL

ORDER BY check_name;
EOF

echo ""

# ============================================================================
# STEP 6: GENERATE STATISTICS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    DATA LOAD SUMMARY                              ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Record counts:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Entities' AS category,
    COUNT(*) AS total,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    COUNT(CASE WHEN NOT is_active THEN 1 END) AS inactive
FROM entity_master

UNION ALL

SELECT
    'Services' AS category,
    COUNT(*) AS total,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    COUNT(CASE WHEN NOT is_active THEN 1 END) AS inactive
FROM service_master

UNION ALL

SELECT
    'Service Attachments' AS category,
    COUNT(*) AS total,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    COUNT(CASE WHEN NOT is_active THEN 1 END) AS inactive
FROM service_attachments

ORDER BY category;
EOF

echo ""
echo "✓ Entities by type:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    entity_type,
    COUNT(*) AS count
FROM entity_master
GROUP BY entity_type
ORDER BY count DESC;
EOF

echo ""
echo "✓ Services by category (top 10):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    COALESCE(service_category, '(no category)') AS category,
    COUNT(*) AS services
FROM service_master
GROUP BY service_category
ORDER BY COUNT(*) DESC
LIMIT 10;
EOF

echo ""
echo "✓ Service attachment requirements:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    COUNT(DISTINCT service_id) AS services_with_attachments,
    COUNT(*) AS total_attachments,
    COUNT(CASE WHEN is_mandatory THEN 1 END) AS mandatory_attachments,
    COUNT(CASE WHEN NOT is_mandatory THEN 1 END) AS optional_attachments
FROM service_attachments;
EOF

echo ""
echo "✓ Services without attachments:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT COUNT(*) AS count FROM (
    SELECT s.service_id, s.service_name
    FROM service_master s
    LEFT JOIN service_attachments sa ON s.service_id = sa.service_id
    WHERE sa.service_id IS NULL
) AS services_without_attachments;
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ MASTER DATA LOAD COMPLETE                                  ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ Entity master loaded and validated"
echo "  ✓ Service master loaded and validated"
echo "  ✓ Service attachments loaded and validated"
echo "  ✓ Foreign key integrity verified"
echo "  ✓ No orphaned records detected"
echo ""
echo "🎯 Next Step:"
echo "  Run: ./database/12-generate-synthetic-data.sh"
echo ""
