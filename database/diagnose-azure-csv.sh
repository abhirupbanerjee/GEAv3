#!/bin/bash

# ============================================================================
# GEA PORTAL - AZURE CSV LOADING DIAGNOSTIC TOOL
# ============================================================================
# Purpose: Diagnose why CSV loading fails on Azure VM but works locally
# Usage: ./database/diagnose-azure-csv.sh
# Date: November 25, 2025
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Source config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         AZURE VM CSV LOADING DIAGNOSTIC REPORT                    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# TEST 1: FILE EXISTENCE AND SIZES
# ============================================================================
echo -e "${BLUE}▶ TEST 1: Checking CSV file existence and sizes...${NC}"
echo ""

for file in entity-master.txt service-master.txt service-attachments.txt; do
    filepath="$MASTER_DATA_DIR/$file"
    if [ -f "$filepath" ]; then
        size=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath" 2>/dev/null)
        lines=$(wc -l < "$filepath")
        echo -e "  ${GREEN}✓${NC} $file: $size bytes, $lines lines"
    else
        echo -e "  ${RED}✗${NC} $file: NOT FOUND at $filepath"
    fi
done
echo ""

# ============================================================================
# TEST 2: LINE ENDINGS CHECK
# ============================================================================
echo -e "${BLUE}▶ TEST 2: Checking line endings (CRLF vs LF)...${NC}"
echo ""

for file in entity-master.txt service-master.txt service-attachments.txt; do
    filepath="$MASTER_DATA_DIR/$file"
    if [ -f "$filepath" ]; then
        # Check for CRLF
        if file "$filepath" | grep -q "CRLF"; then
            echo -e "  ${RED}✗${NC} $file: Windows line endings (CRLF) - ${RED}WILL FAIL${NC}"
            echo "    Fix: dos2unix $filepath"
        else
            echo -e "  ${GREEN}✓${NC} $file: Unix line endings (LF)"
        fi
    fi
done
echo ""

# ============================================================================
# TEST 3: FILE ENCODING CHECK
# ============================================================================
echo -e "${BLUE}▶ TEST 3: Checking file encoding...${NC}"
echo ""

for file in entity-master.txt service-master.txt service-attachments.txt; do
    filepath="$MASTER_DATA_DIR/$file"
    if [ -f "$filepath" ]; then
        encoding=$(file -b --mime-encoding "$filepath")
        if [ "$encoding" = "utf-8" ] || [ "$encoding" = "us-ascii" ]; then
            echo -e "  ${GREEN}✓${NC} $file: $encoding"
        else
            echo -e "  ${YELLOW}⚠${NC} $file: $encoding (expected utf-8)"
        fi
    fi
done
echo ""

# ============================================================================
# TEST 4: CSV HEADER AND SAMPLE DATA
# ============================================================================
echo -e "${BLUE}▶ TEST 4: Checking CSV headers and first data row...${NC}"
echo ""

echo "  entity-master.txt:"
if [ -f "$MASTER_DATA_DIR/entity-master.txt" ]; then
    echo "    Header: $(head -1 "$MASTER_DATA_DIR/entity-master.txt")"
    echo "    Sample: $(sed -n '2p' "$MASTER_DATA_DIR/entity-master.txt")"
else
    echo -e "    ${RED}✗${NC} File not found"
fi
echo ""

echo "  service-master.txt:"
if [ -f "$MASTER_DATA_DIR/service-master.txt" ]; then
    echo "    Header: $(head -1 "$MASTER_DATA_DIR/service-master.txt")"
    echo "    Sample: $(sed -n '2p' "$MASTER_DATA_DIR/service-master.txt")"
else
    echo -e "    ${RED}✗${NC} File not found"
fi
echo ""

# ============================================================================
# TEST 5: FILE PERMISSIONS
# ============================================================================
echo -e "${BLUE}▶ TEST 5: Checking file permissions...${NC}"
echo ""

for file in entity-master.txt service-master.txt service-attachments.txt; do
    filepath="$MASTER_DATA_DIR/$file"
    if [ -f "$filepath" ]; then
        perms=$(stat -c%a "$filepath" 2>/dev/null || stat -f%Lp "$filepath" 2>/dev/null)
        echo -e "  ${GREEN}✓${NC} $file: $perms"
    fi
done
echo ""

# ============================================================================
# TEST 6: DOCKER CONTAINER ACCESS
# ============================================================================
echo -e "${BLUE}▶ TEST 6: Testing Docker container file access...${NC}"
echo ""

check_container
check_db_connection

echo "  Copying test file to container..."
docker cp "$MASTER_DATA_DIR/entity-master.txt" "$DB_CONTAINER:/tmp/test-entity.txt"
echo -e "  ${GREEN}✓${NC} File copied to container"

echo "  Checking file inside container..."
lines=$(docker exec "$DB_CONTAINER" wc -l /tmp/test-entity.txt | awk '{print $1}')
echo -e "  ${GREEN}✓${NC} File readable inside container: $lines lines"

echo "  Checking first 3 lines inside container:"
docker exec "$DB_CONTAINER" head -3 /tmp/test-entity.txt
echo ""

# ============================================================================
# TEST 7: POSTGRESQL COPY COMMAND TEST
# ============================================================================
echo -e "${BLUE}▶ TEST 7: Testing PostgreSQL COPY command directly...${NC}"
echo ""

echo "  Creating temporary test table..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
DROP TABLE IF EXISTS test_entity_load;
CREATE TEMP TABLE test_entity_load (
    unique_entity_id VARCHAR(50),
    entity_name VARCHAR(255),
    entity_type VARCHAR(50),
    parent_entity_id VARCHAR(50),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active VARCHAR(10)
);
"

echo "  Attempting COPY command..."
copy_output=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
\COPY test_entity_load FROM '/tmp/test-entity.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '\"');
" 2>&1)

if echo "$copy_output" | grep -q "COPY [0-9]"; then
    rows=$(echo "$copy_output" | grep -o "COPY [0-9]*" | grep -o "[0-9]*")
    echo -e "  ${GREEN}✓${NC} COPY command succeeded: $rows rows loaded"

    echo "  Verifying loaded data:"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT COUNT(*) AS rows_in_temp_table FROM test_entity_load;
SELECT * FROM test_entity_load LIMIT 3;
"
else
    echo -e "  ${RED}✗${NC} COPY command FAILED"
    echo "  Error output:"
    echo "$copy_output"
fi
echo ""

# ============================================================================
# TEST 8: CHECK FOR SPECIAL CHARACTERS
# ============================================================================
echo -e "${BLUE}▶ TEST 8: Checking for problematic characters...${NC}"
echo ""

for file in entity-master.txt service-master.txt; do
    filepath="$MASTER_DATA_DIR/$file"
    if [ -f "$filepath" ]; then
        # Check for NULL bytes
        if grep -q $'\x00' "$filepath" 2>/dev/null; then
            echo -e "  ${RED}✗${NC} $file: Contains NULL bytes (binary data)"
        else
            echo -e "  ${GREEN}✓${NC} $file: No NULL bytes"
        fi

        # Check for BOM (Byte Order Mark)
        if head -c 3 "$filepath" | xxd | grep -q "efbb bf"; then
            echo -e "  ${YELLOW}⚠${NC} $file: Contains UTF-8 BOM"
        else
            echo -e "  ${GREEN}✓${NC} $file: No BOM"
        fi
    fi
done
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    DIAGNOSTIC SUMMARY                             ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "If TEST 7 (PostgreSQL COPY) succeeded with rows > 0:"
echo -e "  ${GREEN}→${NC} Files are valid, issue is in script logic"
echo ""

echo "If TEST 7 failed:"
echo -e "  ${RED}→${NC} Check line endings (TEST 2) - run: dos2unix database/master-data/cleaned/*.txt"
echo -e "  ${RED}→${NC} Check encoding (TEST 3) - run: iconv -f ISO-8859-1 -t UTF-8 input.txt > output.txt"
echo -e "  ${RED}→${NC} Check for special characters (TEST 8)"
echo ""

echo "Next steps:"
echo "  1. Review diagnostic output above"
echo "  2. Fix any issues identified"
echo "  3. Run: ./database/99-consolidated-setup.sh --reload"
echo ""
