#!/bin/bash
# Migration: Create service_categories and life_events tables
# This script creates the base lookup tables for services
# Safe to run multiple times (idempotent)

set -e

echo "=== Starting Migration: Service Categories & Life Events ==="
echo "Timestamp: $(date)"
echo ""

# Database connection details
DB_CONTAINER="${DB_CONTAINER:-feedback_db}"
DB_USER="${DB_USER:-feedback_user}"
DB_NAME="${DB_NAME:-feedback}"

echo "Database: $DB_NAME"
echo "Container: $DB_CONTAINER"
echo ""

# Execute SQL
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<'EOF'

-- =============================================================================
-- 1. CREATE SERVICE_CATEGORIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default service categories (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM service_categories LIMIT 1) THEN
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
        RAISE NOTICE 'Inserted 20 service categories';
    ELSE
        RAISE NOTICE 'Service categories already exist - skipping insert';
    END IF;
END $$;

-- =============================================================================
-- 2. CREATE LIFE_EVENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS life_events (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default life events (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM life_events LIMIT 1) THEN
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
        RAISE NOTICE 'Inserted 20 life events';
    ELSE
        RAISE NOTICE 'Life events already exist - skipping insert';
    END IF;
END $$;

-- =============================================================================
-- 3. CREATE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_service_categories_value
    ON service_categories (value);

CREATE INDEX IF NOT EXISTS idx_service_categories_active
    ON service_categories (is_active);

CREATE INDEX IF NOT EXISTS idx_life_events_value
    ON life_events (value);

CREATE INDEX IF NOT EXISTS idx_life_events_category
    ON life_events (category);

CREATE INDEX IF NOT EXISTS idx_life_events_active
    ON life_events (is_active);

-- =============================================================================
-- 4. VERIFICATION
-- =============================================================================
-- Show table counts
SELECT 'service_categories' as table_name, COUNT(*) as row_count FROM service_categories
UNION ALL
SELECT 'life_events' as table_name, COUNT(*) as row_count FROM life_events;

EOF

echo ""
echo "=== Migration Completed Successfully ==="
echo "Summary:"
echo "  - Created service_categories table with 20 default categories"
echo "  - Created life_events table with 20 default life events"
echo "  - Created indexes for efficient lookups"
echo ""
echo "Next steps:"
echo "  - Restart your application to pick up the changes"
echo "  - Test the Categories and Life Events tabs in the admin panel"
echo ""
