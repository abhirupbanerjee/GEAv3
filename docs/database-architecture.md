# GEA Database Architecture Document

**Version:** 2.0  
**Database Name:** feedback_db  
**Organization:** Government of Grenada  
**Status:** Production Ready  
**Last Updated:** November 18, 2025  

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Database Architecture](#2-database-architecture)
3. [Physical Schema](#3-physical-schema)
4. [Entity Relationships](#4-entity-relationships)
5. [Component Details](#5-component-details)
6. [Data Dictionary](#6-data-dictionary)
7. [Functions & Procedures](#7-functions--procedures)
8. [Triggers & Automation](#8-triggers--automation)
9. [Views & Analytics](#9-views--analytics)
10. [Security & Performance](#10-security--performance)
11. [Backup & Recovery](#11-backup--recovery)
12. [Operational Procedures](#12-operational-procedures)

---

## 1. Executive Overview

### 1.1 Purpose

The feedback_db database is the central data repository for the Government of Grenada Enterprise Architecture (GEA) Portal ecosystem. It manages:

- Citizen feedback collection from multiple channels
- Service quality metrics and analytics
- Automated ticket management system
- Service level agreement (SLA) tracking
- Audit logging and compliance
- Rate limiting and security controls

### 1.2 Scope

**In Scope:**
- Feedback collection and management
- Ticket lifecycle management
- SLA calculation and monitoring
- QR code tracking
- Rate limiting and security
- Analytics and reporting

**Out of Scope:**
- User authentication (handled by Keycloak)
- Payment processing
- Email delivery (handled by SendGrid)
- File storage (handled by Azure Blob Storage)

### 1.3 Key Capabilities

**Automated Operations**
- Auto-generate ticket numbers (YYYYMM-XXXXXX format)
- Auto-calculate SLA targets based on priority & category
- Auto-detect SLA breaches
- Auto-create tickets from feedback

**Security**
- Rate limiting (5 submissions/hour/IP)
- CAPTCHA protection
- Audit trail of all changes
- Row-level security ready

**Analytics**
- Service performance metrics
- SLA compliance tracking
- Entity workload analysis
- Daily ticket statistics

**Scalability**
- 30+ optimized indexes
- Connection pooling ready
- Partition-ready schema
- 99.5% uptime capability

### 1.4 Environment Configuration

| Environment | Database | User | Host | Port |
|-------------|----------|------|------|------|
| Development | feedback | feedback_user | localhost | 5432 |
| Production | feedback | feedback_user | feedback_db | 5432 |
| Backup | feedback_bak | feedback_user | backup_host | 5432 |

---

## 2. Database Architecture

### 2.1 High-Level Architecture Overview

The GEA Portal ecosystem uses a centralized PostgreSQL database (feedback_db) serving:
- Public Portal: Citizens submit feedback and check ticket status
- Admin Dashboard: Government staff manage tickets and monitor SLAs
- Analytics Engine: Real-time performance metrics and reporting

### 2.2 Data Flow Architecture

**Citizen Input Channels:**
1. QR Code scanning (service-specific feedback)
2. Web Portal (direct feedback submission)
3. Walk-in (admin-created tickets manually)

**Automatic Processing Flow:**
1. Feedback received → service_feedback table
2. Check trigger conditions (grievance flag OR rating ≤ 2)
3. If true → Auto-create ticket in tickets table
4. Generate unique ticket_number (YYYYMM-XXXXXX format)
5. Calculate SLA targets (response_target, resolution_target)
6. Log creation to ticket_activities
7. Monitor for SLA breaches

**Status Update Flow:**
1. Admin updates ticket status
2. Log change to ticket_activities
3. Check SLA breach conditions
4. If breached → Create sla_breaches record
5. Update analytics views

**Analytics Output:**
- v_service_performance: Service metrics dashboard
- v_active_tickets_sla: SLA monitoring
- v_entity_ticket_queue: Workload distribution
- v_qr_performance: QR code analytics
- v_daily_ticket_stats: Historical trends

### 2.3 Storage Architecture

**Database Schema Organization:**

```
feedback_db/
├── Master Data Tables (3)
│   ├── entity_master (Ministries, Departments, Agencies)
│   ├── service_master (Services provided)
│   └── priority_levels (Ticket priority definitions)
│
├── Feedback System (4)
│   ├── service_feedback (Citizen feedback)
│   ├── qr_codes (QR code tracking)
│   └── submission_rate_limit (Rate limiting)
│
├── Ticket Management (7)
│   ├── tickets (Main ticket records)
│   ├── ticket_status (Status definitions)
│   ├── ticket_categories (Category definitions)
│   ├── ticket_activities (Change log)
│   ├── ticket_notes (Internal notes)
│   ├── sla_breaches (SLA violations)
│   └── submission_attempts (Audit trail)
│
├── Security & Compliance (1)
│   └── captcha_challenges (CAPTCHA tracking)
│
├── Functions (13 total)
│   ├── Utility: UUID generation, ticket number generation
│   ├── Ticket: Auto-create from feedback, status updates
│   ├── SLA: Calculate targets, detect breaches
│   ├── Audit: Log activities
│   ├── Security: Rate limiting, CAPTCHA validation
│   └── Integration: osTicket sync
│
├── Triggers (8 total)
│   ├── Timestamp: Auto-update created_at, updated_at
│   ├── Ticket Management: Generate numbers, calculate SLA
│   ├── Audit: Log all changes
│   ├── SLA: Detect breaches
│   └── Integration: Create tickets from feedback
│
└── Views (5 total)
    ├── v_service_performance (Service ratings)
    ├── v_active_tickets_sla (Active tickets with SLA status)
    ├── v_entity_ticket_queue (Workload by entity)
    ├── v_qr_performance (QR code analytics)
    └── v_daily_ticket_stats (Daily statistics)
```

**Extensions Used:**
- uuid-ossp: UUID generation
- pgcrypto: Encryption and hashing
- pg_trgm: Full-text search on service names

---

## 3. Physical Schema

### 3.1 Master Data Tables

#### 3.1.1 entity_master

**Purpose:** Store government entities (ministries, departments, agencies)

**Schema:**
```sql
CREATE TABLE entity_master (
    unique_entity_id VARCHAR(50) PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    parent_entity_id VARCHAR(50) REFERENCES entity_master(unique_entity_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- idx_entity_active: For active entity queries
- idx_entity_type: For entity type filtering

**Data Volume:** 20-50 entities

**Sample Data:**
```
MIN-001 | Ministry of Finance
MIN-002 | Ministry of Health
DEPT-001 | Finance Department (parent: MIN-001)
AGY-001 | Statistics Agency (parent: MIN-001)
```

---

#### 3.1.2 service_master

**Purpose:** Store government services provided by entities

**Schema:**
```sql
CREATE TABLE service_master (
    service_id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    service_category VARCHAR(100),
    service_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- idx_service_active: Active service queries
- idx_service_entity: Service lookup by entity
- idx_service_name_trgm: Full-text search

**Data Volume:** 100-500 services

**Sample Data:**
```
SVC-001 | Passport Processing (MIN-002)
SVC-002 | License Renewal (MIN-001)
SVC-003 | Birth Certificate (DEPT-001)
```

---

#### 3.1.3 priority_levels

**Purpose:** Define ticket priority levels and SLA multipliers

**Schema:**
```sql
CREATE TABLE priority_levels (
    priority_id INT PRIMARY KEY,
    priority_name VARCHAR(50) NOT NULL,
    priority_order INT,
    sla_multiplier DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data:**
```
1 | Critical    | 1 | 2.0x (SLA targets halved)
2 | High        | 2 | 1.5x
3 | Medium      | 3 | 1.0x (standard SLA)
4 | Low         | 4 | 1.5x (SLA targets extended)
```

---

### 3.2 Feedback System Tables

#### 3.2.1 service_feedback

**Purpose:** Collect citizen feedback on government services

**Schema:**
```sql
CREATE TABLE service_feedback (
    feedback_id SERIAL PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    service_quality INT,
    staff_behavior INT,
    waiting_time INT,
    cleanliness INT,
    grievance_flag BOOLEAN DEFAULT FALSE,
    feedback_text TEXT,
    channel VARCHAR(50),
    qr_code_id INT REFERENCES qr_codes(qr_code_id),
    submitted_by VARCHAR(100),
    submitted_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- idx_feedback_service: Query by service
- idx_feedback_entity: Query by entity
- idx_feedback_rating: Filter by rating
- idx_feedback_grievance: Find grievances
- idx_feedback_created: Time-based queries

**Data Volume:** 10K-100K+ daily

---

#### 3.2.2 qr_codes

**Purpose:** Track QR code performance and link to services

**Schema:**
```sql
CREATE TABLE qr_codes (
    qr_code_id SERIAL PRIMARY KEY,
    qr_code_value VARCHAR(500) NOT NULL UNIQUE,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    location VARCHAR(255),
    scan_count INT DEFAULT 0,
    feedback_received INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Data Volume:** 100-1000 QR codes

---

#### 3.2.3 submission_rate_limit

**Purpose:** Track and enforce rate limiting per IP address

**Schema:**
```sql
CREATE TABLE submission_rate_limit (
    rate_limit_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    submission_count INT DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    requires_captcha BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Auto-cleanup:** Entries older than 7 days deleted nightly

---

### 3.3 Ticket Management Tables

#### 3.3.1 tickets

**Purpose:** Store ticket records (primary ticket system)

**Schema:**
```sql
CREATE TABLE tickets (
    ticket_id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    feedback_id INT REFERENCES service_feedback(feedback_id),
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    service_id VARCHAR(50) NOT NULL REFERENCES service_master(service_id),
    category_id INT REFERENCES ticket_categories(category_id),
    priority_id INT REFERENCES priority_levels(priority_id),
    status_id INT NOT NULL REFERENCES ticket_status(status_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100),
    response_target TIMESTAMP,
    resolution_target TIMESTAMP,
    responded_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- idx_ticket_number: Quick lookup
- idx_ticket_status: Query by status
- idx_ticket_entity: Entity-based queries
- idx_ticket_priority: Priority filtering
- idx_ticket_assigned_to: Assignment queries
- idx_ticket_created: Time-based queries

**Data Volume:** 1K-10K+ tickets/month

---

#### 3.3.2 ticket_status

**Purpose:** Define valid ticket statuses

**Schema:**
```sql
CREATE TABLE ticket_status (
    status_id INT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    status_order INT,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data:**
```
1 | Open | 1 | red
2 | In Progress | 2 | yellow
3 | Waiting | 3 | orange
4 | Resolved | 4 | green
5 | Closed | 5 | gray
6 | Reopened | 2 | purple
```

---

#### 3.3.3 ticket_categories

**Purpose:** Define ticket categories with SLA defaults

**Schema:**
```sql
CREATE TABLE ticket_categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(50) NOT NULL REFERENCES entity_master(unique_entity_id),
    default_response_hours INT,
    default_resolution_hours INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Sample Data:**
```
1 | Passport Issue | MIN-002 | 4 | 24
2 | License Renewal | MIN-001 | 2 | 48
3 | Birth Certificate | DEPT-001 | 4 | 72
```

---

#### 3.3.4 ticket_activities

**Purpose:** Audit trail of all ticket changes

**Schema:**
```sql
CREATE TABLE ticket_activities (
    activity_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    activity_type VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- idx_activity_ticket: Query changes by ticket
- idx_activity_type: Filter by activity type
- idx_activity_created: Time-based queries

---

#### 3.3.5 ticket_notes

**Purpose:** Internal notes on tickets (not visible to citizens)

**Schema:**
```sql
CREATE TABLE ticket_notes (
    note_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

#### 3.3.6 sla_breaches

**Purpose:** Track SLA violations for reporting and escalation

**Schema:**
```sql
CREATE TABLE sla_breaches (
    breach_id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
    breach_type VARCHAR(50),
    expected_time TIMESTAMP,
    actual_time TIMESTAMP,
    hours_overdue INT,
    escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Breach Types:**
- response_breach: Response SLA missed
- resolution_breach: Resolution SLA missed

---

#### 3.3.7 submission_attempts

**Purpose:** Security audit log for all submissions

**Schema:**
```sql
CREATE TABLE submission_attempts (
    attempt_id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45),
    attempt_type VARCHAR(50),
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.4 Security Table

#### 3.4.1 captcha_challenges

**Purpose:** Track CAPTCHA usage for security validation

**Schema:**
```sql
CREATE TABLE captcha_challenges (
    challenge_id SERIAL PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    challenge_code VARCHAR(100) NOT NULL UNIQUE,
    is_solved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);
```

---

## 4. Entity Relationships

### 4.1 Relationship Diagram

```
entity_master (1) ──┬─── (M) service_master
                    ├─── (M) qr_codes
                    ├─── (M) service_feedback
                    ├─── (M) tickets
                    └─── (M) ticket_categories

service_master (1) ──┬─── (M) qr_codes
                     ├─── (M) service_feedback
                     └─── (M) tickets

priority_levels (1) ─── (M) tickets

ticket_status (1) ─── (M) tickets

ticket_categories (1) ─── (M) tickets

service_feedback (1) ──┬─── (M) qr_codes
                       └─── (1) tickets (optional)

tickets (1) ──┬─── (M) ticket_activities
              ├─── (M) ticket_notes
              └─── (M) sla_breaches
```

### 4.2 Cardinality Summary

| Parent | Child | Relationship |
|--------|-------|--------------|
| entity_master | service_master | 1:Many |
| entity_master | tickets | 1:Many |
| service_master | service_feedback | 1:Many |
| tickets | ticket_activities | 1:Many |
| qr_codes | service_feedback | 1:Many |

---

## 5. Component Details

### 5.1 Feedback System

**Flow:**
1. Citizen submits feedback (web, QR, or walk-in)
2. Rate limiting check: 5 submissions/hour/IP
3. If limit exceeded → CAPTCHA required
4. Store in service_feedback
5. Check auto-ticket conditions:
   - grievance_flag = TRUE, OR
   - rating ≤ 2
6. If condition met → Auto-create ticket

**Key Columns:**
- rating: 1-5 scale (required)
- grievance_flag: Boolean (escalates automatically)
- channel: portal, qr_code, walk_in
- submitted_ip: For rate limiting

---

### 5.2 Ticket Management

**Ticket Number Format:** YYYYMM-XXXXXX (e.g., 202511-000001)

**Status Workflow:**
```
Open → In Progress → (Waiting) → Resolved → Closed
         ↑                            ↑
         └────── Reopened ────────────┘
```

**SLA Calculation:**
- Base response time: 4-24 hours (by category)
- Base resolution time: 24-72 hours (by category)
- Multiplier applied: Based on priority_level
  - Critical: 0.5x (half the time)
  - High: 0.75x
  - Medium: 1.0x
  - Low: 1.5x (extended time)

**Auto-actions:**
- Generate unique ticket_number
- Calculate response_target & resolution_target
- Log creation in ticket_activities
- Monitor for SLA breaches

---

### 5.3 SLA Management

**SLA Breach Detection:**
- Response breach: If responded_at > response_target
- Resolution breach: If resolved_at > resolution_target

**Escalation Triggers:**
- Any response breach: Escalate immediately
- Resolution breach: Escalate after 1 hour overdue

**Notifications:**
- System creates sla_breaches record
- Triggers alert in admin dashboard
- Marks escalated = TRUE

---

### 5.4 Rate Limiting & Security

**Rate Limiting:**
- Limit: 5 submissions per hour per IP
- Window: Rolling 1-hour window
- Enforcement: Check submission_rate_limit table
- Action: Return error after 5th attempt

**CAPTCHA:**
- Triggered: After 2nd attempt in window
- Validation: requires_captcha() function
- Storage: captcha_challenges table
- Expiry: 30 minutes

**Audit:**
- All submissions logged: submission_attempts
- Success/failure recorded
- IP addresses hashed for privacy

---

## 6. Data Dictionary

### 6.1 Core Tables Quick Reference

| Table | Purpose | Records/Day | Retention |
|-------|---------|------------|-----------|
| service_feedback | Citizen feedback | 100-1000 | Permanent |
| tickets | Service tickets | 50-500 | Permanent |
| ticket_activities | Change log | 500-5000 | 1 year |
| submission_attempts | Security audit | 100-1000 | 7 days |
| sla_breaches | SLA violations | 10-100 | Permanent |

### 6.2 Key Field Types

**Standard Fields:**
- Primary Keys: SERIAL or VARCHAR(50)
- Timestamps: TIMESTAMP with CURRENT_TIMESTAMP
- Ratings: INT CHECK (1-5)
- Email: VARCHAR(255)
- IP Address: VARCHAR(45) (supports IPv6)

**Special Fields:**
- ticket_number: VARCHAR(20) UNIQUE
- ip_hash: VARCHAR(64) (MD5 hash for privacy)
- status_id: INT REFERENCES ticket_status
- priority_id: INT REFERENCES priority_levels

---

## 7. Functions & Procedures

### 7.1 Utility Functions

#### generate_ticket_number()
**Returns:** VARCHAR(20)
**Purpose:** Generate unique ticket number (YYYYMM-XXXXXX format)
**Usage:** Called by trigger before insert on tickets

```sql
SELECT generate_ticket_number();
-- Returns: 202511-000001
```

#### check_rate_limit()
**Returns:** BOOLEAN
**Purpose:** Check if IP has exceeded submission limit
**Parameters:** ip_hash (VARCHAR), limit (INT), hours (INT)

```sql
SELECT check_rate_limit(
    md5('192.168.1.1')::varchar,
    5,  -- limit
    1   -- hours
);
-- Returns: TRUE if allowed, FALSE if limit exceeded
```

#### requires_captcha()
**Returns:** BOOLEAN
**Purpose:** Determine if CAPTCHA is required
**Parameters:** ip_hash (VARCHAR), threshold (INT)

```sql
SELECT requires_captcha(
    md5('192.168.1.1')::varchar,
    2  -- attempts threshold
);
```

---

### 7.2 Ticket Functions

#### create_ticket_from_feedback()
**Returns:** INT (ticket_id)
**Purpose:** Auto-create ticket from feedback
**Trigger:** Automatic on feedback insert

**Conditions:**
- grievance_flag = TRUE, OR
- rating ≤ 2

**Actions:**
- Create tickets record
- Generate ticket_number
- Calculate SLA targets
- Log activity

---

### 7.3 SLA Functions

#### calculate_sla_targets()
**Returns:** TABLE
**Purpose:** Calculate response and resolution deadlines
**Parameters:** category_id (INT), priority_id (INT)

**Formula:**
```
response_target = NOW() + 
    (category.default_response_hours / priority.sla_multiplier) hours

resolution_target = NOW() + 
    (category.default_resolution_hours / priority.sla_multiplier) hours
```

#### detect_sla_breaches()
**Returns:** TABLE
**Purpose:** Find all breached tickets
**Usage:** Called by nightly job or admin query

---

## 8. Triggers & Automation

### 8.1 Timestamp Triggers

**trg_set_created_at_timestamp**
- Table: All tables with created_at
- Event: BEFORE INSERT
- Action: Set created_at = NOW()

**trg_set_updated_at_timestamp**
- Table: All tables with updated_at
- Event: BEFORE UPDATE
- Action: Set updated_at = NOW()

---

### 8.2 Ticket Management Triggers

**trg_generate_ticket_number**
- Table: tickets
- Event: BEFORE INSERT
- Condition: ticket_number IS NULL
- Action: Call generate_ticket_number()

**trg_calculate_sla**
- Table: tickets
- Event: BEFORE INSERT
- Action: Calculate response_target & resolution_target

---

### 8.3 Audit Triggers

**trg_log_ticket_activity**
- Table: tickets
- Event: BEFORE UPDATE
- Action: Log changes to ticket_activities
- Logged Fields: status_id, priority_id, assigned_to

---

### 8.4 Integration Triggers

**trg_create_ticket_from_feedback**
- Table: service_feedback
- Event: AFTER INSERT
- Condition: grievance_flag = TRUE OR rating ≤ 2
- Action: Auto-create tickets record

---

## 9. Views & Analytics

### 9.1 v_service_performance

**Purpose:** Service ratings and satisfaction metrics

**Columns:**
- service_id, service_name
- total_submissions, avg_rating
- satisfaction_rate (% rating > 3)
- feedback_count_by_rating

**Use Case:** Service performance dashboard

---

### 9.2 v_active_tickets_sla

**Purpose:** Monitor active tickets with SLA status

**Columns:**
- ticket_number, service_name, priority
- status, assigned_to
- response_status (on_track / breached)
- resolution_status (on_track / breached)
- hours_until_deadline

**Use Case:** Admin SLA monitoring dashboard

---

### 9.3 v_entity_ticket_queue

**Purpose:** Workload distribution across entities

**Columns:**
- entity_name
- total_open_tickets
- high_priority_tickets
- avg_age_hours
- sla_breach_count

**Use Case:** Workload balancing analysis

---

### 9.4 v_qr_performance

**Purpose:** QR code usage and effectiveness

**Columns:**
- qr_code_id, location, service_name
- total_scans
- feedback_received
- feedback_conversion_rate (%)
- avg_rating_from_qr

---

### 9.5 v_daily_ticket_stats

**Purpose:** Daily trend analysis

**Columns:**
- date
- tickets_created, tickets_closed
- avg_resolution_time
- sla_compliance_rate (%)

---

## 10. Security & Performance

### 10.1 Security Measures

**Data Protection:**
- IP addresses hashed (MD5) in submission_rate_limit
- CAPTCHA for abuse prevention
- Rate limiting enforced at database level
- Audit trail in submission_attempts
- Parameterized queries (SQL injection protection)

**Access Control:**
- Row-level security ready (via Keycloak)
- Role-based filtering in views
- Service staff only see their tickets

**Compliance:**
- PII protection: No sensitive citizen data stored
- Audit logging: All changes tracked
- Data retention: Follows government policy
- Backup encryption: On-disk encryption

---

### 10.2 Performance Optimization

**Indexes (30+):**
- Primary Keys: 14 tables
- Foreign Keys: 20+ relationships
- Performance Indexes: 
  - B-tree on frequently queried columns
  - BRIN on large timestamp columns
  - GiST on text search

**Query Optimization:**
- Materialized views for analytics
- Query execution plans reviewed
- Slow query log monitored
- Index fragmentation checked weekly

**Scalability:**
- Connection pooling: 20 connections recommended
- Prepared statements: Reduce parsing overhead
- Batch operations: Reduce round-trips
- Archive strategy: Separate hot/warm/cold data

---

### 10.3 Backup & Recovery

**Backup Strategy:**
- Full backup: Daily at 2 AM UTC
- Incremental: Every 4 hours
- Retention: 30 days (on-disk), 1 year (off-site)
- Encryption: AES-256 at rest

**Recovery Procedures:**
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 4 hours
- Test: Monthly recovery drills
- Documentation: Recovery runbook available

---

## 11. Backup & Recovery

### 11.1 Backup Schedule

**Daily Full Backup**
- Time: 2:00 AM UTC
- Destination: Azure Backup Vault
- Compression: gzip (60% reduction)
- Verification: Automated checksum

**Incremental Backups**
- Frequency: Every 4 hours
- Method: WAL (Write-Ahead Logs)
- Size: ~100MB-500MB per backup
- Retention: 30 days on-disk

**Off-Site Archive**
- Frequency: Weekly
- Destination: Cold storage (S3 Glacier)
- Retention: 1 year
- For: Disaster recovery & compliance

---

### 11.2 Recovery Procedures

**Point-in-Time Recovery:**
1. Stop application
2. Restore from full backup
3. Replay WAL logs to desired timestamp
4. Verify data integrity
5. Run ANALYZE to update statistics
6. Restart application

**Estimated Time:** 30-60 minutes

**Testing:**
- Monthly recovery drills
- Validate restored data
- Document any issues
- Update runbook as needed

---

### 11.3 Disaster Recovery

**Data Center Failure:**
1. Promote read replica (if available)
2. Update DNS to new location
3. Verify data completeness
4. Restore from backup if needed

**Data Corruption:**
1. Identify affected records
2. Restore from point-in-time backup
3. Re-apply subsequent transactions
4. Validate data integrity

---

## 12. Operational Procedures

### 12.1 Daily Operations

**Morning Checks (8:00 AM):**
- Database up and responsive
- Connection pool healthy
- Backup completion verified
- Disk space available (>20% free)
- No critical errors in logs

**During Business Hours:**
- Monitor slow queries
- Check SLA compliance metrics
- Review rate limiting events
- Handle user support requests

**Evening Checks (5:00 PM):**
- Verify daily statistics
- Check for data anomalies
- Plan any needed maintenance
- Archive old submission_attempts records

---

### 12.2 Weekly Maintenance

**Monday 3:00 AM:**
- VACUUM ANALYZE all tables
- Reindex fragmented indexes
- Update table statistics
- Check slow query log

**Every Wednesday:**
- Review database growth
- Analyze rate limiting patterns
- Backup verification test
- Plan upcoming changes

**Friday 4:00 AM:**
- Full system check
- Capacity planning review
- Performance report generation
- Security audit logs review

---

### 12.3 Monthly Maintenance

**First Sunday of Month:**
- Archive old ticket_activities (>90 days)
- Archive old submission_attempts (>30 days)
- Rebuild large table indexes
- Update materialized views

**Capacity Planning:**
- Review growth trends
- Forecast disk space needs
- Check connection pool usage
- Plan scaling if needed

**Performance Analysis:**
- Review slow query patterns
- Identify missing indexes
- Optimize query plans
- Document recommendations

---

### 12.4 Monitoring & Alerting

**Key Metrics to Monitor:**
- Database CPU: Target <70%
- Memory Usage: Target <80%
- Disk Space: Alert <20% free
- Query Latency: p95 < 100ms
- Connection Pool: <75% utilization
- SLA Compliance: Target >95%

**Alert Thresholds:**
- CPU > 80%: Investigate
- Memory > 90%: Page cache issue
- Disk < 10%: Archive immediately
- Query > 1 second: Review
- Connections > 90%: Scale up
- SLA Breaches > 10%: Escalate

---

## 13. Implementation Notes

### 13.1 Creation Order

1. entity_master (no dependencies)
2. service_master, priority_levels (depend on entity_master)
3. service_feedback, qr_codes (depend on entity_master, service_master)
4. tickets (depends on all lookup tables)
5. ticket_status, ticket_categories (lookup tables)
6. ticket_activities, ticket_notes, sla_breaches (depend on tickets)
7. submission_attempts, captcha_challenges (independent)
8. Functions (reference tables)
9. Triggers (reference functions)
10. Views (reference tables and functions)
11. Indexes (final optimization)

---

### 13.2 SQL Generation

- All DDL tested and production-ready
- Idempotent scripts (safe to run multiple times)
- Error handling included
- Drop scripts for rollback
- Verification queries provided

---

## 14. Appendices

### 14.1 Entity Type Codes

| Code | Description | Examples |
|------|-------------|----------|
| MIN | Ministry | Finance, Health, Education |
| DEPT | Department | Finance Dept, Health Dept |
| AGY | Agency | Statistics, Immigration |
| UNIT | Unit | Payments, Licenses |

### 14.2 Service Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| 1 | Open | Newly created |
| 2 | In Progress | Being worked on |
| 3 | Waiting | Awaiting information |
| 4 | Resolved | Issue fixed |
| 5 | Closed | Ticket closed |
| 6 | Reopened | Reactivated |

### 14.3 Channel Types

| Channel | Source | Format |
|---------|--------|--------|
| portal | Web form | Structured |
| qr_code | QR scan | Mobile |
| walk_in | In-person | Manual entry |
| api | External system | JSON |

---

## 15. Document Information

**Version:** 2.0  
**Status:** Production Ready  
**Last Updated:** November 18, 2025  
**Next Review:** November 25, 2025  

**For technical support or questions:**
Contact: Digital Transformation Agency (DTA)
Email: dta@gov.gd
Portal: https://gea.gov.gd

---

**End of Document**