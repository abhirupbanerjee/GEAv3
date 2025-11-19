#!/bin/bash

# GEA Portal Seed Data Loader - v3.0
# Populates service_attachments master data for grievances and EA service requests
# Version: 1.0

set -e

DB_USER="feedback_user"
DB_NAME="feedback"

echo "=== GEA Portal Seed Data Loader ==="
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Test connection
echo "Testing database connection..."
if docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "SELECT 1" 2>/dev/null; then
    echo "✓ Database connection successful"
else
    echo "✗ Cannot connect to database"
    exit 1
fi

echo ""
echo "Loading service attachments master data..."
echo ""

# Insert service attachments for all 7 EA services
docker exec -i feedback_db psql -U $DB_USER -d $DB_NAME << 'SQLEOF'

-- ============================================================================
-- SERVICE ATTACHMENTS MASTER DATA
-- Define mandatory and optional documents for each EA service
-- ============================================================================

-- Service 1: Public Sector Digital Roadmap Support
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('digital-roadmap', 'Senior leadership approval letter or email', 'pdf', TRUE, 'Approval for roadmap support request', 1),
('digital-roadmap', 'Digital vision / strategic plan', 'docx', TRUE, 'Vision document or strategic plan', 2),
('digital-roadmap', 'Inventory of services and systems', 'xlsx', TRUE, 'List of current services and IT systems', 3),
('digital-roadmap', 'Organizational structure', 'pdf', FALSE, 'Organizational chart or structure document', 4),
('digital-roadmap', 'Existing system/vendor contracts', 'pdf', FALSE, 'Current system contracts and agreements', 5);

-- Service 2: Grenada EA Framework Management
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('ea-framework-review', 'Details of domain/method requiring update', 'docx', TRUE, 'Specific domain or methodology needing review', 1),
('ea-framework-review', 'Senior Government leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 2),
('ea-framework-review', 'Supporting EA documents (drafts, models, standards)', 'pdf', FALSE, 'Draft documents, models, or standards for reference', 3);

-- Service 3: Grenada EA Maturity Assessment
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('maturity-assessment', 'Budget or funding request to MoF', 'pdf', TRUE, 'Scan of budget request letter or email to Ministry of Finance', 1),
('maturity-assessment', 'Description of proposed digital initiative', 'docx', TRUE, 'Initiative description with KPIs and target outcomes', 2),
('maturity-assessment', 'Architecture or system documentation', 'pdf', FALSE, 'Relevant architecture or system documentation', 3);

-- Service 4: Grenada EA Repository Access
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('repository-access', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1),
('repository-access', 'Required duration of access', 'docx', TRUE, 'Specify duration needed (e.g., 6 months, 1 year)', 2);

-- Service 5: Grenada EA Compliance Review
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('compliance-review', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1),
('compliance-review', 'Current state architecture documents', 'pdf', TRUE, 'As-is architecture documentation', 2),
('compliance-review', 'Target state architecture design document', 'pdf', TRUE, 'To-be architecture design', 3),
('compliance-review', 'Solution design documents', 'pdf', TRUE, 'Detailed solution design documents', 4),
('compliance-review', 'Vendor contracts / SOWs', 'pdf', FALSE, 'Vendor contracts and statements of work', 5),
('compliance-review', 'Integration diagrams', 'pdf', FALSE, 'System integration diagrams', 6),
('compliance-review', 'Security documentation', 'pdf', FALSE, 'Security design and documentation', 7),
('compliance-review', 'Data architecture diagrams', 'pdf', FALSE, 'Data flow and architecture diagrams', 8);

-- Service 6: IT Portfolio Review
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('portfolio-review', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1),
('portfolio-review', 'Baseline inventory of systems and services', 'xlsx', TRUE, 'Complete inventory of IT systems and services', 2),
('portfolio-review', 'Existing IT contracts and SLAs', 'pdf', FALSE, 'Current contracts and service level agreements', 3);

-- Service 7: EA Training & Capacity Development
INSERT INTO service_attachments (service_id, filename, file_extension, is_mandatory, description, sort_order) VALUES
('training-capacity', 'Senior leadership approval', 'pdf', TRUE, 'Approval from senior government leadership', 1),
('training-capacity', 'Intended audience list', 'xlsx', TRUE, 'List with names, designations, and parent organisation details', 2),
('training-capacity', 'Training topics or customization needs', 'docx', FALSE, 'Specific topics or customization requirements', 3);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Service Attachments by Service:' as "Report";

SELECT 
  s.service_name,
  COUNT(sa.service_attachment_id) as total_attachments,
  SUM(CASE WHEN sa.is_mandatory THEN 1 ELSE 0 END) as mandatory_count,
  SUM(CASE WHEN NOT sa.is_mandatory THEN 1 ELSE 0 END) as optional_count
FROM service_master s
LEFT JOIN service_attachments sa ON s.service_id = sa.service_id
WHERE s.service_id IN ('digital-roadmap', 'ea-framework-review', 'maturity-assessment', 
                       'repository-access', 'compliance-review', 'portfolio-review', 'training-capacity')
GROUP BY s.service_id, s.service_name
ORDER BY s.service_id;

SQLEOF

if [ $? -eq 0 ]; then
    echo "✓ Seed data loaded successfully"
else
    echo "✗ Seed data loading failed"
    exit 1
fi

echo ""
echo "=== Summary ==="
echo ""

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'SUMMARY'
SELECT 
  'Total service attachments' as "Metric", 
  COUNT(*) as "Count"
FROM service_attachments

UNION ALL

SELECT 
  'Mandatory attachments',
  COUNT(*) 
FROM service_attachments 
WHERE is_mandatory = TRUE

UNION ALL

SELECT 
  'Optional attachments',
  COUNT(*) 
FROM service_attachments 
WHERE is_mandatory = FALSE

UNION ALL

SELECT 
  'EA services configured',
  COUNT(DISTINCT service_id)
FROM service_attachments;
SUMMARY

echo ""
echo "Service Attachments loaded:"
docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "
SELECT service_id, COUNT(*) as attachments FROM service_attachments GROUP BY service_id ORDER BY service_id;
"

echo ""
echo "✓ Seed data initialization complete!"
echo ""
echo "Next steps:"
echo "1. Restart frontend: docker-compose restart frontend"
echo "2. Test API: curl -s https://gea.abhirup.app/api/tickets/categories | jq '.success'"
echo "3. Submit a grievance: POST /api/grievances/submit"
echo "4. Submit EA service request: POST /api/ea-services/submit"
echo ""