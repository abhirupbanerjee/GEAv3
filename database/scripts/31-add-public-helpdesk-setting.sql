-- ==============================================================================
-- Add Public Helpdesk Enable/Disable Setting
-- ==============================================================================
-- Purpose: Add admin-configurable toggle to enable/disable public helpdesk ticket tracking
-- Run via: docker compose exec -T feedback_db psql -U feedback_user -d feedback < database/scripts/31-add-public-helpdesk-setting.sql
-- ==============================================================================

INSERT INTO system_settings (
  setting_key,
  setting_value,
  setting_type,
  category,
  subcategory,
  display_name,
  description,
  is_sensitive,
  default_value,
  is_runtime,
  sort_order
)
VALUES (
  'PUBLIC_HELPDESK_ENABLED',
  'true',
  'boolean',
  'INTEGRATIONS',
  'Public Features',
  'Enable Public Helpdesk',
  'Allow public users to track tickets using ticket numbers without authentication. When disabled, tickets are still created but cannot be tracked publicly.',
  false,
  'true',
  true,
  20
)
ON CONFLICT (setting_key) DO NOTHING;

-- Verify the setting was created
SELECT setting_key, display_name, category, subcategory, setting_value, is_runtime
FROM system_settings
WHERE setting_key = 'PUBLIC_HELPDESK_ENABLED';
