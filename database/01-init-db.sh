#!/bin/bash

# ============================================================================
# GEA PORTAL DATABASE INITIALIZATION - CLEAN SLATE
# Version: 5.0 (Production Ready)
# Purpose: Drop all tables and rebuild entire database from scratch
# Architecture: Phase 2b - Grievances + EA Services
# Date: November 19, 2025
# ============================================================================
#
# THREE DISTINCT FLOWS:
# 1. Service Feedback → Auto-create Grievance (low rating or grievance flag)
# 2. EA Service Request (admin portal with per-service attachments)
# 3. Formal Citizen Grievance (public /grievance page)
#
# KEY TABLES:
# - grievance_tickets (Flow 1 & 3)
# - grievance_attachments (Flow 1 & 3)
# - ea_service_requests (Flow 2)
# - ea_service_request_attachments (Flow 2)
# - service_attachments (Master data: 27 docs across 7 services)
# - service_feedback (Trigger for auto-grievance)
# - entity_master, service_master (Reference data)
# - submission_rate_limit, captcha_challenges (Security)
#
# ============================================================================

set -e

DB_USER="feedback_user"
DB_NAME="feedback"
BACKUP_DIR="/tmp/gea_backups"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║   GEA PORTAL DATABASE INITIALIZATION v5.0 - CLEAN SLATE           ║"
echo "║   Phase 2b: Grievances + EA Services Architecture                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: VERIFY CONNECTION
# ============================================================================
echo "▶ Step 1: Verifying database connection..."
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" 2>/dev/null; then
    echo "✗ Cannot connect to database."
    echo "  Ensure feedback_db container is running:"
    echo "  docker-compose up -d feedback_db"
    exit 1
fi
echo "✓ Database connection successful"
echo ""

# ============================================================================
# STEP 2: BACKUP (OPTIONAL)
# ============================================================================
echo "▶ Step 2: Creating backup (optional)..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/feedback_backup_$(date +%Y%m%d_%H%M%S).sql"

if docker exec feedback_db pg_dump -U $DB_USER feedback > "$BACKUP_FILE" 2>/dev/null; then
    echo "✓ Backup created: $BACKUP_FILE"
else
    echo "⊘ Backup skipped (database may be empty)"
fi
echo ""

# ============================================================================
# STEP 3: DROP ALL TABLES AND SCHEMA
# ============================================================================
echo "▶ Step 3: Dropping all existing tables and objects..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
-- Drop all tables with cascade
DROP TABLE IF EXISTS captcha_challenges CASCADE;
DROP TABLE IF EXISTS submission_attempts CASCADE;
DROP TABLE IF EXISTS submission_rate_limit CASCADE;
DROP TABLE IF EXISTS ea_service_request_attachments CASCADE;
DROP TABLE IF EXISTS ea_service_requests CASCADE;
DROP TABLE IF EXISTS grievance_attachments CASCADE;
DROP TABLE IF EXISTS grievance_tickets CASCADE;
DROP TABLE IF EXISTS service_feedback CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS service_attachments CASCADE;
DROP TABLE IF EXISTS grievance_status CASCADE;
DROP TABLE IF EXISTS priority_levels CASCADE;
DROP TABLE IF EXISTS service_master CASCADE;
DROP TABLE IF EXISTS entity_master CASCADE;
DROP TABLE IF EXISTS initialization_checkpoint CASCADE;

-- Confirm all tables dropped
SELECT COUNT(*) as tables_remaining FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
EOF

echo "✓ All tables dropped"
echo ""

# ============================================================================
# STEP 4: CREATE EXTENSIONS
# ============================================================================
echo "▶ Step 4: Creating PostgreSQL extensions..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOF

echo "✓ Extensions created"
echo ""

# ============================================================================
# STEP 5: CREATE MASTER DATA TABLES
# ============================================================================
echo "▶ Step 5: Creating master data tables (entity_master, service_master)..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Entity Master: Government departments, agencies, ministries
CREATE TABLE entity_master (
    unique_entity_id VARCHAR(50) PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    parent_entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entity_active ON entity_master(is_active);
CREATE INDEX idx_entity_type ON entity_master(entity_type);

-- Service Master: All government services (public + 7 EA services)
CREATE TABLE service_master (
    service_id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    service_category VARCHAR(100),
    service_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_active ON service_master(is_active);
CREATE INDEX idx_service_entity ON service_master(entity_id);

EOF

echo "✓ Master data tables created"
echo ""

# ============================================================================
# STEP 6: CREATE LOOKUP/REFERENCE TABLES
# ============================================================================
echo "▶ Step 6: Creating lookup tables (priorities, statuses)..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Priority Levels: For SLA calculation
CREATE TABLE priority_levels (
    priority_id SERIAL PRIMARY KEY,
    priority_code VARCHAR(20) UNIQUE NOT NULL,
    priority_name VARCHAR(50) NOT NULL,
    sla_multiplier DECIMAL(3,2) DEFAULT 1.0,
    sort_order INTEGER DEFAULT 0,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_priority_code ON priority_levels(priority_code);

-- Grievance Status: Workflow states for grievances
CREATE TABLE grievance_status (
    status_id SERIAL PRIMARY KEY,
    status_code VARCHAR(20) UNIQUE NOT NULL,
    status_name VARCHAR(50) NOT NULL,
    status_order INTEGER DEFAULT 0,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grievance_status_code ON grievance_status(status_code);

EOF

echo "✓ Lookup tables created"
echo ""

# ============================================================================
# STEP 7: CREATE FEEDBACK COLLECTION SYSTEM
# ============================================================================
echo "▶ Step 7: Creating feedback collection tables..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Service Feedback: Citizens rate services (triggers grievance creation)
CREATE TABLE service_feedback (
    feedback_id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    channel VARCHAR(20) NOT NULL,
    qr_code_id VARCHAR(50),
    recipient_group VARCHAR(50),
    q1_ease INTEGER,
    q2_clarity INTEGER,
    q3_timeliness INTEGER,
    q4_trust INTEGER,
    q5_overall_satisfaction INTEGER,
    comment_text TEXT,
    grievance_flag BOOLEAN DEFAULT FALSE,
    grievance_ticket_id INTEGER,
    feedback_type VARCHAR(50) DEFAULT 'general',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64)
);

CREATE INDEX idx_feedback_service ON service_feedback(service_id);
CREATE INDEX idx_feedback_entity ON service_feedback(entity_id);
CREATE INDEX idx_feedback_channel ON service_feedback(channel);
CREATE INDEX idx_feedback_submitted ON service_feedback(submitted_at DESC);
CREATE INDEX idx_feedback_grievance ON service_feedback(grievance_flag);
CREATE INDEX idx_feedback_qr ON service_feedback(qr_code_id);

-- QR Codes: For feedback collection locations
CREATE TABLE qr_codes (
    qr_code_id VARCHAR(50) PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    location_name VARCHAR(255) NOT NULL,
    location_address TEXT,
    location_type VARCHAR(50),
    generated_url TEXT NOT NULL,
    scan_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    deactivated_at TIMESTAMP
);

CREATE INDEX idx_qr_active ON qr_codes(is_active);
CREATE INDEX idx_qr_service ON qr_codes(service_id);

EOF

echo "✓ Feedback collection tables created"
echo ""

# ============================================================================
# STEP 8: CREATE GRIEVANCE SYSTEM (Flow 1 & 3)
# ============================================================================
echo "▶ Step 8: Creating grievance system tables..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Grievance Tickets: For both auto-created (Flow 1) and citizen-submitted (Flow 3)
CREATE TABLE grievance_tickets (
    grievance_id SERIAL PRIMARY KEY,
    grievance_number VARCHAR(20) UNIQUE NOT NULL,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    submitter_category VARCHAR(50),
    submitter_name VARCHAR(255) NOT NULL,
    submitter_email VARCHAR(255) NOT NULL,
    submitter_phone VARCHAR(50),
    grievance_subject VARCHAR(255) NOT NULL,
    grievance_description TEXT NOT NULL,
    incident_date DATE,
    submission_ip_hash VARCHAR(64),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    updated_by VARCHAR(255) DEFAULT 'system'
);

CREATE INDEX idx_grievance_number ON grievance_tickets(grievance_number);
CREATE INDEX idx_grievance_status ON grievance_tickets(status);
CREATE INDEX idx_grievance_service ON grievance_tickets(service_id);
CREATE INDEX idx_grievance_entity ON grievance_tickets(entity_id);
CREATE INDEX idx_grievance_created ON grievance_tickets(created_at DESC);
CREATE INDEX idx_grievance_submitter ON grievance_tickets(submitter_email);

-- Grievance Attachments: Proof/evidence for grievances
CREATE TABLE grievance_attachments (
    attachment_id SERIAL PRIMARY KEY,
    grievance_id INTEGER NOT NULL REFERENCES grievance_tickets(grievance_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    file_content BYTEA NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_grievance_file_size CHECK (file_size > 0 AND file_size <= 5242880)
);

CREATE INDEX idx_grievance_attachment ON grievance_attachments(grievance_id);
CREATE INDEX idx_grievance_attachment_created ON grievance_attachments(created_at);

EOF

echo "✓ Grievance system tables created"
echo ""

# ============================================================================
# STEP 9: CREATE EA SERVICE REQUEST SYSTEM (Flow 2)
# ============================================================================
echo "▶ Step 9: Creating EA service request tables..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- EA Service Requests: Admin submissions for 7 EA services
CREATE TABLE ea_service_requests (
    request_id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255) NOT NULL,
    requester_phone VARCHAR(50),
    requester_ministry VARCHAR(255),
    request_description TEXT,
    submission_ip_hash VARCHAR(64),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    updated_by VARCHAR(255) DEFAULT 'system'
);

CREATE INDEX idx_request_number ON ea_service_requests(request_number);
CREATE INDEX idx_request_status ON ea_service_requests(status);
CREATE INDEX idx_request_service ON ea_service_requests(service_id);
CREATE INDEX idx_request_entity ON ea_service_requests(entity_id);
CREATE INDEX idx_request_created ON ea_service_requests(created_at DESC);
CREATE INDEX idx_request_submitter ON ea_service_requests(requester_email);

-- EA Service Request Attachments: Per-service document requirements
CREATE TABLE ea_service_request_attachments (
    attachment_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES ea_service_requests(request_id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    file_content BYTEA NOT NULL,
    file_size INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    uploaded_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_ea_file_size CHECK (file_size > 0 AND file_size <= 5242880)
);

CREATE INDEX idx_ea_attachment ON ea_service_request_attachments(request_id);
CREATE INDEX idx_ea_attachment_created ON ea_service_request_attachments(created_at);

EOF

echo "✓ EA service request tables created"
echo ""

# ============================================================================
# STEP 10: CREATE SERVICE ATTACHMENTS MASTER DATA
# ============================================================================
echo "▶ Step 10: Creating service attachments master data table..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Service Attachments: Define document requirements per EA service
-- 27 documents across 7 EA services (17 mandatory + 10 optional)
CREATE TABLE service_attachments (
    service_attachment_id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    filename VARCHAR(255) NOT NULL,
    file_extension VARCHAR(10),
    is_mandatory BOOLEAN DEFAULT FALSE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_service_file UNIQUE(service_id, filename)
);

CREATE INDEX idx_service_attachment_service ON service_attachments(service_id);
CREATE INDEX idx_service_attachment_active ON service_attachments(is_active);

EOF

echo "✓ Service attachments master data table created"
echo ""

# ============================================================================
# STEP 11: CREATE SECURITY TABLES
# ============================================================================
echo "▶ Step 11: Creating security and rate limiting tables..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Submission Rate Limit: Prevent abuse
CREATE TABLE submission_rate_limit (
    ip_hash VARCHAR(64) PRIMARY KEY,
    submission_count INTEGER DEFAULT 1,
    attempt_type VARCHAR(50) DEFAULT 'submission',
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submission Attempts: Audit trail
CREATE TABLE submission_attempts (
    attempt_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    attempt_type VARCHAR(50) DEFAULT 'submission',
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_attempts_ip ON submission_attempts(ip_hash);

-- CAPTCHA Challenges: Security verification
CREATE TABLE captcha_challenges (
    challenge_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    challenge_issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    challenge_completed_at TIMESTAMP,
    success BOOLEAN
);

CREATE INDEX idx_captcha_ip ON captcha_challenges(ip_hash);

EOF

echo "✓ Security tables created"
echo ""

# ============================================================================
# STEP 12: INSERT REFERENCE DATA
# ============================================================================
echo "▶ Step 12: Inserting reference data (priorities, statuses, entities, services)..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- ============================================================================
-- Priority Levels
-- ============================================================================
INSERT INTO priority_levels (priority_code, priority_name, sla_multiplier, sort_order, color_code) VALUES
('URGENT', 'Urgent', 0.5, 1, '#ef4444'),
('HIGH', 'High', 0.75, 2, '#fb923c'),
('MEDIUM', 'Medium', 1.0, 3, '#fbbf24'),
('LOW', 'Low', 2.0, 4, '#93c5fd');

-- ============================================================================
-- Grievance Status
-- ============================================================================
INSERT INTO grievance_status (status_code, status_name, status_order, color_code) VALUES
('open', 'Open', 1, '#ef4444'),
('process', 'Processing', 2, '#fbbf24'),
('resolved', 'Resolved', 3, '#22c55e'),
('closed', 'Closed', 4, '#9ca3af');

-- ============================================================================
-- Entity Master
-- ============================================================================
INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, is_active) VALUES
('DEPT-001', 'Immigration Department', 'department', TRUE),
('DEPT-002', 'Inland Revenue Division', 'department', TRUE),
('DEPT-004', 'Civil Registry & Deeds', 'department', TRUE),
('AGY-002', 'Digital Transformation Agency', 'agency', TRUE);

-- ============================================================================
-- Service Master (7 public services + 7 EA services)
-- ============================================================================
INSERT INTO service_master (service_id, service_name, entity_id, is_active) VALUES
-- Public Services
('SVC-IMM-001', 'Passport Application', 'DEPT-001', TRUE),
('SVC-IMM-002', 'Passport Renewal', 'DEPT-001', TRUE),
('SVC-TAX-001', 'Business Registration', 'DEPT-002', TRUE),
('SVC-TAX-002', 'Tax Filing', 'DEPT-002', TRUE),
('SVC-REG-010', 'Birth Certificate', 'DEPT-004', TRUE),
('SVC-DIG-001', 'eServices Account', 'AGY-002', TRUE),
('SVC-DIG-002', 'Portal Support', 'AGY-002', TRUE),
-- EA Services (7 services)
('digital-roadmap', 'Public Sector Digital Roadmap Support', 'AGY-002', TRUE),
('ea-framework-review', 'Grenada EA Framework Management', 'AGY-002', TRUE),
('maturity-assessment', 'Grenada EA Maturity Assessment', 'AGY-002', TRUE),
('repository-access', 'Grenada EA Repository Access', 'AGY-002', TRUE),
('compliance-review', 'Grenada EA Compliance Review', 'AGY-002', TRUE),
('portfolio-review', 'IT Portfolio Review', 'AGY-002', TRUE),
('training-capacity', 'EA Training & Capacity Development', 'AGY-002', TRUE);

EOF

echo "✓ Reference data inserted"
echo ""

# ============================================================================
# STEP 13: LOAD SERVICE ATTACHMENTS MASTER DATA
# ============================================================================
echo "▶ Step 13: Loading service attachments master data (27 documents)..."
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'

-- Service 1: Public Sector Digital Roadmap Support
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('digital-roadmap', 'Senior leadership approval letter or email', 'pdf', TRUE, 'Approval for roadmap support request', 1, TRUE),
('digital-roadmap', 'Digital vision / strategic plan', 'docx', TRUE, 'Vision document or strategic plan', 2, TRUE),
('digital-roadmap', 'Inventory of services and systems', 'xlsx', TRUE, 'List of current services and IT systems', 3, TRUE),
('digital-roadmap', 'Organizational structure', 'pdf', FALSE, 'Organizational chart or structure document', 4, TRUE),
('digital-roadmap', 'Existing system/vendor contracts', 'pdf', FALSE, 'Current system contracts and agreements', 5, TRUE);

-- Service 2: Grenada EA Framework Management
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('ea-framework-review', 'Details of domain/method requiring update', 'docx', TRUE, 'Specific domain or methodology needing review', 1, TRUE),
('ea-framework-review', 'Senior Government leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 2, TRUE),
('ea-framework-review', 'Supporting EA documents (drafts, models, standards)', 'pdf', FALSE, 'Draft documents, models, or standards for reference', 3, TRUE);

-- Service 3: Grenada EA Maturity Assessment
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('maturity-assessment', 'Budget or funding request to MoF', 'pdf', TRUE, 'Scan of budget request letter or email to Ministry of Finance', 1, TRUE),
('maturity-assessment', 'Description of proposed digital initiative', 'docx', TRUE, 'Description with KPIs and target outcomes', 2, TRUE),
('maturity-assessment', 'Architecture or system documentation', 'pdf', FALSE, 'Supporting architecture or documentation', 3, TRUE);

-- Service 4: Grenada EA Repository Access
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('repository-access', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1, TRUE),
('repository-access', 'Required duration of access', 'docx', TRUE, 'Specify duration and access requirements', 2, TRUE);

-- Service 5: Grenada EA Compliance Review
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('compliance-review', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1, TRUE),
('compliance-review', 'Current state architecture documents', 'pdf', TRUE, 'Current architecture design documents', 2, TRUE),
('compliance-review', 'Target state architecture design document', 'pdf', TRUE, 'Target state architecture document', 3, TRUE),
('compliance-review', 'Solution design documents', 'pdf', TRUE, 'Solution design specifications', 4, TRUE),
('compliance-review', 'Vendor contracts / SOWs', 'pdf', FALSE, 'Vendor contracts and statements of work', 5, TRUE),
('compliance-review', 'Integration diagrams', 'pdf', FALSE, 'System integration diagrams', 6, TRUE),
('compliance-review', 'Security documentation', 'pdf', FALSE, 'Security architecture documentation', 7, TRUE),
('compliance-review', 'Data architecture diagrams', 'pdf', FALSE, 'Data flow and architecture diagrams', 8, TRUE);

-- Service 6: IT Portfolio Review
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('portfolio-review', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1, TRUE),
('portfolio-review', 'Baseline inventory of systems and services', 'xlsx', TRUE, 'Complete inventory of IT systems and services', 2, TRUE),
('portfolio-review', 'Existing IT contracts and SLAs', 'pdf', FALSE, 'Current contracts and service level agreements', 3, TRUE);

-- Service 7: EA Training & Capacity Development
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order, is_active) VALUES
('training-capacity', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1, TRUE),
('training-capacity', 'Intended audience list', 'xlsx', TRUE, 'List with names, designations, and parent organisation details', 2, TRUE),
('training-capacity', 'Training topics or customization needs', 'docx', FALSE, 'Specific topics or customization requirements', 3, TRUE);

EOF

echo "✓ Service attachments master data loaded (27 documents)"
echo ""

# ============================================================================
# STEP 14: VERIFICATION
# ============================================================================
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                        VERIFICATION                              ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

echo "Database schema summary:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'VERIFY'
\pset tuples_only
SELECT 'Total Tables' as component, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT 'Total Indexes', COUNT(*) FROM information_schema.schemata, pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'Priority Levels', COUNT(*) FROM priority_levels
UNION ALL
SELECT 'Grievance Statuses', COUNT(*) FROM grievance_status
UNION ALL
SELECT 'Entities', COUNT(*) FROM entity_master
UNION ALL
SELECT 'Services (Public + EA)', COUNT(*) FROM service_master
UNION ALL
SELECT 'Service Attachments', COUNT(*) FROM service_attachments
ORDER BY component;
VERIFY

echo ""
echo "Service attachments breakdown:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'ATTACHMENTS'
\pset tuples_only
SELECT service_id, COUNT(*) as total, 
       SUM(CASE WHEN is_mandatory THEN 1 ELSE 0 END) as mandatory,
       SUM(CASE WHEN NOT is_mandatory THEN 1 ELSE 0 END) as optional
FROM service_attachments
GROUP BY service_id
ORDER BY service_id;
ATTACHMENTS

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║              ✓ INITIALIZATION COMPLETE - FRESH START              ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Database Architecture Summary:"
echo ""
echo "  ✓ FLOW 1: Service Feedback → Auto-Created Grievance"
echo "    Table: service_feedback → grievance_tickets"
echo "    Trigger: grievance_flag=TRUE OR avg_rating<3.0"
echo ""
echo "  ✓ FLOW 2: EA Service Request (Admin Portal)"
echo "    Tables: ea_service_requests + ea_service_request_attachments"
echo "    Attachments: 27 documents across 7 EA services"
echo ""
echo "  ✓ FLOW 3: Formal Citizen Grievance"
echo "    Tables: grievance_tickets + grievance_attachments"
echo "    File Upload: Max 5 files, 5MB total per grievance"
echo ""
echo "📋 Master Data Loaded:"
echo "  ✓ 4 Priority Levels (Urgent, High, Medium, Low)"
echo "  ✓ 4 Grievance Statuses (Open, Processing, Resolved, Closed)"
echo "  ✓ 4 Government Entities"
echo "  ✓ 14 Services (7 public + 7 EA)"
echo "  ✓ 27 Service Attachments (17 mandatory + 10 optional)"
echo ""
echo "🔒 Security Features:"
echo "  ✓ Rate limiting table (submission_rate_limit)"
echo "  ✓ Submission audit log (submission_attempts)"
echo "  ✓ CAPTCHA tracking (captcha_challenges)"
echo "  ✓ File size constraints (5MB max per file)"
echo ""
echo "⚙️ Configuration Ready:"
echo "  ✓ SendGrid API: Configure in .env"
echo "  ✓ DTA Admin Email: alerts.dtahelpdesk@gmail.com"
echo "  ✓ Database: Fresh and ready for Phase 2b APIs"
echo ""
echo "📝 Next Steps:"
echo "  1. Update .env with SendGrid API key and DTA email"
echo "  2. Rebuild frontend: docker-compose up -d --build"
echo "  3. Test endpoints (grievance submit, EA request, feedback submit)"
echo "  4. Verify emails are sent correctly"
echo "  5. Deploy Phase 2b APIs"
echo ""
echo "🔗 Database Connection:"
echo "  docker exec -it feedback_db psql -U $DB_USER -d $DB_NAME"
echo ""
echo "📦 Backup Location: $BACKUP_FILE"
echo ""