-- Update file extension requirements to allow PDF alternatives
-- This makes the form more flexible for users

-- Documents currently requiring DOCX - allow PDF, DOCX, DOC
UPDATE service_attachments
SET file_extension = 'pdf,docx,doc'
WHERE file_extension = 'docx';

-- Documents currently requiring XLSX - allow PDF, XLSX, XLS, CSV
UPDATE service_attachments
SET file_extension = 'pdf,xlsx,xls,csv'
WHERE file_extension = 'xlsx';

-- Verify the updates
SELECT
    service_id,
    filename,
    file_extension,
    is_mandatory,
    sort_order
FROM service_attachments
ORDER BY service_id, sort_order;
