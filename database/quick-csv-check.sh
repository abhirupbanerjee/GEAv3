#!/bin/bash

# Quick CSV file diagnostic for Azure VM
echo "CSV FILE DIAGNOSTIC"
echo "==================="
echo ""

MASTER_DATA_DIR="$(dirname "$0")/master-data/cleaned"

echo "Checking CSV files in: $MASTER_DATA_DIR"
echo ""

for file in entity-master.txt service-master.txt service-attachments.txt; do
    filepath="$MASTER_DATA_DIR/$file"
    if [ -f "$filepath" ]; then
        size=$(wc -c < "$filepath")
        lines=$(wc -l < "$filepath")
        echo "✓ $file:"
        echo "  Size: $size bytes"
        echo "  Lines: $lines"
        echo "  Header: $(head -1 "$filepath")"
        echo "  First data row: $(sed -n '2p' "$filepath")"
        echo ""
    else
        echo "✗ $file: NOT FOUND"
        echo ""
    fi
done

echo "If all files show 1 line (header only), the files are EMPTY!"
echo "You need to populate them with actual data."
