-- Load service master data
CREATE TEMP TABLE temp_services (
    service_id VARCHAR(50),
    service_name VARCHAR(255),
    entity_id VARCHAR(50),
    service_category VARCHAR(100),
    service_description TEXT,
    is_active VARCHAR(10)
);

\COPY temp_services FROM '/tmp/service-master.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"')

INSERT INTO service_master (
    service_id,
    service_name,
    entity_id,
    service_category,
    service_description,
    is_active
)
SELECT
    service_id,
    service_name,
    entity_id,
    NULLIF(service_category, ''),
    NULLIF(service_description, ''),
    CASE WHEN is_active = 'TRUE' THEN TRUE ELSE FALSE END
FROM temp_services
ON CONFLICT (service_id) DO NOTHING;

SELECT COUNT(*) AS services_loaded FROM service_master;
