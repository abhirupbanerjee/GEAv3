#!/bin/bash

# ============================================
# Fix Duplicate Ticket Statuses Migration
# ============================================
# This script removes duplicate ticket status entries
# Keeps numeric codes ('1', '2', '3', '4') and removes old text codes (OPEN, IN_PROGRESS, etc.)

set -e

# Load environment variables
if [ -f ../.env.dev ]; then
  export $(cat ../.env.dev | sed 's/#.*//g' | xargs)
fi

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-feedback}"
DB_USER="${DB_USER:-feedback_user}"
DB_PASSWORD="${DB_PASSWORD:-feedback_pass}"

echo "============================================"
echo "Fix Duplicate Ticket Statuses Migration"
echo "============================================"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "User: $DB_USER"
echo "============================================"

# Execute SQL commands
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF

-- Start transaction
BEGIN;

-- Display current status entries
SELECT 'Current ticket_status entries:' as message;
SELECT status_id, status_code, status_name, is_active, sort_order
FROM ticket_status
ORDER BY sort_order, status_id;

-- Update any tickets using old status codes to use new ones
-- OPEN (status_id 1) -> status_id 19 (code '1')
UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '1' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'OPEN' LIMIT 1);

-- IN_PROGRESS (status_id 2) -> status_id 20 (code '2')
UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '2' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'IN_PROGRESS' LIMIT 1);

-- RESOLVED (status_id 4) -> status_id 21 (code '3')
UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '3' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'RESOLVED' LIMIT 1);

-- CLOSED (status_id 5) -> status_id 22 (code '4')
UPDATE tickets
SET status_id = (SELECT status_id FROM ticket_status WHERE status_code = '4' LIMIT 1)
WHERE status_id = (SELECT status_id FROM ticket_status WHERE status_code = 'CLOSED' LIMIT 1);

-- Delete old duplicate status entries
DELETE FROM ticket_status WHERE status_code IN ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- Display updated status entries
SELECT 'Updated ticket_status entries:' as message;
SELECT status_id, status_code, status_name, is_active, sort_order
FROM ticket_status
ORDER BY sort_order;

-- Commit transaction
COMMIT;

SELECT 'Migration completed successfully!' as message;

EOF

echo "============================================"
echo "Migration completed!"
echo "============================================"
