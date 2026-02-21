#!/bin/bash
# ============================================================================
# GEA Portal - Add Life Events to Services Table
# ============================================================================
# Adds life_events column to enable citizen-centric service navigation.
# Services can be tagged with multiple life events (e.g., having_a_baby,
# getting_married) to help citizens find services relevant to their situation.
#
# Run: ./database/scripts/28-add-life-events-to-services.sh
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
echo "Adding Life Events Column to Services"
echo "============================================"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- ADD LIFE_EVENTS COLUMN TO SERVICES TABLE
-- ============================================================================
-- Enables tagging services with life events for citizen-centric discovery.
-- Life events represent significant moments in citizens' lives where they
-- need government services (e.g., having a baby, starting a business,
-- buying property, retiring).

-- Add life_events column as TEXT array
ALTER TABLE services
ADD COLUMN IF NOT EXISTS life_events TEXT[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN services.life_events IS 'Array of life event tags (e.g., {having_a_baby, getting_married}) for citizen-centric service discovery. Based on Estonia/Australia/UK best practices.';

-- Create GIN index for efficient array search queries
CREATE INDEX IF NOT EXISTS idx_services_life_events ON services USING GIN (life_events);

COMMENT ON INDEX idx_services_life_events IS 'GIN index for fast life_events array searches (e.g., WHERE ''having_a_baby'' = ANY(life_events))';

-- Verify the changes
DO $$
DECLARE
    column_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'services'
          AND column_name = 'life_events'
    ) INTO column_exists;

    -- Check if index exists
    SELECT EXISTS(
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'services'
          AND indexname = 'idx_services_life_events'
    ) INTO index_exists;

    IF column_exists AND index_exists THEN
        RAISE NOTICE '✓ life_events column added successfully';
        RAISE NOTICE '✓ GIN index created successfully';
    ELSE
        IF NOT column_exists THEN
            RAISE WARNING '✗ Failed to create life_events column';
        END IF;
        IF NOT index_exists THEN
            RAISE WARNING '✗ Failed to create GIN index';
        END IF;
    END IF;
END $$;

-- Show column details
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name = 'life_events';

-- Show current services count
SELECT
    COUNT(*) as total_services,
    SUM(CASE WHEN cardinality(life_events) > 0 THEN 1 ELSE 0 END) as services_with_life_events
FROM services;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Life events column added successfully"
    echo "   Column: life_events (TEXT[])"
    echo "   Index: idx_services_life_events (GIN)"
    echo "   Next: Update services via Admin UI to tag with life events"
    echo ""
    echo "   Recommended life events:"
    echo "   - having_a_baby"
    echo "   - getting_married"
    echo "   - death_and_bereavement"
    echo "   - starting_a_business"
    echo "   - buying_property"
    echo "   - retiring"
    echo "   - going_to_school"
    echo "   - and 13 more (see plan document)"
    echo ""
else
    echo "✗ Failed to add life_events column"
    exit 1
fi

echo "============================================"
echo "Migration Complete"
echo "============================================"
