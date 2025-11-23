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
        'immigration.staff@gov.gd',
        'Sarah Johnson',
        staff_role_id,
        'DEPT-001',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;

    -- Inland Revenue Division Staff
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'revenue.staff@gov.gd',
        'Michael Thompson',
        staff_role_id,
        'DEPT-002',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;

    -- Civil Registry Staff
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'registry.staff@gov.gd',
        'Patricia Williams',
        staff_role_id,
        'DEPT-004',
        true,
        'google'
    ) ON CONFLICT (email) DO NOTHING;

    -- DTA Staff (secondary user for testing)
    INSERT INTO users (email, name, role_id, entity_id, is_active, provider)
    VALUES (
        'dta.staff@gov.gd',
        'Robert Martinez',
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
    'Dr. James Patterson',
    'j.patterson@immigration.gov.gd',
    '+1-473-444-5000',
    'Ministry of Immigration and Border Protection',
    'We are seeking support to develop a comprehensive digital transformation roadmap for our passport services. Our current system is outdated and we need guidance on modernization priorities, technology stack selection, and phased implementation strategy. This aligns with our ministry''s 2026-2030 strategic plan.',
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
    'Ms. Catherine Moore',
    'c.moore@revenue.gov.gd',
    '+1-473-444-6000',
    'Ministry of Finance - Inland Revenue Division',
    'Request for review of our proposed tax filing system architecture against the Grenada EA Framework. Specifically need assessment of our business process domain and application architecture layers. We have draft documentation ready for review.',
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
    'Mr. Anthony Rodriguez',
    'a.rodriguez@registry.gov.gd',
    '+1-473-444-7000',
    'Ministry of Legal Affairs - Civil Registry & Deeds',
    'We are proposing a new online birth certificate issuance system and need an EA maturity assessment before approaching MoF for budget approval. This assessment will help us demonstrate readiness and compliance with government IT standards.',
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
    'Ms. Grace Lee',
    'g.lee@immigration.gov.gd',
    '+1-473-444-5100',
    'Ministry of Immigration and Border Protection',
    'Our IT architects need access to the Grenada EA Repository to review reference architectures and best practices for identity management systems. Request for 12-month access for 3 technical staff members.',
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
    'Mr. William Brown',
    'w.brown@revenue.gov.gd',
    '+1-473-444-6100',
    'Ministry of Finance - Inland Revenue Division',
    'Completed compliance review request for our new e-filing platform. The solution architecture has been validated against GEA framework requirements. All documentation has been reviewed and approved by DTA architects.',
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
    'Ms. Diana Prince',
    'd.prince@dta.gov.gd',
    '+1-473-444-8000',
    'Digital Transformation Agency',
    'Internal DTA request: Comprehensive review of all government IT systems portfolio to identify consolidation opportunities, redundant systems, and cloud migration candidates. This is part of our annual strategic planning process.',
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
    'Mr. Thomas King',
    't.king@dta.gov.gd',
    '+1-473-444-8100',
    'Digital Transformation Agency',
    'Coordinating EA training program for government IT staff across 5 ministries. Program will cover EA fundamentals, framework navigation, and compliance requirements. Target audience: 25 IT professionals from various MDAs. Duration: 3-day workshop.',
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

-- Request 1: Digital Roadmap - Immigration
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'senior_leadership_approval_immigration.pdf',
    'application/pdf',
    'SAMPLE PDF: Senior Leadership Approval Letter - Immigration Department'::bytea,
    245000,
    true,
    'j.patterson@immigration.gov.gd'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-DR-001';

INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'digital_vision_document.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'SAMPLE DOCX: Immigration Digital Vision 2026-2030'::bytea,
    156000,
    true,
    'j.patterson@immigration.gov.gd'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-DR-001';

-- Request 2: EA Framework Review - Revenue (in progress)
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'senior_govt_approval_revenue.pdf',
    'application/pdf',
    'SAMPLE PDF: Ministry of Finance Approval - Tax System Review'::bytea,
    198000,
    true,
    'c.moore@revenue.gov.gd'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'tax_system_architecture_details.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'SAMPLE DOCX: Proposed Tax Filing System Architecture'::bytea,
    234000,
    true,
    'c.moore@revenue.gov.gd'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

-- Request 3: Maturity Assessment - Civil Registry
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'mof_budget_request_letter.pdf',
    'application/pdf',
    'SAMPLE PDF: Budget Request to Ministry of Finance - Birth Certificate System'::bytea,
    189000,
    true,
    'a.rodriguez@registry.gov.gd'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-MA-001';

-- Request 5: Compliance Review (completed)
INSERT INTO ea_service_request_attachments (
    request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by
)
SELECT
    r.request_id,
    'final_compliance_report.pdf',
    'application/pdf',
    'SAMPLE PDF: EA Compliance Review Report - Tax E-Filing Platform - APPROVED'::bytea,
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
    'Request received and assigned to Senior EA Architect for initial review.',
    'status_change',
    true,
    'submitted',
    'process',
    'admin@dta.gov.gd',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM ea_service_requests r
WHERE r.request_number = 'REQ-2025-EA-001';

INSERT INTO ea_service_request_comments (
    request_id, comment_text, comment_type, created_by, created_at
)
SELECT
    r.request_id,
    'Initial review completed. Architecture documentation is comprehensive. Scheduling technical review meeting with Revenue IT team for next week.',
    'internal_note',
    'admin@dta.gov.gd',
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
    'Compliance review completed successfully. All EA framework requirements met. Final report generated and shared with requesting ministry.',
    'status_change',
    true,
    'process',
    'resolved',
    'admin@dta.gov.gd',
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
    'Training program approved. Coordinating with HR departments across ministries to confirm participant availability.',
    'status_change',
    true,
    'submitted',
    'process',
    'admin@dta.gov.gd',
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
echo "  ✓ 7 realistic EA service requests"
echo "  ✓ Sample attachments with realistic file types"
echo "  ✓ Comments and status history"
echo "  ✓ Multiple request statuses (submitted, processing, resolved)"
echo ""
echo "🎯 Ready for Testing:"
echo "  1. Staff login: immigration.staff@gov.gd (DEPT-001)"
echo "  2. Staff login: revenue.staff@gov.gd (DEPT-002)"
echo "  3. Staff login: registry.staff@gov.gd (DEPT-004)"
echo "  4. Staff login: dta.staff@gov.gd (AGY-002)"
echo ""
echo "  All staff can access EA services and create new requests!"
echo ""
echo "✓ DTA operational data ready!"
echo ""
