#!/bin/bash

# ============================================================================
# GEA PORTAL - DTA COMPREHENSIVE SEED DATA
# ============================================================================
# Version: 1.0
# Purpose: Load comprehensive seed data specific to DTA operations
# Includes: Staff users, sample EA service requests, realistic scenarios
# Date: November 23, 2025
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL - DTA COMPREHENSIVE SEED DATA v1.0                   ║"
echo "║   Loading: Staff users + EA requests + Sample workflows           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PHASE 1: CREATE STAFF USERS FOR TESTING
# ============================================================================
echo "▶ Phase 1: Creating staff user accounts for ministries..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Get role_id for staff
DO $$
DECLARE
    staff_role_id INTEGER;
BEGIN
    SELECT role_id INTO staff_role_id FROM user_roles WHERE role_code = 'staff_mda';

    -- Immigration Department Staff
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'immigration.staff@example.com',
        'Jane Doe',
        staff_role_id,
        'DEPT-001',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;

    -- Inland Revenue Division Staff
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'revenue.staff@example.com',
        'John Smith',
        staff_role_id,
        'DEPT-002',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;

    -- Civil Registry Staff
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'registry.staff@example.com',
        'Alice Brown',
        staff_role_id,
        'DEPT-004',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;

    -- DTA Staff (secondary user for testing)
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'dta.staff@example.com',
        'Bob Wilson',
        staff_role_id,
        'AGY-002',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;
END $$;

EOF

echo "  ✓ 4 staff user accounts created"
echo ""

# ============================================================================
# PHASE 2: EA SERVICE REQUESTS WITH REALISTIC SCENARIOS
# ============================================================================
echo "▶ Phase 2: Creating EA service requests with realistic scenarios..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Delete existing sample requests (for clean slate)
DELETE FROM ea_service_requests WHERE request_number LIKE 'REQ-2025%';

-- Service 1: Digital Roadmap - Immigration Department
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, created_by
)
VALUES (
    'REQ-2025-DR-001',
    'digital-roadmap',
    'DEPT-001',
    'submitted',
    'Jane Doe',
    'jane.doe@example.com',
    '+1-555-0001',
    'Sample Ministry A',
    'Sample request for digital transformation roadmap consultation. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'staff_mda'
);

-- Service 2: EA Framework Review - Inland Revenue
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, updated_at, created_by
)
VALUES (
    'REQ-2025-EA-001',
    'ea-framework-review',
    'DEPT-002',
    'process',
    'John Smith',
    'john.smith@example.com',
    '+1-555-0002',
    'Sample Ministry B',
    'Sample request for EA framework review consultation. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    'staff_mda'
);

-- Service 3: Maturity Assessment - Civil Registry
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, created_by
)
VALUES (
    'REQ-2025-MA-001',
    'maturity-assessment',
    'DEPT-004',
    'submitted',
    'Alice Brown',
    'alice.brown@example.com',
    '+1-555-0003',
    'Sample Ministry C',
    'Sample request for maturity assessment consultation. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'staff_mda'
);

-- Service 4: Repository Access - Immigration Department
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, created_by
)
VALUES (
    'REQ-2025-RA-001',
    'repository-access',
    'DEPT-001',
    'submitted',
    'Bob Wilson',
    'bob.wilson@example.com',
    '+1-555-0004',
    'Sample Ministry D',
    'Sample request for repository access. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    'staff_mda'
);

-- Service 5: Compliance Review - Inland Revenue
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, updated_at, resolved_at, created_by
)
VALUES (
    'REQ-2025-CR-001',
    'compliance-review',
    'DEPT-002',
    'resolved',
    'Carol Davis',
    'carol.davis@example.com',
    '+1-555-0005',
    'Sample Ministry E',
    'Sample completed compliance review request. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'staff_mda'
);

-- Service 6: Portfolio Review - DTA Internal
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, created_by
)
VALUES (
    'REQ-2025-PR-001',
    'portfolio-review',
    'AGY-002',
    'submitted',
    'David Miller',
    'david.miller@example.com',
    '+1-555-0006',
    'Sample Agency F',
    'Sample request for portfolio review. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    'admin_dta'
);

-- Service 7: Training & Capacity - Multi-ministry Program
INSERT INTO ea_service_requests (
    request_number, service_id, entity_id, status, requester_name,
    requester_email, requester_phone, requester_ministry, request_description,
    created_at, updated_at, created_by
)
VALUES (
    'REQ-2025-TC-001',
    'training-capacity',
    'AGY-002',
    'process',
    'Emily Johnson',
    'emily.johnson@example.com',
    '+1-555-0007',
    'Sample Agency G',
    'Sample request for training and capacity building. This is test data for demonstration purposes only.',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'admin_dta'
);

EOF

echo "  ✓ 7 realistic EA service requests created"
echo ""

# ============================================================================
# PHASE 3: ADD SAMPLE ATTACHMENTS TO REQUESTS
# ============================================================================
echo "▶ Phase 3: Adding sample attachments to EA service requests..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Sample attachments for completed/processing requests
-- Note: Using minimal sample data for file_content

-- Request 1: Digital Roadmap - Sample
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'sample_approval_document.pdf',
    'application/pdf',
    'SAMPLE PDF: Test approval document for demonstration purposes only'::bytea,
    245000,
    true,
    'jane.doe@example.com'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-DR-001';

INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'sample_vision_document.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'SAMPLE DOCX: Test vision document for demonstration purposes only'::bytea,
    156000,
    true,
    'jane.doe@example.com'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-DR-001';

-- Request 2: EA Framework Review - Sample (in progress)
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'sample_approval_letter.pdf',
    'application/pdf',
    'SAMPLE PDF: Test approval letter for demonstration purposes only'::bytea,
    198000,
    true,
    'john.smith@example.com'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'sample_architecture_document.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'SAMPLE DOCX: Test architecture document for demonstration purposes only'::bytea,
    234000,
    true,
    'john.smith@example.com'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

-- Request 3: Maturity Assessment - Sample
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'sample_budget_request.pdf',
    'application/pdf',
    'SAMPLE PDF: Test budget request for demonstration purposes only'::bytea,
    189000,
    true,
    'alice.brown@example.com'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-MA-001';

-- Request 5: Compliance Review (completed)
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'sample_compliance_report.pdf',
    'application/pdf',
    'SAMPLE PDF: Test compliance report for demonstration purposes only'::bytea,
    567000,
    true,
    'system'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-CR-001';

EOF

echo "  ✓ Sample attachments added to requests"
echo ""

# ============================================================================
# PHASE 4: ADD COMMENTS/NOTES TO ACTIVE REQUESTS
# ============================================================================
echo "▶ Phase 4: Adding comments/notes to service requests..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Comments for Request in Process (EA Framework Review)
INSERT INTO ea_service_request_comments (
    request_id, comment_text, comment_type, is_status_change,
    old_status, new_status, created_by, created_at
)
SELECT
    r.request_id,
    'Sample status change comment. This is test data for demonstration purposes only.',
    'status_change',
    true,
    'submitted',
    'process',
    'admin@example.com',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

INSERT INTO ea_service_request_comments (
    request_id, comment_text, comment_type, created_by, created_at
)
SELECT
    r.request_id,
    'Sample internal note comment. This is test data for demonstration purposes only.',
    'internal_note',
    'admin@example.com',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

-- Comments for Completed Request (Compliance Review)
INSERT INTO ea_service_request_comments (
    request_id, comment_text, comment_type, is_status_change,
    old_status, new_status, created_by, created_at
)
SELECT
    r.request_id,
    'Sample completion comment. This is test data for demonstration purposes only.',
    'status_change',
    true,
    'process',
    'resolved',
    'admin@example.com',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-CR-001';

-- Comments for Training Request
INSERT INTO ea_service_request_comments (
    request_id, comment_text, comment_type, is_status_change,
    old_status, new_status, created_by, created_at
)
SELECT
    r.request_id,
    'Sample approval comment. This is test data for demonstration purposes only.',
    'status_change',
    true,
    'submitted',
    'process',
    'admin@example.com',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-TC-001';

EOF

echo "  ✓ Comments and status history added"
echo ""

# ============================================================================
# VERIFICATION
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                  DTA SEED DATA SUMMARY                            ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "✓ Staff Users Created:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    u.name,
    u.email,
    e.entity_name,
    r.role_name
FROM users u
JOIN entity_master e ON u.entity_id = e.unique_entity_id
JOIN user_roles r ON u.role_id = r.role_id
WHERE r.role_code = 'staff_mda'
ORDER BY e.entity_name;
EOF

echo ""
echo "✓ EA Service Requests by Status:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    status,
    COUNT(*) as count,
    string_agg(request_number, ', ' ORDER BY request_number) as request_numbers
FROM ea_service_requests
WHERE request_number LIKE 'REQ-2025%'
GROUP BY status
ORDER BY
    CASE status
        WHEN 'submitted' THEN 1
        WHEN 'process' THEN 2
        WHEN 'resolved' THEN 3
        WHEN 'closed' THEN 4
    END;
EOF

echo ""
echo "✓ EA Requests by Service Type:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    sm.service_name,
    COUNT(r.request_id) as requests,
    string_agg(r.status, ', ') as statuses
FROM service_master sm
LEFT JOIN ea_service_requests r ON sm.service_id = r.service_id
WHERE sm.entity_id = 'AGY-002'
GROUP BY sm.service_name
HAVING COUNT(r.request_id) > 0
ORDER BY sm.service_name;
EOF

echo ""
echo "✓ EA Requests by Ministry:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    e.entity_name,
    COUNT(r.request_id) as total_requests,
    COUNT(CASE WHEN r.status = 'submitted' THEN 1 END) as new_requests,
    COUNT(CASE WHEN r.status = 'process' THEN 1 END) as in_progress,
    COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as completed
FROM entity_master e
LEFT JOIN ea_service_requests r ON e.unique_entity_id = r.entity_id
WHERE r.request_number LIKE 'REQ-2025%'
GROUP BY e.entity_name
ORDER BY total_requests DESC;
EOF

echo ""
echo "✓ Attachments Summary:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    r.request_number,
    r.status,
    COUNT(a.attachment_id) as attachments,
    ROUND(SUM(a.file_size)::numeric / 1024, 0) || ' KB' as total_size
FROM ea_service_requests r
LEFT JOIN ea_service_request_attachments a ON r.request_id = a.request_id
WHERE r.request_number LIKE 'REQ-2025%'
GROUP BY r.request_number, r.status
ORDER BY r.request_number;
EOF

echo ""
echo "✓ Comments Summary:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT
    r.request_number,
    COUNT(c.comment_id) as comments,
    COUNT(CASE WHEN c.is_status_change THEN 1 END) as status_changes,
    COUNT(CASE WHEN c.comment_type = 'internal_note' THEN 1 END) as internal_notes
FROM ea_service_requests r
LEFT JOIN ea_service_request_comments c ON r.request_id = c.request_id
WHERE r.request_number LIKE 'REQ-2025%'
GROUP BY r.request_number
HAVING COUNT(c.comment_id) > 0
ORDER BY r.request_number;
EOF

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     ✓ DTA SEED DATA LOADED SUCCESSFULLY                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
echo "  ✓ 4 staff users created (one per ministry/agency)"
echo "  ✓ 7 sample EA service requests (test data only)"
echo "  ✓ Sample attachments with test file types"
echo "  ✓ Comments and status history (test data)"
echo "  ✓ Multiple request statuses (submitted, processing, resolved)"
echo ""
echo "🎯 Ready for Testing:"
echo "  1. Staff login: immigration.staff@example.com (DEPT-001)"
echo "  2. Staff login: revenue.staff@example.com (DEPT-002)"
echo "  3. Staff login: registry.staff@example.com (DEPT-004)"
echo "  4. Staff login: dta.staff@example.com (AGY-002)"
echo ""
echo "  All staff can access EA services and create new requests!"
echo ""
echo "ℹ️  NOTE: All data is fictitious for testing purposes only"
echo ""
echo "✓ DTA test data ready!"
echo ""
