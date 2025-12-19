-- ============================================================================
-- AI BOTS TABLE
-- ============================================================================
-- Creates ai_bots table for managing AI chatbot inventory
-- Run: docker exec -i feedback_db psql -U feedback_user -d feedback -f - < database/sql/create-ai-bots-table.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_bots (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'planned', 'inactive')),
    deployment VARCHAR(100),
    audience VARCHAR(100),
    modality VARCHAR(50),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_bots_status ON ai_bots(status);
CREATE INDEX IF NOT EXISTS idx_ai_bots_is_active ON ai_bots(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_bots_category ON ai_bots(category);

-- Insert existing bots from config (only if table is empty)
INSERT INTO ai_bots (id, name, url, description, status, deployment, audience, modality, category, created_by)
SELECT * FROM (VALUES
    ('gea-bot', 'GEA AI Assistant', 'https://gea-ai-assistant.vercel.app/', 'General EA portal assistant for government services and citizen inquiries', 'active', 'Vercel', 'Public', 'text', 'General Support', 'system'),
    ('change-management-bot', 'Change Navigator', 'https://cmb-jade.vercel.app/', 'Assists with government digital transformation change management processes', 'active', 'Vercel', 'Government Staff', 'text-audio', 'Process Management', 'system'),
    ('citizen-survey-bot', 'Citizen Survey Bot', 'https://gog-citizen-survey-bot.vercel.app/', 'Conducts citizen satisfaction surveys and collects feedback data', 'active', 'Vercel', 'Public', 'text', 'Feedback Collection', 'system'),
    ('gea-cyber-bot', 'GEA Cyber Bot', 'https://gea-cyber-bot.vercel.app/', 'AI assistant for government staff to manage cybersecurity and cyber defense', 'active', 'Vercel', 'Government Staff', 'text', 'General Support', 'system'),
    ('ea-compliance-bot', 'EA Compliance Bot', '', 'Monitors and reports on enterprise architecture compliance standards', 'planned', 'TBD', 'Government Staff', 'text', 'Compliance', 'system'),
    ('service-feedback-bot', 'Service Feedback Bot', '', 'Collects and analyzes service delivery feedback from citizens', 'planned', 'TBD', 'Public', 'text', 'Feedback Collection', 'system'),
    ('policy-bot', 'Policy Bot', '', 'Provides guidance on government policies and digital transformation strategies', 'planned', 'TBD', 'Government Staff', 'text', 'Policy Guidance', 'system'),
    ('ea-maturity-assessment-bot', 'EA Maturity Assessment Bot', '', 'Assesses and reports on enterprise architecture maturity levels', 'planned', 'TBD', 'Government Staff', 'text', 'Assessment', 'system')
) AS v(id, name, url, description, status, deployment, audience, modality, category, created_by)
WHERE NOT EXISTS (SELECT 1 FROM ai_bots LIMIT 1);

-- Verify migration
SELECT
    'AI Bots Migration Complete' AS status,
    COUNT(*) AS total_bots,
    COUNT(*) FILTER (WHERE status = 'active') AS active_bots,
    COUNT(*) FILTER (WHERE status = 'planned') AS planned_bots
FROM ai_bots;
