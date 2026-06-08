#!/bin/bash
# ============================================================================
# GEA Portal - Comment Attachments Table Migration
# ============================================================================
# Creates ea_comment_attachments table for file attachments on service request
# comments. Run: ./database/scripts/41-add-comment-attachments-table.sh
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
echo "  Comment Attachments Table Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- COMMENT ATTACHMENTS TABLE
-- ============================================================================
-- Stores file attachments linked to ea_service_request_comments.
-- Files are stored as BYTEA in PostgreSQL (same pattern as ticket_attachments
-- and ea_service_request_attachments).

CREATE TABLE IF NOT EXISTS ea_comment_attachments (
    attachment_id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES ea_service_request_comments(comment_id) ON DELETE CASCADE,
    request_id INTEGER NOT NULL REFERENCES ea_service_requests(request_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    file_content BYTEA NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_comment_file_size CHECK (file_size > 0 AND file_size <= 10485760)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON ea_comment_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_request ON ea_comment_attachments(request_id);

-- Verify migration
SELECT
    'Comment Attachments Table Migration Complete' AS status,
    COUNT(*) AS total_rows
FROM ea_comment_attachments;

EOF

echo ""
echo "✅ Comment Attachments table migration complete!"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d ea_comment_attachments'"
