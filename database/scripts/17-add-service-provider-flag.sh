#!/bin/bash
# ============================================================================
# GEA Portal - Add Service Provider Flag to Entity Master
# ============================================================================
# Adds is_service_provider column to entity_master table to support
# multiple entities receiving service requests (not just DTA).
#
# Run: ./database/scripts/17-add-service-provider-flag.sh
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
echo "  Add Service Provider Flag Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- ADD SERVICE PROVIDER FLAG TO ENTITY_MASTER
-- ============================================================================
-- This migration adds support for multiple service provider entities.
-- A service provider entity can receive service requests from other entities.

-- Add the is_service_provider column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entity_master' AND column_name = 'is_service_provider'
    ) THEN
        ALTER TABLE entity_master
        ADD COLUMN is_service_provider BOOLEAN DEFAULT FALSE;

        RAISE NOTICE 'Added is_service_provider column to entity_master';
    ELSE
        RAISE NOTICE 'is_service_provider column already exists';
    END IF;
END $$;

-- Set DTA (AGY-005) as the default service provider
UPDATE entity_master
SET is_service_provider = TRUE
WHERE unique_entity_id = 'AGY-005';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_entity_master_service_provider
ON entity_master(is_service_provider)
WHERE is_service_provider = TRUE;

-- Verify the migration
DO $$
DECLARE
    provider_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO provider_count
    FROM entity_master
    WHERE is_service_provider = TRUE;

    RAISE NOTICE 'Migration complete. % service provider(s) configured.', provider_count;
END $$;

-- Show current service providers
SELECT unique_entity_id, entity_name, is_service_provider
FROM entity_master
WHERE is_service_provider = TRUE
ORDER BY entity_name;

EOF

echo ""
echo "✓ Service provider flag migration complete"
echo ""
