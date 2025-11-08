-- ============================================
-- GRENADA FEEDBACK DATABASE - SEED DATA
-- ============================================
-- Sample entities and services for testing
-- ============================================

-- ============================================
-- ENTITY MASTER DATA
-- ============================================

INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
-- Ministries
('MIN-001', 'Ministry of Finance', 'ministry', NULL, TRUE),
('MIN-002', 'Ministry of Health', 'ministry', NULL, TRUE),
('MIN-003', 'Ministry of Education', 'ministry', NULL, TRUE),
('MIN-004', 'Ministry of Legal Affairs', 'ministry', NULL, TRUE),
('MIN-005', 'Ministry of Tourism', 'ministry', NULL, TRUE),

-- Departments
('DEPT-001', 'Immigration Department', 'department', 'MIN-004', TRUE),
('DEPT-002', 'Inland Revenue Department', 'department', 'MIN-001', TRUE),
('DEPT-003', 'Customs & Excise Department', 'department', 'MIN-001', TRUE),
('DEPT-004', 'Registry Department', 'department', 'MIN-004', TRUE),
('DEPT-005', 'Public Health Department', 'department', 'MIN-002', TRUE),

-- Agencies
('AGY-001', 'Grenada Tourism Authority', 'agency', 'MIN-005', TRUE),
('AGY-002', 'Digital Transformation Agency', 'agency', NULL, TRUE),
('AGY-003', 'National Water & Sewerage Authority', 'statutory_body', NULL, TRUE),
('AGY-004', 'GRENLEC', 'statutory_body', NULL, TRUE);

-- ============================================
-- SERVICE MASTER DATA
-- ============================================

INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
-- Immigration Services
('SVC-IMM-001', 'Passport Application', 'DEPT-001', 'Immigration', 'Apply for new passport', TRUE),
('SVC-IMM-002', 'Passport Renewal', 'DEPT-001', 'Immigration', 'Renew existing passport', TRUE),
('SVC-IMM-003', 'Visa Application', 'DEPT-001', 'Immigration', 'Apply for visa', TRUE),
('SVC-IMM-004', 'Work Permit', 'DEPT-001', 'Immigration', 'Apply for work permit', TRUE),

-- Tax Services
('SVC-TAX-001', 'Business Registration', 'DEPT-002', 'Tax & Revenue', 'Register new business', TRUE),
('SVC-TAX-002', 'Tax Filing', 'DEPT-002', 'Tax & Revenue', 'File tax returns', TRUE),
('SVC-TAX-003', 'Tax Clearance Certificate', 'DEPT-002', 'Tax & Revenue', 'Obtain tax clearance', TRUE),

-- Customs Services
('SVC-CUS-001', 'Import Declaration', 'DEPT-003', 'Customs', 'Declare imported goods', TRUE),
('SVC-CUS-002', 'Export License', 'DEPT-003', 'Customs', 'Apply for export license', TRUE),

-- Registry Services
('SVC-REG-001', 'Birth Certificate', 'DEPT-004', 'Civil Registry', 'Obtain birth certificate', TRUE),
('SVC-REG-002', 'Marriage Certificate', 'DEPT-004', 'Civil Registry', 'Obtain marriage certificate', TRUE),
('SVC-REG-003', 'Death Certificate', 'DEPT-004', 'Civil Registry', 'Obtain death certificate', TRUE),
('SVC-REG-004', 'Land Title Search', 'DEPT-004', 'Property', 'Search land title records', TRUE),

-- Health Services
('SVC-HLT-001', 'Vaccination Certificate', 'DEPT-005', 'Health', 'Obtain vaccination records', TRUE),
('SVC-HLT-002', 'Health Inspection', 'DEPT-005', 'Health', 'Request health inspection', TRUE),
('SVC-HLT-003', 'Food Handler Permit', 'DEPT-005', 'Health', 'Apply for food handler permit', TRUE),

-- Tourism Services
('SVC-TUR-001', 'Tour Operator License', 'AGY-001', 'Tourism', 'Apply for tour operator license', TRUE),
('SVC-TUR-002', 'Hotel Registration', 'AGY-001', 'Tourism', 'Register hotel/accommodation', TRUE),

-- Utility Services
('SVC-UTL-001', 'Water Connection', 'AGY-003', 'Utilities', 'Request new water connection', TRUE),
('SVC-UTL-002', 'Water Bill Payment', 'AGY-003', 'Utilities', 'Pay water bill', TRUE),
('SVC-UTL-003', 'Electricity Connection', 'AGY-004', 'Utilities', 'Request new electricity connection', TRUE),
('SVC-UTL-004', 'Electricity Bill Payment', 'AGY-004', 'Utilities', 'Pay electricity bill', TRUE),

-- Digital Services
('SVC-DIG-001', 'eServices Account', 'AGY-002', 'Digital', 'Create eServices account', TRUE),
('SVC-DIG-002', 'Portal Support', 'AGY-002', 'Digital', 'Technical support for portal', TRUE);

-- ============================================
-- SAMPLE QR CODES (Optional - for testing)
-- ============================================

INSERT INTO qr_codes (qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, is_active, created_by) VALUES
('QR-IMM-001-TEST', 'SVC-IMM-001', 'DEPT-001', 'Immigration Office - St. Georges', 'Ministerial Complex, St. Georges', 'office', 'https://gea.abhirup.app/feedback/qr?c=QR-IMM-001-TEST', TRUE, 'system'),
('QR-TAX-001-TEST', 'SVC-TAX-001', 'DEPT-002', 'Inland Revenue - Main Office', 'Melville Street, St. Georges', 'office', 'https://gea.abhirup.app/feedback/qr?c=QR-TAX-001-TEST', TRUE, 'system'),
('QR-REG-001-TEST', 'SVC-REG-001', 'DEPT-004', 'Registry Office - St. Georges', 'Church Street, St. Georges', 'office', 'https://gea.abhirup.app/feedback/qr?c=QR-REG-001-TEST', TRUE, 'system');

-- ============================================
-- SEED DATA COMPLETE
-- ============================================

-- Verify data loaded
SELECT 'Entities loaded: ' || COUNT(*) FROM entity_master;
SELECT 'Services loaded: ' || COUNT(*) FROM service_master;
SELECT 'QR codes loaded: ' || COUNT(*) FROM qr_codes;