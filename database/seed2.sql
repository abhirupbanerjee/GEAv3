-- ============================================
-- GRENADA FEEDBACK DATABASE - SEED DATA (Expanded)
-- Safe to run multiple times if UNIQUE constraints exist.
-- ============================================

-- Recommended (create once):
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_entity_master_id ON entity_master(unique_entity_id);
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_service_master_id ON service_master(service_id);
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_qr_codes_id      ON qr_codes(qr_code_id);

-- ============================================
-- ENTITY MASTER DATA
-- Types used: ministry | department | agency | statutory_body | regulator | portal
-- ============================================

-- Core Ministries (existing + expanded)
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('MIN-001','Ministry of Finance','ministry',NULL,TRUE),
('MIN-002','Ministry of Health, Wellness & Religious Affairs','ministry',NULL,TRUE),
('MIN-003','Ministry of Education, Youth & Sports','ministry',NULL,TRUE),
('MIN-004','Ministry of Legal Affairs, Labour & Consumer Affairs','ministry',NULL,TRUE),
('MIN-005','Ministry of Economic Development, Planning & Tourism','ministry',NULL,TRUE),
('MIN-006','Ministry of Infrastructure, Public Utilities, Civil Aviation & Transport','ministry',NULL,TRUE),
('MIN-007','Ministry of Social & Community Development, Housing & Gender Affairs','ministry',NULL,TRUE),
('MIN-008','Office of the Prime Minister','ministry',NULL,TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- Departments (existing + expanded)
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('DEPT-001','Immigration Department','department','MIN-004',TRUE),
('DEPT-002','Inland Revenue Division (IRD)','department','MIN-001',TRUE),
('DEPT-003','Customs & Excise Division','department','MIN-001',TRUE),
('DEPT-004','Civil Registry & Deeds','department','MIN-004',TRUE),
('DEPT-005','Public Health Department','department','MIN-002',TRUE),
('DEPT-006','Central Statistical Office (CSO)','department','MIN-001',TRUE),
('DEPT-007','Accountant General’s Division','department','MIN-001',TRUE),
('DEPT-008','Budget Unit','department','MIN-001',TRUE),
('DEPT-009','Debt Management Unit','department','MIN-001',TRUE),
('DEPT-010','Office of Public Procurement','department','MIN-001',TRUE),
('DEPT-011','Department of ICT (DoICT)','department','MIN-008',TRUE),
('DEPT-012','Government Information Service (GIS)','department','MIN-008',TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- Agencies / Authorities / Statutory Bodies (existing + expanded)
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('AGY-001','Grenada Tourism Authority (GTA)','agency','MIN-005',TRUE),
('AGY-002','Digital Transformation Agency (DTA)','agency',NULL,TRUE),
('AGY-003','National Water & Sewerage Authority (NAWASA)','statutory_body','MIN-006',TRUE),
('AGY-004','Grenada Electricity Services Ltd (GRENLEC)','statutory_body','MIN-006',TRUE),
('AGY-005','Grenada Development Bank (GDB)','statutory_body','MIN-001',TRUE),
('AGY-006','National Insurance Scheme (NIS)','statutory_body','MIN-001',TRUE),
('AGY-007','Grenada Investment Development Corporation (GIDC)','agency','MIN-005',TRUE),
('AGY-008','Grenada Ports Authority (GPA)','statutory_body','MIN-006',TRUE),
('AGY-009','Grenada Airports Authority (GAA)','statutory_body','MIN-006',TRUE),
('AGY-010','Grenada Solid Waste Management Authority (GSWMA)','statutory_body','MIN-006',TRUE),
('AGY-011','Housing Authority of Grenada (HAG)','statutory_body','MIN-007',TRUE),
('AGY-012','Planning & Development Authority (PDA)','agency','MIN-005',TRUE),
('AGY-013','Grenada Bureau of Standards (GBS)','agency','MIN-005',TRUE),
('AGY-014','Marketing & National Importing Board (MNIB)','statutory_body','MIN-005',TRUE),
('AGY-015','Parliamentary Elections Office (PEO)','agency',NULL,TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- Regulators / Commissions
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('REG-001','Grenada Authority for the Regulation of Financial Institutions (GARFIN)','regulator','MIN-001',TRUE),
('REG-002','Public Utilities Regulatory Commission (PURC)','regulator','MIN-006',TRUE),
('REG-003','National Telecommunications Regulatory Commission (NTRC)','regulator','MIN-006',TRUE),
('REG-004','Financial Intelligence Unit (FIU)','regulator','MIN-001',TRUE),
('REG-005','Integrity Commission of Grenada','regulator','MIN-008',TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- Portals (for mapping digital services)
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active) VALUES
('PRT-001','my.gov.gd (Unified eServices Portal)','portal','DEPT-011',TRUE),
('PRT-002','pay.gov.gd (Government Payments Portal)','portal','DEPT-011',TRUE),
('PRT-003','ptax.gov.gd (Tax Portal)','portal','DEPT-002',TRUE)
ON CONFLICT (unique_entity_id) DO UPDATE
SET entity_name=EXCLUDED.entity_name, entity_type=EXCLUDED.entity_type, parent_entity_id=EXCLUDED.parent_entity_id, is_active=EXCLUDED.is_active;

-- ============================================
-- SERVICE MASTER DATA
-- service_id format kept from your pattern, grouped by domain
-- ============================================

-- Immigration / Legal Affairs
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-IMM-001','Passport Application','DEPT-001','Immigration','Apply for new passport',TRUE),
('SVC-IMM-002','Passport Renewal','DEPT-001','Immigration','Renew existing passport',TRUE),
('SVC-IMM-003','Visa Application','DEPT-001','Immigration','Apply for visa',TRUE),
('SVC-IMM-004','Work Permit (Employer-sponsored)','DEPT-001','Immigration','Apply for a work permit for foreign nationals',TRUE),
('SVC-LEG-001','Police Certificate of Character','DEPT-001','Legal','Background certificate for work/visa',TRUE),
('SVC-REG-010','Civil Records – Birth Certificate','DEPT-004','Civil Registry','Obtain birth certificate',TRUE),
('SVC-REG-011','Civil Records – Marriage Certificate','DEPT-004','Civil Registry','Obtain marriage certificate',TRUE),
('SVC-REG-012','Civil Records – Death Certificate','DEPT-004','Civil Registry','Obtain death certificate',TRUE),
('SVC-REG-013','Deeds & Land Registry – Title/Deed Registration','DEPT-004','Property','Register property transactions',TRUE),
('SVC-REG-014','Land Title Search / Certified Copy','DEPT-004','Property','Search and obtain certified title copies',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Tax & Revenue (IRD) + Payments
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-TAX-001','Business Registration','DEPT-002','Tax & Revenue','Register new business',TRUE),
('SVC-TAX-002','Tax Filing (Personal/Corporate)','DEPT-002','Tax & Revenue','File tax returns via ptax.gov.gd',TRUE),
('SVC-TAX-003','Tax Clearance Certificate','DEPT-002','Tax & Revenue','Obtain tax clearance',TRUE),
('SVC-TAX-004','Apply for Tax Identification Number (TIN)','DEPT-002','Tax & Revenue','Obtain a TIN',TRUE),
('SVC-PAY-001','Pay Government Taxes & Fees Online','PRT-002','Payments','Pay government taxes, fees and licences online',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Customs & Excise
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-CUS-001','Import Declaration','DEPT-003','Customs','Declare imported goods (ASYCUDA)',TRUE),
('SVC-CUS-002','Export Licence (Restricted Items)','DEPT-003','Customs','Apply for export licence',TRUE),
('SVC-CUS-003','Duty-Free Concession (Eligible Applicants)','DEPT-003','Customs','Apply for customs duty relief',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Health
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-HLT-001','Vaccination Certificate','DEPT-005','Health','Obtain vaccination records',TRUE),
('SVC-HLT-002','Public Health Inspection – Premises','DEPT-005','Health','Request public health inspection certificate',TRUE),
('SVC-HLT-003','Food Handler Permit','DEPT-005','Health','Apply for food handler permit',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Education
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-EDU-001','Scholarship Application (Tertiary)','MIN-003','Education','Apply for government or regional scholarships',TRUE),
('SVC-EDU-002','Teacher Registration/Licence','MIN-003','Education','Register/licence to teach',TRUE),
('SVC-EDU-003','CXC / External Exam Registration','MIN-003','Education','Register candidates for examinations',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Social Development / Housing / NIS / GDB
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-SOC-001','Public Assistance / Welfare Grant','MIN-007','Social','Apply for social assistance support',TRUE),
('SVC-HOU-001','Apply for Public Housing','AGY-011','Housing','Application for government-assisted housing',TRUE),
('SVC-NIS-001','NIS Contributions & Benefit Claims','AGY-006','Social Insurance','Manage contributions and apply for benefits',TRUE),
('SVC-NIS-002','Senior Citizens Pension','AGY-006','Social Insurance','Apply for pension benefits',TRUE),
('SVC-GDB-001','Student Loan – Tertiary Education','AGY-005','Finance','Apply for student loan financing',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Tourism / Business Development
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-TUR-001','Tour Operator Licence','AGY-001','Tourism','Apply for tour operator licence',TRUE),
('SVC-TUR-002','Hotel Registration / Classification','AGY-001','Tourism','Register and classify hotel/accommodation',TRUE),
('SVC-TUR-003','Film/Photography Permit (Public Sites)','AGY-001','Tourism','Permit to film in public/heritage sites',TRUE),
('SVC-BIZ-001','Investment Incentives / Tax Concessions','MIN-001','Business','Apply for investment incentives and concessions',TRUE),
('SVC-GIDC-001','Export Support / Promotion','AGY-007','Business','Support for exporters and trade promotion',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Planning / Lands / Standards / Agriculture
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-PLAN-001','Building/Development Permit','AGY-012','Planning','Apply for building/development approval',TRUE),
('SVC-PLAN-002','Planning Data / Cadastral Map Request','AGY-012','Planning','Request maps and planning data',TRUE),
('SVC-STD-001','Product/Process Certification','AGY-013','Standards','Apply for standards certification',TRUE),
('SVC-AGRI-001','Importer/Exporter Registration (Agri)','AGY-014','Agriculture','Register as importer/exporter for agri products',TRUE),
('SVC-AGRI-002','Plant/Animal Import Permit','AGY-014','Agriculture','Apply for plant/animal import permit',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Infrastructure / Transport / Utilities / Waste
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-TRN-001','Driver’s Licence / Learner’s Permit','MIN-006','Transport','Apply for or renew driver’s/learner’s permit',TRUE),
('SVC-TRN-002','Vehicle Registration (New)','MIN-006','Transport','Register a new motor vehicle',TRUE),
('SVC-TRN-003','Vehicle Licence Renewal','MIN-006','Transport','Renew annual vehicle licence',TRUE),
('SVC-UTL-001','Water Connection','AGY-003','Utilities','Request new water connection',TRUE),
('SVC-UTL-002','Water Bill Payment','AGY-003','Utilities','Pay water bill',TRUE),
('SVC-UTL-003','Electricity Connection','AGY-004','Utilities','Request new electricity connection',TRUE),
('SVC-UTL-004','Electricity Bill Payment','AGY-004','Utilities','Pay electricity bill',TRUE),
('SVC-SWM-001','Report Waste / Illegal Dumping','AGY-010','Waste','Report waste issues or illegal dumping',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- ICT / Digital Government / Open Data
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-DIG-001','Create eServices Account','PRT-001','Digital','Create/activate account for my.gov.gd',TRUE),
('SVC-DIG-002','Portal Support (Help Desk)','AGY-002','Digital','Technical support for eServices portal',TRUE),
('SVC-DIG-003','Report Cybercrime / Incident','DEPT-011','Digital','Submit cyber incident report to national team',TRUE),
('SVC-OD-001','Request Official Statistics / Datasets','DEPT-006','Open Data','Request/download official statistics',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Aviation / Ports
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-AV-001','Airport Concession / Permit','AGY-009','Aviation','Apply for airport commercial concessions/permits',TRUE),
('SVC-PORT-001','Port Services / Berthing Request','AGY-008','Ports','Request berthing/port services',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- Elections / Governance
INSERT INTO service_master (service_id, service_name, entity_id, service_category, service_description, is_active) VALUES
('SVC-ELC-001','Voter Registration / Update','AGY-015','Elections','Register to vote or update voter details',TRUE),
('SVC-FOI-001','Access to Information (FOI)','DEPT-012','Governance','Submit freedom-of-information request',TRUE)
ON CONFLICT (service_id) DO UPDATE
SET service_name=EXCLUDED.service_name, entity_id=EXCLUDED.entity_id, service_category=EXCLUDED.service_category, service_description=EXCLUDED.service_description, is_active=EXCLUDED.is_active;

-- ============================================
-- SAMPLE QR CODES (kept from your setup + examples)
-- ============================================

INSERT INTO qr_codes (qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, is_active, created_by) VALUES
('QR-IMM-001-TEST','SVC-IMM-001','DEPT-001','Immigration Office - St. George’s','Ministerial Complex, St. George’s','office','https://gea.abhirup.app/feedback/qr?c=QR-IMM-001-TEST',TRUE,'system'),
('QR-TAX-001-TEST','SVC-TAX-001','DEPT-002','Inland Revenue - Main Office','Melville Street, St. George’s','office','https://gea.abhirup.app/feedback/qr?c=QR-TAX-001-TEST',TRUE,'system'),
('QR-REG-001-TEST','SVC-REG-010','DEPT-004','Registry Office - St. George’s','Church Street, St. George’s','office','https://gea.abhirup.app/feedback/qr?c=QR-REG-001-TEST',TRUE,'system')
ON CONFLICT (qr_code_id) DO UPDATE
SET service_id=EXCLUDED.service_id, entity_id=EXCLUDED.entity_id, location_name=EXCLUDED.location_name, location_address=EXCLUDED.location_address, location_type=EXCLUDED.location_type, generated_url=EXCLUDED.generated_url, is_active=EXCLUDED.is_active, created_by=EXCLUDED.created_by;

-- ============================================
-- SEED DATA COMPLETE
-- ============================================

-- Verification snapshots
SELECT 'Entities loaded: '  || COUNT(*) AS info FROM entity_master;
SELECT 'Services loaded: '  || COUNT(*) AS info FROM service_master;
SELECT 'QR codes loaded: '  || COUNT(*) AS info FROM qr_codes;
