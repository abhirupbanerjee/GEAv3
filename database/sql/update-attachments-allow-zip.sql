-- Update service attachments to allow ZIP files in addition to PDF
-- Also update description to inform users about ZIP support
-- Run this script to apply the changes to the database

-- Update ALL attachments that currently only allow PDF to also allow ZIP
UPDATE service_attachments
SET file_extension = 'pdf,zip'
WHERE file_extension = 'pdf';

-- Update descriptions to add ZIP info (append to existing description)
UPDATE service_attachments
SET description = description || ' pdf and zip allowed. Use zip for multiple files and different formats.'
WHERE file_extension = 'pdf,zip'
  AND description IS NOT NULL
  AND description NOT LIKE '%zip allowed%';

-- For attachments with NULL descriptions, set the ZIP info
UPDATE service_attachments
SET description = 'pdf and zip allowed. Use zip for multiple files and different formats.'
WHERE file_extension = 'pdf,zip'
  AND description IS NULL;

-- Verify the update
SELECT
  service_attachment_id,
  service_id,
  filename,
  file_extension,
  description
FROM service_attachments
WHERE file_extension LIKE '%zip%'
LIMIT 20;

-- Show count of updated records
SELECT COUNT(*) AS attachments_updated
FROM service_attachments
WHERE file_extension LIKE '%zip%';

-- Update file size constraint from 5MB to 10MB for ea_service_request_attachments
-- First drop the existing constraint
ALTER TABLE ea_service_request_attachments
DROP CONSTRAINT IF EXISTS check_ea_file_size;

-- Add new constraint with 10MB limit (10 * 1024 * 1024 = 10485760 bytes)
ALTER TABLE ea_service_request_attachments
ADD CONSTRAINT check_ea_file_size CHECK (file_size > 0 AND file_size <= 10485760);

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'check_ea_file_size';
