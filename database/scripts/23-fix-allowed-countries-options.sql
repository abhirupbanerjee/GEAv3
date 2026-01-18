-- ==============================================================================
-- Fix CITIZEN_ALLOWED_COUNTRIES Options JSON Structure
-- ==============================================================================
-- The settings page expects options in grouped format with "groups" property
-- Current format: flat array - WRONG
-- Required format: {"groups": [...]} - CORRECT
-- ==============================================================================
-- Run via: docker compose exec -T feedback_db psql -U feedback_user -d feedback < database/scripts/23-fix-allowed-countries-options.sql
-- ==============================================================================

-- Fix the options JSON structure for CITIZEN_ALLOWED_COUNTRIES
UPDATE system_settings
SET options = '{
  "groups": [
    {
      "label": "Primary",
      "collapsed": false,
      "options": [
        {"value": "grenada", "label": "Grenada (+1-473)"}
      ]
    },
    {
      "label": "Caribbean Islands",
      "collapsed": true,
      "options": [
        {"value": "antigua", "label": "Antigua & Barbuda (+1-268)"},
        {"value": "barbados", "label": "Barbados (+1-246)"},
        {"value": "dominica", "label": "Dominica (+1-767)"},
        {"value": "dominican_republic", "label": "Dominican Republic (+1-809/829/849)"},
        {"value": "jamaica", "label": "Jamaica (+1-876/658)"},
        {"value": "st_kitts", "label": "St Kitts & Nevis (+1-869)"},
        {"value": "st_lucia", "label": "St Lucia (+1-758)"},
        {"value": "st_vincent", "label": "St Vincent & Grenadines (+1-784)"},
        {"value": "trinidad", "label": "Trinidad & Tobago (+1-868)"},
        {"value": "usvi", "label": "US Virgin Islands (+1-340)"},
        {"value": "bvi", "label": "British Virgin Islands (+1-284)"},
        {"value": "bahamas", "label": "Bahamas (+1-242)"},
        {"value": "cayman", "label": "Cayman Islands (+1-345)"},
        {"value": "turks_caicos", "label": "Turks & Caicos (+1-649)"},
        {"value": "bermuda", "label": "Bermuda (+1-441)"},
        {"value": "anguilla", "label": "Anguilla (+1-264)"},
        {"value": "montserrat", "label": "Montserrat (+1-664)"},
        {"value": "guyana", "label": "Guyana (+592)"},
        {"value": "suriname", "label": "Suriname (+597)"}
      ]
    },
    {
      "label": "Other Regions",
      "collapsed": true,
      "options": [
        {"value": "usa", "label": "United States (+1)"},
        {"value": "uk", "label": "United Kingdom (+44)"},
        {"value": "canada", "label": "Canada (+1)"}
      ]
    }
  ]
}'
WHERE setting_key = 'CITIZEN_ALLOWED_COUNTRIES';

-- Update the Custom Country Codes description to support Name:+XX format
UPDATE system_settings
SET description = 'Additional countries with format: Name:+XX (comma-separated, e.g., India:+91,Germany:+49,France:+33)'
WHERE setting_key = 'CITIZEN_CUSTOM_COUNTRY_CODES';

-- Verify the changes
SELECT setting_key, display_name,
       CASE WHEN options IS NOT NULL THEN 'Has options' ELSE 'No options' END as options_status
FROM system_settings
WHERE setting_key IN ('CITIZEN_ALLOWED_COUNTRIES', 'CITIZEN_CUSTOM_COUNTRY_CODES');
