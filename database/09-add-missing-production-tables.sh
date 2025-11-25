#!/bin/bash

# ============================================================================
# GEA PORTAL - Add Missing Production Tables
# ============================================================================
# Purpose: Add tables that exist in production but are missing from scripts
# Date: November 24, 2025
# Tables Added:
#   - sla_breaches (SLA breach tracking)
#   - ticket_notes (internal notes)
# Note: ticket_activity is created by 01-init-db.sh (not here)
# ============================================================================

set -e

DB_USER="${DB_USER:-feedback_user}"
DB_NAME="${DB_NAME:-feedback}"
DB_CONTAINER="${DB_CONTAINER:-feedback_db}"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - Add Missing Production Tables                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo "✗ Container '$DB_CONTAINER' is not running!"
    exit 1
fi

echo "▶ Verifying database connection..."
if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database"
    exit 1
fi
echo "  ✓ Database connection successful"
echo ""

echo "▶ Creating missing tables..."
echo ""

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- ============================================================================
-- TABLE 1: SLA_BREACHES
-- ============================================================================
-- Purpose: Track SLA breaches for tickets
-- ============================================================================

CREATE TABLE IF NOT EXISTS sla_breaches (
    breach_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id),
    breach_type VARCHAR(20),
    target_time TIMESTAMP NOT NULL,
    actual_time TIMESTAMP,
    breach_duration_hours NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_breach_ticket ON sla_breaches(ticket_id);
CREATE INDEX IF NOT EXISTS idx_breach_type ON sla_breaches(breach_type);
CREATE INDEX IF NOT EXISTS idx_breach_active ON sla_breaches(is_active);

COMMENT ON TABLE sla_breaches IS 'Tracks SLA breaches for ticket response and resolution times';

-- ============================================================================
-- TABLE 2: TICKET_NOTES
-- ============================================================================
-- Purpose: Internal notes for tickets (staff-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_notes (
    note_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_ticket ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON ticket_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON ticket_notes(created_by);

COMMENT ON TABLE ticket_notes IS 'Internal notes for tickets (primarily for staff use)';
COMMENT ON COLUMN ticket_notes.is_public IS 'Whether note is visible to ticket submitter';

EOF

echo "  ✓ Missing tables created successfully"
echo ""

# ============================================================================
# VERIFICATION
# ============================================================================
echo "▶ Verifying tables created..."
echo ""

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\pset border 2

SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE information_schema.columns.table_name = t.table_name) as columns,
    (SELECT COUNT(*) FROM pg_indexes
     WHERE tablename = t.table_name) as indexes
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('sla_breaches', 'ticket_notes')
ORDER BY table_name;

EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ MISSING TABLES ADDED SUCCESSFULLY                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ sla_breaches - SLA breach tracking"
echo "  ✓ ticket_notes - Internal notes system"
echo ""
echo "ℹ️  NOTE: ticket_activity table (6 columns) is created by 01-init-db.sh"
echo "   This script only adds production-specific tables."
echo ""
