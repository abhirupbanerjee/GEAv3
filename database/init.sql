-- ============================================
-- GRENADA FEEDBACK DATABASE - INITIALIZATION
-- ============================================
-- Version: 1.0
-- Purpose: Service feedback collection (PII-free)
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- MASTER DATA TABLES
-- ============================================

-- Entity Master (Government Departments)
CREATE TABLE entity_master (
    unique_entity_id VARCHAR(50) PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
--    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('ministry', 'department', 'agency', 'statutory_body', 'other')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('ministry', 'department', 'agency', 'statutory_body', 'regulator', 'portal', 'other')),
    parent_entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entity_active ON entity_master(is_active);
CREATE INDEX idx_entity_type ON entity_master(entity_type);

-- Service Master (Government Services)
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
CREATE INDEX idx_service_name_trgm ON service_master USING gin(service_name gin_trgm_ops);

-- ============================================
-- FEEDBACK COLLECTION
-- ============================================

-- Service Feedback (Main Table)
CREATE TABLE service_feedback (
    feedback_id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('ea_portal', 'qr_code')),
    qr_code_id VARCHAR(50),
    recipient_group VARCHAR(50) CHECK (recipient_group IN ('citizen', 'business', 'government', 'visitor', 'other')),
    
    -- Ratings (1-5 scale)
    q1_ease INTEGER NOT NULL CHECK (q1_ease BETWEEN 1 AND 5),
    q2_clarity INTEGER NOT NULL CHECK (q2_clarity BETWEEN 1 AND 5),
    q3_timeliness INTEGER NOT NULL CHECK (q3_timeliness BETWEEN 1 AND 5),
    q4_trust INTEGER NOT NULL CHECK (q4_trust BETWEEN 1 AND 5),
    q5_overall_satisfaction INTEGER NOT NULL CHECK (q5_overall_satisfaction BETWEEN 1 AND 5),
    
    -- Optional fields
    comment_text TEXT,
    grievance_flag BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_hash VARCHAR(64),
    user_agent_hash VARCHAR(64)
);

CREATE INDEX idx_feedback_service ON service_feedback(service_id);
CREATE INDEX idx_feedback_entity ON service_feedback(entity_id);
CREATE INDEX idx_feedback_channel ON service_feedback(channel);
CREATE INDEX idx_feedback_submitted ON service_feedback(submitted_at DESC);
CREATE INDEX idx_feedback_grievance ON service_feedback(grievance_flag) WHERE grievance_flag = TRUE;
CREATE INDEX idx_feedback_qr ON service_feedback(qr_code_id) WHERE qr_code_id IS NOT NULL;

-- ============================================
-- QR CODE MANAGEMENT
-- ============================================

CREATE TABLE qr_codes (
    qr_code_id VARCHAR(50) PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    location_name VARCHAR(255) NOT NULL,
    location_address TEXT,
    location_type VARCHAR(50) CHECK (location_type IN ('office', 'kiosk', 'service_center', 'event', 'other')),
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
CREATE INDEX idx_qr_location ON qr_codes(location_type);

-- ============================================
-- ANALYTICS VIEWS
-- ============================================

-- Service Performance View
CREATE VIEW v_service_performance AS
SELECT 
    s.service_id,
    s.service_name,
    e.entity_name,
    COUNT(f.feedback_id) as total_submissions,
    ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
    ROUND(AVG(f.q1_ease)::numeric, 2) as avg_ease,
    ROUND(AVG(f.q2_clarity)::numeric, 2) as avg_clarity,
    ROUND(AVG(f.q3_timeliness)::numeric, 2) as avg_timeliness,
    ROUND(AVG(f.q4_trust)::numeric, 2) as avg_trust,
    SUM(CASE WHEN f.grievance_flag THEN 1 ELSE 0 END) as grievance_count,
    MAX(f.submitted_at) as last_feedback_at
FROM service_master s
JOIN entity_master e ON s.entity_id = e.unique_entity_id
LEFT JOIN service_feedback f ON s.service_id = f.service_id
WHERE s.is_active = TRUE
GROUP BY s.service_id, s.service_name, e.entity_name;

-- QR Code Performance View
CREATE VIEW v_qr_performance AS
SELECT 
    q.qr_code_id,
    q.location_name,
    q.location_type,
    s.service_name,
    e.entity_name,
    q.scan_count,
    COUNT(f.feedback_id) as submission_count,
    ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
    MAX(f.submitted_at) as last_scanned_at
FROM qr_codes q
JOIN service_master s ON q.service_id = s.service_id
JOIN entity_master e ON q.entity_id = e.unique_entity_id
LEFT JOIN service_feedback f ON q.qr_code_id = f.qr_code_id
WHERE q.is_active = TRUE
GROUP BY q.qr_code_id, q.location_name, q.location_type, s.service_name, e.entity_name, q.scan_count;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_entity_updated_at BEFORE UPDATE ON entity_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_updated_at BEFORE UPDATE ON service_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search index refresh function
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS void AS $$
BEGIN
    REINDEX INDEX idx_service_name_trgm;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RATE LIMITING TABLE
-- ============================================

CREATE TABLE submission_rate_limit (
    ip_hash VARCHAR(64) PRIMARY KEY,
    submission_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limit_window ON submission_rate_limit(window_start);

-- Cleanup old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM submission_rate_limit 
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant permissions (adjust as needed)
GRANT SELECT, INSERT ON service_feedback TO feedback_user;
GRANT SELECT ON entity_master, service_master TO feedback_user;
GRANT SELECT, INSERT, UPDATE ON qr_codes TO feedback_user;
GRANT USAGE, SELECT ON SEQUENCE service_feedback_feedback_id_seq TO feedback_user;

-- ============================================
-- INITIALIZATION COMPLETE
-- ============================================
