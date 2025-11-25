#!/bin/bash

# ============================================================================
# GEA PORTAL - MASTER DATABASE INITIALIZATION
# ============================================================================
# Version: 7.0 - Consolidated Master Script
# Purpose: Complete database setup from scratch
# Architecture: Phase 2b - Feedback + Grievances + EA Services + Admin Portal
# Date: November 23, 2025
#
# FEATURES:
# - All schema creation (feedback, grievances, EA requests, tickets, users)
# - Reference data (entities, services, priorities, statuses)
# - EA service attachments requirements (27 documents across 7 services)
# - NextAuth authentication tables
# - Comprehensive indexes and constraints
# - PostgreSQL 13+ compatible
# - Idempotent (safe to run multiple times)
#
# RUNS AUTOMATICALLY:
# 1. Schema creation
# 2. Reference data insertion
# 3. NextAuth user management setup
# 4. Service request enhancements
#
# USAGE:
#   ./database/00-master-init.sh
#
# ============================================================================

set -e

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ROOT="$(dirname "$SCRIPT_DIR")"
source "$DB_ROOT/config.sh"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - MASTER DATABASE INITIALIZATION v7.0                ║"
echo "║   Complete setup: Schema + Auth + Reference Data                  ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: VERIFY CONNECTION
# ============================================================================
echo "▶ Step 1: Verifying database connection..."
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database."
    exit 1
fi
echo "  ✓ Database connection successful"
echo ""

# ============================================================================
# STEP 2: DETECT EXISTING SCHEMA & BACKUP
# ============================================================================
echo "▶ Step 2: Detecting existing database state..."
EXISTING_TABLES=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')

if [ "$EXISTING_TABLES" -gt 0 ]; then
    echo "  ℹ️  Found $EXISTING_TABLES existing tables"
    echo ""
    echo "▶ Step 2a: Creating backup..."
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/feedback_backup_$(date +%Y%m%d_%H%M%S)_master_init.sql"

    if docker exec feedback_db pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE" 2>/dev/null; then
        echo "  ✓ Backup created: $BACKUP_FILE"
        echo "  💾 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    fi
    echo ""
else
    echo "  ℹ️  Database is empty, creating fresh schema"
    echo ""
fi

# ============================================================================
# STEP 3: RUN MAIN SCHEMA INITIALIZATION
# ============================================================================
echo "▶ Step 3: Running main schema initialization..."
echo "  (This will take a moment...)"
echo ""

"$SCRIPTS_DIR/01-init-db.sh"

echo "  ✓ Main schema initialized"
echo ""

# ============================================================================
# STEP 4: RUN NEXTAUTH MIGRATION
# ============================================================================
echo "▶ Step 4: Setting up NextAuth user management..."
echo ""

"$SCRIPTS_DIR/04-nextauth-users.sh"

echo "  ✓ NextAuth tables created"
echo ""

# ============================================================================
# STEP 5: ADD SERVICE REQUEST ENHANCEMENTS
# ============================================================================
echo "▶ Step 5: Adding service request comments/notes..."
echo ""

"$SCRIPTS_DIR/07-service-request-enhancements.sh"

echo "  ✓ Service request enhancements added"
echo ""

# ============================================================================
# STEP 6: ADD MISSING PRODUCTION TABLES
# ============================================================================
echo "▶ Step 6: Adding production-specific tables (SLA, activities, notes)..."
echo ""

"$SCRIPTS_DIR/09-add-missing-production-tables.sh"

echo "  ✓ Production tables added"
echo ""

# ============================================================================
# STEP 7: FIX FILE EXTENSION COLUMN SIZE
# ============================================================================
echo "▶ Step 7: Updating file_extension column size for multi-format support..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Expand file_extension column from VARCHAR(10) to VARCHAR(50)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='service_attachments'
        AND column_name='file_extension'
        AND character_maximum_length = 10
    ) THEN
        ALTER TABLE service_attachments
        ALTER COLUMN file_extension TYPE VARCHAR(50);
        RAISE NOTICE 'Column expanded from VARCHAR(10) to VARCHAR(50)';
    ELSE
        RAISE NOTICE 'Column already expanded or does not exist';
    END IF;
END $$;

-- Update file extensions to allow multiple formats
UPDATE service_attachments
SET file_extension = 'pdf,docx,doc'
WHERE file_extension = 'docx';

UPDATE service_attachments
SET file_extension = 'pdf,xlsx,xls,csv'
WHERE file_extension = 'xlsx';

-- Update any remaining single 'pdf' to allow alternatives
UPDATE service_attachments
SET file_extension = 'pdf'
WHERE file_extension = 'pdf' AND file_extension NOT LIKE '%,%';
EOF

echo "  ✓ File extensions updated to support multiple formats"
echo ""

# ============================================================================
# STEP 8: VERIFICATION
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION SUMMARY                           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Total tables created:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"

echo ""
echo "✓ Key tables verified:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE information_schema.columns.table_name = tables.table_name) as columns
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'entity_master',
    'service_master',
    'service_attachments',
    'ea_service_requests',
    'ea_service_request_attachments',
    'ea_service_request_comments',
    'grievance_tickets',
    'tickets',
    'ticket_activity',
    'ticket_notes',
    'sla_breaches',
    'users',
    'user_roles',
    'accounts',
    'sessions'
  )
ORDER BY table_name;
EOF

echo ""
echo "✓ Reference data counts:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 'Entities' as category, COUNT(*) as count FROM entity_master
UNION ALL SELECT 'Services', COUNT(*) FROM service_master
UNION ALL SELECT 'Service Attachments', COUNT(*) FROM service_attachments
UNION ALL SELECT 'Priority Levels', COUNT(*) FROM priority_levels
UNION ALL SELECT 'User Roles', COUNT(*) FROM user_roles
ORDER BY category;
EOF

echo ""
echo "✓ EA Service Attachments by Service:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    sm.service_name,
    COUNT(sa.service_attachment_id) as documents,
    COUNT(CASE WHEN sa.is_mandatory THEN 1 END) as mandatory,
    COUNT(CASE WHEN NOT sa.is_mandatory THEN 1 END) as optional
FROM service_master sm
LEFT JOIN service_attachments sa ON sm.service_id = sa.service_id
WHERE sm.entity_id = 'AGY-002'
GROUP BY sm.service_name
ORDER BY sm.service_name;
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ MASTER INITIALIZATION COMPLETE                             ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ Core schema created (all Phase 2b tables)"
echo "  ✓ NextAuth authentication ready"
echo "  ✓ Service request comments enabled"
echo "  ✓ File extensions support multiple formats"
echo "  ✓ Reference data loaded"
echo "  ✓ 27 EA service attachment requirements configured"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "  1. Add admin user:"
echo "     ./database/05-add-initial-admin.sh"
echo "     (or with custom email:)"
echo "     ADMIN_EMAIL=your@email.com ADMIN_NAME=\"Name\" ./database/05-add-initial-admin.sh"
echo ""
echo "  2. Load sample data for testing:"
echo "     ./database/02-load-seed-data.sh"
echo ""
echo "  3. Verify analytics:"
echo "     ./database/03-verify-analytics.sh"
echo ""
echo "  4. Configure OAuth in frontend/.env.local:"
echo "     - GOOGLE_CLIENT_ID"
echo "     - GOOGLE_CLIENT_SECRET"
echo "     - MICROSOFT_CLIENT_ID"
echo "     - MICROSOFT_CLIENT_SECRET"
echo "     - NEXTAUTH_SECRET"
echo "     - NEXTAUTH_URL"
echo ""
echo "✓ Database ready for GEA Portal v3!"
echo ""
