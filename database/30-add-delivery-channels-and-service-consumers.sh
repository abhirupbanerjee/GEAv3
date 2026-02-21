#!/bin/bash
# Migration: Add delivery channels and service consumers
# This script adds new master data tables and extends the service_master table
# Safe to run multiple times (idempotent)

set -e

echo "=== Starting Migration: Delivery Channels & Service Consumers ==="
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
-- 1. CREATE DELIVERY CHANNELS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS delivery_channels (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default delivery channels (if not exists)
INSERT INTO delivery_channels (value, label, description, icon, sort_order, is_active)
VALUES
    ('office', 'Walk-in Office', 'Visit a physical office location', '🏢', 1, true),
    ('kiosk', 'Self-Service Kiosk', 'Use an automated kiosk terminal', '💻', 2, true),
    ('service_center', 'Service Center', 'Dedicated service center location', '🏛️', 3, true),
    ('web_portal', 'Web Portal', 'Access through online web portal', '🌐', 4, true),
    ('mobile_app', 'Mobile App', 'Use mobile application', '📱', 5, true),
    ('email', 'Email', 'Submit request via email', '📧', 6, true),
    ('phone', 'Phone/Hotline', 'Call customer service hotline', '☎️', 7, true),
    ('event', 'Special Event', 'Available at community events', '🎪', 8, true),
    ('other', 'Other', 'Alternative delivery method', '📦', 9, true)
ON CONFLICT (value) DO NOTHING;

-- =============================================================================
-- 2. CREATE SERVICE CONSUMERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS service_consumers (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default service consumers (if not exists)
INSERT INTO service_consumers (value, label, description, icon, sort_order, is_active)
VALUES
    ('citizen', 'Citizen/Resident', 'General citizens and residents', '👤', 1, true),
    ('student', 'Student', 'Students and educational institutions', '🎓', 2, true),
    ('business', 'Business/Company', 'Business entities and corporations', '🏢', 3, true),
    ('visitor', 'Visitor/Tourist', 'Tourists and temporary visitors', '🧳', 4, true),
    ('government', 'Government Employee', 'Government staff and officials', '👔', 5, true),
    ('ngo', 'NGO/Non-Profit', 'Non-governmental organizations', '🤝', 6, true),
    ('other', 'Other', 'Other types of service consumers', '👥', 7, true)
ON CONFLICT (value) DO NOTHING;

-- =============================================================================
-- 3. EXTEND SERVICE_MASTER TABLE
-- =============================================================================
-- Add new columns to service_master (if they don't exist)
DO $$
BEGIN
    -- Add life_events column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_master' AND column_name = 'life_events'
    ) THEN
        ALTER TABLE service_master ADD COLUMN life_events TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added column: life_events';
    ELSE
        RAISE NOTICE 'Column life_events already exists';
    END IF;

    -- Add delivery_channel column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_master' AND column_name = 'delivery_channel'
    ) THEN
        ALTER TABLE service_master ADD COLUMN delivery_channel TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added column: delivery_channel';
    ELSE
        RAISE NOTICE 'Column delivery_channel already exists';
    END IF;

    -- Add target_consumers column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_master' AND column_name = 'target_consumers'
    ) THEN
        ALTER TABLE service_master ADD COLUMN target_consumers TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added column: target_consumers';
    ELSE
        RAISE NOTICE 'Column target_consumers already exists';
    END IF;
END $$;

-- =============================================================================
-- 4. CREATE INDEXES FOR EFFICIENT SEARCHES
-- =============================================================================
-- GIN indexes for array column searches
CREATE INDEX IF NOT EXISTS idx_service_master_life_events
    ON service_master USING GIN (life_events);

CREATE INDEX IF NOT EXISTS idx_service_master_delivery_channel
    ON service_master USING GIN (delivery_channel);

CREATE INDEX IF NOT EXISTS idx_service_master_target_consumers
    ON service_master USING GIN (target_consumers);

-- Regular indexes for lookup tables
CREATE INDEX IF NOT EXISTS idx_delivery_channels_value
    ON delivery_channels (value);

CREATE INDEX IF NOT EXISTS idx_delivery_channels_active
    ON delivery_channels (is_active);

CREATE INDEX IF NOT EXISTS idx_service_consumers_value
    ON service_consumers (value);

CREATE INDEX IF NOT EXISTS idx_service_consumers_active
    ON service_consumers (is_active);

-- =============================================================================
-- 5. VERIFICATION
-- =============================================================================
-- Show table counts
SELECT 'delivery_channels' as table_name, COUNT(*) as row_count FROM delivery_channels
UNION ALL
SELECT 'service_consumers' as table_name, COUNT(*) as row_count FROM service_consumers;

-- Show new columns in service_master
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'service_master'
AND column_name IN ('life_events', 'delivery_channel', 'target_consumers')
ORDER BY column_name;

EOF

echo ""
echo "=== Migration Completed Successfully ==="
echo "Summary:"
echo "  - Created delivery_channels table with 9 default channels"
echo "  - Created service_consumers table with 7 default consumer types"
echo "  - Added life_events, delivery_channel, target_consumers columns to service_master"
echo "  - Created GIN indexes for efficient array searches"
echo ""
echo "Next steps:"
echo "  - Restart your application to pick up the changes"
echo "  - Test the new Master Data tabs in the admin panel"
echo "  - Test adding/editing services with the new fields"
echo ""
