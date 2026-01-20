-- ============================================
-- Direct Captcha Removal SQL
-- ============================================
-- Run this directly: docker exec -i feedback_db psql -U feedback_user -d feedback < remove-captcha-direct.sql

-- Start transaction
BEGIN;

-- Show what will be deleted
SELECT 'Settings to be removed:' AS info;
SELECT setting_key, display_name, category
FROM system_settings
WHERE setting_key IN ('HCAPTCHA_SITEKEY', 'HCAPTCHA_SECRET', 'HCAPTCHA_ENABLED');

-- Delete captcha settings (exact matches)
DELETE FROM system_settings
WHERE setting_key IN ('HCAPTCHA_SITEKEY', 'HCAPTCHA_SECRET', 'HCAPTCHA_ENABLED');

-- Remove from audit log
DELETE FROM settings_audit_log
WHERE setting_key IN ('HCAPTCHA_SITEKEY', 'HCAPTCHA_SECRET', 'HCAPTCHA_ENABLED');

-- Drop captcha table if exists
DROP TABLE IF EXISTS captcha_challenges CASCADE;

-- Verify deletion
SELECT 'Remaining captcha settings (should be 0):' AS verification;
SELECT COUNT(*) as remaining_count
FROM system_settings
WHERE setting_key IN ('HCAPTCHA_SITEKEY', 'HCAPTCHA_SECRET', 'HCAPTCHA_ENABLED');

-- Verify table is gone
SELECT 'Captcha table exists (should be false):' AS table_check;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'captcha_challenges'
) as table_exists;

-- Commit if everything looks good
COMMIT;

SELECT '✓ Captcha settings and table removed successfully!' AS result;
