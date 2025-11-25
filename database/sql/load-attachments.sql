-- Load service attachments data
CREATE TEMP TABLE temp_attachments (
    service_id VARCHAR(50),
    filename VARCHAR(255),
    file_extension VARCHAR(50),
    is_mandatory VARCHAR(10),
    description TEXT,
    sort_order INTEGER,
    is_active VARCHAR(10)
);

\COPY temp_attachments FROM '/tmp/service-attachments.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"')

INSERT INTO service_attachments (
    service_id,
    filename,
    file_extension,
    is_mandatory,
    description,
    sort_order,
    is_active
)
SELECT
    service_id,
    filename,
    NULLIF(file_extension, ''),
    CASE WHEN is_mandatory = 'TRUE' THEN TRUE ELSE FALSE END,
    NULLIF(description, ''),
    sort_order,
    CASE WHEN is_active = 'TRUE' THEN TRUE ELSE FALSE END
FROM temp_attachments
ON CONFLICT DO NOTHING;

SELECT COUNT(*) AS attachments_loaded FROM service_attachments;
