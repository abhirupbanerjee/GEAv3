#!/bin/bash

# GEA Portal Database Initialization - COMPLETE REDESIGN
# Separate tables for: Tickets, Grievances, EA Service Requests
# Version: 3.0 - Clean slate with distinct architectures

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo "=== GEA Portal Database Initialization v3.0 ==="
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Test connection first
echo "Testing database connection..."
if docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" 2>/dev/null; then
    echo "✓ Database connection successful"
else
    echo "✗ Cannot connect to database"
    exit 1
fi

echo ""
echo "⚠️  Dropping existing tables and recreating from scratch..."
echo ""

# Drop all tables (CASCADE to handle dependencies)
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'SQLEOF'
DROP TABLE IF EXISTS service_attachments CASCADE;
DROP TABLE IF EXISTS grievance_attachments CASCADE;
DROP TABLE IF EXISTS grievance_tickets CASCADE;
DROP TABLE IF EXISTS ea_service_request_attachments CASCADE;
DROP TABLE IF EXISTS ea_service_requests CASCADE;
DROP TABLE IF EXISTS submission_attempts CASCADE;
DROP TABLE IF EXISTS captcha_challenges CASCADE;
DROP TABLE IF EXISTS submission_rate_limit CASCADE;
DROP TABLE IF EXISTS service_feedback CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS priority_levels CASCADE;
DROP TABLE IF EXISTS service_master CASCADE;
DROP TABLE IF EXISTS entity_master CASCADE;

SQLEOF

echo "✓ All tables dropped"
echo ""
echo "Initializing fresh database schema..."
echo ""

# Create all tables from scratch
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'SQLEOF'
-- ============================================================================
-- GEA PORTAL DATABASE INITIALIZATION - VERSION 3.0
-- Clean slate with distinct table architectures
-- Tested: November 19, 2025
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- PHASE 1: MASTER DATA TABLES
-- ============================================================================

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

-- ============================================================================

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

-- ============================================================================
-- PHASE 2: PRIORITY & STATUS LOOKUP TABLES
-- ============================================================================

CREATE TABLE priority_levels (
    priority_id SERIAL PRIMARY KEY,
    priority_code VARCHAR(20) UNIQUE NOT NULL,
    priority_name VARCHAR(50) NOT NULL,
    sla_multiplier DECIMAL(3,2) DEFAULT 1.0,
    sort_order INTEGER DEFAULT 0,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_priority_code ON priority_levels(priority_code);





-- ============================================================================
-- PHASE 3: FEEDBACK COLLECTION
-- ============================================================================

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

-- ============================================================================
-- PHASE 4: QR CODES
-- ============================================================================

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



-- ============================================================================
-- PHASE 6: GRIEVANCE TICKETS
-- Separate from general tickets - distinct workflow
-- ============================================================================

CREATE TABLE grievance_tickets (
    grievance_id SERIAL PRIMARY KEY,
    grievance_number VARCHAR(20) UNIQUE NOT NULL,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, process, resolved, closed
    submitter_category VARCHAR(50),  -- citizen, tourist, gov_employee, student
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
CREATE INDEX idx_grievance_created ON grievance_tickets(created_at DESC);
CREATE INDEX idx_grievance_submitter ON grievance_tickets(submitter_email);

-- ============================================================================
-- PHASE 6b: GRIEVANCE ATTACHMENTS
-- ============================================================================

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

-- ============================================================================
-- PHASE 7: EA SERVICE REQUESTS
-- Separate from tickets - distinct workflow for government EA services
-- ============================================================================

CREATE TABLE ea_service_requests (
    request_id SERIAL PRIMARY KEY,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',  -- submitted, process, resolved, closed
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
CREATE INDEX idx_request_created ON ea_service_requests(created_at DESC);
CREATE INDEX idx_request_submitter ON ea_service_requests(requester_email);

-- ============================================================================
-- PHASE 7b: EA SERVICE REQUEST ATTACHMENTS
-- Per-service documents based on service_attachments master data
-- ============================================================================

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

-- ============================================================================
-- PHASE 7c: SERVICE ATTACHMENTS MASTER DATA
-- Define required/optional documents per EA service
-- ============================================================================

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


-- ============================================================================

CREATE TABLE submission_attempts (
    attempt_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    attempt_type VARCHAR(50) DEFAULT 'ticket_submit',
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_attempts_ip ON submission_attempts(ip_hash);

-- ============================================================================

CREATE TABLE captcha_challenges (
    challenge_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    challenge_issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    challenge_completed_at TIMESTAMP,
    success BOOLEAN
);

CREATE INDEX idx_captcha_ip ON captcha_challenges(ip_hash);

-- ============================================================================

CREATE TABLE submission_rate_limit (
    ip_hash VARCHAR(64) PRIMARY KEY,
    submission_count INTEGER DEFAULT 1,
    attempt_type VARCHAR(50) DEFAULT 'ticket_submit',
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHASE 11: INSERT REFERENCE DATA
-- ============================================================================

INSERT INTO priority_levels (priority_code, priority_name, sla_multiplier, sort_order, color_code)
VALUES 
    ('URGENT', 'Urgent', 0.5, 1, '#ef4444'),
    ('HIGH', 'High', 0.75, 2, '#fb923c'),
    ('MEDIUM', 'Medium', 1.0, 3, '#fbbf24'),
    ('LOW', 'Low', 2.0, 4, '#93c5fd');



-- ============================================================================
-- PHASE 12: INSERT SAMPLE DATA
-- ============================================================================

INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, is_active)
VALUES 
    ('DEPT-001', 'Immigration Department', 'department', TRUE),
    ('DEPT-002', 'Inland Revenue Division', 'department', TRUE),
    ('DEPT-004', 'Civil Registry & Deeds', 'department', TRUE),
    ('AGY-002', 'Digital Transformation Agency', 'agency', TRUE);

-- ============================================================================

INSERT INTO service_master (service_id, service_name, entity_id, is_active)
VALUES 
    ('SVC-IMM-001', 'Passport Application', 'DEPT-001', TRUE),
    ('SVC-IMM-002', 'Passport Renewal', 'DEPT-001', TRUE),
    ('SVC-TAX-001', 'Business Registration', 'DEPT-002', TRUE),
    ('SVC-TAX-002', 'Tax Filing', 'DEPT-002', TRUE),
    ('SVC-REG-010', 'Birth Certificate', 'DEPT-004', TRUE),
    ('SVC-DIG-001', 'eServices Account', 'AGY-002', TRUE),
    ('SVC-DIG-002', 'Portal Support', 'AGY-002', TRUE),
    ('digital-roadmap', 'Public Sector Digital Roadmap Support', 'AGY-002', TRUE),
    ('ea-framework-review', 'Grenada EA Framework Management', 'AGY-002', TRUE),
    ('maturity-assessment', 'Grenada EA Maturity Assessment', 'AGY-002', TRUE),
    ('repository-access', 'Grenada EA Repository Access', 'AGY-002', TRUE),
    ('compliance-review', 'Grenada EA Compliance Review', 'AGY-002', TRUE),
    ('portfolio-review', 'IT Portfolio Review', 'AGY-002', TRUE),
    ('training-capacity', 'EA Training & Capacity Development', 'AGY-002', TRUE);

-- ============================================================================
-- ALL TABLES CREATED SUCCESSFULLY
-- ============================================================================
SQLEOF

if [ $? -eq 0 ]; then
    echo "✓ SQL executed successfully"
else
    echo "✗ SQL execution failed"
    exit 1
fi

echo ""
echo "=== Verification ==="
echo "Tables created:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "\dt" 

echo ""
echo "Sample data counts:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'VERIFY'
SELECT 'Priority Levels' as "Component", COUNT(*) as count FROM priority_levels
UNION ALL
SELECT 'Ticket Status', COUNT(*) FROM ticket_status
UNION ALL
SELECT 'Ticket Categories', COUNT(*) FROM ticket_categories
UNION ALL
SELECT 'Entities', COUNT(*) FROM entity_master
UNION ALL
SELECT 'Services', COUNT(*) FROM service_master
ORDER BY "Component";
VERIFY

echo ""
echo "✓ Database initialization v3.0 complete!"
echo ""
echo "Tables created:"
echo "  • grievance_tickets (from service feedback - open→process→resolved→closed)"
echo "  • ea_service_requests (from EA service requests - submitted→process→resolved→closed)"
echo "  • grievance_attachments (grievance proofs - up to 5MB)"
echo "  • ea_service_request_attachments (EA service documents)"
echo "  • service_attachments (master data for per-service requirements)"
echo "  • service_feedback (citizen ratings and comments)"
echo "  • service_master, entity_master (reference data)"
echo ""
echo "Next steps:"
echo "1. Populate service_attachments: ./2-load-seed-data.sh"
echo "2. Rebuild frontend: docker-compose up -d --build"
echo "3. Test API: curl -s https://gea.abhirup.app/api/tickets/categories | jq '.success'"
echo ""