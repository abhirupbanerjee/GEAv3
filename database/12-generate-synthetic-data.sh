#!/bin/bash

# ============================================================================
# GEA PORTAL - GENERATE SYNTHETIC TRANSACTIONAL DATA
# ============================================================================
# Version: 1.0
# Purpose: Generate realistic test data based on loaded master data
# Date: November 25, 2025
#
# WHAT THIS SCRIPT GENERATES:
# ✓ 200 Service Feedback records (distributed across all services)
# ✓ 50 Grievance Tickets (auto-created + manual submissions)
# ✓ 30 EA Service Requests (with required attachments)
# ✓ 80 Unified Tickets (with activity logs and notes)
# ✓ Realistic date distributions (last 90 days)
# ✓ Varied statuses, priorities, and user types
#
# PREREQUISITES:
# - Master data must be loaded (run ./database/11-load-master-data.sh first)
# - Database must have reference data (priority_levels, ticket_status, etc.)
#
# USAGE:
#   ./database/12-generate-synthetic-data.sh
#
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - GENERATE SYNTHETIC DATA v1.0                       ║"
echo "║   Creating realistic test data for all modules                    ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================================
echo "▶ Step 1: Verifying prerequisites..."

if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "✗ Cannot connect to database."
    exit 1
fi

# Check if master data is loaded
ENTITY_COUNT=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM entity_master" | tr -d ' ')
SERVICE_COUNT=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM service_master" | tr -d ' ')

if [ "$ENTITY_COUNT" -eq 0 ] || [ "$SERVICE_COUNT" -eq 0 ]; then
    echo "✗ Master data not loaded. Run ./database/11-load-master-data.sh first"
    exit 1
fi

echo "  ✓ Database connection successful"
echo "  ✓ Master data loaded ($ENTITY_COUNT entities, $SERVICE_COUNT services)"
echo ""

# ============================================================================
# STEP 2: GENERATE SERVICE FEEDBACK (200 records)
# ============================================================================
echo "▶ Step 2: Generating service feedback (200 records)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Generate 200 service feedback records with realistic distribution
WITH service_list AS (
    SELECT service_id, entity_id
    FROM service_master
    WHERE is_active = TRUE
    ORDER BY RANDOM()
),
recipient_groups AS (
    SELECT unnest(ARRAY['citizen', 'business', 'government', 'tourist', 'student', 'other']) AS recipient_group
),
channels AS (
    SELECT unnest(ARRAY['web', 'web', 'web', 'web', 'qr', 'mobile', 'kiosk']) AS channel
),
ratings AS (
    -- Weighted toward positive ratings (realistic distribution)
    SELECT unnest(ARRAY[5,5,5,5,5,4,4,4,4,3,3,2,1]) AS rating
),
generated_feedback AS (
    SELECT
        (SELECT service_id FROM service_list ORDER BY RANDOM() LIMIT 1) AS service_id,
        (SELECT entity_id FROM service_list s WHERE s.service_id = (SELECT service_id FROM service_list ORDER BY RANDOM() LIMIT 1) LIMIT 1) AS entity_id,
        (SELECT rating FROM ratings ORDER BY RANDOM() LIMIT 1) AS rating,
        (SELECT channel FROM channels ORDER BY RANDOM() LIMIT 1) AS channel,
        (SELECT recipient_group FROM recipient_groups ORDER BY RANDOM() LIMIT 1) AS recipient_group,
        CASE
            WHEN RANDOM() < 0.3 THEN 'Great service, very satisfied!'
            WHEN RANDOM() < 0.6 THEN 'Service was acceptable, but could be improved.'
            WHEN RANDOM() < 0.8 THEN 'Had some issues with the process.'
            ELSE 'Very disappointed with the service experience.'
        END AS comments,
        CASE WHEN RANDOM() < 0.4 THEN 'John Citizen' ELSE NULL END AS contact_name,
        CASE WHEN RANDOM() < 0.3 THEN 'citizen@example.gd' ELSE NULL END AS contact_email,
        CASE WHEN RANDOM() < 0.2 THEN '473-555-0100' ELSE NULL END AS contact_phone,
        MD5(RANDOM()::TEXT) AS ip_hash,
        CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days') AS created_at
    FROM generate_series(1, 200)
)
INSERT INTO service_feedback (
    service_id,
    entity_id,
    rating,
    channel,
    recipient_group,
    comments,
    contact_name,
    contact_email,
    contact_phone,
    ip_hash,
    created_at,
    is_grievance
)
SELECT
    gf.service_id,
    (SELECT entity_id FROM service_master WHERE service_id = gf.service_id),
    gf.rating,
    gf.channel,
    gf.recipient_group,
    gf.comments,
    gf.contact_name,
    gf.contact_email,
    gf.contact_phone,
    gf.ip_hash,
    gf.created_at,
    CASE WHEN gf.rating <= 2 THEN TRUE ELSE FALSE END
FROM generated_feedback gf;

SELECT COUNT(*) AS feedback_created FROM service_feedback;
EOF

echo "  ✓ Service feedback generated"
echo ""

# ============================================================================
# STEP 3: GENERATE GRIEVANCE TICKETS (50 records)
# ============================================================================
echo "▶ Step 3: Generating grievance tickets (50 records)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Part A: Auto-created grievances from low-rated feedback (20 records)
WITH low_feedback AS (
    SELECT
        id,
        service_id,
        entity_id,
        rating,
        comments,
        contact_name,
        contact_email,
        contact_phone,
        ip_hash,
        created_at,
        recipient_group
    FROM service_feedback
    WHERE rating <= 2
    ORDER BY RANDOM()
    LIMIT 20
)
INSERT INTO grievance_tickets (
    grievance_number,
    service_id,
    entity_id,
    grievance_type,
    source_feedback_id,
    requester_category,
    subject,
    description,
    contact_name,
    contact_email,
    contact_phone,
    status,
    priority,
    ip_hash,
    created_at
)
SELECT
    'GRV-' || TO_CHAR(lf.created_at, 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY lf.created_at))::TEXT, 4, '0'),
    lf.service_id,
    lf.entity_id,
    'auto_created_from_feedback',
    lf.id,
    lf.recipient_group,
    'Poor service experience - Rating: ' || lf.rating || ' stars',
    COALESCE(lf.comments, 'Service experience was unsatisfactory.'),
    COALESCE(lf.contact_name, 'Anonymous Citizen'),
    COALESCE(lf.contact_email, 'noreply@example.gd'),
    lf.contact_phone,
    (SELECT status_id FROM grievance_status ORDER BY RANDOM() LIMIT 1),
    (SELECT priority_id FROM priority_levels WHERE priority_code IN ('high', 'medium') ORDER BY RANDOM() LIMIT 1),
    lf.ip_hash,
    lf.created_at + INTERVAL '5 minutes'
FROM low_feedback lf;

-- Part B: Manual citizen-submitted grievances (30 records)
WITH service_list AS (
    SELECT service_id, entity_id FROM service_master WHERE is_active = TRUE
),
grievance_subjects AS (
    SELECT unnest(ARRAY[
        'Long waiting times at service counter',
        'Staff was unhelpful and rude',
        'Website portal is not functioning',
        'Required documents were not clearly listed',
        'Application was lost or misplaced',
        'Processing time exceeded stated timeframe',
        'Incorrect information provided by staff',
        'Facility was closed during posted hours',
        'Unable to reach office by phone',
        'Payment system not working properly',
        'Forms not available for download',
        'Discriminatory treatment experienced',
        'Service denied without valid reason',
        'Requested callback never received',
        'Email inquiries not answered'
    ]) AS subject
),
requester_categories AS (
    SELECT unnest(ARRAY['citizen', 'citizen', 'citizen', 'business', 'government']) AS category
)
INSERT INTO grievance_tickets (
    grievance_number,
    service_id,
    entity_id,
    grievance_type,
    requester_category,
    subject,
    description,
    contact_name,
    contact_email,
    contact_phone,
    status,
    priority,
    ip_hash,
    created_at
)
SELECT
    'GRV-' || TO_CHAR(CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days'), 'YYYYMMDD') || '-' || LPAD((5000 + generate_series)::TEXT, 4, '0'),
    (SELECT service_id FROM service_list ORDER BY RANDOM() LIMIT 1),
    (SELECT entity_id FROM service_master WHERE service_id = (SELECT service_id FROM service_list ORDER BY RANDOM() LIMIT 1) LIMIT 1),
    'service_complaint',
    (SELECT category FROM requester_categories ORDER BY RANDOM() LIMIT 1),
    (SELECT subject FROM grievance_subjects ORDER BY RANDOM() LIMIT 1),
    'This grievance outlines significant concerns with the service delivery. ' ||
    'Despite multiple attempts to resolve the issue, no satisfactory response was received. ' ||
    'Immediate attention and corrective action are requested.',
    CASE
        WHEN RANDOM() < 0.5 THEN 'Maria Rodriguez'
        WHEN RANDOM() < 0.7 THEN 'James Williams'
        ELSE 'Sarah Johnson'
    END,
    CASE
        WHEN RANDOM() < 0.6 THEN 'citizen' || generate_series || '@example.gd'
        ELSE NULL
    END,
    CASE WHEN RANDOM() < 0.5 THEN '473-555-01' || LPAD(generate_series::TEXT, 2, '0') ELSE NULL END,
    (SELECT status_id FROM grievance_status ORDER BY RANDOM() LIMIT 1),
    (SELECT priority_id FROM priority_levels ORDER BY RANDOM() LIMIT 1),
    MD5(generate_series::TEXT),
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days')
FROM generate_series(1, 30);

SELECT COUNT(*) AS grievances_created FROM grievance_tickets;
EOF

echo "  ✓ Grievance tickets generated"
echo ""

# ============================================================================
# STEP 4: GENERATE GRIEVANCE ATTACHMENTS (20 attachments for 20 grievances)
# ============================================================================
echo "▶ Step 4: Generating grievance attachments (20 files)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Add attachments to 40% of grievances
WITH grievances_sample AS (
    SELECT id
    FROM grievance_tickets
    ORDER BY RANDOM()
    LIMIT 20
)
INSERT INTO grievance_attachments (
    grievance_id,
    file_name,
    file_type,
    file_size,
    file_data,
    uploaded_at
)
SELECT
    gs.id,
    'evidence_document_' || gs.id || '.pdf',
    'application/pdf',
    100000 + (RANDOM() * 500000)::INTEGER,
    decode('255044462D312E340A', 'hex'), -- Minimal PDF header bytes
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '85 days')
FROM grievances_sample gs;

SELECT COUNT(*) AS attachments_created FROM grievance_attachments;
EOF

echo "  ✓ Grievance attachments generated"
echo ""

# ============================================================================
# STEP 5: GENERATE EA SERVICE REQUESTS (30 records)
# ============================================================================
echo "▶ Step 5: Generating EA service requests (30 records)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Generate 30 EA service requests
WITH service_list AS (
    SELECT service_id, entity_id
    FROM service_master
    WHERE is_active = TRUE
    ORDER BY RANDOM()
    LIMIT 30
),
statuses AS (
    SELECT unnest(ARRAY['Draft', 'Draft', 'Submitted', 'Submitted', 'Submitted', 'In Progress', 'In Progress', 'Completed', 'Completed']) AS status
),
departments AS (
    SELECT unnest(ARRAY[
        'Digital Transformation Agency',
        'Ministry of Finance',
        'Ministry of Health',
        'Ministry of Education',
        'Immigration Department',
        'Inland Revenue Division',
        'Customs & Excise Division',
        'Building & Planning Authority'
    ]) AS dept
),
requesters AS (
    SELECT unnest(ARRAY[
        'John Smith',
        'Sarah Thompson',
        'Michael Brown',
        'Jennifer Davis',
        'Robert Wilson',
        'Patricia Martinez',
        'David Anderson'
    ]) AS name
)
INSERT INTO ea_service_requests (
    request_number,
    service_id,
    entity_id,
    requester_name,
    requester_email,
    requester_phone,
    requester_department,
    priority,
    status,
    description,
    notes,
    created_at,
    submitted_at,
    completed_at
)
SELECT
    'EA-' || TO_CHAR(created_ts, 'YYYYMMDD') || '-' || LPAD(generate_series::TEXT, 4, '0'),
    sl.service_id,
    sl.entity_id,
    (SELECT name FROM requesters ORDER BY RANDOM() LIMIT 1),
    'requester' || generate_series || '@gov.gd',
    CASE WHEN RANDOM() < 0.6 THEN '473-440-' || (2000 + generate_series) ELSE NULL END,
    (SELECT dept FROM departments ORDER BY RANDOM() LIMIT 1),
    (SELECT priority_id FROM priority_levels ORDER BY RANDOM() LIMIT 1),
    req_status,
    'Request for ' || (SELECT service_name FROM service_master WHERE service_id = sl.service_id) || '. ' ||
    'This request is submitted on behalf of ' || (SELECT dept FROM departments ORDER BY RANDOM() LIMIT 1) || '. ' ||
    'Supporting documentation is attached as per requirements.',
    CASE
        WHEN req_status IN ('In Progress', 'Completed') THEN 'Request is being processed by assigned officer.'
        ELSE NULL
    END,
    created_ts,
    CASE WHEN req_status != 'Draft' THEN created_ts + INTERVAL '2 hours' ELSE NULL END,
    CASE WHEN req_status = 'Completed' THEN created_ts + (RANDOM() * INTERVAL '14 days') ELSE NULL END
FROM generate_series(1, 30) AS generate_series,
     LATERAL (SELECT service_id, entity_id FROM service_list ORDER BY RANDOM() LIMIT 1) AS sl,
     LATERAL (SELECT CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days') AS created_ts) AS ts,
     LATERAL (SELECT status FROM statuses ORDER BY RANDOM() LIMIT 1) AS req_status;

SELECT COUNT(*) AS ea_requests_created FROM ea_service_requests;
EOF

echo "  ✓ EA service requests generated"
echo ""

# ============================================================================
# STEP 6: GENERATE EA SERVICE REQUEST ATTACHMENTS
# ============================================================================
echo "▶ Step 6: Generating EA service request attachments..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Generate attachments for submitted/completed requests based on service_attachments requirements
WITH eligible_requests AS (
    SELECT
        ea.id AS request_id,
        ea.service_id,
        ea.created_at
    FROM ea_service_requests ea
    WHERE ea.status IN ('Submitted', 'In Progress', 'Completed')
),
required_docs AS (
    SELECT
        er.request_id,
        sa.service_attachment_id,
        sa.filename,
        sa.file_extension,
        sa.is_mandatory,
        er.created_at
    FROM eligible_requests er
    JOIN service_attachments sa ON er.service_id = sa.service_id
    WHERE sa.is_active = TRUE
)
INSERT INTO ea_service_request_attachments (
    request_id,
    attachment_definition_id,
    file_name,
    file_type,
    file_size,
    file_data,
    uploaded_at
)
SELECT
    rd.request_id,
    rd.service_attachment_id,
    rd.filename,
    'application/' || COALESCE(SPLIT_PART(rd.file_extension, ',', 1), 'pdf'),
    50000 + (RANDOM() * 450000)::INTEGER,
    decode('255044462D312E340A', 'hex'), -- Minimal PDF header
    rd.created_at + (RANDOM() * INTERVAL '1 hour')
FROM required_docs rd
WHERE rd.is_mandatory = TRUE OR RANDOM() < 0.5; -- All mandatory + 50% of optional

SELECT COUNT(*) AS ea_attachments_created FROM ea_service_request_attachments;
EOF

echo "  ✓ EA service request attachments generated"
echo ""

# ============================================================================
# STEP 7: GENERATE UNIFIED TICKETS (80 records)
# ============================================================================
echo "▶ Step 7: Generating unified tickets (80 records)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Generate 80 tickets with various sources
WITH service_list AS (
    SELECT service_id, entity_id FROM service_master WHERE is_active = TRUE
),
ticket_subjects AS (
    SELECT unnest(ARRAY[
        'Request for service status update',
        'Technical issue with online portal',
        'Assistance required with application process',
        'Clarification on required documents',
        'Follow-up on previous submission',
        'Request for expedited processing',
        'Error in issued certificate/document',
        'Payment confirmation not received',
        'Unable to access online service',
        'Appointment scheduling request',
        'Refund request for overpayment',
        'Complaint about service quality',
        'Request for duplicate documentation',
        'Change of registered information',
        'General inquiry about service requirements'
    ]) AS subject
),
requester_categories AS (
    SELECT unnest(ARRAY['citizen', 'citizen', 'citizen', 'business', 'government', 'tourist']) AS category
)
INSERT INTO tickets (
    ticket_number,
    service_id,
    entity_id,
    category_id,
    priority_id,
    status_id,
    requester_category,
    subject,
    description,
    contact_name,
    contact_email,
    contact_phone,
    ip_hash,
    sla_target,
    source_type,
    created_at,
    updated_at,
    resolved_at
)
SELECT
    TO_CHAR(created_ts, 'YYYYMM') || '-' || LPAD(generate_series::TEXT, 6, '0'),
    (SELECT service_id FROM service_list ORDER BY RANDOM() LIMIT 1),
    (SELECT entity_id FROM service_master WHERE service_id = (SELECT service_id FROM service_list ORDER BY RANDOM() LIMIT 1) LIMIT 1),
    (SELECT category_id FROM ticket_categories ORDER BY RANDOM() LIMIT 1),
    priority_val,
    status_val,
    (SELECT category FROM requester_categories ORDER BY RANDOM() LIMIT 1),
    (SELECT subject FROM ticket_subjects ORDER BY RANDOM() LIMIT 1),
    'Detailed description of the ticket issue. ' ||
    'This ticket requires attention from the assigned department. ' ||
    'Supporting information and context are provided in the activity log.',
    CASE
        WHEN RANDOM() < 0.3 THEN 'Alex Johnson'
        WHEN RANDOM() < 0.6 THEN 'Maria Garcia'
        ELSE 'David Lee'
    END,
    'ticket' || generate_series || '@example.gd',
    CASE WHEN RANDOM() < 0.6 THEN '473-555-02' || LPAD(generate_series::TEXT, 2, '0') ELSE NULL END,
    MD5(generate_series::TEXT || RANDOM()::TEXT),
    created_ts + (
        SELECT (resolution_time_hours * INTERVAL '1 hour')
        FROM priority_levels
        WHERE priority_id = priority_val
    ),
    CASE
        WHEN RANDOM() < 0.3 THEN 'direct'
        WHEN RANDOM() < 0.6 THEN 'feedback'
        ELSE 'grievance'
    END,
    created_ts,
    created_ts + (RANDOM() * INTERVAL '10 days'),
    CASE
        WHEN status_val >= (SELECT status_id FROM ticket_status WHERE status_name = 'Resolved')
        THEN created_ts + (RANDOM() * INTERVAL '15 days')
        ELSE NULL
    END
FROM generate_series(1, 80),
     LATERAL (SELECT CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days') AS created_ts) AS ts,
     LATERAL (SELECT priority_id FROM priority_levels ORDER BY RANDOM() LIMIT 1) AS priority_val,
     LATERAL (SELECT status_id FROM ticket_status ORDER BY RANDOM() LIMIT 1) AS status_val;

SELECT COUNT(*) AS tickets_created FROM tickets;
EOF

echo "  ✓ Unified tickets generated"
echo ""

# ============================================================================
# STEP 8: GENERATE TICKET ACTIVITY (for all tickets)
# ============================================================================
echo "▶ Step 8: Generating ticket activity logs..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Create initial "ticket created" activity for all tickets
INSERT INTO ticket_activity (
    ticket_id,
    activity_type,
    performed_by,
    description,
    created_at
)
SELECT
    t.ticket_id,
    'created',
    'system',
    'Ticket ' || t.ticket_number || ' created',
    t.created_at
FROM tickets t;

-- Add status change activities for tickets that have progressed
INSERT INTO ticket_activity (
    ticket_id,
    activity_type,
    performed_by,
    description,
    created_at
)
SELECT
    t.ticket_id,
    'status_change',
    CASE
        WHEN RANDOM() < 0.5 THEN 'admin@gov.gd'
        ELSE 'staff.officer@gov.gd'
    END,
    'Status changed from New to ' || ts.status_name,
    t.created_at + (RANDOM() * INTERVAL '5 days')
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
WHERE ts.status_id > 1;

-- Add internal notes for resolved tickets
INSERT INTO ticket_activity (
    ticket_id,
    activity_type,
    performed_by,
    description,
    created_at
)
SELECT
    t.ticket_id,
    'internal_note',
    'staff.officer@gov.gd',
    CASE
        WHEN RANDOM() < 0.3 THEN 'Issue has been resolved. Customer was contacted and confirmed satisfaction.'
        WHEN RANDOM() < 0.6 THEN 'Resolved after verifying documentation and processing request.'
        ELSE 'Ticket closed. All required actions completed and verified.'
    END,
    COALESCE(t.resolved_at, t.updated_at)
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
WHERE ts.is_final_status = TRUE;

SELECT COUNT(*) AS activities_created FROM ticket_activity;
EOF

echo "  ✓ Ticket activity logs generated"
echo ""

# ============================================================================
# STEP 9: GENERATE TICKET ATTACHMENTS (30 files)
# ============================================================================
echo "▶ Step 9: Generating ticket attachments (30 files)..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Add attachments to 30 random tickets
WITH tickets_sample AS (
    SELECT ticket_id, created_at
    FROM tickets
    ORDER BY RANDOM()
    LIMIT 30
)
INSERT INTO ticket_attachments (
    ticket_id,
    filename,
    mimetype,
    file_content,
    file_size,
    uploaded_by,
    created_at
)
SELECT
    ts.ticket_id,
    'supporting_document_' || ts.ticket_id || CASE
        WHEN RANDOM() < 0.6 THEN '.pdf'
        WHEN RANDOM() < 0.8 THEN '.jpg'
        ELSE '.png'
    END,
    CASE
        WHEN RANDOM() < 0.6 THEN 'application/pdf'
        WHEN RANDOM() < 0.8 THEN 'image/jpeg'
        ELSE 'image/png'
    END,
    decode('255044462D312E340A', 'hex'),
    80000 + (RANDOM() * 400000)::INTEGER,
    CASE
        WHEN RANDOM() < 0.5 THEN 'citizen'
        ELSE 'staff@gov.gd'
    END,
    ts.created_at + (RANDOM() * INTERVAL '2 days')
FROM tickets_sample ts;

SELECT COUNT(*) AS ticket_attachments_created FROM ticket_attachments;
EOF

echo "  ✓ Ticket attachments generated"
echo ""

# ============================================================================
# STEP 10: GENERATE SUMMARY STATISTICS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    SYNTHETIC DATA SUMMARY                         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Record counts generated:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    'Service Feedback' AS data_type,
    COUNT(*) AS records
FROM service_feedback

UNION ALL SELECT 'Grievance Tickets', COUNT(*) FROM grievance_tickets
UNION ALL SELECT '  ├─ Auto-created', COUNT(*) FROM grievance_tickets WHERE grievance_type = 'auto_created_from_feedback'
UNION ALL SELECT '  └─ Manual', COUNT(*) FROM grievance_tickets WHERE grievance_type = 'service_complaint'
UNION ALL SELECT 'Grievance Attachments', COUNT(*) FROM grievance_attachments
UNION ALL SELECT 'EA Service Requests', COUNT(*) FROM ea_service_requests
UNION ALL SELECT '  ├─ Draft', COUNT(*) FROM ea_service_requests WHERE status = 'Draft'
UNION ALL SELECT '  ├─ Submitted', COUNT(*) FROM ea_service_requests WHERE status = 'Submitted'
UNION ALL SELECT '  ├─ In Progress', COUNT(*) FROM ea_service_requests WHERE status = 'In Progress'
UNION ALL SELECT '  └─ Completed', COUNT(*) FROM ea_service_requests WHERE status = 'Completed'
UNION ALL SELECT 'EA Request Attachments', COUNT(*) FROM ea_service_request_attachments
UNION ALL SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'Ticket Activity', COUNT(*) FROM ticket_activity
UNION ALL SELECT 'Ticket Attachments', COUNT(*) FROM ticket_attachments;
EOF

echo ""
echo "✓ Rating distribution:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    rating || ' stars' AS rating,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) || '%' AS percentage
FROM service_feedback
GROUP BY rating
ORDER BY rating DESC;
EOF

echo ""
echo "✓ Feedback by channel:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    channel,
    COUNT(*) AS count
FROM service_feedback
GROUP BY channel
ORDER BY count DESC;
EOF

echo ""
echo "✓ Grievances by status:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    gs.status_name,
    COUNT(*) AS count,
    CASE WHEN gs.is_active_status THEN 'Open' ELSE 'Closed' END AS state
FROM grievance_tickets gt
JOIN grievance_status gs ON gt.status = gs.status_id
GROUP BY gs.status_name, gs.is_active_status
ORDER BY gs.status_order;
EOF

echo ""
echo "✓ Tickets by status:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    ts.status_name,
    COUNT(*) AS count,
    CASE WHEN ts.is_active_status THEN 'Active' ELSE 'Closed' END AS state
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
GROUP BY ts.status_name, ts.is_active_status, ts.status_order
ORDER BY ts.status_order;
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ SYNTHETIC DATA GENERATION COMPLETE                         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ 200 service feedback records generated"
echo "  ✓ 50 grievance tickets generated (20 auto + 30 manual)"
echo "  ✓ 20 grievance attachments generated"
echo "  ✓ 30 EA service requests generated"
echo "  ✓ EA request attachments generated (based on requirements)"
echo "  ✓ 80 unified tickets generated"
echo "  ✓ Ticket activity logs generated"
echo "  ✓ 30 ticket attachments generated"
echo "  ✓ Realistic date distribution (last 90 days)"
echo ""
echo "🎯 Next Step:"
echo "  Run: ./database/13-verify-master-data.sh"
echo "  Or view analytics at: http://localhost:3000/analytics"
echo ""
