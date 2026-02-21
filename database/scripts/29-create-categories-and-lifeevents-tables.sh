#!/bin/bash
# ============================================================================
# GEA Portal - Create Service Categories and Life Events Tables
# ============================================================================
# Creates lookup tables for managing service categories and life events
# Enables admin users to manage these through the UI instead of hardcoding
#
# Run: ./database/scripts/29-create-categories-and-lifeevents-tables.sh
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

echo "============================================"
echo "Creating Categories and Life Events Tables"
echo "============================================"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- CREATE SERVICE_CATEGORIES TABLE
-- ============================================================================
-- Stores service categories that can be managed by admin users

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

CREATE INDEX IF NOT EXISTS idx_service_categories_value ON service_categories(value);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active);

COMMENT ON TABLE service_categories IS 'Lookup table for service categories - managed via admin UI';
COMMENT ON COLUMN service_categories.value IS 'Database key (snake_case, e.g., health_services_and_clinics)';
COMMENT ON COLUMN service_categories.label IS 'Display name shown to users';
COMMENT ON COLUMN service_categories.description IS 'Brief explanation of category scope';
COMMENT ON COLUMN service_categories.sort_order IS 'Controls display order in dropdowns';

-- ============================================================================
-- CREATE LIFE_EVENTS TABLE
-- ============================================================================
-- Stores life event tags for citizen-centric service discovery

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

CREATE INDEX IF NOT EXISTS idx_life_events_value ON life_events(value);
CREATE INDEX IF NOT EXISTS idx_life_events_category ON life_events(category);
CREATE INDEX IF NOT EXISTS idx_life_events_active ON life_events(is_active);

COMMENT ON TABLE life_events IS 'Lookup table for life event tags - managed via admin UI';
COMMENT ON COLUMN life_events.value IS 'Database key (snake_case, e.g., having_a_baby)';
COMMENT ON COLUMN life_events.label IS 'Display name shown to users';
COMMENT ON COLUMN life_events.description IS 'Explanation of services related to this life event';
COMMENT ON COLUMN life_events.category IS 'Category grouping (family, education, employment, etc.)';
COMMENT ON COLUMN life_events.icon IS 'Optional emoji icon for UI display';
COMMENT ON COLUMN life_events.sort_order IS 'Controls display order in UI';

-- ============================================================================
-- INSERT DEFAULT DATA FROM SERVICEMANAGER.TSX
-- ============================================================================

-- Insert default categories (from ServiceManager.tsx lines 94-152)
INSERT INTO service_categories (value, label, sort_order) VALUES
    ('identity_and_civil_registration', 'Identity & Civil Registration', 1),
    ('immigration_passports_and_travel', 'Immigration & Travel', 2),
    ('taxation_duties_and_revenue', 'Tax & Revenue', 3),
    ('health_services_and_clinics', 'Health Services & Clinics', 4),
    ('health_facility_licensing', 'Health Facility Licensing', 5),
    ('public_health_and_sanitation', 'Public Health & Sanitation', 6),
    ('social_protection_and_family_support', 'Social Protection & Family Support', 7),
    ('social_protection_and_insurance', 'Social Protection & Insurance (NIS)', 8),
    ('social_protection_cash_transfers', 'Social Protection: Cash Transfers', 9),
    ('education_exams_and_assessment', 'Education: Exams & Assessment', 10),
    ('education_scholarships_and_financial_aid', 'Education: Scholarships & Aid', 11),
    ('education_school_administration', 'Education: School Administration', 12),
    ('land_administration_and_cadastre', 'Land Administration & Cadastre', 13),
    ('land_use_planning_and_building_control', 'Planning & Building Control', 14),
    ('housing_support', 'Housing Support', 15),
    ('business_and_commerce', 'Business & Commerce', 16),
    ('investment_and_business_support', 'Investment & Business Support', 17),
    ('agriculture_and_rural_development', 'Agriculture & Rural Development', 18),
    ('fisheries_and_marine_resources', 'Fisheries & Marine Resources', 19),
    ('forestry_and_wildlife_management', 'Forestry & Wildlife', 20),
    ('cooperatives_and_producer_organizations', 'Cooperatives & Producer Organizations', 21),
    ('transport_vehicles_and_civil_aviation', 'Transport & Vehicles', 22),
    ('justice_legal_affairs_and_law_enforcement', 'Justice & Law Enforcement', 23),
    ('tourism_culture_and_events', 'Tourism & Culture', 24),
    ('utilities_and_public_infrastructure', 'Utilities & Infrastructure', 25),
    ('digital_government_and_ict_services', 'Digital Government Services', 26),
    ('enterprise_architecture_services', 'Enterprise Architecture', 27),
    ('financial_regulation_and_licensing', 'Financial Regulation & Licensing', 28),
    ('standards_quality_and_safety', 'Standards, Quality & Safety', 29),
    ('statistics_and_data', 'Statistics & Data', 30),
    ('youth_and_community_development', 'Youth & Community Development', 31),
    ('disaster_support_and_assessment', 'Disaster Support', 32),
    ('governance_elections_and_public_administration', 'Governance & Public Administration', 33),
    ('general', 'General Services', 99)
ON CONFLICT (value) DO NOTHING;

-- Insert default life events (from ServiceManager.tsx lines 169-205)
INSERT INTO life_events (value, label, description, category, sort_order) VALUES
    -- Family Life Events
    ('having_a_baby', 'Having a Baby', 'Birth registration, maternity benefits, maternal health services', 'family', 1),
    ('getting_married', 'Getting Married', 'Marriage licence, marriage certificate, name change', 'family', 2),
    ('death_and_bereavement', 'Death & Bereavement', 'Death certificate, funeral benefits, survivor benefits', 'family', 3),
    ('child_welfare', 'Child Protection & Welfare', 'Foster care, adoption, child protection, parenting support', 'family', 4),

    -- Education Journey
    ('going_to_school', 'Going to School', 'School placement, transfers, exam registration', 'education', 5),
    ('pursuing_higher_education', 'Pursuing Higher Education', 'Scholarships, study leave, bursaries, transcripts', 'education', 6),

    -- Employment & Business
    ('starting_a_business', 'Starting a Business', 'Business registration, TRN, VAT registration, licenses', 'employment', 7),
    ('starting_work', 'Starting Work', 'Work permits, NIS registration, employment documents', 'employment', 8),
    ('losing_a_job', 'Job Loss / Unemployment', 'Unemployment benefits, retraining, social assistance', 'employment', 9),
    ('retiring', 'Retiring', 'NIS pension, age benefits, senior citizen support', 'employment', 10),

    -- Housing & Property
    ('buying_property', 'Buying Property / Building Home', 'Land purchase, surveys, building permits, property tax', 'housing', 11),
    ('moving_house', 'Moving / Changing Address', 'Utilities connection, address change, school transfers', 'housing', 12),

    -- Transport
    ('getting_drivers_license', 'Learning to Drive', 'Learner''s permit, driver''s test, license renewal', 'transport', 13),
    ('buying_a_vehicle', 'Buying a Vehicle', 'Vehicle registration, transfer, fitness test, licence fees', 'transport', 14),

    -- Crisis & Support
    ('experiencing_hardship', 'Experiencing Hardship', 'SEED cash transfer, emergency assistance, social support', 'crisis', 15),
    ('disaster_recovery', 'Recovering from Disaster', 'Household assessment, emergency assistance, rebuilding', 'crisis', 16),
    ('violence_or_abuse', 'Experiencing Violence / Abuse', 'GBV support, shelter placement, crisis intervention', 'crisis', 17),

    -- Health
    ('illness_or_disability', 'Dealing with Illness / Disability', 'Hospital services, disability grants, home care, benefits', 'health', 18),

    -- Immigration & Travel
    ('traveling_abroad', 'Traveling Abroad', 'Passport application/renewal, visas, travel documents', 'immigration', 19),
    ('coming_to_grenada', 'Coming to Grenada', 'Visas, entry permits, work permits, immigration services', 'immigration', 20)
ON CONFLICT (value) DO NOTHING;

-- Verify the changes
DO $$
DECLARE
    categories_count INTEGER;
    life_events_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO categories_count FROM service_categories;
    SELECT COUNT(*) INTO life_events_count FROM life_events;

    RAISE NOTICE '✓ service_categories table created: % categories', categories_count;
    RAISE NOTICE '✓ life_events table created: % life events', life_events_count;
END $$;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Tables created successfully"
    echo "   - service_categories: 33 default categories"
    echo "   - life_events: 20 default life events"
    echo ""
    echo "   Admin users can now manage categories and life events at:"
    echo "   /admin/managedata?tab=categories"
    echo "   /admin/managedata?tab=lifeevents"
    echo ""
else
    echo "✗ Failed to create tables"
    exit 1
fi

echo "============================================"
echo "Migration Complete"
echo "============================================"
