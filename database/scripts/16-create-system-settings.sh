#!/bin/bash
# ============================================================================
# GEA Portal - System Settings & Leadership Contacts Tables
# ============================================================================
# Creates tables for admin-configurable settings and leadership contacts
# Run: ./database/scripts/16-create-system-settings.sh
# ============================================================================

set -e

# Load environment
source "$(dirname "$0")/../lib/common.sh" 2>/dev/null || {
    # Fallback if common.sh not available
    DB_USER="${DB_USER:-feedback_user}"
    DB_NAME="${DB_NAME:-feedback}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
}

echo "=============================================="
echo "  System Settings & Leadership Contacts Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
-- Stores admin-configurable application settings

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) NOT NULL DEFAULT 'string'
        CHECK (setting_type IN ('string', 'number', 'boolean', 'secret', 'json', 'select', 'multiselect', 'email', 'url', 'image')),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    is_runtime BOOLEAN DEFAULT TRUE,
    default_value TEXT,
    validation_regex VARCHAR(500),
    validation_message VARCHAR(255),
    min_value NUMERIC,
    max_value NUMERIC,
    options JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_modified_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for system_settings
CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_runtime ON system_settings(is_runtime);
CREATE INDEX IF NOT EXISTS idx_settings_active ON system_settings(is_active);

-- ============================================================================
-- SETTINGS AUDIT LOG TABLE
-- ============================================================================
-- Tracks all changes to system settings

CREATE TABLE IF NOT EXISTS settings_audit_log (
    audit_id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255) NOT NULL,
    change_reason TEXT,
    ip_address VARCHAR(45),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_settings_audit_key ON settings_audit_log(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_audit_date ON settings_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_audit_user ON settings_audit_log(changed_by);

-- ============================================================================
-- LEADERSHIP CONTACTS TABLE
-- ============================================================================
-- Stores dynamic leadership contacts for the About page

CREATE TABLE IF NOT EXISTS leadership_contacts (
    contact_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    image_path VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Create indexes for leadership_contacts
CREATE INDEX IF NOT EXISTS idx_contacts_active ON leadership_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_sort ON leadership_contacts(sort_order);

-- ============================================================================
-- SEED INITIAL SETTINGS (only if table is empty)
-- ============================================================================

-- Category: SYSTEM - General
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('SITE_NAME', 'Government of Grenada - EA Portal', 'string', 'SYSTEM', 'General', 'Site Name', 'Application name displayed in headers and browser tabs', 'GEA Portal', true, 1),
    ('SITE_SHORT_NAME', 'GEA Portal', 'string', 'SYSTEM', 'General', 'Site Short Name', 'Abbreviated site name for compact displays', 'GEA', true, 2),
    ('COPYRIGHT_YEAR', '2025', 'string', 'SYSTEM', 'General', 'Copyright Year', 'Year displayed in footer copyright notice', '2025', true, 3),
    ('SESSION_DURATION_HOURS', '2', 'number', 'SYSTEM', 'General', 'Session Duration (hours)', 'How long admin sessions remain active before requiring re-login', '2', false, 4)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE category = 'SYSTEM' LIMIT 1);

-- Category: SYSTEM - Branding
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('SITE_FAVICON', '', 'image', 'SYSTEM', 'Branding', 'Site Favicon', 'Favicon/site icon displayed in browser tabs (ICO/PNG)', '', true, 10),
    ('SITE_LOGO', '', 'image', 'SYSTEM', 'Branding', 'Site Logo', 'Logo image displayed in the header', '', true, 11),
    ('SITE_LOGO_ALT', 'Government of Grenada EA Portal', 'string', 'SYSTEM', 'Branding', 'Logo Alt Text', 'Alternative text for the logo image', 'GEA Portal Logo', true, 12)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Branding' LIMIT 1);

-- Category: SYSTEM - Contact
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('SERVICE_ADMIN_EMAIL', 'alerts.dtahelpdesk@gmail.com', 'email', 'SYSTEM', 'Contact', 'Service Admin Email', 'Email address for service request notifications', '', true, 20),
    ('ABOUT_CONTACT_EMAIL', 'gogdtaservices@gmail.com', 'email', 'SYSTEM', 'Contact', 'About Page Contact Email', 'Contact email displayed on the About page', '', true, 21)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Contact' LIMIT 1);

-- Category: AUTHENTICATION - Google OAuth
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('GOOGLE_OAUTH_ENABLED', 'true', 'boolean', 'AUTHENTICATION', 'Google', 'Enable Google OAuth', 'Allow users to sign in with Google accounts', false, false, 1),
    ('GOOGLE_CLIENT_ID', '', 'string', 'AUTHENTICATION', 'Google', 'Google Client ID', 'OAuth 2.0 Client ID from Google Cloud Console', false, false, 2),
    ('GOOGLE_CLIENT_SECRET', '', 'secret', 'AUTHENTICATION', 'Google', 'Google Client Secret', 'OAuth 2.0 Client Secret from Google Cloud Console', true, false, 3)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Google' LIMIT 1);

-- Category: AUTHENTICATION - Microsoft OAuth
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('MICROSOFT_OAUTH_ENABLED', 'true', 'boolean', 'AUTHENTICATION', 'Microsoft', 'Enable Microsoft OAuth', 'Allow users to sign in with Microsoft accounts', false, false, 10),
    ('MICROSOFT_CLIENT_ID', '', 'string', 'AUTHENTICATION', 'Microsoft', 'Microsoft Client ID', 'Application (client) ID from Azure Portal', false, false, 11),
    ('MICROSOFT_CLIENT_SECRET', '', 'secret', 'AUTHENTICATION', 'Microsoft', 'Microsoft Client Secret', 'Client secret from Azure Portal', true, false, 12),
    ('MICROSOFT_TENANT_ID', '', 'string', 'AUTHENTICATION', 'Microsoft', 'Microsoft Tenant ID', 'Directory (tenant) ID from Azure Portal', false, false, 13)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Microsoft' LIMIT 1);

-- Category: INTEGRATIONS - SendGrid
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('SENDGRID_API_KEY', '', 'secret', 'INTEGRATIONS', 'Email', 'SendGrid API Key', 'API key for SendGrid email service', true, '', true, 1),
    ('SENDGRID_FROM_EMAIL', 'alerts.dtahelpdesk@gmail.com', 'email', 'INTEGRATIONS', 'Email', 'Sender Email', 'Email address that sends notifications', false, 'noreply@example.com', true, 2),
    ('SENDGRID_FROM_NAME', 'DTA', 'string', 'INTEGRATIONS', 'Email', 'Sender Name', 'Display name for sent emails', false, 'GEA Portal', true, 3)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Email' LIMIT 1);

-- Category: INTEGRATIONS - Chatbot
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('CHATBOT_URL', 'https://policybot.abhirup.app/e/llk3fp4tzqhxihim', 'url', 'INTEGRATIONS', 'Chatbot', 'Chatbot URL', 'URL for the embedded chatbot widget', '', true, 10),
    ('CHATBOT_ENABLED', 'true', 'boolean', 'INTEGRATIONS', 'Chatbot', 'Enable Chatbot', 'Show the chatbot widget on the portal', 'true', true, 11)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Chatbot' LIMIT 1);

-- Category: BUSINESS_RULES - Service Requests
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, options, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('SERVICE_REQUEST_ENTITY_ID', 'AGY-005', 'select', 'BUSINESS_RULES', 'Service Requests', 'Service Request Entity', 'Default entity that receives service requests (DTA)', 'AGY-005', '{"source": "entities"}', true, 1),
    ('DTA_ADMIN_ROLE_CODE', 'admin_dta', 'string', 'BUSINESS_RULES', 'Service Requests', 'DTA Admin Role Code', 'Role code for DTA administrators', 'admin_dta', NULL, true, 2)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, options, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Service Requests' LIMIT 1);

-- Category: BUSINESS_RULES - Rate Limits
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('FEEDBACK_RATE_LIMIT', '5', 'number', 'BUSINESS_RULES', 'Rate Limits', 'Feedback Rate Limit', 'Max feedback submissions per hour per IP', '5', 1, 100, true, 10),
    ('GRIEVANCE_RATE_LIMIT', '5', 'number', 'BUSINESS_RULES', 'Rate Limits', 'Grievance Rate Limit', 'Max grievance submissions per hour per IP', '2', 1, 50, true, 11),
    ('EA_SERVICE_RATE_LIMIT', '5', 'number', 'BUSINESS_RULES', 'Rate Limits', 'EA Service Rate Limit', 'Max EA service requests per hour per IP', '10', 1, 100, true, 12),
    ('RATE_LIMIT_WINDOW_SECONDS', '3600', 'number', 'BUSINESS_RULES', 'Rate Limits', 'Rate Limit Window', 'Time window in seconds for rate limiting', '3600', 60, 86400, true, 13)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Rate Limits' LIMIT 1);

-- Category: BUSINESS_RULES - Thresholds
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('LOW_RATING_THRESHOLD', '2.5', 'number', 'BUSINESS_RULES', 'Thresholds', 'Low Rating Threshold', 'Rating at or below which triggers ticket creation', '2.5', 1, 5, true, 20),
    ('DTA_ALERT_THRESHOLD', '2', 'number', 'BUSINESS_RULES', 'Thresholds', 'DTA Alert Threshold', 'Rating at or below which triggers DTA admin alert', '2', 1, 5, true, 21),
    ('PRIORITY_URGENT_THRESHOLD', '1.5', 'number', 'BUSINESS_RULES', 'Thresholds', 'Urgent Priority Threshold', 'Rating threshold for URGENT priority', '1.5', 1, 5, true, 22),
    ('PRIORITY_HIGH_THRESHOLD', '2.5', 'number', 'BUSINESS_RULES', 'Thresholds', 'High Priority Threshold', 'Rating threshold for HIGH priority', '2.5', 1, 5, true, 23),
    ('PRIORITY_MEDIUM_THRESHOLD', '3.5', 'number', 'BUSINESS_RULES', 'Thresholds', 'Medium Priority Threshold', 'Rating threshold for MEDIUM priority', '3.5', 1, 5, true, 24)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Thresholds' LIMIT 1);

-- Category: BUSINESS_RULES - File Upload
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('MAX_FILE_SIZE', '2097152', 'number', 'BUSINESS_RULES', 'File Upload', 'Max File Size (bytes)', 'Maximum size per file upload in bytes (2MB = 2097152)', '2097152', 102400, 10485760, true, 30),
    ('MAX_TOTAL_UPLOAD_SIZE', '5242880', 'number', 'BUSINESS_RULES', 'File Upload', 'Max Total Upload Size (bytes)', 'Maximum total upload size per submission (5MB = 5242880)', '5242880', 1048576, 52428800, true, 31),
    ('ALLOWED_FILE_TYPES', 'pdf,jpg,jpeg,png,doc,docx,xlsx,xls', 'string', 'BUSINESS_RULES', 'File Upload', 'Allowed File Types', 'Comma-separated list of allowed file extensions', 'pdf,jpg,jpeg,png,doc,docx,xlsx,xls', true, 32)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'File Upload' LIMIT 1);

-- Category: CONTENT - Footer Links
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('GOG_URL', 'https://www.gov.gd/', 'url', 'CONTENT', 'Footer Links', 'Government Website URL', 'Link to main government website in footer', 'https://www.gov.gd/', true, 1),
    ('ESERVICES_URL', 'https://eservice.gov.gd/', 'url', 'CONTENT', 'Footer Links', 'eServices URL', 'Link to eServices portal in footer', 'https://eservice.gov.gd/', true, 2),
    ('CONSTITUTION_URL', 'https://grenadaparliament.gd/ova_doc/', 'url', 'CONTENT', 'Footer Links', 'Constitution URL', 'Link to constitution documents in footer', 'https://grenadaparliament.gd/ova_doc/', true, 3)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Footer Links' LIMIT 1);

-- Category: PERFORMANCE - Caching (Redis)
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
SELECT * FROM (VALUES
    ('ANALYTICS_CACHE_ENABLED', 'true', 'boolean', 'PERFORMANCE', 'Caching', 'Enable Analytics Caching', 'Enable Redis caching for analytics dashboard data', 'true', NULL, NULL, true, 1),
    ('ANALYTICS_CACHE_TTL', '300', 'number', 'PERFORMANCE', 'Caching', 'Analytics Cache TTL (seconds)', 'Time-to-live for cached analytics data (60-600 seconds)', '300', 60, 600, true, 2)
) AS v(setting_key, setting_value, setting_type, category, subcategory, display_name, description, default_value, min_value, max_value, is_runtime, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE subcategory = 'Caching' LIMIT 1);

-- ============================================================================
-- SEED INITIAL LEADERSHIP CONTACTS (only if table is empty)
-- ============================================================================

INSERT INTO leadership_contacts (name, title, email, sort_order, created_by)
SELECT * FROM (VALUES
    ('CEO', 'Chief Executive Officer', 'ceo@dta.gov.gd', 1, 'system'),
    ('COO', 'Chief Operating Officer', 'coo@dta.gov.gd', 2, 'system'),
    ('CDO', 'Chief Digital Officer', 'cdo@dta.gov.gd', 3, 'system')
) AS v(name, title, email, sort_order, created_by)
WHERE NOT EXISTS (SELECT 1 FROM leadership_contacts LIMIT 1);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    'System Settings Migration Complete' AS status,
    COUNT(*) AS total_settings,
    COUNT(*) FILTER (WHERE category = 'SYSTEM') AS system_settings,
    COUNT(*) FILTER (WHERE category = 'AUTHENTICATION') AS auth_settings,
    COUNT(*) FILTER (WHERE category = 'INTEGRATIONS') AS integration_settings,
    COUNT(*) FILTER (WHERE category = 'BUSINESS_RULES') AS business_rules,
    COUNT(*) FILTER (WHERE category = 'CONTENT') AS content_settings,
    COUNT(*) FILTER (WHERE category = 'PERFORMANCE') AS performance_settings
FROM system_settings;

SELECT
    'Leadership Contacts' AS status,
    COUNT(*) AS total_contacts
FROM leadership_contacts;

EOF

echo ""
echo "=============================================="
echo "  Migration Complete!"
echo "=============================================="
echo ""
echo "Tables created:"
echo "  - system_settings"
echo "  - settings_audit_log"
echo "  - leadership_contacts"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c 'SELECT setting_key, category, subcategory FROM system_settings ORDER BY category, sort_order;'"
echo ""
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c 'SELECT * FROM leadership_contacts;'"
echo ""
