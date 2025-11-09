-- ============================================
-- SYNTHETIC FEEDBACK DATA GENERATOR
-- ============================================
-- Purpose: Generate realistic test data for analytics dashboard
-- Coverage: Multiple services, channels, time periods, ratings patterns
-- ============================================

-- ============================================
-- HELPER FUNCTION: Random rating generator
-- ============================================
CREATE OR REPLACE FUNCTION random_rating(avg_target INTEGER, variance INTEGER)
RETURNS INTEGER AS $$
DECLARE
    rating INTEGER;
BEGIN
    rating := avg_target + floor(random() * (variance * 2 + 1))::INTEGER - variance;
    RETURN GREATEST(1, LEAST(5, rating));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GENERATE SYNTHETIC FEEDBACK DATA
-- ============================================

-- Variables for data generation
DO $$
DECLARE
    service_rec RECORD;
    qr_rec RECORD;
    feedback_count INTEGER;
    days_ago INTEGER;
    recipient_groups TEXT[] := ARRAY['citizen', 'business', 'government', 'visitor', 'other'];
    comment_templates TEXT[] := ARRAY[
        'Excellent service, very satisfied',
        'Process was straightforward and efficient',
        'Staff were helpful and professional',
        'Could be faster but overall good experience',
        'System was easy to use',
        'Waiting time was reasonable',
        'Clear instructions provided',
        'Would recommend this service',
        'Process needs improvement',
        'Forms were confusing',
        'Long wait times experienced',
        'Staff need more training',
        'System had technical issues',
        'Information was not clear',
        'Service exceeded expectations',
        'Quick and efficient processing',
        'Online portal works well',
        'Documentation requirements unclear'
    ];
    
BEGIN
    -- ============================================
    -- 1. GENERATE EA PORTAL FEEDBACK
    -- ============================================
    RAISE NOTICE 'Generating EA Portal feedback...';
    
    FOR service_rec IN 
        SELECT s.service_id, s.entity_id, e.entity_type
        FROM service_master s
        JOIN entity_master e ON s.entity_id = e.unique_entity_id
        WHERE s.is_active = TRUE
        LIMIT 40 -- Generate for first 40 services
    LOOP
        -- Vary feedback count by service type
        feedback_count := CASE 
            WHEN service_rec.entity_type = 'ministry' THEN 15 + floor(random() * 25)::INTEGER
            WHEN service_rec.entity_type = 'department' THEN 20 + floor(random() * 40)::INTEGER
            WHEN service_rec.entity_type = 'agency' THEN 10 + floor(random() * 30)::INTEGER
            ELSE 8 + floor(random() * 15)::INTEGER
        END;
        
        -- Generate feedback records over last 90 days
        FOR i IN 1..feedback_count LOOP
            days_ago := floor(random() * 90)::INTEGER;
            
            INSERT INTO service_feedback (
                service_id,
                entity_id,
                channel,
                qr_code_id,
                recipient_group,
                q1_ease,
                q2_clarity,
                q3_timeliness,
                q4_trust,
                q5_overall_satisfaction,
                comment_text,
                grievance_flag,
                submitted_at,
                ip_hash,
                user_agent_hash
            ) VALUES (
                service_rec.service_id,
                service_rec.entity_id,
                'ea_portal',
                NULL,
                recipient_groups[1 + floor(random() * array_length(recipient_groups, 1))::INTEGER],
                random_rating(4, 1), -- q1_ease: avg 4, variance ±1
                random_rating(4, 1), -- q2_clarity
                random_rating(3, 1), -- q3_timeliness: slightly lower avg
                random_rating(4, 1), -- q4_trust
                random_rating(4, 1), -- q5_overall_satisfaction
                CASE WHEN random() < 0.4 THEN comment_templates[1 + floor(random() * array_length(comment_templates, 1))::INTEGER] ELSE NULL END,
                CASE WHEN random() < 0.05 THEN TRUE ELSE FALSE END, -- 5% grievance rate
                NOW() - (days_ago || ' days')::INTERVAL - (floor(random() * 24)::INTEGER || ' hours')::INTERVAL,
                md5(random()::TEXT || i::TEXT),
                md5('user-agent-' || i::TEXT)
            );
        END LOOP;
    END LOOP;
    
    -- ============================================
    -- 2. GENERATE QR CODE FEEDBACK
    -- ============================================
    RAISE NOTICE 'Generating QR Code feedback...';
    
    FOR qr_rec IN 
        SELECT qr_code_id, service_id, entity_id, scan_count
        FROM qr_codes
        WHERE is_active = TRUE
    LOOP
        -- Generate feedback for each QR code (30-70% conversion rate)
        feedback_count := GREATEST(5, floor(qr_rec.scan_count * (0.3 + random() * 0.4))::INTEGER);
        
        FOR i IN 1..feedback_count LOOP
            days_ago := floor(random() * 60)::INTEGER; -- Last 60 days for QR codes
            
            INSERT INTO service_feedback (
                service_id,
                entity_id,
                channel,
                qr_code_id,
                recipient_group,
                q1_ease,
                q2_clarity,
                q3_timeliness,
                q4_trust,
                q5_overall_satisfaction,
                comment_text,
                grievance_flag,
                submitted_at,
                ip_hash,
                user_agent_hash
            ) VALUES (
                qr_rec.service_id,
                qr_rec.entity_id,
                'qr_code',
                qr_rec.qr_code_id,
                recipient_groups[1 + floor(random() * array_length(recipient_groups, 1))::INTEGER],
                random_rating(4, 1),
                random_rating(4, 1),
                random_rating(4, 2), -- QR users might rate timeliness more variably
                random_rating(4, 1),
                random_rating(4, 1),
                CASE WHEN random() < 0.3 THEN comment_templates[1 + floor(random() * array_length(comment_templates, 1))::INTEGER] ELSE NULL END,
                CASE WHEN random() < 0.03 THEN TRUE ELSE FALSE END, -- 3% grievance rate
                NOW() - (days_ago || ' days')::INTERVAL - (floor(random() * 24)::INTEGER || ' hours')::INTERVAL,
                md5(random()::TEXT || 'qr' || i::TEXT),
                md5('kiosk-agent-' || i::TEXT)
            );
        END LOOP;
        
        -- Update QR scan count
        UPDATE qr_codes 
        SET scan_count = scan_count + feedback_count + floor(random() * 20)::INTEGER
        WHERE qr_code_id = qr_rec.qr_code_id;
    END LOOP;
    
    -- ============================================
    -- 3. GENERATE MORE QR CODES FOR TESTING
    -- ============================================
    RAISE NOTICE 'Generating additional QR codes...';
    
    -- Add more QR codes for popular services
    INSERT INTO qr_codes (qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, scan_count, is_active, created_by) 
    SELECT 
        'QR-' || s.service_id || '-' || row_number() OVER (PARTITION BY s.service_id) AS qr_code_id,
        s.service_id,
        s.entity_id,
        e.entity_name || ' - Service Point',
        'St. George''s, Grenada',
        CASE (row_number() OVER (PARTITION BY s.service_id ORDER BY random())) % 3
            WHEN 0 THEN 'office'
            WHEN 1 THEN 'kiosk'
            ELSE 'service_center'
        END,
        'https://gea.abhirup.app/feedback/qr?c=QR-' || s.service_id || '-' || row_number() OVER (PARTITION BY s.service_id),
        floor(random() * 100)::INTEGER + 20, -- Random scan count 20-120
        TRUE,
        'synthetic_data'
    FROM service_master s
    JOIN entity_master e ON s.entity_id = e.unique_entity_id
    WHERE s.service_id IN (
        'SVC-TAX-002', 'SVC-IMM-002', 'SVC-TRN-001', 'SVC-TRN-003',
        'SVC-UTL-002', 'SVC-UTL-004', 'SVC-NIS-001', 'SVC-REG-010'
    )
    ON CONFLICT (qr_code_id) DO NOTHING;
    
    -- ============================================
    -- 4. CREATE TIME-SERIES PATTERNS
    -- ============================================
    RAISE NOTICE 'Generating time-series patterns...';
    
    -- Add more recent feedback with improving trend
    FOR service_rec IN 
        SELECT service_id, entity_id 
        FROM service_master 
        WHERE service_id IN ('SVC-TAX-002', 'SVC-IMM-001', 'SVC-TRN-001')
        LIMIT 3
    LOOP
        FOR i IN 1..50 LOOP
            INSERT INTO service_feedback (
                service_id, entity_id, channel, recipient_group,
                q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction,
                submitted_at, ip_hash, user_agent_hash
            ) VALUES (
                service_rec.service_id,
                service_rec.entity_id,
                'ea_portal',
                recipient_groups[1 + floor(random() * array_length(recipient_groups, 1))::INTEGER],
                random_rating(5, 0), -- High ratings for recent period
                random_rating(5, 0),
                random_rating(5, 1),
                random_rating(5, 0),
                random_rating(5, 0),
                NOW() - (floor(random() * 14)::INTEGER || ' days')::INTERVAL,
                md5(random()::TEXT || 'recent' || i::TEXT),
                md5('user-agent-recent-' || i::TEXT)
            );
        END LOOP;
    END LOOP;
    
END $$;

-- ============================================
-- CLEANUP HELPER FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS random_rating(INTEGER, INTEGER);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Total feedback count
SELECT 'Total Feedback Records: ' || COUNT(*) AS info FROM service_feedback;

-- Feedback by channel
SELECT channel, COUNT(*) as count, 
       ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
FROM service_feedback 
GROUP BY channel;

-- Feedback by recipient group
SELECT recipient_group, COUNT(*) as count
FROM service_feedback 
GROUP BY recipient_group
ORDER BY count DESC;

-- Grievance rate
SELECT 
    COUNT(*) as total_feedback,
    SUM(CASE WHEN grievance_flag THEN 1 ELSE 0 END) as grievances,
    ROUND(100.0 * SUM(CASE WHEN grievance_flag THEN 1 ELSE 0 END) / COUNT(*), 2) as grievance_percentage
FROM service_feedback;

-- Top 10 services by feedback volume
SELECT s.service_name, e.entity_name, COUNT(f.feedback_id) as feedback_count,
       ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_rating
FROM service_feedback f
JOIN service_master s ON f.service_id = s.service_id
JOIN entity_master e ON s.entity_id = e.unique_entity_id
GROUP BY s.service_name, e.entity_name
ORDER BY feedback_count DESC
LIMIT 10;

-- Feedback over time (weekly)
SELECT 
    DATE_TRUNC('week', submitted_at) as week,
    COUNT(*) as feedback_count,
    ROUND(AVG(q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
FROM service_feedback
GROUP BY DATE_TRUNC('week', submitted_at)
ORDER BY week DESC
LIMIT 12;

-- QR Code performance
SELECT qr_code_id, location_name, scan_count, 
       COUNT(f.feedback_id) as feedback_count
FROM qr_codes q
LEFT JOIN service_feedback f ON q.qr_code_id = f.qr_code_id
WHERE q.is_active = TRUE
GROUP BY q.qr_code_id, q.location_name, q.scan_count
ORDER BY scan_count DESC
LIMIT 10;

-- ============================================
-- SYNTHETIC DATA GENERATION COMPLETE
-- ============================================
RAISE NOTICE '✓ Synthetic data generation complete!';
