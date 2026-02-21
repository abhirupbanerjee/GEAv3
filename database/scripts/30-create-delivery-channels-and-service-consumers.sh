#!/bin/bash
# ============================================================================
# GEA Portal - Create Delivery Channels and Service Consumers Tables
# ============================================================================
# Creates lookup tables for managing service delivery channels and target consumers
# Also adds delivery_channel and target_consumers fields to services table
#
# Run: ./database/scripts/30-create-delivery-channels-and-service-consumers.sh
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
echo "Creating Delivery Channels and Service Consumers Tables"
echo "============================================"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- CREATE DELIVERY_CHANNELS TABLE
-- ============================================================================
-- Stores delivery channels through which services are provided

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

CREATE INDEX IF NOT EXISTS idx_delivery_channels_value ON delivery_channels(value);
CREATE INDEX IF NOT EXISTS idx_delivery_channels_active ON delivery_channels(is_active);

COMMENT ON TABLE delivery_channels IS 'Lookup table for service delivery channels (office, web, mobile, etc.)';
COMMENT ON COLUMN delivery_channels.value IS 'Database key (snake_case, e.g., web_portal)';
COMMENT ON COLUMN delivery_channels.label IS 'Display name shown to users';
COMMENT ON COLUMN delivery_channels.description IS 'Brief explanation of delivery channel';
COMMENT ON COLUMN delivery_channels.icon IS 'Optional emoji icon for UI display';

-- ============================================================================
-- CREATE SERVICE_CONSUMERS TABLE
-- ============================================================================
-- Stores target service consumer types

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

CREATE INDEX IF NOT EXISTS idx_service_consumers_value ON service_consumers(value);
CREATE INDEX IF NOT EXISTS idx_service_consumers_active ON service_consumers(is_active);

COMMENT ON TABLE service_consumers IS 'Lookup table for target service consumers (citizen, business, student, etc.)';
COMMENT ON COLUMN service_consumers.value IS 'Database key (snake_case, e.g., government_employee)';
COMMENT ON COLUMN service_consumers.label IS 'Display name shown to users';
COMMENT ON COLUMN service_consumers.description IS 'Brief explanation of consumer type';
COMMENT ON COLUMN service_consumers.icon IS 'Optional emoji icon for UI display';

-- ============================================================================
-- ADD FIELDS TO SERVICES TABLE
-- ============================================================================
-- Add delivery_channel and target_consumers to services

ALTER TABLE services
ADD COLUMN IF NOT EXISTS delivery_channel TEXT[] DEFAULT '{}';

ALTER TABLE services
ADD COLUMN IF NOT EXISTS target_consumers TEXT[] DEFAULT '{}';

COMMENT ON COLUMN services.delivery_channel IS 'Array of delivery channel values (e.g., {web_portal, mobile_app})';
COMMENT ON COLUMN services.target_consumers IS 'Array of target consumer values (e.g., {citizen, business})';

-- Create GIN indexes for efficient array searches
CREATE INDEX IF NOT EXISTS idx_services_delivery_channel ON services USING GIN (delivery_channel);
CREATE INDEX IF NOT EXISTS idx_services_target_consumers ON services USING GIN (target_consumers);

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert delivery channels (from QR code location types)
INSERT INTO delivery_channels (value, label, description, icon, sort_order) VALUES
    ('office', 'Office', 'Physical office location', '🏢', 1),
    ('kiosk', 'Kiosk', 'Self-service kiosk', '🖥️', 2),
    ('service_center', 'Service Center', 'Customer service center', '🏛️', 3),
    ('web_portal', 'Web Portal', 'Online web portal', '🌐', 4),
    ('mobile_app', 'Mobile App', 'Mobile application', '📱', 5),
    ('phone', 'Phone', 'Phone call or hotline', '☎️', 6),
    ('email', 'Email', 'Email communication', '📧', 7),
    ('event', 'Event', 'Special event or outreach', '📅', 8),
    ('other', 'Other', 'Other delivery method', '📋', 99)
ON CONFLICT (value) DO NOTHING;

-- Insert service consumers (from feedback "Who are you?")
INSERT INTO service_consumers (value, label, description, icon, sort_order) VALUES
    ('citizen', 'Citizen', 'Grenadian citizen', '👤', 1),
    ('business', 'Business', 'Business entity or company', '🏢', 2),
    ('government_employee', 'Government Employee', 'Government staff member', '🏛️', 3),
    ('visitor', 'Visitor', 'Visitor or tourist', '✈️', 4),
    ('student', 'Student', 'Student or educational institution', '🎓', 5),
    ('ngo', 'NGO/Non-Profit', 'Non-governmental organization', '🤝', 6),
    ('other', 'Other', 'Other type of service consumer', '📋', 99)
ON CONFLICT (value) DO NOTHING;

-- Verify the changes
DO $$
DECLARE
    channels_count INTEGER;
    consumers_count INTEGER;
    services_dc_exists BOOLEAN;
    services_tc_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO channels_count FROM delivery_channels;
    SELECT COUNT(*) INTO consumers_count FROM service_consumers;

    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'services'
          AND column_name = 'delivery_channel'
    ) INTO services_dc_exists;

    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'services'
          AND column_name = 'target_consumers'
    ) INTO services_tc_exists;

    RAISE NOTICE '✓ delivery_channels table created: % channels', channels_count;
    RAISE NOTICE '✓ service_consumers table created: % consumer types', consumers_count;

    IF services_dc_exists AND services_tc_exists THEN
        RAISE NOTICE '✓ Services table updated with delivery_channel and target_consumers columns';
    END IF;
END $$;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Tables created successfully"
    echo "   - delivery_channels: 9 default channels"
    echo "   - service_consumers: 7 default consumer types"
    echo "   - services table: added delivery_channel and target_consumers fields"
    echo ""
    echo "   Admin users can now manage these at:"
    echo "   /admin/managedata?tab=deliverychannels"
    echo "   /admin/managedata?tab=serviceconsumers"
    echo ""
else
    echo "✗ Failed to create tables"
    exit 1
fi

echo "============================================"
echo "Migration Complete"
echo "============================================"
