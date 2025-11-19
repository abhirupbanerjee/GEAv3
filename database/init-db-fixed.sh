#!/bin/bash

# GEA Portal Database Initialization - FINAL VERSION
# Tested and working with all required columns
# Version: 2.0 - Complete & Production Ready

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo "=== GEA Portal Database Initialization ==="
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
echo "Initializing database schema..."

# Pipe SQL directly to docker exec psql
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'SQLEOF'
-- ============================================================================
-- GEA PORTAL DATABASE INITIALIZATION - FINAL PRODUCTION VERSION
-- Version: 2.0 - All required columns included
-- Tested: November 18, 2025
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- PHASE 1: MASTER DATA TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_master (
    unique_entity_id VARCHAR(50) PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    parent_entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_active ON entity_master(is_active);
CREATE INDEX IF NOT EXISTS idx_entity_type ON entity_master(entity_type);

-- ============================================================================

CREATE TABLE IF NOT EXISTS service_master (
    service_id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    service_category VARCHAR(100),
    service_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_active ON service_master(is_active);
CREATE INDEX IF NOT EXISTS idx_service_entity ON service_master(entity_id);

-- ============================================================================
-- PHASE 2: PRIORITY & STATUS LOOKUP TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS priority_levels (
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

CREATE INDEX IF NOT EXISTS idx_priority_code ON priority_levels(priority_code);

-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_status (
    status_id SERIAL PRIMARY KEY,
    status_code VARCHAR(50) UNIQUE NOT NULL,
    status_name VARCHAR(100) NOT NULL,
    status_type VARCHAR(20),
    is_terminal BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_code ON ticket_status(status_code);

-- ============================================================================
-- CRITICAL: ticket_categories with ALL required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT NULL,
    service_id VARCHAR(50) DEFAULT NULL,
    entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    sla_response_hours INTEGER DEFAULT 24,
    sla_resolution_hours INTEGER DEFAULT 72,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_code ON ticket_categories(category_code);

-- ============================================================================
-- PHASE 3: FEEDBACK COLLECTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_feedback (
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
    ticket_id INTEGER,
    ticket_created BOOLEAN DEFAULT FALSE,
    feedback_type VARCHAR(50) DEFAULT 'general',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_feedback_service ON service_feedback(service_id);
CREATE INDEX IF NOT EXISTS idx_feedback_entity ON service_feedback(entity_id);
CREATE INDEX IF NOT EXISTS idx_feedback_channel ON service_feedback(channel);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted ON service_feedback(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_grievance ON service_feedback(grievance_flag);
CREATE INDEX IF NOT EXISTS idx_feedback_qr ON service_feedback(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_feedback_ticket ON service_feedback(ticket_id);

-- ============================================================================
-- PHASE 4: QR CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
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

CREATE INDEX IF NOT EXISTS idx_qr_active ON qr_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_qr_service ON qr_codes(service_id);

-- ============================================================================
-- PHASE 5: TICKET MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS tickets (
    ticket_id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES ticket_categories(category_id),
    priority_id INTEGER REFERENCES priority_levels(priority_id),
    status_id INTEGER REFERENCES ticket_status(status_id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    submitter_name VARCHAR(255),
    submitter_email VARCHAR(255),
    submitter_phone VARCHAR(50),
    submission_ip_hash VARCHAR(64),
    assigned_entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    assigned_user_id VARCHAR(36),
    sla_response_target TIMESTAMP,
    sla_resolution_target TIMESTAMP,
    first_response_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    feedback_id INTEGER REFERENCES service_feedback(feedback_id),
    service_id VARCHAR(50) REFERENCES service_master(service_id),
    source VARCHAR(50) DEFAULT 'portal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    updated_by VARCHAR(255) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_ticket_category ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_ticket_created ON tickets(created_at DESC);

-- ============================================================================
-- PHASE 6: TICKET ACTIVITIES & NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_activities (
    activity_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    performed_by VARCHAR(255) DEFAULT 'system',
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_hash VARCHAR(64),
    is_public BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_activity_ticket ON ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON ticket_activities(activity_type);

-- ============================================================================

CREATE TABLE IF NOT EXISTS ticket_notes (
    note_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_ticket ON ticket_notes(ticket_id);

-- ============================================================================
-- PHASE 7: SLA TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS sla_breaches (
    breach_id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id),
    breach_type VARCHAR(20),
    target_time TIMESTAMP NOT NULL,
    actual_time TIMESTAMP,
    breach_duration_hours DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_breach_ticket ON sla_breaches(ticket_id);

-- ============================================================================
-- PHASE 8: SECURITY & RATE LIMITING
-- ============================================================================

CREATE TABLE IF NOT EXISTS submission_attempts (
    attempt_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    attempt_type VARCHAR(50) DEFAULT 'ticket_submit',
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_attempts_ip ON submission_attempts(ip_hash);

-- ============================================================================

CREATE TABLE IF NOT EXISTS captcha_challenges (
    challenge_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    challenge_issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    challenge_completed_at TIMESTAMP,
    success BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_captcha_ip ON captcha_challenges(ip_hash);

-- ============================================================================

CREATE TABLE IF NOT EXISTS submission_rate_limit (
    ip_hash VARCHAR(64) PRIMARY KEY,
    submission_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHASE 9: INSERT REFERENCE DATA
-- ============================================================================

INSERT INTO priority_levels (priority_code, priority_name, sla_multiplier, sort_order, color_code)
VALUES 
    ('URGENT', 'Urgent', 0.5, 1, '#ef4444'),
    ('HIGH', 'High', 0.75, 2, '#fb923c'),
    ('MEDIUM', 'Medium', 1.0, 3, '#fbbf24'),
    ('LOW', 'Low', 2.0, 4, '#93c5fd')
ON CONFLICT (priority_code) DO NOTHING;

-- ============================================================================

INSERT INTO ticket_status (status_code, status_name, status_type, is_terminal, sort_order, color_code)
VALUES 
    ('OPEN', 'Open', 'open', FALSE, 1, '#dbeafe'),
    ('IN_PROGRESS', 'In Progress', 'working', FALSE, 2, '#fef3c7'),
    ('PENDING', 'Pending', 'working', FALSE, 3, '#fed7aa'),
    ('RESOLVED', 'Resolved', 'closed', TRUE, 4, '#d9f99d'),
    ('CLOSED', 'Closed', 'closed', TRUE, 5, '#e5e7eb'),
    ('CANCELLED', 'Cancelled', 'closed', TRUE, 6, '#fecaca')
ON CONFLICT (status_code) DO NOTHING;

-- ============================================================================
-- CRITICAL: All columns must match application expectations
-- ============================================================================

INSERT INTO ticket_categories (category_code, category_name, description, icon, service_id, sla_response_hours, sla_resolution_hours)
VALUES 
    ('GENERAL_INQUIRY', 'General Inquiry', 'General questions', 'help-circle', NULL, 24, 72),
    ('FEEDBACK', 'Feedback', 'Service feedback', 'message-square', NULL, 48, 96),
    ('COMPLAINT', 'Complaint', 'Service complaints', 'alert-triangle', NULL, 12, 48),
    ('TECHNICAL_ISSUE', 'Technical Issue', 'Technical problems', 'zap', NULL, 8, 48),
    ('PORTAL_ISSUE', 'Portal Issue', 'Portal problems', 'globe', NULL, 2, 8),
    ('LOGIN_ISSUE', 'Login Issue', 'Access problems', 'lock', NULL, 4, 24)
ON CONFLICT (category_code) DO NOTHING;

-- ============================================================================
-- PHASE 10: INSERT SAMPLE DATA
-- ============================================================================

INSERT INTO entity_master (unique_entity_id, entity_name, entity_type, is_active)
VALUES 
    ('DEPT-001', 'Immigration Department', 'department', TRUE),
    ('DEPT-002', 'Inland Revenue Division', 'department', TRUE),
    ('DEPT-004', 'Civil Registry & Deeds', 'department', TRUE),
    ('AGY-002', 'Digital Transformation Agency', 'agency', TRUE)
ON CONFLICT (unique_entity_id) DO NOTHING;

-- ============================================================================

INSERT INTO service_master (service_id, service_name, entity_id, is_active)
VALUES 
    ('SVC-IMM-001', 'Passport Application', 'DEPT-001', TRUE),
    ('SVC-IMM-002', 'Passport Renewal', 'DEPT-001', TRUE),
    ('SVC-TAX-001', 'Business Registration', 'DEPT-002', TRUE),
    ('SVC-TAX-002', 'Tax Filing', 'DEPT-002', TRUE),
    ('SVC-REG-010', 'Birth Certificate', 'DEPT-004', TRUE),
    ('SVC-DIG-001', 'eServices Account', 'AGY-002', TRUE),
    ('SVC-DIG-002', 'Portal Support', 'AGY-002', TRUE)
ON CONFLICT (service_id) DO NOTHING;

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
echo "Checking tables..."
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "\dt" 

echo ""
echo "Table count:"
TCOUNT=$(docker exec feedback_db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo "Tables created: $TCOUNT"

echo ""
echo "Sample data:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Priority Levels:' as info, COUNT(*) as count FROM priority_levels"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Ticket Status:' as info, COUNT(*) as count FROM ticket_status"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Categories:' as info, COUNT(*) as count FROM ticket_categories"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Entities:' as info, COUNT(*) as count FROM entity_master"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 'Services:' as info, COUNT(*) as count FROM service_master"

echo ""
echo "✓ Database initialization complete!"
echo ""
echo "Next steps:"
echo "1. Restart frontend: cd ~/GEAv3 && docker-compose restart frontend"
echo "2. Load seed data: ./load-seed-data.sh"
echo "3. Test API: curl -s https://gea.abhirup.app/api/tickets/categories | jq '.success'"
echo ""