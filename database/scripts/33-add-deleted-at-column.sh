#!/bin/bash
# ============================================================================
# GEA Portal - Documents Module: Add deleted_at column
# ============================================================================
# Adds deleted_at column to documents table for trash functionality
# Run: ./database/scripts/33-add-deleted-at-column.sh
# ============================================================================

set -e

# Load environment
source "$(dirname "$0")/../lib/common.sh" 2>/dev/null || {
    # Fallback if common.sh not available
    DB_USER="${DB_USER:-feedback_user}"
    DB_NAME="${DB_NAME:-feedback}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
}

echo "=============================================="
echo "  Documents: Add deleted_at Column Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- ADD DELETED_AT COLUMN TO DOCUMENTS TABLE
-- ============================================================================
-- Supports trash functionality:
-- - When document is soft-deleted: is_active = false, deleted_at = NOW()
-- - Documents in trash > 30 days are automatically purged
-- - Restore sets: is_active = true, deleted_at = NULL

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMP;
        RAISE NOTICE 'Added deleted_at column to documents table';
    ELSE
        RAISE NOTICE 'deleted_at column already exists';
    END IF;
END $$;

-- Create index for deleted_at (useful for trash queries and cleanup)
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    'Add deleted_at Migration Complete' AS status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'deleted_at';

EOF

echo ""
echo "deleted_at column migration complete!"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d documents'"
echo ""
