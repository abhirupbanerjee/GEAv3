-- Migration: Add life_events column to services table
-- Purpose: Enable tagging services with life events for citizen-centric navigation
-- Date: 2026-02-21

-- Add life_events column as TEXT array
ALTER TABLE services
ADD COLUMN IF NOT EXISTS life_events TEXT[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN services.life_events IS 'Array of life event tags (e.g., {having_a_baby, getting_married}) for citizen-centric service discovery';

-- Create GIN index for efficient array search queries
CREATE INDEX IF NOT EXISTS idx_services_life_events ON services USING GIN (life_events);

-- Verify the changes
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name = 'life_events';

COMMENT ON INDEX idx_services_life_events IS 'GIN index for fast life_events array searches (e.g., WHERE ''having_a_baby'' = ANY(life_events))';
