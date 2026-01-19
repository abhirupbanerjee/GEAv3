-- ============================================
-- GEA Portal - Citizen Block Tracking
-- Migration: Add block tracking columns to citizens table
-- ============================================

-- Add block tracking columns to citizens table
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE citizens ADD COLUMN IF NOT EXISTS blocked_by VARCHAR(255);

-- Add index for blocked citizens queries
CREATE INDEX IF NOT EXISTS idx_citizens_blocked ON citizens(is_active) WHERE is_active = false;

-- Verify changes
DO $$
BEGIN
    RAISE NOTICE 'Citizen block tracking columns added successfully';
END $$;
