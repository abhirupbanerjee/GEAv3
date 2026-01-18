azureuser@gea:~/GEAv3$ # 1. Get all table structures with column types
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.column_default,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;" > /tmp/prod_schema.txt
azureuser@gea:~/GEAv3$ cat /tmp/prod_schema.txt
           table_name           |       column_name       |          data_type          | character_maximum_length |                            column_default                             | is_nullable 
--------------------------------+-------------------------+-----------------------------+--------------------------+-----------------------------------------------------------------------+-------------
 accounts                       | id                      | uuid                        |                          | uuid_generate_v4()                                                    | NO
 accounts                       | user_id                 | uuid                        |                          |                                                                       | NO
 accounts                       | type                    | character varying           |                       50 |                                                                       | NO
 accounts                       | provider                | character varying           |                       50 |                                                                       | NO
 accounts                       | provider_account_id     | character varying           |                      255 |                                                                       | NO
 accounts                       | refresh_token           | text                        |                          |                                                                       | YES
 accounts                       | access_token            | text                        |                          |                                                                       | YES
 accounts                       | expires_at              | integer                     |                          |                                                                       | YES
 accounts                       | token_type              | character varying           |                       50 |                                                                       | YES
 accounts                       | scope                   | text                        |                          |                                                                       | YES
 accounts                       | id_token                | text                        |                          |                                                                       | YES
 accounts                       | session_state           | text                        |                          |                                                                       | YES
 accounts                       | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 accounts                       | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ai_bots                        | id                      | character varying           |                       50 |                                                                       | NO
 ai_bots                        | name                    | character varying           |                      255 |                                                                       | NO
 ai_bots                        | url                     | text                        |                          |                                                                       | YES
 ai_bots                        | description             | text                        |                          |                                                                       | YES
 ai_bots                        | status                  | character varying           |                       20 | 'planned'::character varying                                          | NO
 ai_bots                        | deployment              | character varying           |                      100 |                                                                       | YES
 ai_bots                        | audience                | character varying           |                      100 |                                                                       | YES
 ai_bots                        | modality                | character varying           |                       50 |                                                                       | YES
 ai_bots                        | category                | character varying           |                      100 |                                                                       | YES
 ai_bots                        | is_active               | boolean                     |                          | true                                                                  | YES
 ai_bots                        | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ai_bots                        | created_by              | character varying           |                      255 |                                                                       | YES
 ai_bots                        | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ai_bots                        | updated_by              | character varying           |                      255 |                                                                       | YES
 backup_audit_log               | audit_id                | integer                     |                          | nextval('backup_audit_log_audit_id_seq'::regclass)                    | NO
 backup_audit_log               | action                  | character varying           |                       20 |                                                                       | NO
 backup_audit_log               | filename                | character varying           |                      255 |                                                                       | NO
 backup_audit_log               | performed_by            | character varying           |                      255 |                                                                       | NO
 backup_audit_log               | ip_address              | character varying           |                       45 |                                                                       | YES
 backup_audit_log               | user_agent              | text                        |                          |                                                                       | YES
 backup_audit_log               | details                 | jsonb                       |                          |                                                                       | YES
 backup_audit_log               | safety_backup_filename  | character varying           |                      255 |                                                                       | YES
 backup_audit_log               | tables_restored         | integer                     |                          |                                                                       | YES
 backup_audit_log               | rows_restored           | integer                     |                          |                                                                       | YES
 backup_audit_log               | file_size               | bigint                      |                          |                                                                       | YES
 backup_audit_log               | duration_ms             | integer                     |                          |                                                                       | YES
 backup_audit_log               | status                  | character varying           |                       20 | 'success'::character varying                                          | YES
 backup_audit_log               | error_message           | text                        |                          |                                                                       | YES
 backup_audit_log               | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 captcha_challenges             | challenge_id            | integer                     |                          | nextval('captcha_challenges_challenge_id_seq'::regclass)              | NO
 captcha_challenges             | ip_hash                 | character varying           |                       64 |                                                                       | NO
 captcha_challenges             | challenge_issued_at     | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 captcha_challenges             | challenge_completed_at  | timestamp without time zone |                          |                                                                       | YES
 captcha_challenges             | success                 | boolean                     |                          |                                                                       | YES
 ea_service_request_attachments | attachment_id           | integer                     |                          | nextval('ea_service_request_attachments_attachment_id_seq'::regclass) | NO
 ea_service_request_attachments | request_id              | integer                     |                          |                                                                       | NO
 ea_service_request_attachments | filename                | character varying           |                      255 |                                                                       | NO
 ea_service_request_attachments | mimetype                | character varying           |                      100 |                                                                       | NO
 ea_service_request_attachments | file_content            | bytea                       |                          |                                                                       | NO
 ea_service_request_attachments | file_size               | integer                     |                          |                                                                       | NO
 ea_service_request_attachments | is_mandatory            | boolean                     |                          | false                                                                 | YES
 ea_service_request_attachments | uploaded_by             | character varying           |                      255 | 'system'::character varying                                           | YES
 ea_service_request_attachments | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ea_service_request_comments    | comment_id              | integer                     |                          | nextval('ea_service_request_comments_comment_id_seq'::regclass)       | NO
 ea_service_request_comments    | request_id              | integer                     |                          |                                                                       | NO
 ea_service_request_comments    | comment_text            | text                        |                          |                                                                       | NO
 ea_service_request_comments    | comment_type            | character varying           |                       50 | 'internal_note'::character varying                                    | YES
 ea_service_request_comments    | is_status_change        | boolean                     |                          | false                                                                 | YES
 ea_service_request_comments    | old_status              | character varying           |                       20 |                                                                       | YES
 ea_service_request_comments    | new_status              | character varying           |                       20 |                                                                       | YES
 ea_service_request_comments    | created_by              | character varying           |                      255 |                                                                       | NO
 ea_service_request_comments    | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ea_service_request_comments    | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ea_service_request_comments    | is_visible_to_staff     | boolean                     |                          | true                                                                  | YES
 ea_service_requests            | request_id              | integer                     |                          | nextval('ea_service_requests_request_id_seq'::regclass)               | NO
 ea_service_requests            | request_number          | character varying           |                       20 |                                                                       | NO
 ea_service_requests            | service_id              | character varying           |                       50 |                                                                       | NO
 ea_service_requests            | entity_id               | character varying           |                       50 |                                                                       | NO
 ea_service_requests            | status                  | character varying           |                       20 | 'submitted'::character varying                                        | NO
 ea_service_requests            | requester_name          | character varying           |                      255 |                                                                       | NO
 ea_service_requests            | requester_email         | character varying           |                      255 |                                                                       | NO
 ea_service_requests            | requester_phone         | character varying           |                       50 |                                                                       | YES
 ea_service_requests            | requester_ministry      | character varying           |                      255 |                                                                       | YES
 ea_service_requests            | request_description     | text                        |                          |                                                                       | YES
 ea_service_requests            | submission_ip_hash      | character varying           |                       64 |                                                                       | YES
 ea_service_requests            | assigned_to             | character varying           |                      255 |                                                                       | YES
 ea_service_requests            | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ea_service_requests            | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ea_service_requests            | resolved_at             | timestamp without time zone |                          |                                                                       | YES
 ea_service_requests            | closed_at               | timestamp without time zone |                          |                                                                       | YES
 ea_service_requests            | created_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 ea_service_requests            | updated_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 entity_master                  | unique_entity_id        | character varying           |                       50 |                                                                       | NO
 entity_master                  | entity_name             | character varying           |                      255 |                                                                       | NO
 entity_master                  | entity_type             | character varying           |                       50 |                                                                       | NO
 entity_master                  | parent_entity_id        | character varying           |                       50 |                                                                       | YES
 entity_master                  | contact_email           | character varying           |                      100 |                                                                       | YES
 entity_master                  | contact_phone           | character varying           |                       20 |                                                                       | YES
 entity_master                  | is_active               | boolean                     |                          | true                                                                  | YES
 entity_master                  | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 entity_master                  | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 entity_master                  | is_service_provider     | boolean                     |                          | false                                                                 | YES
 entity_user_assignments        | assignment_id           | integer                     |                          | nextval('entity_user_assignments_assignment_id_seq'::regclass)        | NO
 entity_user_assignments        | user_id                 | uuid                        |                          |                                                                       | NO
 entity_user_assignments        | entity_id               | character varying           |                       50 |                                                                       | NO
 entity_user_assignments        | assigned_at             | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 entity_user_assignments        | assigned_by             | character varying           |                      255 |                                                                       | YES
 entity_user_assignments        | is_active               | boolean                     |                          | true                                                                  | YES
 grievance_attachments          | attachment_id           | integer                     |                          | nextval('grievance_attachments_attachment_id_seq'::regclass)          | NO
 grievance_attachments          | grievance_id            | integer                     |                          |                                                                       | NO
 grievance_attachments          | filename                | character varying           |                      255 |                                                                       | NO
 grievance_attachments          | mimetype                | character varying           |                      100 |                                                                       | NO
 grievance_attachments          | file_content            | bytea                       |                          |                                                                       | NO
 grievance_attachments          | file_size               | integer                     |                          |                                                                       | NO
 grievance_attachments          | uploaded_by             | character varying           |                      255 | 'system'::character varying                                           | YES
 grievance_attachments          | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 grievance_status               | status_code             | character varying           |                       20 |                                                                       | NO
 grievance_status               | status_name             | character varying           |                      100 |                                                                       | NO
 grievance_status               | status_order            | integer                     |                          | 0                                                                     | YES
 grievance_status               | color_code              | character varying           |                        7 |                                                                       | YES
 grievance_status               | is_active               | boolean                     |                          | true                                                                  | YES
 grievance_status               | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 grievance_tickets              | grievance_id            | integer                     |                          | nextval('grievance_tickets_grievance_id_seq'::regclass)               | NO
 grievance_tickets              | grievance_number        | character varying           |                       50 |                                                                       | NO
 grievance_tickets              | service_id              | character varying           |                       50 |                                                                       | NO
 grievance_tickets              | entity_id               | character varying           |                       50 |                                                                       | NO
 grievance_tickets              | status                  | character varying           |                       20 | 'open'::character varying                                             | NO
 grievance_tickets              | submitter_category      | character varying           |                       50 |                                                                       | YES
 grievance_tickets              | submitter_name          | character varying           |                      255 |                                                                       | NO
 grievance_tickets              | submitter_email         | character varying           |                      255 |                                                                       | NO
 grievance_tickets              | submitter_phone         | character varying           |                       50 |                                                                       | YES
 grievance_tickets              | grievance_subject       | character varying           |                      255 |                                                                       | NO
 grievance_tickets              | grievance_description   | text                        |                          |                                                                       | NO
 grievance_tickets              | incident_date           | date                        |                          |                                                                       | YES
 grievance_tickets              | submission_ip_hash      | character varying           |                       64 |                                                                       | YES
 grievance_tickets              | assigned_to             | character varying           |                      255 |                                                                       | YES
 grievance_tickets              | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 grievance_tickets              | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 grievance_tickets              | resolved_at             | timestamp without time zone |                          |                                                                       | YES
 grievance_tickets              | closed_at               | timestamp without time zone |                          |                                                                       | YES
 grievance_tickets              | created_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 grievance_tickets              | updated_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 leadership_contacts            | contact_id              | integer                     |                          | nextval('leadership_contacts_contact_id_seq'::regclass)               | NO
 leadership_contacts            | name                    | character varying           |                      100 |                                                                       | NO
 leadership_contacts            | title                   | character varying           |                      100 |                                                                       | NO
 leadership_contacts            | email                   | character varying           |                      255 |                                                                       | YES
 leadership_contacts            | image_path              | character varying           |                      500 |                                                                       | YES
 leadership_contacts            | sort_order              | integer                     |                          | 0                                                                     | YES
 leadership_contacts            | is_active               | boolean                     |                          | true                                                                  | YES
 leadership_contacts            | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 leadership_contacts            | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 leadership_contacts            | created_by              | character varying           |                      255 |                                                                       | YES
 leadership_contacts            | updated_by              | character varying           |                      255 |                                                                       | YES
 priority_levels                | priority_id             | integer                     |                          | nextval('priority_levels_priority_id_seq'::regclass)                  | NO
 priority_levels                | priority_code           | character varying           |                       20 |                                                                       | NO
 priority_levels                | priority_name           | character varying           |                       50 |                                                                       | NO
 priority_levels                | sla_multiplier          | numeric                     |                          | 1.0                                                                   | YES
 priority_levels                | sort_order              | integer                     |                          | 0                                                                     | YES
 priority_levels                | color_code              | character varying           |                        7 |                                                                       | YES
 priority_levels                | is_active               | boolean                     |                          | true                                                                  | YES
 priority_levels                | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 priority_levels                | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 qr_codes                       | qr_code_id              | character varying           |                       50 |                                                                       | NO
 qr_codes                       | service_id              | character varying           |                       50 |                                                                       | NO
 qr_codes                       | entity_id               | character varying           |                       50 |                                                                       | NO
 qr_codes                       | location_name           | character varying           |                      255 |                                                                       | YES
 qr_codes                       | location_address        | text                        |                          |                                                                       | YES
 qr_codes                       | location_type           | character varying           |                      100 |                                                                       | YES
 qr_codes                       | generated_url           | text                        |                          |                                                                       | NO
 qr_codes                       | scan_count              | integer                     |                          | 0                                                                     | YES
 qr_codes                       | is_active               | boolean                     |                          | true                                                                  | YES
 qr_codes                       | notes                   | text                        |                          |                                                                       | YES
 qr_codes                       | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 qr_codes                       | created_by              | character varying           |                      100 |                                                                       | YES
 qr_codes                       | deactivated_at          | timestamp without time zone |                          |                                                                       | YES
 qr_codes                       | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 service_attachments            | service_attachment_id   | integer                     |                          | nextval('service_attachments_service_attachment_id_seq'::regclass)    | NO
 service_attachments            | service_id              | character varying           |                       50 |                                                                       | NO
 service_attachments            | filename                | character varying           |                      255 |                                                                       | NO
 service_attachments            | file_extension          | character varying           |                       50 |                                                                       | YES
 service_attachments            | is_mandatory            | boolean                     |                          | false                                                                 | YES
 service_attachments            | description             | text                        |                          |                                                                       | YES
 service_attachments            | sort_order              | integer                     |                          | 0                                                                     | YES
 service_attachments            | is_active               | boolean                     |                          | true                                                                  | YES
 service_attachments            | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 service_feedback               | feedback_id             | bigint                      |                          | nextval('service_feedback_feedback_id_seq'::regclass)                 | NO
 service_feedback               | service_id              | character varying           |                       50 |                                                                       | NO
 service_feedback               | entity_id               | character varying           |                       50 |                                                                       | NO
 service_feedback               | q1_ease                 | integer                     |                          |                                                                       | YES
 service_feedback               | q2_clarity              | integer                     |                          |                                                                       | YES
 service_feedback               | q3_timeliness           | integer                     |                          |                                                                       | YES
 service_feedback               | q4_trust                | integer                     |                          |                                                                       | YES
 service_feedback               | q5_overall_satisfaction | integer                     |                          |                                                                       | YES
 service_feedback               | grievance_flag          | boolean                     |                          | false                                                                 | YES
 service_feedback               | comment_text            | text                        |                          |                                                                       | YES
 service_feedback               | recipient_group         | character varying           |                       50 |                                                                       | YES
 service_feedback               | channel                 | character varying           |                       50 | 'portal'::character varying                                           | YES
 service_feedback               | qr_code_id              | character varying           |                       50 |                                                                       | YES
 service_feedback               | submitted_ip_hash       | character varying           |                       64 |                                                                       | YES
 service_feedback               | submitted_user_agent    | text                        |                          |                                                                       | YES
 service_feedback               | is_active               | boolean                     |                          | true                                                                  | YES
 service_feedback               | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 service_feedback               | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 service_master                 | service_id              | character varying           |                       50 |                                                                       | NO
 service_master                 | service_name            | character varying           |                      255 |                                                                       | NO
 service_master                 | entity_id               | character varying           |                       50 |                                                                       | NO
 service_master                 | service_category        | character varying           |                      100 |                                                                       | YES
 service_master                 | service_description     | text                        |                          |                                                                       | YES
 service_master                 | is_active               | boolean                     |                          | true                                                                  | YES
 service_master                 | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 service_master                 | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 sessions                       | id                      | uuid                        |                          | uuid_generate_v4()                                                    | NO
 sessions                       | session_token           | character varying           |                      255 |                                                                       | NO
 sessions                       | user_id                 | uuid                        |                          |                                                                       | NO
 sessions                       | expires                 | timestamp without time zone |                          |                                                                       | NO
 sessions                       | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 sessions                       | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 settings_audit_log             | audit_id                | integer                     |                          | nextval('settings_audit_log_audit_id_seq'::regclass)                  | NO
 settings_audit_log             | setting_key             | character varying           |                      100 |                                                                       | NO
 settings_audit_log             | old_value               | text                        |                          |                                                                       | YES
 settings_audit_log             | new_value               | text                        |                          |                                                                       | YES
 settings_audit_log             | changed_by              | character varying           |                      255 |                                                                       | NO
 settings_audit_log             | change_reason           | text                        |                          |                                                                       | YES
 settings_audit_log             | ip_address              | character varying           |                       45 |                                                                       | YES
 settings_audit_log             | changed_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 sla_breaches                   | breach_id               | integer                     |                          | nextval('sla_breaches_breach_id_seq'::regclass)                       | NO
 sla_breaches                   | ticket_id               | integer                     |                          |                                                                       | NO
 sla_breaches                   | breach_type             | character varying           |                       20 |                                                                       | YES
 sla_breaches                   | target_time             | timestamp without time zone |                          |                                                                       | NO
 sla_breaches                   | actual_time             | timestamp without time zone |                          |                                                                       | YES
 sla_breaches                   | breach_duration_hours   | numeric                     |                          |                                                                       | YES
 sla_breaches                   | is_active               | boolean                     |                          | true                                                                  | YES
 sla_breaches                   | detected_at             | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 submission_attempts            | attempt_id              | integer                     |                          | nextval('submission_attempts_attempt_id_seq'::regclass)               | NO
 submission_attempts            | ip_hash                 | character varying           |                       64 |                                                                       | NO
 submission_attempts            | attempt_type            | character varying           |                       50 | 'submission'::character varying                                       | YES
 submission_attempts            | attempt_time            | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 submission_attempts            | success                 | boolean                     |                          | true                                                                  | YES
 submission_rate_limit          | ip_hash                 | character varying           |                       64 |                                                                       | NO
 submission_rate_limit          | submission_count        | integer                     |                          | 1                                                                     | YES
 submission_rate_limit          | attempt_type            | character varying           |                       50 | 'submission'::character varying                                       | YES
 submission_rate_limit          | window_start            | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 system_settings                | setting_id              | integer                     |                          | nextval('system_settings_setting_id_seq'::regclass)                   | NO
 system_settings                | setting_key             | character varying           |                      100 |                                                                       | NO
 system_settings                | setting_value           | text                        |                          |                                                                       | YES
 system_settings                | setting_type            | character varying           |                       20 | 'string'::character varying                                           | NO
 system_settings                | category                | character varying           |                       50 |                                                                       | NO
 system_settings                | subcategory             | character varying           |                       50 |                                                                       | YES
 system_settings                | display_name            | character varying           |                      255 |                                                                       | NO
 system_settings                | description             | text                        |                          |                                                                       | YES
 system_settings                | is_sensitive            | boolean                     |                          | false                                                                 | YES
 system_settings                | is_runtime              | boolean                     |                          | true                                                                  | YES
 system_settings                | default_value           | text                        |                          |                                                                       | YES
 system_settings                | validation_regex        | character varying           |                      500 |                                                                       | YES
 system_settings                | validation_message      | character varying           |                      255 |                                                                       | YES
 system_settings                | min_value               | numeric                     |                          |                                                                       | YES
 system_settings                | max_value               | numeric                     |                          |                                                                       | YES
 system_settings                | options                 | jsonb                       |                          |                                                                       | YES
 system_settings                | sort_order              | integer                     |                          | 0                                                                     | YES
 system_settings                | is_active               | boolean                     |                          | true                                                                  | YES
 system_settings                | last_modified_by        | character varying           |                      255 |                                                                       | YES
 system_settings                | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 system_settings                | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ticket_activity                | activity_id             | integer                     |                          | nextval('ticket_activity_activity_id_seq'::regclass)                  | NO
 ticket_activity                | ticket_id               | integer                     |                          |                                                                       | NO
 ticket_activity                | activity_type           | character varying           |                      100 |                                                                       | NO
 ticket_activity                | performed_by            | character varying           |                      255 |                                                                       | YES
 ticket_activity                | description             | text                        |                          |                                                                       | YES
 ticket_activity                | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ticket_attachments             | attachment_id           | integer                     |                          | nextval('ticket_attachments_attachment_id_seq'::regclass)             | NO
 ticket_attachments             | ticket_id               | integer                     |                          |                                                                       | NO
 ticket_attachments             | filename                | character varying           |                      255 |                                                                       | NO
 ticket_attachments             | mimetype                | character varying           |                      100 |                                                                       | NO
 ticket_attachments             | file_content            | bytea                       |                          |                                                                       | NO
 ticket_attachments             | file_size               | integer                     |                          |                                                                       | NO
 ticket_attachments             | uploaded_by             | character varying           |                      255 | 'system'::character varying                                           | YES
 ticket_attachments             | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ticket_categories              | category_id             | integer                     |                          | nextval('ticket_categories_category_id_seq'::regclass)                | NO
 ticket_categories              | category_code           | character varying           |                      100 |                                                                       | NO
 ticket_categories              | category_name           | character varying           |                      255 |                                                                       | NO
 ticket_categories              | description             | text                        |                          |                                                                       | YES
 ticket_categories              | sort_order              | integer                     |                          | 0                                                                     | YES
 ticket_categories              | is_active               | boolean                     |                          | true                                                                  | YES
 ticket_categories              | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ticket_notes                   | note_id                 | integer                     |                          | nextval('ticket_notes_note_id_seq'::regclass)                         | NO
 ticket_notes                   | ticket_id               | integer                     |                          |                                                                       | NO
 ticket_notes                   | note_text               | text                        |                          |                                                                       | NO
 ticket_notes                   | is_public               | boolean                     |                          | false                                                                 | YES
 ticket_notes                   | created_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 ticket_notes                   | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ticket_status                  | status_id               | integer                     |                          | nextval('ticket_status_status_id_seq'::regclass)                      | NO
 ticket_status                  | status_code             | character varying           |                       50 |                                                                       | NO
 ticket_status                  | status_name             | character varying           |                      100 |                                                                       | NO
 ticket_status                  | status_type             | character varying           |                       20 |                                                                       | YES
 ticket_status                  | is_terminal             | boolean                     |                          | false                                                                 | YES
 ticket_status                  | sort_order              | integer                     |                          | 0                                                                     | YES
 ticket_status                  | color_code              | character varying           |                        7 |                                                                       | YES
 ticket_status                  | is_active               | boolean                     |                          | true                                                                  | YES
 ticket_status                  | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 ticket_status                  | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 tickets                        | ticket_id               | integer                     |                          | nextval('tickets_ticket_id_seq'::regclass)                            | NO
 tickets                        | ticket_number           | character varying           |                       50 |                                                                       | NO
 tickets                        | category_id             | integer                     |                          |                                                                       | YES
 tickets                        | priority_id             | integer                     |                          |                                                                       | YES
 tickets                        | status_id               | integer                     |                          |                                                                       | YES
 tickets                        | subject                 | character varying           |                      255 |                                                                       | NO
 tickets                        | description             | text                        |                          |                                                                       | NO
 tickets                        | submitter_name          | character varying           |                      255 |                                                                       | YES
 tickets                        | submitter_email         | character varying           |                      255 |                                                                       | YES
 tickets                        | submitter_phone         | character varying           |                       50 |                                                                       | YES
 tickets                        | submission_ip_hash      | character varying           |                       64 |                                                                       | YES
 tickets                        | assigned_entity_id      | character varying           |                       50 |                                                                       | YES
 tickets                        | assigned_user_id        | character varying           |                       36 |                                                                       | YES
 tickets                        | sla_response_target     | timestamp without time zone |                          |                                                                       | YES
 tickets                        | sla_resolution_target   | timestamp without time zone |                          |                                                                       | YES
 tickets                        | first_response_at       | timestamp without time zone |                          |                                                                       | YES
 tickets                        | resolved_at             | timestamp without time zone |                          |                                                                       | YES
 tickets                        | closed_at               | timestamp without time zone |                          |                                                                       | YES
 tickets                        | feedback_id             | integer                     |                          |                                                                       | YES
 tickets                        | service_id              | character varying           |                       50 |                                                                       | YES
 tickets                        | source                  | character varying           |                       50 | 'portal'::character varying                                           | YES
 tickets                        | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 tickets                        | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 tickets                        | created_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 tickets                        | updated_by              | character varying           |                      255 | 'system'::character varying                                           | YES
 tickets                        | entity_id               | character varying           |                       50 | 'AGY-002'::character varying                                          | YES
 tickets                        | requester_category      | character varying           |                       50 | 'citizen'::character varying                                          | YES
 user_audit_log                 | log_id                  | integer                     |                          | nextval('user_audit_log_log_id_seq'::regclass)                        | NO
 user_audit_log                 | user_id                 | uuid                        |                          |                                                                       | YES
 user_audit_log                 | action                  | character varying           |                      100 |                                                                       | NO
 user_audit_log                 | resource_type           | character varying           |                       50 |                                                                       | YES
 user_audit_log                 | resource_id             | character varying           |                      255 |                                                                       | YES
 user_audit_log                 | old_value               | jsonb                       |                          |                                                                       | YES
 user_audit_log                 | new_value               | jsonb                       |                          |                                                                       | YES
 user_audit_log                 | ip_address              | inet                        |                          |                                                                       | YES
 user_audit_log                 | user_agent              | text                        |                          |                                                                       | YES
 user_audit_log                 | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 user_permissions               | permission_id           | integer                     |                          | nextval('user_permissions_permission_id_seq'::regclass)               | NO
 user_permissions               | user_id                 | uuid                        |                          |                                                                       | NO
 user_permissions               | permission_code         | character varying           |                      100 |                                                                       | NO
 user_permissions               | resource_type           | character varying           |                       50 |                                                                       | YES
 user_permissions               | resource_id             | character varying           |                      255 |                                                                       | YES
 user_permissions               | granted_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 user_permissions               | granted_by              | character varying           |                      255 |                                                                       | YES
 user_permissions               | expires_at              | timestamp without time zone |                          |                                                                       | YES
 user_roles                     | role_id                 | integer                     |                          | nextval('user_roles_role_id_seq'::regclass)                           | NO
 user_roles                     | role_code               | character varying           |                       50 |                                                                       | NO
 user_roles                     | role_name               | character varying           |                      100 |                                                                       | NO
 user_roles                     | role_type               | character varying           |                       20 |                                                                       | NO
 user_roles                     | description             | text                        |                          |                                                                       | YES
 user_roles                     | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 users                          | id                      | uuid                        |                          | uuid_generate_v4()                                                    | NO
 users                          | email                   | character varying           |                      255 |                                                                       | NO
 users                          | name                    | character varying           |                      255 |                                                                       | YES
 users                          | image                   | text                        |                          |                                                                       | YES
 users                          | email_verified          | timestamp without time zone |                          |                                                                       | YES
 users                          | role_id                 | integer                     |                          |                                                                       | NO
 users                          | entity_id               | character varying           |                       50 |                                                                       | YES
 users                          | is_active               | boolean                     |                          | true                                                                  | YES
 users                          | provider                | character varying           |                       50 |                                                                       | YES
 users                          | last_login              | timestamp without time zone |                          |                                                                       | YES
 users                          | created_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 users                          | updated_at              | timestamp without time zone |                          | CURRENT_TIMESTAMP                                                     | YES
 users                          | created_by              | character varying           |                      255 |                                                                       | YES
 users                          | updated_by              | character varying           |                      255 |                                                                       | YES
 verification_tokens            | identifier              | character varying           |                      255 |                                                                       | NO
 verification_tokens            | token                   | character varying           |                      255 |                                                                       | NO
 verification_tokens            | expires                 | timestamp without time zone |                          |                                                                       | NO
(362 rows)

azureuser@gea:~/GEAv3$ # 2. Get all foreign keys
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;"
           table_name           |   column_name    |    foreign_table    |  foreign_column  
--------------------------------+------------------+---------------------+------------------
 accounts                       | user_id          | users               | id
 ea_service_request_attachments | request_id       | ea_service_requests | request_id
 ea_service_request_comments    | request_id       | ea_service_requests | request_id
 ea_service_requests            | entity_id        | entity_master       | unique_entity_id
 ea_service_requests            | service_id       | service_master      | service_id
 entity_master                  | parent_entity_id | entity_master       | unique_entity_id
 entity_user_assignments        | entity_id        | entity_master       | unique_entity_id
 entity_user_assignments        | user_id          | users               | id
 grievance_attachments          | grievance_id     | grievance_tickets   | grievance_id
 grievance_tickets              | service_id       | service_master      | service_id
 grievance_tickets              | entity_id        | entity_master       | unique_entity_id
 qr_codes                       | entity_id        | entity_master       | unique_entity_id
 qr_codes                       | service_id       | service_master      | service_id
 service_attachments            | service_id       | service_master      | service_id
 service_feedback               | service_id       | service_master      | service_id
 service_feedback               | entity_id        | entity_master       | unique_entity_id
 service_master                 | entity_id        | entity_master       | unique_entity_id
 sessions                       | user_id          | users               | id
 sla_breaches                   | ticket_id        | tickets             | ticket_id
 ticket_activity                | ticket_id        | tickets             | ticket_id
 ticket_attachments             | ticket_id        | tickets             | ticket_id
 ticket_notes                   | ticket_id        | tickets             | ticket_id
 tickets                        | status_id        | ticket_status       | status_id
 tickets                        | priority_id      | priority_levels     | priority_id
 tickets                        | entity_id        | entity_master       | unique_entity_id
 tickets                        | service_id       | service_master      | service_id
 user_audit_log                 | user_id          | users               | id
 user_permissions               | user_id          | users               | id
 users                          | entity_id        | entity_master       | unique_entity_id
 users                          | role_id          | user_roles          | role_id
(30 rows)

azureuser@gea:~/GEAv3$ # 3. Quick comparison - count columns per table
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;"
           table_name           | column_count 
--------------------------------+--------------
 accounts                       |           14
 ai_bots                        |           14
 backup_audit_log               |           15
 captcha_challenges             |            5
 ea_service_request_attachments |            9
 ea_service_request_comments    |           11
 ea_service_requests            |           18
 entity_master                  |           10
 entity_user_assignments        |            6
 grievance_attachments          |            8
 grievance_status               |            6
 grievance_tickets              |           20
 leadership_contacts            |           11
 priority_levels                |            9
 qr_codes                       |           14
 service_attachments            |            9
 service_feedback               |           18
 service_master                 |            8
 sessions                       |            6
 settings_audit_log             |            8
 sla_breaches                   |            8
 submission_attempts            |            5
 submission_rate_limit          |            4
 system_settings                |           21
 ticket_activity                |            6
 ticket_attachments             |            8
 ticket_categories              |            7
 ticket_notes                   |            6
 ticket_status                  |           10
 tickets                        |           27
 user_audit_log                 |           10
 user_permissions               |            8
 user_roles                     |            6
 users                          |           14
 verification_tokens            |            3
(35 rows)

azureuser@gea:~/GEAv3$ 
