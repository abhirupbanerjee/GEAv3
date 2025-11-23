#!/bin/bash

# ============================================================================
# GEA PORTAL - Service Request Enhancements Migration
# ============================================================================
# Purpose: Add comments/notes table for service requests
# Features:
# - Comments/notes for internal discussion
# - Status change tracking with comments
# - Visible to both admin and staff
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   Service Request Enhancements Migration                          ║"
echo "║   Adding: Comments/Notes table                                    ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "▶ Creating service request comments table..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- ============================================================================
-- SERVICE REQUEST COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ea_service_request_comments (
    comment_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES ea_service_requests(request_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'internal_note',
    is_status_change BOOLEAN DEFAULT FALSE,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_visible_to_staff BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sr_comment_request ON ea_service_request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_sr_comment_created ON ea_service_request_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_comment_type ON ea_service_request_comments(comment_type);

-- Add comment explaining the table
COMMENT ON TABLE ea_service_request_comments IS 'Comments and notes for EA service requests, including status change history';
COMMENT ON COLUMN ea_service_request_comments.comment_type IS 'Types: internal_note, status_change, admin_note';
COMMENT ON COLUMN ea_service_request_comments.is_visible_to_staff IS 'Controls visibility for staff users';

EOF

echo "✓ Service request comments table created successfully"
echo ""

echo "▶ Verifying table structure..."
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "\d ea_service_request_comments"

echo ""
echo "✓ Migration completed successfully!"
echo ""
