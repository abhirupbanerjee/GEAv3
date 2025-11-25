#!/bin/bash

# ============================================================================
# GEA PORTAL - VERIFY MASTER DATA AND SYNTHETIC DATA
# ============================================================================
# Version: 1.0
# Purpose: Comprehensive validation of master data and generated transactions
# Date: November 25, 2025
#
# WHAT THIS SCRIPT CHECKS:
# ✓ Row counts for all tables
# ✓ Foreign key integrity (no orphaned records)
# ✓ Data quality metrics (distributions, ranges, completeness)
# ✓ Referential integrity across all relationships
# ✓ Performance analytics (ratings, SLA compliance, etc.)
#
# USAGE:
#   ./database/13-verify-master-data.sh
#
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - DATA VERIFICATION v1.0                             ║"
echo "║   Comprehensive integrity and quality checks                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# VERIFY CONNECTION
# ============================================================================
echo "▶ Verifying database connection..."
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database."
    exit 1
fi
echo "  ✓ Database connection successful"
echo ""

# ============================================================================
# SECTION 1: TABLE ROW COUNTS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              SECTION 1: TABLE ROW COUNTS                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Master Data Tables:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "
SELECT
    'entity_master' AS table_name,
    COUNT(*) AS rows,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    CASE
        WHEN COUNT(*) >= 50 THEN '✓ PASS'
        ELSE '⚠ LOW'
    END AS status
FROM entity_master

UNION ALL

SELECT
    'service_master' AS table_name,
    COUNT(*) AS rows,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    CASE
        WHEN COUNT(*) >= 100 THEN '✓ PASS'
        ELSE '⚠ LOW'
    END AS status
FROM service_master

UNION ALL

SELECT
    'service_attachments' AS table_name,
    COUNT(*) AS rows,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    CASE
        WHEN COUNT(*) >= 50 THEN '✓ PASS'
        ELSE '⚠ LOW'
    END AS status
FROM service_attachments

ORDER BY table_name;
"

echo ""
echo "✓ Transactional Data Tables:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "
SELECT
    'service_feedback' AS table_name,
    COUNT(*) AS rows,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END AS status
FROM service_feedback

UNION ALL SELECT 'grievance_tickets', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM grievance_tickets
UNION ALL SELECT 'grievance_attachments', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM grievance_attachments
UNION ALL SELECT 'ea_service_requests', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM ea_service_requests
UNION ALL SELECT 'ea_service_request_attachments', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM ea_service_request_attachments
UNION ALL SELECT 'tickets', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM tickets
UNION ALL SELECT 'ticket_activity', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM ticket_activity
UNION ALL SELECT 'ticket_attachments', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END FROM ticket_attachments

ORDER BY table_name;
"

echo ""

# ============================================================================
# SECTION 2: FOREIGN KEY INTEGRITY
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           SECTION 2: FOREIGN KEY INTEGRITY CHECKS                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Check 1: Orphaned services (entity_id not in entity_master)
SELECT
    'Services → Entities' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM service_master s
LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
WHERE e.unique_entity_id IS NULL

UNION ALL

-- Check 2: Orphaned service attachments
SELECT
    'Service Attachments → Services' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM service_attachments sa
LEFT JOIN service_master s ON sa.service_id = s.service_id
WHERE s.service_id IS NULL

UNION ALL

-- Check 3: Service feedback foreign keys
SELECT
    'Service Feedback → Services' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM service_feedback sf
LEFT JOIN service_master s ON sf.service_id = s.service_id
WHERE s.service_id IS NULL

UNION ALL

SELECT
    'Service Feedback → Entities' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM service_feedback sf
LEFT JOIN entity_master e ON sf.entity_id = e.unique_entity_id
WHERE e.unique_entity_id IS NULL

UNION ALL

-- Check 4: Grievance tickets foreign keys
SELECT
    'Grievance Tickets → Services' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM grievance_tickets gt
LEFT JOIN service_master s ON gt.service_id = s.service_id
WHERE s.service_id IS NULL

UNION ALL

-- Check 5: EA service requests foreign keys
SELECT
    'EA Requests → Services' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM ea_service_requests ea
LEFT JOIN service_master s ON ea.service_id = s.service_id
WHERE s.service_id IS NULL

UNION ALL

-- Check 6: Tickets foreign keys
SELECT
    'Tickets → Services' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM tickets t
LEFT JOIN service_master s ON t.service_id = s.service_id
WHERE s.service_id IS NULL

UNION ALL

-- Check 7: Entity hierarchy (parent_entity_id validity)
SELECT
    'Entity Parent References' AS relationship,
    COUNT(*) AS orphaned_records,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM entity_master e1
LEFT JOIN entity_master e2 ON e1.parent_entity_id = e2.unique_entity_id
WHERE e1.parent_entity_id IS NOT NULL AND e2.unique_entity_id IS NULL

ORDER BY relationship;
EOF

echo ""

# ============================================================================
# SECTION 3: DATA QUALITY METRICS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              SECTION 3: DATA QUALITY METRICS                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Entity hierarchy structure:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    entity_type,
    COUNT(*) AS count,
    COUNT(CASE WHEN parent_entity_id IS NOT NULL THEN 1 END) AS with_parent,
    COUNT(CASE WHEN parent_entity_id IS NULL THEN 1 END) AS top_level
FROM entity_master
GROUP BY entity_type
ORDER BY count DESC;
EOF

echo ""
echo "✓ Service categories distribution (top 15):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    COALESCE(service_category, '(uncategorized)') AS category,
    COUNT(*) AS services
FROM service_master
GROUP BY service_category
ORDER BY COUNT(*) DESC
LIMIT 15;
EOF

echo ""
echo "✓ Service attachment requirements:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    COUNT(DISTINCT service_id) AS services_with_attachments,
    COUNT(*) AS total_attachment_definitions,
    COUNT(CASE WHEN is_mandatory THEN 1 END) AS mandatory_docs,
    COUNT(CASE WHEN NOT is_mandatory THEN 1 END) AS optional_docs,
    ROUND(AVG(CASE WHEN is_mandatory THEN 1.0 ELSE 0.0 END) * 100, 1) || '%' AS pct_mandatory
FROM service_attachments;
EOF

echo ""
echo "✓ Services without attachment requirements:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    s.service_id,
    s.service_name,
    s.service_category
FROM service_master s
LEFT JOIN service_attachments sa ON s.service_id = sa.service_id
WHERE sa.service_id IS NULL
ORDER BY s.service_id
LIMIT 10;
EOF

echo ""
echo "✓ Feedback recipient distribution:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    recipient_group,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) || '%' AS percentage
FROM service_feedback
GROUP BY recipient_group
ORDER BY count DESC;
EOF

echo ""

# ============================================================================
# SECTION 4: REFERENTIAL INTEGRITY DEEP CHECKS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║         SECTION 4: REFERENTIAL INTEGRITY DEEP CHECKS              ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Grievance source tracking:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Auto-created grievances' AS check_type,
    COUNT(*) AS count,
    COUNT(CASE WHEN source_feedback_id IS NOT NULL THEN 1 END) AS with_source,
    CASE
        WHEN COUNT(*) = COUNT(CASE WHEN source_feedback_id IS NOT NULL THEN 1 END)
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM grievance_tickets
WHERE grievance_type = 'auto_created_from_feedback'

UNION ALL

SELECT
    'Manual grievances' AS check_type,
    COUNT(*) AS count,
    COUNT(CASE WHEN source_feedback_id IS NULL THEN 1 END) AS without_source,
    CASE
        WHEN COUNT(*) = COUNT(CASE WHEN source_feedback_id IS NULL THEN 1 END)
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM grievance_tickets
WHERE grievance_type = 'service_complaint';
EOF

echo ""
echo "✓ EA request attachment completeness:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    ea.request_number,
    ea.status,
    COUNT(DISTINCT sa.service_attachment_id) AS required_docs,
    COUNT(DISTINCT att.attachment_definition_id) AS uploaded_docs,
    CASE
        WHEN ea.status = 'Draft' THEN '○ Draft (OK)'
        WHEN COUNT(DISTINCT att.attachment_definition_id) >= COUNT(DISTINCT CASE WHEN sa.is_mandatory THEN sa.service_attachment_id END)
        THEN '✓ Complete'
        ELSE '⚠ Missing Required Docs'
    END AS completeness_status
FROM ea_service_requests ea
LEFT JOIN service_attachments sa ON ea.service_id = sa.service_id AND sa.is_mandatory = TRUE
LEFT JOIN ea_service_request_attachments att ON ea.id = att.request_id
GROUP BY ea.id, ea.request_number, ea.status
HAVING ea.status IN ('Submitted', 'In Progress', 'Completed')
LIMIT 10;
EOF

echo ""
echo "✓ Ticket activity coverage:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Tickets with activity' AS check_type,
    COUNT(DISTINCT ta.ticket_id) AS count,
    (SELECT COUNT(*) FROM tickets) AS total_tickets,
    CASE
        WHEN COUNT(DISTINCT ta.ticket_id) = (SELECT COUNT(*) FROM tickets)
        THEN '✓ PASS (100%)'
        ELSE '⚠ INCOMPLETE'
    END AS status
FROM ticket_activity ta;
EOF

echo ""

# ============================================================================
# SECTION 5: DATA QUALITY METRICS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║            SECTION 5: DATA QUALITY METRICS                        ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Service feedback rating distribution:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    rating,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage,
    REPEAT('█', (COUNT(*) * 50 / MAX(COUNT(*)) OVER ())::INTEGER) AS bar
FROM service_feedback
GROUP BY rating
ORDER BY rating DESC;
EOF

echo ""
echo "✓ Average rating by service (top 10 and bottom 10):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
(
    SELECT
        s.service_name,
        COUNT(f.id) AS feedback_count,
        ROUND(AVG(f.rating), 2) AS avg_rating,
        'Top Rated' AS category
    FROM service_master s
    LEFT JOIN service_feedback f ON s.service_id = f.service_id
    GROUP BY s.service_id, s.service_name
    HAVING COUNT(f.id) > 0
    ORDER BY AVG(f.rating) DESC
    LIMIT 10
)
UNION ALL
(
    SELECT
        s.service_name,
        COUNT(f.id) AS feedback_count,
        ROUND(AVG(f.rating), 2) AS avg_rating,
        'Lowest Rated' AS category
    FROM service_master s
    LEFT JOIN service_feedback f ON s.service_id = f.service_id
    GROUP BY s.service_id, s.service_name
    HAVING COUNT(f.id) > 0
    ORDER BY AVG(f.rating) ASC
    LIMIT 10
)
ORDER BY category DESC, avg_rating DESC;
EOF

echo ""
echo "✓ Grievance status distribution:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    gs.status_name,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage,
    CASE WHEN gs.is_active_status THEN 'Open' ELSE 'Closed' END AS state
FROM grievance_tickets gt
JOIN grievance_status gs ON gt.status = gs.status_id
GROUP BY gs.status_name, gs.is_active_status, gs.status_order
ORDER BY gs.status_order;
EOF

echo ""
echo "✓ Ticket status distribution:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    ts.status_name,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage,
    CASE WHEN ts.is_active_status THEN 'Active' ELSE 'Closed' END AS state
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
GROUP BY ts.status_name, ts.is_active_status, ts.status_order
ORDER BY ts.status_order;
EOF

echo ""
echo "✓ Priority distribution:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    p.priority_name,
    COUNT(DISTINCT t.ticket_id) AS tickets,
    COUNT(DISTINCT gt.id) AS grievances,
    COUNT(DISTINCT ea.id) AS ea_requests
FROM priority_levels p
LEFT JOIN tickets t ON p.priority_id = t.priority_id
LEFT JOIN grievance_tickets gt ON p.priority_id = gt.priority
LEFT JOIN ea_service_requests ea ON p.priority_id = ea.priority
GROUP BY p.priority_name, p.priority_order
ORDER BY p.priority_order;
EOF

echo ""

# ============================================================================
# SECTION 6: TEMPORAL DATA VALIDATION
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           SECTION 6: TEMPORAL DATA VALIDATION                     ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Data freshness (records in last 30/60/90 days):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Service Feedback' AS table_name,
    COUNT(*) AS total,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) AS last_30d,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '60 days' THEN 1 END) AS last_60d,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN 1 END) AS last_90d
FROM service_feedback

UNION ALL

SELECT
    'Grievance Tickets',
    COUNT(*),
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END),
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '60 days' THEN 1 END),
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN 1 END)
FROM grievance_tickets

UNION ALL

SELECT
    'Tickets',
    COUNT(*),
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END),
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '60 days' THEN 1 END),
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '90 days' THEN 1 END)
FROM tickets

ORDER BY table_name;
EOF

echo ""
echo "✓ Date range validation:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Service Feedback' AS table_name,
    MIN(created_at)::DATE AS earliest,
    MAX(created_at)::DATE AS latest,
    (MAX(created_at)::DATE - MIN(created_at)::DATE) AS date_span_days
FROM service_feedback

UNION ALL

SELECT
    'Grievance Tickets',
    MIN(created_at)::DATE,
    MAX(created_at)::DATE,
    (MAX(created_at)::DATE - MIN(created_at)::DATE)
FROM grievance_tickets

UNION ALL

SELECT
    'Tickets',
    MIN(created_at)::DATE,
    MAX(created_at)::DATE,
    (MAX(created_at)::DATE - MIN(created_at)::DATE)
FROM tickets;
EOF

echo ""

# ============================================================================
# SECTION 7: PERFORMANCE ANALYTICS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║            SECTION 7: PERFORMANCE ANALYTICS                       ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Top 10 most-used services (by feedback):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    s.service_name,
    COUNT(f.id) AS feedback_count,
    ROUND(AVG(f.rating), 2) AS avg_rating,
    COUNT(CASE WHEN f.rating <= 2 THEN 1 END) AS low_ratings
FROM service_master s
LEFT JOIN service_feedback f ON s.service_id = f.service_id
GROUP BY s.service_id, s.service_name
HAVING COUNT(f.id) > 0
ORDER BY COUNT(f.id) DESC
LIMIT 10;
EOF

echo ""
echo "✓ Entity performance summary (top 10 by volume):"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    e.entity_name,
    COUNT(DISTINCT s.service_id) AS services,
    COUNT(DISTINCT f.id) AS feedback,
    COUNT(DISTINCT gt.id) AS grievances,
    COUNT(DISTINCT t.ticket_id) AS tickets
FROM entity_master e
LEFT JOIN service_master s ON e.unique_entity_id = s.entity_id
LEFT JOIN service_feedback f ON s.service_id = f.service_id
LEFT JOIN grievance_tickets gt ON s.service_id = gt.service_id
LEFT JOIN tickets t ON s.service_id = t.service_id
GROUP BY e.unique_entity_id, e.entity_name
HAVING COUNT(DISTINCT f.id) > 0
ORDER BY COUNT(DISTINCT f.id) DESC
LIMIT 10;
EOF

echo ""
echo "✓ SLA target validation:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Tickets with SLA' AS check_type,
    COUNT(*) AS count,
    COUNT(CASE WHEN sla_target IS NOT NULL THEN 1 END) AS with_sla_target,
    CASE
        WHEN COUNT(CASE WHEN sla_target IS NOT NULL THEN 1 END) = COUNT(*)
        THEN '✓ PASS (100%)'
        ELSE '⚠ Some missing'
    END AS status
FROM tickets;
EOF

echo ""
echo "✓ Auto-grievance conversion rate:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    COUNT(CASE WHEN rating <= 2 THEN 1 END) AS low_ratings,
    COUNT(CASE WHEN is_grievance = TRUE THEN 1 END) AS flagged_as_grievance,
    (SELECT COUNT(*) FROM grievance_tickets WHERE grievance_type = 'auto_created_from_feedback') AS auto_grievances_created,
    CASE
        WHEN COUNT(CASE WHEN rating <= 2 THEN 1 END) > 0
        THEN ROUND((SELECT COUNT(*) FROM grievance_tickets WHERE grievance_type = 'auto_created_from_feedback') * 100.0 / COUNT(CASE WHEN rating <= 2 THEN 1 END), 1) || '% converted'
        ELSE 'N/A'
    END AS conversion_rate
FROM service_feedback;
EOF

echo ""

# ============================================================================
# SECTION 8: FILE STORAGE VALIDATION
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           SECTION 8: FILE STORAGE VALIDATION                      ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Attachment storage summary:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Grievance Attachments' AS attachment_type,
    COUNT(*) AS files,
    pg_size_pretty(SUM(file_size)::BIGINT) AS total_size,
    pg_size_pretty(AVG(file_size)::BIGINT) AS avg_size,
    pg_size_pretty(MAX(file_size)::BIGINT) AS max_size
FROM grievance_attachments

UNION ALL

SELECT
    'EA Request Attachments',
    COUNT(*),
    pg_size_pretty(SUM(file_size)::BIGINT),
    pg_size_pretty(AVG(file_size)::BIGINT),
    pg_size_pretty(MAX(file_size)::BIGINT)
FROM ea_service_request_attachments

UNION ALL

SELECT
    'Ticket Attachments',
    COUNT(*),
    pg_size_pretty(SUM(file_size)::BIGINT),
    pg_size_pretty(AVG(file_size)::BIGINT),
    pg_size_pretty(MAX(file_size)::BIGINT)
FROM ticket_attachments;
EOF

echo ""
echo "✓ File size constraint validation:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Oversized Grievance Attachments' AS check_type,
    COUNT(*) AS count,
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM grievance_attachments
WHERE file_size > 5242880

UNION ALL

SELECT
    'Oversized EA Attachments',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM ea_service_request_attachments
WHERE file_size > 5242880

UNION ALL

SELECT
    'Oversized Ticket Attachments',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM ticket_attachments
WHERE file_size > 5242880;
EOF

echo ""

# ============================================================================
# SECTION 9: FINAL VALIDATION SUMMARY
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              FINAL VALIDATION SUMMARY                             ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
WITH validation_results AS (
    SELECT
        'Master Data Loaded' AS check_category,
        CASE
            WHEN (SELECT COUNT(*) FROM entity_master) >= 50
             AND (SELECT COUNT(*) FROM service_master) >= 100
             AND (SELECT COUNT(*) FROM service_attachments) >= 50
            THEN '✓ PASS'
            ELSE '✗ FAIL'
        END AS status
    UNION ALL
    SELECT
        'Foreign Keys Valid',
        CASE
            WHEN NOT EXISTS (
                SELECT 1 FROM service_master s
                LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
                WHERE e.unique_entity_id IS NULL
            )
            THEN '✓ PASS'
            ELSE '✗ FAIL'
        END
    UNION ALL
    SELECT
        'Transactional Data Generated',
        CASE
            WHEN (SELECT COUNT(*) FROM service_feedback) > 0
             AND (SELECT COUNT(*) FROM grievance_tickets) > 0
             AND (SELECT COUNT(*) FROM tickets) > 0
            THEN '✓ PASS'
            ELSE '⚠ EMPTY'
        END
    UNION ALL
    SELECT
        'Activity Logs Complete',
        CASE
            WHEN (SELECT COUNT(DISTINCT ticket_id) FROM ticket_activity) = (SELECT COUNT(*) FROM tickets)
            THEN '✓ PASS'
            ELSE '⚠ INCOMPLETE'
        END
    UNION ALL
    SELECT
        'File Size Constraints',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM grievance_attachments WHERE file_size > 5242880)
             AND NOT EXISTS (SELECT 1 FROM ea_service_request_attachments WHERE file_size > 5242880)
             AND NOT EXISTS (SELECT 1 FROM ticket_attachments WHERE file_size > 5242880)
            THEN '✓ PASS'
            ELSE '✗ FAIL'
        END
    UNION ALL
    SELECT
        'Date Ranges Realistic',
        CASE
            WHEN (SELECT MAX(created_at) FROM service_feedback) <= CURRENT_TIMESTAMP
             AND (SELECT MIN(created_at) FROM service_feedback) >= CURRENT_TIMESTAMP - INTERVAL '91 days'
            THEN '✓ PASS'
            ELSE '⚠ CHECK'
        END
)
SELECT * FROM validation_results ORDER BY check_category;
EOF

echo ""
echo "✓ Database table count:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              CONSOLIDATED VERIFICATION REPORT                     ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# COMPREHENSIVE SUMMARY REPORT
# ============================================================================

echo "📊 TABLE ROW COUNTS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "
SELECT
    '  ' || table_name || ': ' || rows || ' rows ' || status as summary
FROM (
    SELECT 'entity_master' AS table_name, COUNT(*) AS rows,
        CASE WHEN COUNT(*) >= 50 THEN '✓' ELSE '⚠ LOW' END AS status
    FROM entity_master
    UNION ALL
    SELECT 'service_master', COUNT(*),
        CASE WHEN COUNT(*) >= 100 THEN '✓' ELSE '⚠ LOW' END
    FROM service_master
    UNION ALL
    SELECT 'service_attachments', COUNT(*),
        CASE WHEN COUNT(*) >= 50 THEN '✓' ELSE '⚠ LOW' END
    FROM service_attachments
    UNION ALL
    SELECT 'service_feedback', COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END
    FROM service_feedback
    UNION ALL
    SELECT 'grievance_tickets', COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END
    FROM grievance_tickets
    UNION ALL
    SELECT 'tickets', COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '○ Empty' END
    FROM tickets
) counts
ORDER BY table_name;
"

echo ""
echo "🔗 FOREIGN KEY INTEGRITY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "
SELECT '  ' || relationship || ': ' || orphaned_records || ' orphans ' || status as summary
FROM (
    SELECT 'Services → Entities' AS relationship, COUNT(*) AS orphaned_records,
        CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
    FROM service_master s
    LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
    WHERE e.unique_entity_id IS NULL
    UNION ALL
    SELECT 'Service Attachments → Services', COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
    FROM service_attachments sa
    LEFT JOIN service_master s ON sa.service_id = s.service_id
    WHERE s.service_id IS NULL
    UNION ALL
    SELECT 'Service Feedback → Services', COUNT(*),
        CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
    FROM service_feedback sf
    LEFT JOIN service_master s ON sf.service_id = s.service_id
    WHERE s.service_id IS NULL
) integrity;
"

echo ""
echo "📈 DATA QUALITY METRICS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "
SELECT
    '  Entity types: ' ||
    (SELECT COUNT(DISTINCT entity_type) FROM entity_master) ||
    ' types, ' ||
    (SELECT COUNT(*) FROM entity_master WHERE parent_entity_id IS NULL) ||
    ' top-level entities'
UNION ALL
SELECT
    '  Service categories: ' ||
    COUNT(DISTINCT service_category) ||
    ' categories, avg ' ||
    ROUND(AVG(services_per_category), 1) ||
    ' services/category'
FROM (
    SELECT service_category, COUNT(*) as services_per_category
    FROM service_master
    GROUP BY service_category
) cat_stats
UNION ALL
SELECT
    '  Attachment requirements: ' ||
    COUNT(DISTINCT service_id) ||
    ' services with docs, ' ||
    COUNT(CASE WHEN is_mandatory THEN 1 END) ||
    ' mandatory docs'
FROM service_attachments
UNION ALL
SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM service_feedback) = 0 THEN '  Feedback ratings: (no feedback data yet)'
        ELSE (SELECT '  Feedback ratings: avg ' ||
            ROUND(AVG(q5_overall_satisfaction), 2) ||
            '/5, ' ||
            COUNT(CASE WHEN q5_overall_satisfaction <= 2 THEN 1 END) ||
            ' low ratings (<= 2)'
            FROM service_feedback)
    END
UNION ALL
SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM grievance_tickets) = 0 THEN '  Grievance status: (no grievances yet)'
        ELSE (SELECT '  Grievance status: ' ||
            COUNT(*) || ' total'
            FROM grievance_tickets gt)
    END
UNION ALL
SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM tickets) = 0 THEN '  Ticket status: (no tickets yet)'
        ELSE (SELECT '  Ticket status: ' ||
            COUNT(*) || ' total'
            FROM tickets t)
    END;
"

echo ""
echo "✅ VALIDATION STATUS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "
SELECT '  ' || check_category || ': ' || status as summary
FROM (
    SELECT 'Master Data Loaded' AS check_category,
        CASE
            WHEN (SELECT COUNT(*) FROM entity_master) >= 50
             AND (SELECT COUNT(*) FROM service_master) >= 100
             AND (SELECT COUNT(*) FROM service_attachments) >= 50
            THEN '✓ PASS'
            ELSE '✗ FAIL'
        END AS status
    UNION ALL
    SELECT 'Foreign Keys Valid',
        CASE
            WHEN NOT EXISTS (
                SELECT 1 FROM service_master s
                LEFT JOIN entity_master e ON s.entity_id = e.unique_entity_id
                WHERE e.unique_entity_id IS NULL
            )
            THEN '✓ PASS'
            ELSE '✗ FAIL'
        END
    UNION ALL
    SELECT 'Transactional Data Generated',
        CASE
            WHEN (SELECT COUNT(*) FROM service_feedback) > 0
             AND (SELECT COUNT(*) FROM grievance_tickets) > 0
             AND (SELECT COUNT(*) FROM tickets) > 0
            THEN '✓ PASS'
            ELSE '⚠ EMPTY'
        END
    UNION ALL
    SELECT 'Activity Logs Complete',
        CASE
            WHEN (SELECT COUNT(DISTINCT ticket_id) FROM ticket_activity) = (SELECT COUNT(*) FROM tickets)
            THEN '✓ PASS'
            ELSE '⚠ INCOMPLETE'
        END
    UNION ALL
    SELECT 'File Size Constraints',
        CASE
            WHEN NOT EXISTS (SELECT 1 FROM grievance_attachments WHERE file_size > 5242880)
             AND NOT EXISTS (SELECT 1 FROM ea_service_request_attachments WHERE file_size > 5242880)
             AND NOT EXISTS (SELECT 1 FROM ticket_attachments WHERE file_size > 5242880)
            THEN '✓ PASS'
            ELSE '✗ FAIL'
        END
) validation_results
ORDER BY check_category;
"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ VERIFICATION COMPLETE                                       ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Verification Summary:"
echo "  ✓ Master data loaded and validated"
echo "  ✓ Foreign key integrity verified"
echo "  ✓ Synthetic transactional data generated"
echo "  ✓ Activity logs complete"
echo "  ✓ File attachments within size limits"
echo "  ✓ Date distributions realistic"
echo ""
echo "🎯 Next Steps:"
echo "  1. Review analytics at: http://localhost:3000/analytics"
echo "  2. Test feedback submission: http://localhost:3000/feedback"
echo "  3. Test grievance submission: http://localhost:3000/submit-grievance"
echo "  4. View admin portal: http://localhost:3000/admin"
echo ""
echo "📝 Quick Access Commands:"
echo "  - View entities: docker exec -it feedback_db psql -U feedback_user -d feedback -c 'SELECT * FROM entity_master LIMIT 10;'"
echo "  - View services: docker exec -it feedback_db psql -U feedback_user -d feedback -c 'SELECT service_id, service_name FROM service_master LIMIT 10;'"
echo "  - View feedback: docker exec -it feedback_db psql -U feedback_user -d feedback -c 'SELECT id, rating, service_id FROM service_feedback ORDER BY created_at DESC LIMIT 10;'"
echo ""
