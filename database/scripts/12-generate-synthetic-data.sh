#!/bin/bash

# ============================================================================
# GEA PORTAL - GENERATE SYNTHETIC TRANSACTIONAL DATA
# ============================================================================
# Version: 2.2
# Purpose: Generate realistic test data based on loaded master data
# Date: November 25, 2025
#
# CHANGES IN v2.2:
# - Added automatic schema migration for created_at and updated_at timestamp columns
#
# CHANGES IN v2.1:
# - Added automatic schema migration for service_feedback tracking columns
# - Fixes Azure VM schema mismatch for submitted_ip_hash and submitted_user_agent
#
# WHAT THIS SCRIPT GENERATES:
# ✓ 200 Service Feedback records (distributed across all services)
# ✓ 50 Grievance Tickets (manual submissions)
# ✓ 30 EA Service Requests (with required attachments)
# ✓ 80 Unified Tickets (with activity logs and notes)
# ✓ Realistic date distributions (last 90 days)
# ✓ Varied statuses, priorities, and user types
#
# PREREQUISITES:
# - Master data must be loaded (run ./database/scripts/11-load-master-data.sh first)
# - Database must have reference data (priority_levels, ticket_status, etc.)
#
# USAGE:
#   ./database/scripts/12-generate-synthetic-data.sh
#
# ============================================================================

set -e

# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ROOT="$(dirname "$SCRIPT_DIR")"
source "$DB_ROOT/config.sh"

echo ""
log_section "GEA PORTAL - GENERATE SYNTHETIC DATA v2.2"
echo "  Creating realistic test data for all modules"
echo ""

# ============================================================================
# STEP 1: VERIFY PREREQUISITES
# ============================================================================
echo "▶ Step 1: Verifying prerequisites..."

check_container
check_db_connection

# Check if master data is loaded
ENTITY_COUNT=$(get_row_count "entity_master")
SERVICE_COUNT=$(get_row_count "service_master")

if [ "$ENTITY_COUNT" -eq 0 ] || [ "$SERVICE_COUNT" -eq 0 ]; then
    log_error "Master data not loaded. Run ./database/scripts/11-load-master-data.sh first"
    exit 1
fi

log_success "Database connection successful"
log_success "Master data loaded ($ENTITY_COUNT entities, $SERVICE_COUNT services)"
echo ""

# ============================================================================
# STEP 1.5: VERIFY SERVICE_FEEDBACK SCHEMA (AUTO-MIGRATION)
# ============================================================================
echo "▶ Step 1.5: Verifying service_feedback schema..."

# Check if submitted_ip_hash and submitted_user_agent columns exist
SUBMITTED_IP_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name='service_feedback' AND column_name='submitted_ip_hash';" 2>/dev/null | tr -d ' ')

SUBMITTED_UA_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name='service_feedback' AND column_name='submitted_user_agent';" 2>/dev/null | tr -d ' ')

# Auto-migrate if columns are missing
if [ "$SUBMITTED_IP_EXISTS" = "0" ] || [ "$SUBMITTED_UA_EXISTS" = "0" ]; then
    log_warn "Schema migration required: Adding tracking columns to service_feedback"

    if [ "$SUBMITTED_IP_EXISTS" = "0" ]; then
        if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "ALTER TABLE service_feedback ADD COLUMN IF NOT EXISTS submitted_ip_hash VARCHAR(64);" > /dev/null 2>&1; then
            log_success "Added submitted_ip_hash column"
        else
            log_error "Failed to add submitted_ip_hash column"
            exit 1
        fi
    fi

    if [ "$SUBMITTED_UA_EXISTS" = "0" ]; then
        if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "ALTER TABLE service_feedback ADD COLUMN IF NOT EXISTS submitted_user_agent TEXT;" > /dev/null 2>&1; then
            log_success "Added submitted_user_agent column"
        else
            log_error "Failed to add submitted_user_agent column"
            exit 1
        fi
    fi

    log_success "Schema migration completed successfully"
else
    log_success "Schema is up to date (tracking columns present)"
fi

# Also check for timestamp columns
CREATED_AT_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name='service_feedback' AND column_name='created_at';" 2>/dev/null | tr -d ' ')

UPDATED_AT_EXISTS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name='service_feedback' AND column_name='updated_at';" 2>/dev/null | tr -d ' ')

if [ "$CREATED_AT_EXISTS" = "0" ] || [ "$UPDATED_AT_EXISTS" = "0" ]; then
    log_warn "Adding timestamp columns to service_feedback"

    if [ "$CREATED_AT_EXISTS" = "0" ]; then
        if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "ALTER TABLE service_feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;" > /dev/null 2>&1; then
            log_success "Added created_at column"
        else
            log_error "Failed to add created_at column"
            exit 1
        fi
    fi

    if [ "$UPDATED_AT_EXISTS" = "0" ]; then
        if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c \
            "ALTER TABLE service_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;" > /dev/null 2>&1; then
            log_success "Added updated_at column"
        else
            log_error "Failed to add updated_at column"
            exit 1
        fi
    fi

    log_success "Timestamp columns added successfully"
fi
echo ""

# ============================================================================
# STEP 2: GENERATE SERVICE FEEDBACK (200 records)
# ============================================================================
echo "▶ Step 2: Generating service feedback (200 records)..."

run_sql -c "
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
    SELECT unnest(ARRAY['portal', 'portal', 'portal', 'portal', 'qr', 'mobile', 'kiosk']) AS channel
),
ratings AS (
    -- Weighted toward positive ratings (realistic distribution)
    SELECT unnest(ARRAY[5,5,5,5,5,4,4,4,4,3,3,2,1]) AS rating
)
INSERT INTO service_feedback (
    service_id,
    entity_id,
    q1_ease,
    q2_clarity,
    q3_timeliness,
    q4_trust,
    q5_overall_satisfaction,
    comment_text,
    recipient_group,
    channel,
    grievance_flag,
    submitted_ip_hash,
    created_at
)
SELECT
    sl.service_id,
    sl.entity_id,
    (SELECT rating FROM ratings ORDER BY RANDOM() LIMIT 1),
    (SELECT rating FROM ratings ORDER BY RANDOM() LIMIT 1),
    (SELECT rating FROM ratings ORDER BY RANDOM() LIMIT 1),
    (SELECT rating FROM ratings ORDER BY RANDOM() LIMIT 1),
    (SELECT rating FROM ratings ORDER BY RANDOM() LIMIT 1) AS overall_rating,
    CASE
        WHEN RANDOM() < 0.3 THEN 'Great service, very satisfied!'
        WHEN RANDOM() < 0.6 THEN 'Service was acceptable, but could be improved.'
        WHEN RANDOM() < 0.8 THEN 'Had some issues with the process.'
        ELSE 'Very disappointed with the service experience.'
    END,
    (SELECT recipient_group FROM recipient_groups ORDER BY RANDOM() LIMIT 1),
    (SELECT channel FROM channels ORDER BY RANDOM() LIMIT 1),
    FALSE,
    MD5(RANDOM()::TEXT),
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days')
FROM generate_series(1, 200),
     LATERAL (SELECT service_id, entity_id FROM service_list ORDER BY RANDOM() LIMIT 1) AS sl;
" > /dev/null

log_success "Service feedback generated ($(get_row_count 'service_feedback') records)"
echo ""

# ============================================================================
# STEP 3: GENERATE GRIEVANCE TICKETS (50 records)
# ============================================================================
echo "▶ Step 3: Generating grievance tickets (50 records)..."

run_sql -c "
-- Generate 50 manual grievances
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
submitter_categories AS (
    SELECT unnest(ARRAY['citizen', 'citizen', 'citizen', 'business', 'government']) AS category
),
statuses AS (
    SELECT status_code FROM grievance_status WHERE is_active = TRUE
)
INSERT INTO grievance_tickets (
    grievance_number,
    service_id,
    entity_id,
    status,
    submitter_category,
    submitter_name,
    submitter_email,
    submitter_phone,
    grievance_subject,
    grievance_description,
    incident_date,
    submission_ip_hash,
    created_at
)
SELECT
    'GRV-' || TO_CHAR(created_ts, 'YYYYMMDD') || '-' || LPAD(generate_series::TEXT, 4, '0'),
    sl.service_id,
    sl.entity_id,
    (SELECT status_code FROM statuses ORDER BY RANDOM() LIMIT 1),
    (SELECT category FROM submitter_categories ORDER BY RANDOM() LIMIT 1),
    CASE
        WHEN RANDOM() < 0.3 THEN 'Maria Rodriguez'
        WHEN RANDOM() < 0.6 THEN 'James Williams'
        ELSE 'Sarah Johnson'
    END,
    'citizen' || generate_series || '@example.gd',
    CASE WHEN RANDOM() < 0.5 THEN '473-555-01' || LPAD(generate_series::TEXT, 2, '0') ELSE NULL END,
    (SELECT subject FROM grievance_subjects ORDER BY RANDOM() LIMIT 1),
    'This grievance outlines significant concerns with the service delivery. ' ||
    'Despite multiple attempts to resolve the issue, no satisfactory response was received. ' ||
    'Immediate attention and corrective action are requested.',
    (created_ts - (RANDOM() * INTERVAL '30 days'))::DATE,
    MD5(generate_series::TEXT),
    created_ts
FROM generate_series(1, 50),
     LATERAL (SELECT CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days') AS created_ts) AS ts,
     LATERAL (SELECT service_id, entity_id FROM service_list ORDER BY RANDOM() LIMIT 1) AS sl;
" > /dev/null

log_success "Grievance tickets generated ($(get_row_count 'grievance_tickets') records)"
echo ""

# ============================================================================
# STEP 4: GENERATE GRIEVANCE ATTACHMENTS (20 files)
# ============================================================================
echo "▶ Step 4: Generating grievance attachments (20 files)..."

run_sql -c "
-- Add attachments to 40% of grievances
WITH grievances_sample AS (
    SELECT grievance_id, created_at
    FROM grievance_tickets
    ORDER BY RANDOM()
    LIMIT 20
)
INSERT INTO grievance_attachments (
    grievance_id,
    filename,
    mimetype,
    file_size,
    file_content,
    uploaded_by,
    created_at
)
SELECT
    gs.grievance_id,
    'evidence_document_' || gs.grievance_id || '.pdf',
    'application/pdf',
    100000 + (RANDOM() * 500000)::INTEGER,
    decode('255044462D312E340A', 'hex'), -- Minimal PDF header bytes
    'citizen',
    gs.created_at + (RANDOM() * INTERVAL '2 hours')
FROM grievances_sample gs;
" > /dev/null

log_success "Grievance attachments generated ($(get_row_count 'grievance_attachments') files)"
echo ""

# ============================================================================
# STEP 5: GENERATE EA SERVICE REQUESTS (30 records)
# ============================================================================
echo "▶ Step 5: Generating EA service requests (30 records)..."

run_sql -c "
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
    requester_ministry,
    status,
    request_description,
    created_at
)
SELECT
    'EA-' || TO_CHAR(created_ts, 'YYYYMMDD') || '-' || LPAD(generate_series::TEXT, 4, '0'),
    sl.service_id,
    sl.entity_id,
    (SELECT name FROM requesters ORDER BY RANDOM() LIMIT 1),
    'requester' || generate_series || '@gov.gd',
    CASE WHEN RANDOM() < 0.6 THEN '473-440-' || (2000 + generate_series) ELSE NULL END,
    (SELECT dept FROM departments ORDER BY RANDOM() LIMIT 1),
    req_status,
    'Request for ' || (SELECT service_name FROM service_master WHERE service_id = sl.service_id) || '. ' ||
    'This request is submitted on behalf of ' || (SELECT dept FROM departments ORDER BY RANDOM() LIMIT 1) || '. ' ||
    'Supporting documentation is attached as per requirements.',
    created_ts
FROM generate_series(1, 30) AS generate_series,
     LATERAL (SELECT service_id, entity_id FROM service_list ORDER BY RANDOM() LIMIT 1) AS sl,
     LATERAL (SELECT CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days') AS created_ts) AS ts,
     LATERAL (SELECT status FROM statuses ORDER BY RANDOM() LIMIT 1) AS req_status;
" > /dev/null

log_success "EA service requests generated ($(get_row_count 'ea_service_requests') records)"
echo ""

# ============================================================================
# STEP 6: GENERATE EA SERVICE REQUEST ATTACHMENTS
# ============================================================================
echo "▶ Step 6: Generating EA service request attachments..."

run_sql -c "
-- Generate attachments for submitted/completed requests based on service_attachments requirements
WITH eligible_requests AS (
    SELECT
        ea.request_id,
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
    filename,
    mimetype,
    file_size,
    file_content,
    is_mandatory,
    uploaded_by,
    created_at
)
SELECT
    rd.request_id,
    rd.filename,
    'application/' || COALESCE(SPLIT_PART(rd.file_extension, ',', 1), 'pdf'),
    50000 + (RANDOM() * 450000)::INTEGER,
    decode('255044462D312E340A', 'hex'), -- Minimal PDF header
    rd.is_mandatory,
    'gov_requester',
    rd.created_at + (RANDOM() * INTERVAL '1 hour')
FROM required_docs rd
WHERE rd.is_mandatory = TRUE OR RANDOM() < 0.5; -- All mandatory + 50% of optional
" > /dev/null

log_success "EA service request attachments generated ($(get_row_count 'ea_service_request_attachments') files)"
echo ""

# ============================================================================
# STEP 7: GENERATE UNIFIED TICKETS (80 records)
# ============================================================================
echo "▶ Step 7: Generating unified tickets (80 records)..."

run_sql -c "
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
),
categories AS (
    SELECT category_id FROM ticket_categories
),
priorities AS (
    SELECT priority_id FROM priority_levels
),
statuses AS (
    SELECT status_id FROM ticket_status
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
    submitter_name,
    submitter_email,
    submitter_phone,
    submission_ip_hash,
    sla_response_target,
    sla_resolution_target,
    source,
    created_at
)
SELECT
    TO_CHAR(created_ts, 'YYYYMM') || '-' || LPAD(generate_series::TEXT, 6, '0'),
    sl.service_id,
    sl.entity_id,
    (SELECT category_id FROM categories ORDER BY RANDOM() LIMIT 1),
    (SELECT priority_id FROM priorities ORDER BY RANDOM() LIMIT 1),
    (SELECT status_id FROM statuses ORDER BY RANDOM() LIMIT 1),
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
    created_ts + INTERVAL '24 hours',
    created_ts + INTERVAL '72 hours',
    CASE
        WHEN RANDOM() < 0.3 THEN 'direct'
        WHEN RANDOM() < 0.6 THEN 'feedback'
        ELSE 'grievance'
    END,
    created_ts
FROM generate_series(1, 80),
     LATERAL (SELECT CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days') AS created_ts) AS ts,
     LATERAL (SELECT service_id, entity_id FROM service_list ORDER BY RANDOM() LIMIT 1) AS sl;
" > /dev/null

log_success "Unified tickets generated ($(get_row_count 'tickets') records)"
echo ""

# ============================================================================
# STEP 8: GENERATE TICKET ACTIVITY (for all tickets)
# ============================================================================
echo "▶ Step 8: Generating ticket activity logs..."

run_sql -c "
-- Create initial 'ticket created' activity for all tickets
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
    'Status changed to ' || ts.status_name,
    t.created_at + (RANDOM() * INTERVAL '5 days')
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
WHERE ts.status_id > 1
LIMIT 40;

-- Add internal notes for some tickets
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
    t.updated_at
FROM tickets t
WHERE RANDOM() < 0.3
LIMIT 20;
" > /dev/null

log_success "Ticket activity logs generated ($(get_row_count 'ticket_activity') activities)"
echo ""

# ============================================================================
# STEP 9: GENERATE TICKET ATTACHMENTS (30 files)
# ============================================================================
echo "▶ Step 9: Generating ticket attachments (30 files)..."

run_sql -c "
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
" > /dev/null

log_success "Ticket attachments generated ($(get_row_count 'ticket_attachments') files)"
echo ""

# ============================================================================
# STEP 10: GENERATE SUMMARY STATISTICS
# ============================================================================
log_section "SYNTHETIC DATA SUMMARY"
echo ""

echo "✓ Record counts generated:"
run_sql -c "
SELECT
    'Service Feedback' AS data_type,
    COUNT(*) AS records
FROM service_feedback

UNION ALL SELECT 'Grievance Tickets', COUNT(*) FROM grievance_tickets
UNION ALL SELECT 'Grievance Attachments', COUNT(*) FROM grievance_attachments
UNION ALL SELECT 'EA Service Requests', COUNT(*) FROM ea_service_requests
UNION ALL SELECT 'EA Request Attachments', COUNT(*) FROM ea_service_request_attachments
UNION ALL SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'Ticket Activity', COUNT(*) FROM ticket_activity
UNION ALL SELECT 'Ticket Attachments', COUNT(*) FROM ticket_attachments;
"

echo ""
echo "✓ Feedback rating distribution:"
run_sql -c "
SELECT
    q5_overall_satisfaction || ' stars' AS rating,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) || '%' AS percentage
FROM service_feedback
GROUP BY q5_overall_satisfaction
ORDER BY q5_overall_satisfaction DESC;
"

echo ""
echo "✓ Feedback by channel:"
run_sql -c "
SELECT
    channel,
    COUNT(*) AS count
FROM service_feedback
GROUP BY channel
ORDER BY count DESC;
"

echo ""
echo "✓ Grievances by status:"
run_sql -c "
SELECT
    gs.status_name,
    COUNT(*) AS count
FROM grievance_tickets gt
JOIN grievance_status gs ON gt.status = gs.status_code
GROUP BY gs.status_name, gs.status_order
ORDER BY gs.status_order;
"

echo ""
echo "✓ Tickets by status:"
run_sql -c "
SELECT
    ts.status_name,
    COUNT(*) AS count,
    CASE WHEN ts.is_active THEN 'Active' ELSE 'Closed' END AS state
FROM tickets t
JOIN ticket_status ts ON t.status_id = ts.status_id
GROUP BY ts.status_name, ts.is_active
ORDER BY ts.status_name;
"

echo ""
log_section "✓ SYNTHETIC DATA GENERATION COMPLETE"
echo ""
echo "📊 Summary:"
echo "  ✓ 200 service feedback records generated"
echo "  ✓ 50 grievance tickets generated"
echo "  ✓ 20 grievance attachments generated"
echo "  ✓ 30 EA service requests generated"
echo "  ✓ EA request attachments generated (based on requirements)"
echo "  ✓ 80 unified tickets generated"
echo "  ✓ Ticket activity logs generated"
echo "  ✓ 30 ticket attachments generated"
echo "  ✓ Realistic date distribution (last 90 days)"
echo ""
echo "🎯 Next Step:"
echo "  Run: $SCRIPTS_DIR/13-verify-master-data.sh"
echo "  Or view analytics at: http://localhost:3000/analytics"
echo ""
