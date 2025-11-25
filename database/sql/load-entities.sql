-- Load entity master data
CREATE TEMP TABLE temp_entities (
    unique_entity_id VARCHAR(50),
    entity_name VARCHAR(255),
    entity_type VARCHAR(50),
    parent_entity_id VARCHAR(50),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    is_active VARCHAR(10)
);

\COPY temp_entities FROM '/tmp/entity-master.txt' WITH (FORMAT csv, HEADER true, DELIMITER ',', QUOTE '"')

INSERT INTO entity_master (
    unique_entity_id,
    entity_name,
    entity_type,
    parent_entity_id,
    contact_email,
    contact_phone,
    is_active
)
SELECT
    unique_entity_id,
    entity_name,
    entity_type,
    NULLIF(parent_entity_id, ''),
    NULLIF(contact_email, ''),
    NULLIF(contact_phone, ''),
    CASE WHEN is_active = 'TRUE' THEN TRUE ELSE FALSE END
FROM temp_entities
ON CONFLICT (unique_entity_id) DO NOTHING;

SELECT COUNT(*) AS entities_loaded FROM entity_master;
