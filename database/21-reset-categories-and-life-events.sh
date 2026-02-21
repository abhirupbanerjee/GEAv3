#!/bin/bash
# Migration: Reset service_categories and life_events to fresh standard data
# This script removes old data and inserts only the agreed-upon standard dataset
# WARNING: This will DELETE all existing categories and life events

set -e

echo "=== Resetting Categories & Life Events to Fresh Data ==="
echo "Timestamp: $(date)"
echo ""

# Database connection details
DB_CONTAINER="${DB_CONTAINER:-feedback_db}"
DB_USER="${DB_USER:-feedback_user}"
DB_NAME="${DB_NAME:-feedback}"

echo "Database: $DB_NAME"
echo "Container: $DB_CONTAINER"
echo ""
echo "WARNING: This will DELETE all existing categories and life events!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Execute SQL
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'EOF'

-- =============================================================================
-- 1. CLEAR EXISTING DATA
-- =============================================================================
TRUNCATE TABLE service_categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE life_events RESTART IDENTITY CASCADE;

-- =============================================================================
-- 2. INSERT FRESH SERVICE CATEGORIES
-- =============================================================================
INSERT INTO service_categories (value, label, description, sort_order, is_active)
VALUES
    ('general', 'General Services', 'General government services', 1, true),
    ('health', 'Health Services', 'Healthcare and medical services', 2, true),
    ('education', 'Education', 'Educational services and programs', 3, true),
    ('tax_revenue', 'Tax & Revenue', 'Taxation and revenue services', 4, true),
    ('immigration', 'Immigration & Travel', 'Immigration, passports, and travel services', 5, true),
    ('business', 'Business Services', 'Business registration and commercial services', 6, true),
    ('civil_registration', 'Civil Registration', 'Birth, death, marriage registration', 7, true),
    ('land_property', 'Land & Property', 'Land registration and property services', 8, true),
    ('social_services', 'Social Services', 'Social welfare and support services', 9, true),
    ('public_safety', 'Public Safety', 'Police, fire, and emergency services', 10, true),
    ('licensing', 'Licensing & Permits', 'Licenses and permits', 11, true),
    ('housing', 'Housing', 'Housing and accommodation services', 12, true),
    ('employment', 'Employment', 'Job and employment services', 13, true),
    ('agriculture', 'Agriculture', 'Agricultural services and support', 14, true),
    ('environment', 'Environment', 'Environmental services and conservation', 15, true),
    ('tourism', 'Tourism', 'Tourism and visitor services', 16, true),
    ('transport', 'Transport', 'Transportation and vehicle services', 17, true),
    ('utilities', 'Utilities', 'Water, electricity, and utility services', 18, true),
    ('legal', 'Legal Services', 'Legal and judicial services', 19, true),
    ('other', 'Other', 'Other services', 99, true);

-- =============================================================================
-- 3. INSERT FRESH LIFE EVENTS
-- =============================================================================
INSERT INTO life_events (value, label, description, category, icon, sort_order, is_active)
VALUES
    -- Birth & Family
    ('having_baby', 'Having a Baby', 'Registering a newborn, birth certificates', 'family', '👶', 1, true),
    ('getting_married', 'Getting Married', 'Marriage registration and certificates', 'family', '💍', 2, true),
    ('adopting_child', 'Adopting a Child', 'Child adoption services and registration', 'family', '👨‍👩‍👧', 3, true),
    ('death_family', 'Death in Family', 'Death certificates and funeral arrangements', 'family', '🕊️', 4, true),

    -- Education
    ('starting_school', 'Starting School', 'School enrollment and registration', 'education', '🎒', 5, true),
    ('going_university', 'Going to University', 'University admission and student services', 'education', '🎓', 6, true),

    -- Employment
    ('starting_job', 'Starting a Job', 'Employment registration and work permits', 'employment', '💼', 7, true),
    ('losing_job', 'Losing a Job', 'Unemployment benefits and job search support', 'employment', '📋', 8, true),
    ('retiring', 'Retiring', 'Pension and retirement services', 'employment', '🏖️', 9, true),

    -- Business
    ('starting_business', 'Starting a Business', 'Business registration and licenses', 'business', '🏢', 10, true),
    ('closing_business', 'Closing a Business', 'Business deregistration and closure', 'business', '📊', 11, true),

    -- Housing
    ('buying_home', 'Buying a Home', 'Property registration and home ownership', 'housing', '🏠', 12, true),
    ('selling_home', 'Selling a Home', 'Property transfer and sale services', 'housing', '🏡', 13, true),
    ('renting_property', 'Renting a Property', 'Rental agreements and tenant services', 'housing', '🔑', 14, true),

    -- Immigration & Travel
    ('moving_grenada', 'Moving to Grenada', 'Immigration and residency permits', 'immigration', '✈️', 15, true),
    ('leaving_grenada', 'Leaving Grenada', 'Exit permits and emigration services', 'immigration', '🌍', 16, true),
    ('getting_passport', 'Getting a Passport', 'Passport application and renewal', 'immigration', '📘', 17, true),

    -- Health
    ('serious_illness', 'Serious Illness', 'Healthcare and medical services', 'health', '🏥', 18, true),
    ('disability', 'Living with Disability', 'Disability support and services', 'health', '♿', 19, true),

    -- Other
    ('other', 'Other Life Event', 'Other significant life events', 'other', '📌', 99, true);

-- =============================================================================
-- 4. VERIFICATION
-- =============================================================================
SELECT 'service_categories' as table_name, COUNT(*) as row_count FROM service_categories
UNION ALL
SELECT 'life_events' as table_name, COUNT(*) as row_count FROM life_events;

-- Show sample data
SELECT 'Sample Categories:' as info;
SELECT value, label FROM service_categories ORDER BY sort_order LIMIT 5;

SELECT 'Sample Life Events:' as info;
SELECT value, label, category FROM life_events ORDER BY category, sort_order LIMIT 5;

EOF

echo ""
echo "=== Reset Completed Successfully ==="
echo "Summary:"
echo "  - Cleared all old categories and life events"
echo "  - Inserted 20 fresh service categories"
echo "  - Inserted 20 fresh life events"
echo ""
echo "Next steps:"
echo "  - Restart your application: docker restart frontend"
echo "  - Test the Categories and Life Events tabs"
echo ""
