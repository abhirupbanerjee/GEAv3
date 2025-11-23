#!/bin/bash

# ============================================================================
# UPDATE FILE EXTENSIONS FOR SERVICE ATTACHMENTS
# ============================================================================
# This script updates the file_extension field in service_attachments table
# to allow PDF as an alternative format for all document types
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "  GEA Portal - Update Service Attachment File Extensions"
echo "============================================================================"
echo ""

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-feedback}"
DB_USER="${DB_USER:-feedback_user}"
DB_PASSWORD="${DB_PASSWORD}"

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Function to run SQL
run_sql() {
    docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME "$@"
}

echo "▶ Step 1: Checking current file_extension column size..."
run_sql << 'EOF'
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'service_attachments'
  AND column_name = 'file_extension';
EOF

echo ""
echo "▶ Step 2: Expanding file_extension column from VARCHAR(10) to VARCHAR(50)..."
run_sql << 'EOF'
ALTER TABLE service_attachments
ALTER COLUMN file_extension TYPE VARCHAR(50);
EOF

echo -e "${GREEN}✓ Column expanded successfully${NC}"
echo ""

echo "▶ Step 3: Checking current file extensions..."
run_sql << 'EOF'
SELECT
    service_id,
    filename,
    file_extension,
    is_mandatory
FROM service_attachments
WHERE file_extension IN ('docx', 'xlsx')
ORDER BY service_id, sort_order;
EOF

echo ""
echo "▶ Step 4: Updating DOCX files to allow PDF, DOCX, DOC..."
DOCX_COUNT=$(run_sql -t -c "SELECT COUNT(*) FROM service_attachments WHERE file_extension = 'docx';" | xargs)
echo "Found $DOCX_COUNT documents requiring DOCX"

run_sql << 'EOF'
UPDATE service_attachments
SET file_extension = 'pdf,docx,doc'
WHERE file_extension = 'docx';
EOF

echo -e "${GREEN}✓ Updated DOCX files${NC}"
echo ""

echo "▶ Step 5: Updating XLSX files to allow PDF, XLSX, XLS, CSV..."
XLSX_COUNT=$(run_sql -t -c "SELECT COUNT(*) FROM service_attachments WHERE file_extension = 'xlsx';" | xargs)
echo "Found $XLSX_COUNT documents requiring XLSX"

run_sql << 'EOF'
UPDATE service_attachments
SET file_extension = 'pdf,xlsx,xls,csv'
WHERE file_extension = 'xlsx';
EOF

echo -e "${GREEN}✓ Updated XLSX files${NC}"
echo ""

echo "▶ Step 6: Verifying updates..."
run_sql << 'EOF'
SELECT
    service_id,
    filename,
    file_extension,
    is_mandatory,
    sort_order
FROM service_attachments
WHERE file_extension LIKE '%,%'
ORDER BY service_id, sort_order;
EOF

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  ✓ File extension updates completed successfully!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "Summary of changes:"
echo "  • Documents accepting DOCX now accept: pdf, docx, doc"
echo "  • Documents accepting XLSX now accept: pdf, xlsx, xls, csv"
echo "  • All changes applied to service_attachments table"
echo ""
echo "The service request form will now accept these alternative formats!"
echo ""
