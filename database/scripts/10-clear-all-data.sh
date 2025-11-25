#!/bin/bash

# ============================================================================
# GEA PORTAL - CLEAR ALL MASTER AND TRANSACTIONAL DATA
# ============================================================================
# Version: 1.0
# Purpose: Clear all data while preserving schema and reference tables
# Date: November 25, 2025
#
# WHAT THIS SCRIPT DOES:
# ✓ Clears ALL transactional data (feedback, grievances, tickets, EA requests)
# ✓ Clears ALL master data (entities, services, service attachments)
# ✓ Resets ALL sequences to start from 1
# ✓ PRESERVES authentication tables (users, sessions, accounts)
# ✓ PRESERVES reference tables (priority_levels, ticket_status, user_roles, etc.)
# ✓ PRESERVES database schema (no DROP TABLE commands)
#
# USE CASE:
# - Fresh start with new master data
# - Testing/development data reset
# - Pre-production cleanup
#
# USAGE:
#   ./database/scripts/10-clear-all-data.sh [--yes]
#
# OPTIONS:
#   --yes    Skip confirmation prompt (for automation)
#
# WARNING: This will DELETE ALL BUSINESS DATA. Cannot be undone without backup.
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

# Parse arguments
AUTO_CONFIRM=false
if [ "$1" = "--yes" ]; then
    AUTO_CONFIRM=true
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - CLEAR ALL DATA v1.0                                ║"
echo "║   ⚠️  WARNING: This will delete all master and transactional data ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# SAFETY CHECK
# ============================================================================
echo "▶ Safety Check: Verifying database connection..."
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database."
    exit 1
fi
echo "  ✓ Database connection successful"
echo ""

# ============================================================================
# SHOW CURRENT DATA COUNTS
# ============================================================================
echo "▶ Current data counts (before clearing):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Entities' AS table_name,
    COUNT(*) AS records
FROM entity_master
UNION ALL SELECT 'Services', COUNT(*) FROM service_master
UNION ALL SELECT 'Service Attachments', COUNT(*) FROM service_attachments
UNION ALL SELECT 'Service Feedback', COUNT(*) FROM service_feedback
UNION ALL SELECT 'Grievance Tickets', COUNT(*) FROM grievance_tickets
UNION ALL SELECT 'Grievance Attachments', COUNT(*) FROM grievance_attachments
UNION ALL SELECT 'EA Service Requests', COUNT(*) FROM ea_service_requests
UNION ALL SELECT 'EA Request Attachments', COUNT(*) FROM ea_service_request_attachments
UNION ALL SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'Ticket Activity', COUNT(*) FROM ticket_activity
UNION ALL SELECT 'Ticket Attachments', COUNT(*) FROM ticket_attachments
UNION ALL SELECT 'Users', COUNT(*) FROM users
ORDER BY table_name;
EOF

echo ""
if [ "$AUTO_CONFIRM" = false ]; then
    read -p "⚠️  Proceed with clearing all data? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Operation cancelled by user"
        exit 0
    fi
else
    echo "⚠️  Auto-confirmed (--yes flag provided)"
fi
echo ""

# ============================================================================
# CLEAR TRANSACTIONAL DATA (cascading deletes will handle dependencies)
# ============================================================================
echo "▶ Step 1: Clearing transactional data..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Disable triggers temporarily for faster deletion
SET session_replication_role = 'replica';

-- Clear transactional tables (order matters due to foreign keys)
TRUNCATE TABLE service_feedback CASCADE;
TRUNCATE TABLE grievance_tickets CASCADE;
TRUNCATE TABLE grievance_attachments CASCADE;
TRUNCATE TABLE ea_service_requests CASCADE;
TRUNCATE TABLE ea_service_request_attachments CASCADE;
TRUNCATE TABLE ea_service_request_comments CASCADE;
TRUNCATE TABLE tickets CASCADE;
TRUNCATE TABLE ticket_activity CASCADE;
TRUNCATE TABLE ticket_attachments CASCADE;
TRUNCATE TABLE ticket_notes CASCADE;
TRUNCATE TABLE sla_breaches CASCADE;
TRUNCATE TABLE qr_codes CASCADE;

-- Clear security/audit tables
TRUNCATE TABLE submission_rate_limit CASCADE;
TRUNCATE TABLE submission_attempts CASCADE;
TRUNCATE TABLE captcha_challenges CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

SELECT '✓ Transactional data cleared' AS status;
EOF

echo "  ✓ Transactional data cleared"
echo ""

# ============================================================================
# CLEAR MASTER DATA (entities, services, service attachments)
# ============================================================================
echo "▶ Step 2: Clearing master data..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Clear service attachments first (foreign key to services)
TRUNCATE TABLE service_attachments CASCADE;

-- Clear services (foreign key to entities)
TRUNCATE TABLE service_master CASCADE;

-- Clear entities (no dependencies)
TRUNCATE TABLE entity_master CASCADE;

SELECT '✓ Master data cleared' AS status;
EOF

echo "  ✓ Master data cleared"
echo ""

# ============================================================================
# RESET SEQUENCES
# ============================================================================
echo "▶ Step 3: Resetting sequences..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Reset transactional sequences
ALTER SEQUENCE IF EXISTS service_feedback_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS grievance_tickets_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS grievance_attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ea_service_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ea_service_request_attachments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ea_service_request_comments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tickets_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ticket_activity_activity_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ticket_attachments_attachment_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ticket_notes_note_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sla_breaches_breach_id_seq RESTART WITH 1;

-- Reset master data sequences
ALTER SEQUENCE IF EXISTS service_attachments_service_attachment_id_seq RESTART WITH 1;

-- Reset security sequences
ALTER SEQUENCE IF EXISTS submission_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS captcha_challenges_id_seq RESTART WITH 1;

SELECT '✓ All sequences reset' AS status;
EOF

echo "  ✓ Sequences reset to 1"
echo ""

# ============================================================================
# VERIFY CLEANUP
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION SUMMARY                           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Data counts after clearing:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Entities' AS table_name,
    COUNT(*) AS records,
    CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END AS status
FROM entity_master
UNION ALL SELECT 'Services', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END FROM service_master
UNION ALL SELECT 'Service Attachments', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END FROM service_attachments
UNION ALL SELECT 'Service Feedback', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END FROM service_feedback
UNION ALL SELECT 'Grievance Tickets', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END FROM grievance_tickets
UNION ALL SELECT 'EA Service Requests', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END FROM ea_service_requests
UNION ALL SELECT 'Tickets', COUNT(*), CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END FROM tickets
ORDER BY table_name;
EOF

echo ""
echo "✓ Preserved tables (should NOT be empty):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Users' AS table_name,
    COUNT(*) AS records,
    CASE WHEN COUNT(*) > 0 THEN '✓ Preserved' ELSE '⚠ Empty' END AS status
FROM users
UNION ALL SELECT 'User Roles', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ Preserved' ELSE '⚠ Empty' END FROM user_roles
UNION ALL SELECT 'Priority Levels', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ Preserved' ELSE '⚠ Empty' END FROM priority_levels
UNION ALL SELECT 'Ticket Status', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ Preserved' ELSE '⚠ Empty' END FROM ticket_status
UNION ALL SELECT 'Grievance Status', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓ Preserved' ELSE '⚠ Empty' END FROM grievance_status
ORDER BY table_name;
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ DATA CLEARING COMPLETE                                     ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ All master data cleared (entities, services, attachments)"
echo "  ✓ All transactional data cleared (feedback, grievances, tickets)"
echo "  ✓ All sequences reset to 1"
echo "  ✓ Authentication data preserved (users, roles, sessions)"
echo "  ✓ Reference data preserved (priorities, statuses)"
echo ""
echo "🎯 Next Step:"
echo "  Run: ./database/11-load-master-data.sh"
echo ""
