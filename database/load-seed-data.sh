#!/bin/bash

# Load Expanded Seed Data - Entities, Services, and Synthetic Feedback
# Fixed for current schema

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo "=== Loading Seed Data ==="
echo "Entities, Services, and Synthetic Feedback"
echo ""

# Pipe SQL directly to docker exec psql
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'SQLEOF'
-- ============================================
-- LOAD EXPANDED ENTITY AND SERVICE DATA
-- ============================================

-- Core Ministries
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, is_active) VALUES
('MIN-001','Ministry of Finance','ministry',TRUE),
('MIN-002','Ministry of Health','ministry',TRUE),
('MIN-003','Ministry of Education','ministry',TRUE),
('MIN-004','Ministry of Legal Affairs','ministry',TRUE),
('MIN-005','Ministry of Tourism','ministry',TRUE),
('MIN-006','Ministry of Infrastructure','ministry',TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, is_active=EXCLUDED.is_active;

-- Departments
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('DEPT-001','Immigration Department','department','MIN-004',TRUE),
('DEPT-002','Inland Revenue Division','department','MIN-001',TRUE),
('DEPT-003','Customs & Excise','department','MIN-001',TRUE),
('DEPT-004','Civil Registry','department','MIN-004',TRUE),
('DEPT-005','Public Health','department','MIN-002',TRUE),
('DEPT-006','Statistics Office','department','MIN-001',TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- Agencies
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('AGY-001','Tourism Authority','agency','MIN-005',TRUE),
('AGY-002','Digital Transformation Agency','agency',NULL,TRUE),
('AGY-003','Water Authority','statutory_body','MIN-006',TRUE),
('AGY-004','Electricity Company','statutory_body','MIN-006',TRUE),
('AGY-005','Development Bank','statutory_body','MIN-001',TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- ============================================
-- LOAD EXPANDED SERVICES
-- ============================================

INSERT INTO service_master (service_id, service_name, entity_id, service_category, is_active) VALUES
-- Immigration
('SVC-IMM-001','Passport Application','DEPT-001','Immigration',TRUE),
('SVC-IMM-002','Passport Renewal','DEPT-001','Immigration',TRUE),
('SVC-IMM-003','Visa Application','DEPT-001','Immigration',TRUE),
('SVC-IMM-004','Work Permit','DEPT-001','Immigration',TRUE),
-- Tax & Revenue
('SVC-TAX-001','Business Registration','DEPT-002','Tax',TRUE),
('SVC-TAX-002','Tax Filing','DEPT-002','Tax',TRUE),
('SVC-TAX-003','Tax Clearance','DEPT-002','Tax',TRUE),
-- Customs
('SVC-CUS-001','Import Declaration','DEPT-003','Customs',TRUE),
('SVC-CUS-002','Export License','DEPT-003','Customs',TRUE),
-- Civil Registry
('SVC-REG-001','Birth Certificate','DEPT-004','Registry',TRUE),
('SVC-REG-002','Marriage Certificate','DEPT-004','Registry',TRUE),
('SVC-REG-003','Land Title Search','DEPT-004','Registry',TRUE),
-- Health
('SVC-HLT-001','Vaccination Certificate','DEPT-005','Health',TRUE),
('SVC-HLT-002','Health Inspection','DEPT-005','Health',TRUE),
-- Tourism
('SVC-TUR-001','Tour Operator License','AGY-001','Tourism',TRUE),
('SVC-TUR-002','Hotel Registration','AGY-001','Tourism',TRUE),
-- Utilities
('SVC-UTL-001','Water Connection','AGY-003','Utilities',TRUE),
('SVC-UTL-002','Electricity Connection','AGY-004','Utilities',TRUE),
-- Digital
('SVC-DIG-001','Portal Account','AGY-002','Digital',TRUE),
('SVC-DIG-002','Technical Support','AGY-002','Digital',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, is_active=EXCLUDED.is_active;

-- ============================================
-- GENERATE SYNTHETIC FEEDBACK DATA
-- ============================================

INSERT INTO service_feedback (
    service_id, entity_id, channel, recipient_group,
    q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
    comment_text, grievance_flag, submitted_at, ip_hash, user_agent_hash
)
SELECT
    s.service_id,
    s.entity_id,
    CASE WHEN random() < 0.7 THEN 'ea_portal' ELSE 'qr_code' END,
    CASE floor(random() * 5)::int
        WHEN 0 THEN 'citizen'
        WHEN 1 THEN 'business'
        WHEN 2 THEN 'government'
        WHEN 3 THEN 'visitor'
        ELSE 'other'
    END,
    GREATEST(1, LEAST(5, 3 + floor(random() * 3)::int)),  -- q1_ease: 3-5
    GREATEST(1, LEAST(5, 3 + floor(random() * 3)::int)),  -- q2_clarity: 3-5
    GREATEST(1, LEAST(5, 3 + floor(random() * 3)::int)),  -- q3_timeliness: 3-5
    GREATEST(1, LEAST(5, 3 + floor(random() * 3)::int)),  -- q4_trust: 3-5
    GREATEST(1, LEAST(5, 3 + floor(random() * 3)::int)),  -- q5_overall_satisfaction: 3-5
    CASE WHEN random() < 0.5 THEN 'Good service, very satisfied' ELSE NULL END,
    CASE WHEN random() < 0.05 THEN TRUE ELSE FALSE END,   -- 5% grievance rate
    NOW() - (floor(random() * 90)::int || ' days')::interval,
    md5(random()::text),
    md5('user-agent-' || random()::text)
FROM service_master s
CROSS JOIN (SELECT generate_series(1, 15)) AS t(i)  -- 15 feedback per service
WHERE s.is_active = TRUE;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Entities loaded: ' || COUNT(*) FROM entity_master;
SELECT 'Services loaded: ' || COUNT(*) FROM service_master;
SELECT 'Feedback records: ' || COUNT(*) FROM service_feedback;

SQLEOF

if [ $? -eq 0 ]; then
    echo "✓ Seed data loaded successfully!"
else
    echo "✗ Failed to load seed data"
    exit 1
fi

echo ""
echo "Summary:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Entities: ' || COUNT(*) FROM entity_master"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Services: ' || COUNT(*) FROM service_master"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Feedback: ' || COUNT(*) FROM service_feedback"

echo ""
echo "✓ Complete!"