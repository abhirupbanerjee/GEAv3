-- ==============================================================================
-- Add Citizen Login Settings (for existing databases)
-- ==============================================================================
-- Run via: docker compose exec -T feedback_db psql -U feedback_user -d feedback < database/scripts/22-add-citizen-login-settings.sql
-- ==============================================================================

-- Citizen Login Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_LOGIN_ENABLED', 'false', 'boolean', 'AUTHENTICATION', 'Citizen Login', 'Enable Citizen Login', 'Allow citizens to create accounts and login via SMS OTP', false, 'false', NULL, NULL, NULL, 20)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('TWILIO_ACCOUNT_SID', '', 'secret', 'AUTHENTICATION', 'Citizen Login', 'Twilio Account SID', 'Account SID from Twilio Console (starts with AC)', true, '', NULL, NULL, NULL, 21)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('TWILIO_AUTH_TOKEN', '', 'secret', 'AUTHENTICATION', 'Citizen Login', 'Twilio Auth Token', 'Auth Token from Twilio Console', true, '', NULL, NULL, NULL, 22)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('TWILIO_VERIFY_SERVICE_SID', '', 'secret', 'AUTHENTICATION', 'Citizen Login', 'Twilio Verify Service SID', 'Verify Service SID (starts with VA) - create in Twilio Verify > Services', true, '', NULL, NULL, NULL, 23)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_ALLOWED_COUNTRIES', '["grenada"]', 'multiselect', 'AUTHENTICATION', 'Citizen Login', 'Allowed Countries', 'Countries whose phone numbers can register. Grenada always available.', false, '["grenada"]',
    '{"groups":[{"label":"Primary","collapsed":false,"options":[{"value":"grenada","label":"Grenada (+1-473)"}]},{"label":"Caribbean Islands","collapsed":true,"options":[{"value":"antigua","label":"Antigua & Barbuda (+1-268)"},{"value":"barbados","label":"Barbados (+1-246)"},{"value":"dominica","label":"Dominica (+1-767)"},{"value":"dominican_republic","label":"Dominican Republic (+1-809/829/849)"},{"value":"jamaica","label":"Jamaica (+1-876/658)"},{"value":"st_kitts","label":"St Kitts & Nevis (+1-869)"},{"value":"st_lucia","label":"St Lucia (+1-758)"},{"value":"st_vincent","label":"St Vincent & Grenadines (+1-784)"},{"value":"trinidad","label":"Trinidad & Tobago (+1-868)"},{"value":"usvi","label":"US Virgin Islands (+1-340)"},{"value":"bvi","label":"British Virgin Islands (+1-284)"},{"value":"bahamas","label":"Bahamas (+1-242)"},{"value":"cayman","label":"Cayman Islands (+1-345)"},{"value":"turks_caicos","label":"Turks & Caicos (+1-649)"},{"value":"bermuda","label":"Bermuda (+1-441)"},{"value":"anguilla","label":"Anguilla (+1-264)"},{"value":"montserrat","label":"Montserrat (+1-664)"},{"value":"guyana","label":"Guyana (+592)"},{"value":"suriname","label":"Suriname (+597)"}]},{"label":"Other Regions","collapsed":true,"options":[{"value":"usa","label":"United States (+1)"},{"value":"uk","label":"United Kingdom (+44)"},{"value":"canada","label":"Canada (+1)"}]}]}',
    NULL, NULL, 24)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_CUSTOM_COUNTRY_CODES', '', 'string', 'AUTHENTICATION', 'Citizen Login', 'Custom Country Codes', 'Additional ISD codes (comma-separated, e.g., +91,+49,+33)', false, '', NULL, NULL, NULL, 25)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_OTP_EXPIRY_MINUTES', '5', 'number', 'AUTHENTICATION', 'Citizen Login', 'OTP Expiry (minutes)', 'How long OTP codes remain valid', false, '5', NULL, 1, 15, 26)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_MAX_OTP_ATTEMPTS', '3', 'number', 'AUTHENTICATION', 'Citizen Login', 'Max OTP Attempts', 'Maximum OTP verification attempts before lockout', false, '3', NULL, 1, 10, 27)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_SESSION_HOURS', '24', 'number', 'AUTHENTICATION', 'Citizen Login', 'Session Duration (hours)', 'How long citizen sessions remain active', false, '24', NULL, 1, 168, 28)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value, setting_type, category, subcategory, display_name, description, is_sensitive, default_value, options, min_value, max_value, sort_order)
VALUES
    ('CITIZEN_DEVICE_TRUST_DAYS', '30', 'number', 'AUTHENTICATION', 'Citizen Login', 'Device Trust (days)', 'How long "remember this device" cookies remain valid', false, '30', NULL, 7, 90, 29)
ON CONFLICT (setting_key) DO NOTHING;

-- Verify
SELECT setting_key, display_name, subcategory FROM system_settings WHERE subcategory = 'Citizen Login' ORDER BY sort_order;
