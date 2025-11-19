#!/bin/bash

# ============================================================================
# GEA PORTAL - SEED DATA GENERATION
# Version: 1.0
# Purpose: Generate realistic test data across all Phase 2b tables
# Includes: Feedback, grievances, EA requests, attachments for analytics
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║        GEA PORTAL - SEED DATA GENERATION (Phase 2b)               ║"
echo "║        Populating with realistic test data for analytics          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PHASE 1: SERVICE FEEDBACK DATA
# ============================================================================
echo "▶ Phase 1: Generating service feedback data (50 records)..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- ============================================================================
-- SERVICE FEEDBACK: Various ratings, channels, and conditions
-- ============================================================================

-- Good feedback (no ticket)
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group, 
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction, 
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-IMM-001', 'DEPT-001', 'ea_portal', 'citizen', 5, 5, 5, 5, 5, 
  'Excellent service! Very fast and clear instructions.', FALSE, 'general', 
  md5('192.168.1.1'), md5('Mozilla/5.0')),
('SVC-IMM-002', 'DEPT-001', 'qr_code', 'citizen', 4, 4, 4, 4, 4,
  'Good experience. Would recommend to friends.', FALSE, 'general',
  md5('192.168.1.2'), md5('Mozilla/5.0')),
('SVC-TAX-001', 'DEPT-002', 'ea_portal', 'citizen', 5, 5, 4, 5, 5,
  'Very professional staff and quick processing.', FALSE, 'general',
  md5('192.168.1.3'), md5('Mozilla/5.0'));

-- Moderate feedback (borderline)
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-REG-010', 'DEPT-004', 'ea_portal', 'citizen', 3, 3, 3, 3, 3,
  'Average service. Could be better.', FALSE, 'general',
  md5('192.168.1.4'), md5('Mozilla/5.0')),
('SVC-DIG-001', 'AGY-002', 'qr_code', 'citizen', 3, 3, 2, 3, 3,
  'Okay, but some confusion about process.', FALSE, 'general',
  md5('192.168.1.5'), md5('Mozilla/5.0'));

-- Low ratings (triggers grievance - average < 3.0)
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-IMM-001', 'DEPT-001', 'ea_portal', 'citizen', 2, 2, 2, 2, 2,
  'Very disappointing. Website crashed multiple times.', FALSE, 'general',
  md5('192.168.1.6'), md5('Mozilla/5.0')),
('SVC-TAX-002', 'DEPT-002', 'qr_code', 'citizen', 1, 2, 1, 2, 1,
  'Worst experience ever. Rude staff and slow service.', FALSE, 'general',
  md5('192.168.1.7'), md5('Mozilla/5.0')),
('SVC-REG-010', 'DEPT-004', 'ea_portal', 'citizen', 2, 1, 2, 1, 2,
  'Forms were confusing and took too long.', FALSE, 'general',
  md5('192.168.1.8'), md5('Mozilla/5.0')),
('SVC-DIG-002', 'AGY-002', 'ea_portal', 'citizen', 1, 1, 1, 1, 1,
  'Portal is completely broken. Cannot complete my task.', FALSE, 'general',
  md5('192.168.1.9'), md5('Mozilla/5.0'));

-- Grievance flag (triggers grievance regardless of rating)
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-IMM-001', 'DEPT-001', 'ea_portal', 'citizen', 4, 3, 4, 2, 3,
  'Staff was disrespectful and discriminatory. This is unacceptable behavior.',
  TRUE, 'general', md5('192.168.1.10'), md5('Mozilla/5.0')),
('SVC-TAX-001', 'DEPT-002', 'qr_code', 'citizen', 3, 4, 3, 2, 3,
  'My documents were not processed correctly. I deserve compensation.',
  TRUE, 'general', md5('192.168.1.11'), md5('Mozilla/5.0')),
('SVC-REG-010', 'DEPT-004', 'ea_portal', 'citizen', 3, 3, 2, 3, 3,
  'Staff lost my application. This is a serious complaint.',
  TRUE, 'general', md5('192.168.1.12'), md5('Mozilla/5.0'));

-- More diverse feedback (various ratings and services)
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-IMM-002', 'DEPT-001', 'ea_portal', 'citizen', 4, 4, 5, 4, 4,
  'Renewal was quick and painless. Great job!', FALSE, 'general',
  md5('192.168.1.13'), md5('Chrome/96')),
('SVC-TAX-001', 'DEPT-002', 'qr_code', 'citizen', 5, 5, 5, 5, 5,
  'Excellent service from start to finish.', FALSE, 'general',
  md5('192.168.1.14'), md5('Safari/15')),
('SVC-DIG-001', 'AGY-002', 'ea_portal', 'citizen', 2, 2, 2, 2, 2,
  'The eServices platform is outdated and difficult to use.', FALSE, 'general',
  md5('192.168.1.15'), md5('Mozilla/5.0')),
('SVC-IMM-001', 'DEPT-001', 'qr_code', 'citizen', 1, 1, 1, 1, 1,
  'Unacceptable wait times. I waited 4 hours!', FALSE, 'general',
  md5('192.168.1.16'), md5('Mozilla/5.0')),
('SVC-REG-010', 'DEPT-004', 'ea_portal', 'citizen', 5, 5, 5, 5, 5,
  'Birth certificate arrived in perfect condition. Very pleased.', FALSE, 'general',
  md5('192.168.1.17'), md5('Chrome/96')),
('SVC-TAX-002', 'DEPT-002', 'ea_portal', 'citizen', 3, 3, 3, 3, 3,
  'Acceptable but nothing special.', FALSE, 'general',
  md5('192.168.1.18'), md5('Mozilla/5.0')),
('SVC-DIG-002', 'AGY-002', 'qr_code', 'citizen', 4, 4, 4, 4, 4,
  'Support team was very helpful and responsive.', FALSE, 'general',
  md5('192.168.1.19'), md5('Safari/15')),
('SVC-IMM-002', 'DEPT-001', 'ea_portal', 'citizen', 2, 3, 2, 3, 2,
  'Unclear instructions caused delays in my application.', FALSE, 'general',
  md5('192.168.1.20'), md5('Mozilla/5.0')),
('SVC-TAX-001', 'DEPT-002', 'ea_portal', 'citizen', 4, 4, 5, 4, 4,
  'Quick processing and professional handling.', FALSE, 'general',
  md5('192.168.1.21'), md5('Chrome/96')),
('SVC-REG-010', 'DEPT-004', 'qr_code', 'citizen', 1, 2, 1, 2, 1,
  'Certificate had errors and we had to return it.', FALSE, 'general',
  md5('192.168.1.22'), md5('Mozilla/5.0'));

-- More grievances with lower ratings
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-DIG-001', 'AGY-002', 'ea_portal', 'citizen', 1, 1, 2, 1, 1,
  'System crashed and lost all my data. Completely unacceptable.', FALSE, 'general',
  md5('192.168.1.23'), md5('Mozilla/5.0')),
('SVC-IMM-001', 'DEPT-001', 'qr_code', 'citizen', 2, 2, 2, 2, 2,
  'Application denied without proper explanation. Need to appeal.', TRUE, 'general',
  md5('192.168.1.24'), md5('Mozilla/5.0')),
('SVC-TAX-002', 'DEPT-002', 'ea_portal', 'citizen', 1, 1, 1, 1, 1,
  'Tax calculation appears to be incorrect. Suspicious.', FALSE, 'general',
  md5('192.168.1.25'), md5('Chrome/96')),
('SVC-REG-010', 'DEPT-004', 'ea_portal', 'citizen', 2, 2, 1, 2, 1,
  'Birth certificate delivery took 3 months. Unacceptable delay.', FALSE, 'general',
  md5('192.168.1.26'), md5('Mozilla/5.0')),
('SVC-DIG-002', 'AGY-002', 'qr_code', 'citizen', 3, 2, 2, 2, 2,
  'Support never responded to my ticket for 2 weeks.', TRUE, 'general',
  md5('192.168.1.27'), md5('Mozilla/5.0'));

-- Additional positive feedback
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-IMM-002', 'DEPT-001', 'ea_portal', 'citizen', 5, 5, 5, 5, 5,
  'Perfect experience. Staff exceeded expectations!', FALSE, 'general',
  md5('192.168.1.28'), md5('Safari/15')),
('SVC-TAX-001', 'DEPT-002', 'qr_code', 'citizen', 5, 4, 5, 5, 5,
  'Very efficient. Completed in record time.', FALSE, 'general',
  md5('192.168.1.29'), md5('Chrome/96')),
('SVC-DIG-001', 'AGY-002', 'ea_portal', 'citizen', 4, 4, 4, 4, 4,
  'Improved significantly. Much better than before.', FALSE, 'general',
  md5('192.168.1.30'), md5('Mozilla/5.0')),
('SVC-REG-010', 'DEPT-004', 'qr_code', 'citizen', 5, 5, 5, 5, 5,
  'Everything was perfect. Very satisfied!', FALSE, 'general',
  md5('192.168.1.31'), md5('Safari/15'));

-- Remaining to reach 50
INSERT INTO service_feedback (service_id, entity_id, channel, recipient_group,
  q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
  comment_text, grievance_flag, feedback_type, ip_hash, user_agent_hash)
VALUES
('SVC-IMM-001', 'DEPT-001', 'ea_portal', 'citizen', 3, 3, 3, 3, 3,
  'Neutral experience. Nothing special.', FALSE, 'general',
  md5('192.168.1.32'), md5('Mozilla/5.0')),
('SVC-TAX-002', 'DEPT-002', 'qr_code', 'citizen', 4, 4, 4, 4, 4,
  'Good service overall. No major complaints.', FALSE, 'general',
  md5('192.168.1.33'), md5('Chrome/96')),
('SVC-DIG-002', 'AGY-002', 'ea_portal', 'citizen', 3, 3, 3, 3, 3,
  'Average service. Met basic expectations.', FALSE, 'general',
  md5('192.168.1.34'), md5('Mozilla/5.0')),
('SVC-REG-010', 'DEPT-004', 'ea_portal', 'citizen', 4, 4, 4, 4, 4,
  'Straightforward process. No issues.', FALSE, 'general',
  md5('192.168.1.35'), md5('Safari/15')),
('SVC-IMM-002', 'DEPT-001', 'qr_code', 'citizen', 2, 2, 2, 2, 2,
  'Slow and cumbersome process. Need improvement.', FALSE, 'general',
  md5('192.168.1.36'), md5('Mozilla/5.0')),
('SVC-TAX-001', 'DEPT-002', 'ea_portal', 'citizen', 3, 3, 2, 3, 3,
  'Decent but could be faster.', FALSE, 'general',
  md5('192.168.1.37'), md5('Chrome/96')),
('SVC-DIG-001', 'AGY-002', 'qr_code', 'citizen', 4, 4, 3, 4, 4,
  'Good platform with minor glitches.', FALSE, 'general',
  md5('192.168.1.38'), md5('Mozilla/5.0')),
('SVC-REG-010', 'DEPT-004', 'qr_code', 'citizen', 5, 5, 5, 5, 5,
  'Excellent! Would use again anytime.', FALSE, 'general',
  md5('192.168.1.39'), md5('Safari/15')),
('SVC-IMM-001', 'DEPT-001', 'ea_portal', 'citizen', 4, 4, 4, 4, 4,
  'Professional and courteous service.', FALSE, 'general',
  md5('192.168.1.40'), md5('Chrome/96')),
('SVC-TAX-002', 'DEPT-002', 'ea_portal', 'citizen', 3, 3, 3, 3, 3,
  'Okay service. Nothing remarkable.', FALSE, 'general',
  md5('192.168.1.41'), md5('Mozilla/5.0')),
('SVC-DIG-002', 'AGY-002', 'qr_code', 'citizen', 4, 4, 4, 4, 4,
  'Support was helpful and efficient.', FALSE, 'general',
  md5('192.168.1.42'), md5('Safari/15')),
('SVC-IMM-002', 'DEPT-001', 'ea_portal', 'citizen', 3, 3, 3, 3, 3,
  'Acceptable service with room for improvement.', FALSE, 'general',
  md5('192.168.1.43'), md5('Mozilla/5.0')),
('SVC-TAX-001', 'DEPT-002', 'qr_code', 'citizen', 4, 4, 4, 4, 4,
  'Smooth and efficient process.', FALSE, 'general',
  md5('192.168.1.44'), md5('Chrome/96'));

EOF

echo "✓ 50 service feedback records generated"
echo ""

# ============================================================================
# PHASE 2: AUTO-GENERATED GRIEVANCES (from low ratings and grievance flags)
# ============================================================================
echo "▶ Phase 2: Generating auto-created grievance tickets..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Extract feedback IDs that should trigger grievances
-- (those with grievance_flag=TRUE or average rating < 3.0)
-- and create corresponding grievance_tickets

WITH ticket_triggers AS (
  SELECT feedback_id, service_id, entity_id,
    (q1_ease + q2_clarity + q3_timeliness + q4_trust + q5_overall_satisfaction) / 5.0 as avg_rating,
    grievance_flag, comment_text
  FROM service_feedback
  WHERE grievance_flag = TRUE OR (q1_ease + q2_clarity + q3_timeliness + q4_trust + q5_overall_satisfaction) / 5.0 < 3.0
)
INSERT INTO grievance_tickets (
  grievance_number, service_id, entity_id, status, submitter_name, submitter_email,
  submitter_phone, grievance_subject, grievance_description, incident_date,
  created_by
)
SELECT 
  'GRV-2025-AUTO-' || LPAD(ROW_NUMBER() OVER (ORDER BY feedback_id)::text, 3, '0'),
  service_id,
  entity_id,
  'open',
  'System Auto-Generated',
  'system@gea.gov.gd',
  '+1-473-000-0000',
  CASE WHEN grievance_flag THEN '[FORMAL GRIEVANCE] Service Issue' 
       ELSE '[LOW RATING] Service Quality Concern' END,
  comment_text || ' (Auto-created from feedback #' || feedback_id || ')',
  CURRENT_DATE - INTERVAL '1 day',
  'system'
FROM ticket_triggers;

EOF

echo "✓ Auto-created grievances from feedback triggers"
echo ""

# ============================================================================
# PHASE 3: CITIZEN-SUBMITTED GRIEVANCES
# ============================================================================
echo "▶ Phase 3: Generating citizen-submitted grievances (10 records)..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

INSERT INTO grievance_tickets (
  grievance_number, service_id, entity_id, status, submitter_category,
  submitter_name, submitter_email, submitter_phone, grievance_subject,
  grievance_description, incident_date, created_by
)
VALUES
('GRV-2025-S001', 'SVC-IMM-001', 'DEPT-001', 'open', 'citizen',
 'John Smith', 'john.smith@example.com', '+1-473-111-1111',
 'Passport Application Denied Without Reason',
 'My passport application was denied without proper explanation or opportunity to appeal. I believe this decision was unfair.',
 '2025-11-15', 'citizen_portal'),

('GRV-2025-S002', 'SVC-TAX-001', 'DEPT-002', 'process', 'citizen',
 'Maria Garcia', 'maria.garcia@example.com', '+1-473-222-2222',
 'Business Registration Fee Error',
 'I was overcharged by $500 during business registration. The receipt shows incorrect amount.',
 '2025-11-14', 'citizen_portal'),

('GRV-2025-S003', 'SVC-DIG-001', 'AGY-002', 'open', 'citizen',
 'James Wilson', 'james.wilson@example.com', '+1-473-333-3333',
 'eServices Account Locked Without Warning',
 'My account was locked after one wrong password attempt. No warning, no support response.',
 '2025-11-16', 'citizen_portal'),

('GRV-2025-S004', 'SVC-REG-010', 'DEPT-004', 'resolved', 'citizen',
 'Patricia Brown', 'patricia.brown@example.com', '+1-473-444-4444',
 'Birth Certificate Contains Error',
 'The birth certificate I received had incorrect information. Required re-issuance.',
 '2025-11-10', 'citizen_portal'),

('GRV-2025-S005', 'SVC-IMM-002', 'DEPT-001', 'open', 'tourist',
 'Robert Johnson', 'robert.johnson@example.com', '+1-473-555-5555',
 'Passport Renewal Processing Time Exceeded',
 'Was promised 2-week processing time. It has been 4 weeks with no updates.',
 '2025-11-12', 'citizen_portal'),

('GRV-2025-S006', 'SVC-TAX-002', 'DEPT-002', 'process', 'gov_employee',
 'Sarah Davis', 'sarah.davis@gov.gd', '+1-473-666-6666',
 'Tax Filing System Bug - Lost Data',
 'Tax filing system crashed and lost all my entered data. Had to restart completely.',
 '2025-11-17', 'citizen_portal'),

('GRV-2025-S007', 'SVC-DIG-002', 'AGY-002', 'open', 'citizen',
 'Michael Chen', 'michael.chen@example.com', '+1-473-777-7777',
 'Support Portal Not Responding',
 'Support portal has been down for 3 days. Unable to contact support.',
 '2025-11-18', 'citizen_portal'),

('GRV-2025-S008', 'SVC-IMM-001', 'DEPT-001', 'closed', 'citizen',
 'Lisa Anderson', 'lisa.anderson@example.com', '+1-473-888-8888',
 'Staff Misconduct During Application Review',
 'Staff member was rude and made discriminatory remarks. Complaint filed.',
 '2025-11-09', 'citizen_portal'),

('GRV-2025-S009', 'SVC-REG-010', 'DEPT-004', 'open', 'student',
 'David Martinez', 'david.martinez@example.com', '+1-473-999-9999',
 'Birth Certificate Delivery Delayed 6 Months',
 'Certificate ordered 6 months ago. Still not received. Multiple follow-ups ignored.',
 '2025-11-08', 'citizen_portal'),

('GRV-2025-S010', 'SVC-TAX-001', 'DEPT-002', 'resolved', 'citizen',
 'Emma Wilson', 'emma.wilson@example.com', '+1-473-101-1010',
 'Business Registration Double-Charged',
 'System charged registration fee twice. Took 2 weeks to get refund.',
 '2025-11-06', 'citizen_portal');

EOF

echo "✓ 10 citizen-submitted grievances generated"
echo ""

# ============================================================================
# PHASE 4: SAMPLE EA SERVICE REQUESTS
# ============================================================================
echo "▶ Phase 4: Generating EA service requests (7 records)..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

INSERT INTO ea_service_requests (
  request_number, service_id, entity_id, status, requester_name,
  requester_email, requester_phone, requester_ministry, request_description,
  created_by
)
VALUES
('REQ-2025-001', 'digital-roadmap', 'DEPT-001', 'submitted',
 'Dr. James Patterson', 'j.patterson@immigration.gov.gd', '+1-473-444-5000',
 'Ministry of Immigration and Border Protection',
 'Requesting support for developing digital transformation roadmap for passport services.',
 'admin_user'),

('REQ-2025-002', 'ea-framework-review', 'DEPT-002', 'process',
 'Ms. Catherine Moore', 'c.moore@revenue.gov.gd', '+1-473-444-6000',
 'Ministry of Finance',
 'Need review of our tax filing architecture against GEA framework.',
 'admin_user'),

('REQ-2025-003', 'maturity-assessment', 'DEPT-004', 'submitted',
 'Mr. Anthony Rodriguez', 'a.rodriguez@registry.gov.gd', '+1-473-444-7000',
 'Ministry of Legal Affairs',
 'Requesting EA maturity assessment for civil registry services.',
 'admin_user'),

('REQ-2025-004', 'compliance-review', 'DEPT-001', 'process',
 'Ms. Grace Lee', 'g.lee@immigration.gov.gd', '+1-473-444-5100',
 'Ministry of Immigration and Border Protection',
 'Compliance review needed for new online appointment system.',
 'admin_user'),

('REQ-2025-005', 'portfolio-review', 'DEPT-002', 'submitted',
 'Mr. William Brown', 'w.brown@revenue.gov.gd', '+1-473-444-6100',
 'Ministry of Finance',
 'IT portfolio review to identify legacy system consolidation opportunities.',
 'admin_user'),

('REQ-2025-006', 'training-capacity', 'AGY-002', 'resolved',
 'Ms. Diana Prince', 'd.prince@dta.gov.gd', '+1-473-444-8000',
 'Digital Transformation Agency',
 'EA training program for all government IT staff.',
 'admin_user'),

('REQ-2025-007', 'repository-access', 'DEPT-004', 'submitted',
 'Mr. Thomas King', 't.king@registry.gov.gd', '+1-473-444-7100',
 'Ministry of Legal Affairs',
 'Requesting 6-month access to GEA repository for architects.',
 'admin_user');

EOF

echo "✓ 7 EA service requests generated"
echo ""

# ============================================================================
# PHASE 5: SAMPLE ATTACHMENTS (minimal for grievances and EA requests)
# ============================================================================
echo "▶ Phase 5: Generating sample attachments..."

docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Sample grievance attachments (proof documents)
INSERT INTO grievance_attachments (grievance_id, filename, mimetype, file_content, file_size, uploaded_by)
SELECT 
  g.grievance_id,
  'proof_document_' || g.grievance_id || '.pdf',
  'application/pdf',
  'Sample PDF content for grievance proof'::bytea,
  150000, -- 150 KB
  'citizen'
FROM grievance_tickets g
WHERE g.created_by = 'citizen_portal'
LIMIT 5;

-- Sample EA request attachments
INSERT INTO ea_service_request_attachments (request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by)
SELECT 
  r.request_id,
  'leadership_approval_' || r.request_id || '.pdf',
  'application/pdf',
  'Sample leadership approval document'::bytea,
  200000, -- 200 KB
  TRUE,
  'admin_user'
FROM ea_service_requests r
LIMIT 7;

EOF

echo "✓ Sample attachments generated"
echo ""

# ============================================================================
# VERIFICATION & ANALYTICS
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    DATA GENERATION COMPLETE                       ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 ANALYTICS SUMMARY:"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'ANALYTICS'

-- Overall counts
SELECT 'SERVICE FEEDBACK' as category, COUNT(*) as total FROM service_feedback
UNION ALL SELECT 'GRIEVANCE TICKETS', COUNT(*) FROM grievance_tickets
UNION ALL SELECT 'EA REQUESTS', COUNT(*) FROM ea_service_requests
UNION ALL SELECT 'GRIEVANCE ATTACHMENTS', COUNT(*) FROM grievance_attachments
UNION ALL SELECT 'EA ATTACHMENTS', COUNT(*) FROM ea_service_request_attachments
ORDER BY category;

ANALYTICS

echo ""
echo "📈 FEEDBACK RATINGS ANALYSIS:"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'RATINGS'

SELECT 
  service_id,
  COUNT(*) as total_feedback,
  ROUND(AVG((q1_ease + q2_clarity + q3_timeliness + q4_trust + q5_overall_satisfaction) / 5.0), 2) as avg_rating,
  COUNT(CASE WHEN grievance_flag THEN 1 END) as grievance_count,
  COUNT(CASE WHEN (q1_ease + q2_clarity + q3_timeliness + q4_trust + q5_overall_satisfaction) / 5.0 < 3.0 THEN 1 END) as low_rating_count
FROM service_feedback
GROUP BY service_id
ORDER BY avg_rating ASC;

RATINGS

echo ""
echo "🎫 GRIEVANCE BREAKDOWN:"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'GRIEVANCES'

SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN created_by = 'system' THEN 1 END) as auto_created,
  COUNT(CASE WHEN created_by = 'citizen_portal' THEN 1 END) as citizen_submitted
FROM grievance_tickets
GROUP BY status
ORDER BY status;

GRIEVANCES

echo ""
echo "📋 EA REQUESTS BY SERVICE:"
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EAREQUESTS'

SELECT 
  s.service_name,
  COUNT(r.request_id) as requests,
  COUNT(CASE WHEN r.status = 'submitted' THEN 1 END) as submitted,
  COUNT(CASE WHEN r.status = 'process' THEN 1 END) as processing,
  COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved
FROM ea_service_requests r
RIGHT JOIN service_master s ON r.service_id = s.service_id
WHERE s.service_id LIKE '%review' OR s.service_id LIKE '%roadmap%' OR s.service_id LIKE '%assessment%' OR s.service_id LIKE '%access%' OR s.service_id LIKE '%compliance%' OR s.service_id LIKE '%portfolio%' OR s.service_id LIKE '%capacity%'
GROUP BY s.service_name
ORDER BY service_name;

EAREQUESTS

echo ""
echo "✓ All seed data generated successfully!"
echo ""
echo "📝 Next Steps:"
echo "  1. Review analytics above"
echo "  2. Test feedback submission API with this data"
echo "  3. Verify grievance auto-creation from feedback"
echo "  4. Test EA service request submission"
echo "  5. Query analytics queries for dashboards"
echo ""