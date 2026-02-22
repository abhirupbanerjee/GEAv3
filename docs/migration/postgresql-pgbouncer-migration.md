# PostgreSQL & PgBouncer Migration Guide

**GEA Portal v3 - Database Infrastructure Assessment**

**Document Version:** 1.0
**Created:** February 22, 2026
**Status:** Assessment Complete - Well Positioned
**Current PostgreSQL:** 16-alpine (16.12)
**Current PgBouncer:** v1.23.1-p3

---

## Executive Summary

This document provides a comprehensive assessment of the GEA Portal's PostgreSQL and PgBouncer infrastructure, including version timelines, upgrade paths, and migration strategies.

### Key Findings

| Component | Current Version | Latest Stable | EOL Date | Status |
|-----------|-----------------|---------------|----------|--------|
| **PostgreSQL** | 16-alpine | 18.2 | Nov 2028 | Excellent - 2.5+ years support |
| **PgBouncer** | 1.23.1-p3 | 1.25.1 | N/A | Good - Security update available |

### Recommendation Summary

| Component | Urgency | Action |
|-----------|---------|--------|
| PostgreSQL 16 → 17/18 | Low | Optional upgrade Q4 2026 |
| PgBouncer 1.23.1 → 1.25.1 | Medium | Update for CVE-2025-12819 fix |

---

## Table of Contents

1. [PostgreSQL Version Timeline](#1-postgresql-version-timeline)
2. [Current PostgreSQL Implementation](#2-current-postgresql-implementation)
3. [PostgreSQL Upgrade Assessment](#3-postgresql-upgrade-assessment)
4. [PgBouncer Version Timeline](#4-pgbouncer-version-timeline)
5. [Current PgBouncer Implementation](#5-current-pgbouncer-implementation)
6. [PgBouncer Upgrade Assessment](#6-pgbouncer-upgrade-assessment)
7. [Migration Strategies](#7-migration-strategies)
8. [Step-by-Step Upgrade Guide](#8-step-by-step-upgrade-guide)
9. [Risk Analysis](#9-risk-analysis)
10. [Decision Matrix](#10-decision-matrix)

---

## 1. PostgreSQL Version Timeline

### Official Support Policy

The PostgreSQL Global Development Group supports each major version for **5 years** after its initial release. After the five-year anniversary, one final minor release is issued before end-of-life.

### Version EOL Schedule

| Version | Released | EOL Date | Latest Patch | Status | Notes |
|---------|----------|----------|--------------|--------|-------|
| **18** | Sep 2025 | Nov 2030 | 18.2 | Active | Newest - Direct TLS, MERGE improvements |
| **17** | Sep 2024 | Nov 2029 | 17.8 | Active | JSON_TABLE, incremental backup |
| **16** | Sep 2023 | **Nov 2028** | **16.12** | **Active (Current)** | Logical replication, pg_stat_io |
| 15 | Oct 2022 | Nov 2027 | 15.16 | Active | MERGE command, jsonlog |
| 14 | Sep 2021 | Nov 2026 | 14.21 | Active | Minimal upgrade path |
| 13 | Sep 2020 | Nov 2025 | 13.23 | **EOL** | No longer supported |
| 12 | Oct 2019 | Nov 2024 | 12.22 | EOL | No longer supported |

### Visual Timeline

```
2023      2024      2025      2026      2027      2028      2029      2030
  |         |         |         |         |         |         |         |
  v16───────────────────────────────────────────────────────EOL
  Released                                              Nov 2028
  Sep 2023                                                  │
                                                            │
            v17───────────────────────────────────────────────────────EOL
            Released                                                Nov 2029
            Sep 2024
                      v18───────────────────────────────────────────────────EOL
                      Released                                          Nov 2030
                      Sep 2025
                                │
                             TODAY
                           Feb 2026
                                │
  ┌─────────────────────────────┴─────────────────────────────────────────────┐
  │  GEA Portal on PostgreSQL 16                                              │
  │  • Current: v16.12                                                        │
  │  • Remaining Support: ~2.7 years (until Nov 2028)                         │
  │  • Recommendation: No urgent upgrade needed                               │
  └───────────────────────────────────────────────────────────────────────────┘
```

### Sources
- [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/)
- [endoflife.date/postgresql](https://endoflife.date/postgresql)

---

## 2. Current PostgreSQL Implementation

### 2.1 Docker Configuration

**File:** `docker-compose.yml`

```yaml
feedback_db:
  image: postgres:16-alpine
  container_name: feedback_db
  restart: unless-stopped
  networks:
    - geav3_network
  environment:
    POSTGRES_DB: ${FEEDBACK_DB_NAME}
    POSTGRES_USER: ${FEEDBACK_DB_USER}
    POSTGRES_PASSWORD: ${FEEDBACK_DB_PASSWORD}
  volumes:
    - feedback_db_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${FEEDBACK_DB_USER} -d ${FEEDBACK_DB_NAME}"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 30s
```

### 2.2 Database Specifications

| Attribute | Value |
|-----------|-------|
| Image | `postgres:16-alpine` |
| Container | `feedback_db` |
| Database Name | `feedback` |
| User | `feedback_user` |
| Port | 5432 (internal only) |
| Storage | Docker volume `feedback_db_data` |
| Network | `geav3_network` (bridge) |

### 2.3 Extensions Used

**File:** `database/scripts/01-init-db.sh`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation (gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Trigram matching for full-text search
```

### 2.4 Database Schema Overview

| Category | Tables | Purpose |
|----------|--------|---------|
| Master Data | `entity_master`, `service_master`, `service_attachments` | Core reference data |
| Lookups | `priority_levels`, `grievance_status`, `ticket_status`, `ticket_categories` | Enumerations |
| Tickets | `tickets`, `ticket_activity`, `ticket_attachments` | Support ticket system |
| Grievances | `grievance_tickets`, `grievance_attachments` | Formal grievance handling |
| EA Services | `ea_service_requests`, `ea_service_request_attachments`, `ea_service_request_comments` | EA service requests |
| Feedback | `service_feedback`, `qr_codes` | Citizen feedback |
| Authentication | `users`, `user_roles`, `accounts`, `sessions` | NextAuth tables |
| Citizens | `citizens`, `citizen_sessions`, `citizen_trusted_devices` | Citizen portal auth |
| System | `system_settings`, `backup_audit_log`, `backup_settings` | Configuration |
| Security | `submission_rate_limit`, `submission_attempts` | Rate limiting |

**Total Tables:** ~35+ tables with comprehensive indexing

### 2.5 Connection Configuration

**File:** `frontend/src/lib/db.ts`

```typescript
const pool = new Pool({
  host: process.env.FEEDBACK_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEEDBACK_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEEDBACK_DB_NAME || process.env.DB_NAME || 'feedback',
  user: process.env.FEEDBACK_DB_USER || process.env.DB_USER || 'feedback_user',
  password: process.env.FEEDBACK_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // 30 seconds idle timeout
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
});
```

### 2.6 Backup Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Backup Tool | `pg_dumpall` | Full cluster dump with roles |
| Restore Tool | `psql` | Standard restore |
| Connection | Direct to `feedback_db` | Bypasses PgBouncer |
| Storage | `/tmp/gea_backups/` | Mounted Docker volume |
| Retention | Configurable (default 30 days) | Minimum 10 backups kept |

---

## 3. PostgreSQL Upgrade Assessment

### 3.1 Version Comparison

#### PostgreSQL 16 → 17 Changes

| Feature | Impact | GEA Portal Relevance |
|---------|--------|---------------------|
| `JSON_TABLE` function | Medium | Future JSON processing |
| Incremental backup | Medium | Faster backups |
| `MERGE` improvements | Low | Not currently used |
| Logical replication slots | Low | Not using replication |
| Performance improvements | Medium | General benefit |
| `EXPLAIN` enhancements | Low | Development only |

#### PostgreSQL 16 → 18 Changes

| Feature | Impact | GEA Portal Relevance |
|---------|--------|---------------------|
| Direct TLS connections | Medium | Faster TLS handshake |
| `MERGE ... RETURNING` | Low | Not currently used |
| Virtual generated columns | Low | Not currently used |
| Async I/O improvements | Medium | Performance benefit |
| `pg_stat_checkpointer` | Low | Monitoring only |

### 3.2 Breaking Changes Analysis

| Version | Breaking Change | GEA Portal Impact |
|---------|-----------------|-------------------|
| 16 → 17 | None significant | No code changes needed |
| 17 → 18 | None significant | No code changes needed |

**Assessment:** PostgreSQL maintains excellent backward compatibility. Upgrades between recent major versions rarely require application code changes.

### 3.3 Extension Compatibility

| Extension | v16 | v17 | v18 | Notes |
|-----------|-----|-----|-----|-------|
| `uuid-ossp` | Yes | Yes | Yes | Core extension, always available |
| `pgcrypto` | Yes | Yes | Yes | Core extension, always available |
| `pg_trgm` | Yes | Yes | Yes | Core extension, always available |

### 3.4 Upgrade Complexity Assessment

| Metric | Score | Reason |
|--------|-------|--------|
| Schema Compatibility | 10/10 | No deprecated features used |
| Extension Compatibility | 10/10 | All core extensions |
| Data Migration | 9/10 | Standard pg_dump/pg_restore |
| Downtime Required | 7/10 | ~15-30 min for dump/restore |
| Rollback Complexity | 8/10 | Easy with backup |
| **Overall** | **9/10** | Low complexity |

---

## 4. PgBouncer Version Timeline

### Version History

| Version | Release Date | Key Features | Security |
|---------|--------------|--------------|----------|
| **1.25.1** | Dec 2025 | Bug fixes | **CVE-2025-12819 fix** |
| 1.25.0 | Nov 2025 | LDAP support, direct TLS, `transaction_timeout` | - |
| 1.24.1 | 2025 | PAM fix | CVE-2025-2291 fix |
| 1.24.0 | 2024 | PAM in HBA | - |
| **1.23.1** | Aug 2024 | **Stability fixes (Current)** | - |
| 1.23.0 | Jul 2024 | Safe SIGTERM shutdown, so_reuseport | - |
| 1.22.1 | Mar 2024 | COPY FROM STDIN fixes | - |
| 1.22.0 | Jan 2024 | Named prepared statements, DEALLOCATE ALL | - |

### Current vs Latest

| Aspect | Current (1.23.1-p3) | Latest (1.25.1) | Gap |
|--------|---------------------|-----------------|-----|
| Release Date | Aug 2024 | Dec 2025 | ~16 months |
| Security Patches | Up to date at release | CVE-2025-12819 fixed | **Update recommended** |
| Features | Stable | LDAP, direct TLS, transaction_timeout | Nice to have |

### Sources
- [PgBouncer Changelog](https://www.pgbouncer.org/changelog.html)
- [GitHub Releases](https://github.com/pgbouncer/pgbouncer/releases)

---

## 5. Current PgBouncer Implementation

### 5.1 Docker Configuration

**File:** `docker-compose.yml`

```yaml
pgbouncer:
  image: edoburu/pgbouncer:v1.23.1-p3
  container_name: pgbouncer
  restart: unless-stopped
  networks:
    - geav3_network
  environment:
    - DATABASE_URL=postgres://${FEEDBACK_DB_USER}:${FEEDBACK_DB_PASSWORD}@feedback_db:5432/${FEEDBACK_DB_NAME}
    - POOL_MODE=transaction
    - MAX_CLIENT_CONN=200
    - DEFAULT_POOL_SIZE=20
    - MIN_POOL_SIZE=5
    - RESERVE_POOL_SIZE=5
    - AUTH_TYPE=scram-sha-256
  depends_on:
    feedback_db:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "pg_isready", "-h", "localhost", "-p", "5432"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### 5.2 Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `POOL_MODE` | `transaction` | Connection released after each transaction |
| `MAX_CLIENT_CONN` | 200 | Maximum client connections |
| `DEFAULT_POOL_SIZE` | 20 | Connections per database/user pair |
| `MIN_POOL_SIZE` | 5 | Minimum maintained connections |
| `RESERVE_POOL_SIZE` | 5 | Extra connections for bursts |
| `AUTH_TYPE` | `scram-sha-256` | Modern secure authentication |

### 5.3 Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONNECTION ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                        │
│  │  Frontend   │                                                        │
│  │  (Next.js)  │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         │ Normal Operations                                             │
│         │ (FEEDBACK_DB_HOST=pgbouncer)                                  │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                      PgBouncer                               │       │
│  │                   (v1.23.1-p3)                               │       │
│  │  ┌────────────────────────────────────────────────────────┐ │       │
│  │  │  Pool Mode: Transaction                                 │ │       │
│  │  │  Max Clients: 200  →  Pool Size: 20  →  PostgreSQL     │ │       │
│  │  │  (200 app connections share 20 DB connections)         │ │       │
│  │  └────────────────────────────────────────────────────────┘ │       │
│  └──────────────────────────┬──────────────────────────────────┘       │
│                             │                                           │
│                             │ 20 pooled connections                     │
│                             ▼                                           │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                     PostgreSQL 16                            │       │
│  │                    (feedback_db)                             │       │
│  │  • Database: feedback                                        │       │
│  │  • User: feedback_user                                       │       │
│  │  • Extensions: uuid-ossp, pgcrypto, pg_trgm                 │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                             ▲                                           │
│                             │                                           │
│         ┌───────────────────┴───────────────────────────┐              │
│         │ Direct Connection (bypasses PgBouncer)         │              │
│         │ (BACKUP_DB_HOST=feedback_db)                   │              │
│         │ Used for: pg_dumpall backups                   │              │
│         └───────────────────────────────────────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Why Transaction Pool Mode?

| Mode | Description | GEA Portal Suitability |
|------|-------------|------------------------|
| **Transaction** (current) | Connection returned after each transaction | Excellent - stateless API |
| Session | Connection held for entire session | Not needed - would waste connections |
| Statement | Connection returned after each statement | Not compatible with transactions |

**Transaction mode is optimal** because:
- Next.js API routes are stateless
- Each API call is typically one transaction
- Maximizes connection efficiency (200 clients → 20 connections)

---

## 6. PgBouncer Upgrade Assessment

### 6.1 Version Comparison (1.23.1 → 1.25.1)

| Feature | 1.23.1 (Current) | 1.25.1 (Latest) | Benefit |
|---------|------------------|-----------------|---------|
| CVE-2025-12819 | Vulnerable | **Fixed** | **Security** |
| CVE-2025-2291 | Vulnerable | Fixed | Security |
| Direct TLS | No | Yes | Performance |
| LDAP Auth | No | Yes | Not needed |
| `transaction_timeout` | No | Yes | Nice to have |
| `query_wait_notify` | No | Yes | Nice to have |

### 6.2 Security Considerations

#### CVE-2025-12819 (Critical)

**Description:** Before PgBouncer 1.25.1, an unauthenticated attacker could execute arbitrary SQL during authentication by providing a malicious `search_path` parameter in the StartupMessage.

**Impact:** Critical - potential SQL injection during auth
**Recommendation:** **Update to 1.25.1**

#### CVE-2025-2291 (Medium)

**Description:** Could allow bypassing PostgreSQL password expiry set via `VALID UNTIL`.

**Impact:** Medium - only if using password expiry
**Status:** Fixed in 1.24.1+

### 6.3 Upgrade Complexity

| Metric | Score | Reason |
|--------|-------|--------|
| Configuration Compatibility | 10/10 | Same env vars work |
| Downtime Required | 9/10 | ~1 minute for container restart |
| Rollback Complexity | 10/10 | Just change image tag |
| Testing Required | 8/10 | Basic connection test |
| **Overall** | **9/10** | Very low complexity |

### 6.4 Upgrade Decision

| Factor | Assessment |
|--------|------------|
| Security CVEs | **Update recommended** |
| New Features Needed | No |
| Current Stability | Good |
| Effort Required | Minimal (~15 min) |
| **Recommendation** | **Update to 1.25.1** |

---

## 7. Migration Strategies

### 7.1 PostgreSQL Upgrade Strategies

#### Strategy A: Docker Image Update (Recommended for Minor Versions)

**When to use:** 16.x → 16.y (patch updates)

```bash
# 1. Backup current data
docker exec feedback_db pg_dumpall -U feedback_user > backup_$(date +%Y%m%d).sql

# 2. Update docker-compose.yml
# Change: postgres:16-alpine → postgres:16.12-alpine (specific version)

# 3. Recreate container (data persists in volume)
docker compose up -d feedback_db
```

**Downtime:** ~1-2 minutes

#### Strategy B: pg_dump/pg_restore (Required for Major Versions)

**When to use:** 16 → 17 or 17 → 18

```bash
# 1. Create full backup
docker exec feedback_db pg_dumpall -U feedback_user > pre_upgrade_backup.sql

# 2. Stop services
docker compose stop frontend pgbouncer

# 3. Backup and remove old data volume
docker volume create feedback_db_backup
docker run --rm -v feedback_db_data:/source -v feedback_db_backup:/backup alpine cp -a /source/. /backup/
docker compose down
docker volume rm feedback_db_data

# 4. Update docker-compose.yml to new version
# Change: postgres:16-alpine → postgres:17-alpine

# 5. Start new PostgreSQL
docker compose up -d feedback_db
# Wait for healthy

# 6. Restore data
docker exec -i feedback_db psql -U feedback_user -d postgres < pre_upgrade_backup.sql

# 7. Reinitialize extensions and verify
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT version();"

# 8. Start other services
docker compose up -d
```

**Downtime:** ~15-30 minutes (depends on database size)

#### Strategy C: Blue-Green Deployment (Zero-Downtime)

**When to use:** Production with zero-downtime requirement

```
┌─────────────────────────────────────────────────────────────────────┐
│  BLUE-GREEN POSTGRESQL UPGRADE                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: Setup Green                                               │
│  ┌──────────────┐            ┌──────────────┐                      │
│  │ PostgreSQL   │            │ PostgreSQL   │                      │
│  │    v16       │   copy     │    v17       │                      │
│  │   (Blue)     │ ────────>  │   (Green)    │                      │
│  │   ACTIVE     │            │   STANDBY    │                      │
│  └──────────────┘            └──────────────┘                      │
│         ▲                                                           │
│         │                                                           │
│  ┌──────┴──────┐                                                   │
│  │  PgBouncer  │                                                   │
│  └─────────────┘                                                   │
│                                                                     │
│  Phase 2: Switch Traffic                                            │
│  ┌──────────────┐            ┌──────────────┐                      │
│  │ PostgreSQL   │            │ PostgreSQL   │                      │
│  │    v16       │            │    v17       │                      │
│  │   (Blue)     │            │   (Green)    │                      │
│  │   STANDBY    │            │   ACTIVE     │                      │
│  └──────────────┘            └──────────────┘                      │
│                                     ▲                               │
│                                     │                               │
│                              ┌──────┴──────┐                       │
│                              │  PgBouncer  │                       │
│                              └─────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Complexity:** High - requires additional infrastructure
**Downtime:** Near-zero (seconds for switchover)

### 7.2 PgBouncer Upgrade Strategy

**Simple Container Update (Recommended)**

```bash
# 1. Update docker-compose.yml
# Change: edoburu/pgbouncer:v1.23.1-p3 → edoburu/pgbouncer:v1.25.1

# 2. Recreate container
docker compose up -d pgbouncer

# 3. Verify health
docker compose ps pgbouncer
docker logs pgbouncer
```

**Downtime:** ~10-30 seconds (existing connections gracefully drained)

---

## 8. Step-by-Step Upgrade Guide

### 8.1 PgBouncer Upgrade (Recommended Now)

#### Pre-Upgrade Checklist

- [ ] Verify current version: `docker exec pgbouncer pgbouncer --version`
- [ ] Check current connections: `docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT count(*) FROM pg_stat_activity;"`
- [ ] Schedule during low-traffic period
- [ ] Notify team

#### Upgrade Steps

```bash
# Step 1: Create backup of docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Step 2: Update PgBouncer image version
# Edit docker-compose.yml line 72:
# FROM: image: edoburu/pgbouncer:v1.23.1-p3
# TO:   image: edoburu/pgbouncer:v1.25.1

# Step 3: Pull new image
docker compose pull pgbouncer

# Step 4: Recreate container (graceful)
docker compose up -d pgbouncer

# Step 5: Verify health
docker compose ps
docker logs pgbouncer --tail 20

# Step 6: Test connection
docker exec -it frontend sh -c "psql -h pgbouncer -U feedback_user -d feedback -c 'SELECT 1;'"
```

#### Rollback (if needed)

```bash
# Restore original docker-compose.yml
cp docker-compose.yml.backup docker-compose.yml

# Recreate with old version
docker compose up -d pgbouncer
```

### 8.2 PostgreSQL Major Version Upgrade (Future Reference)

#### Pre-Upgrade Checklist

- [ ] Verify current version: `docker exec feedback_db psql -U feedback_user -c "SELECT version();"`
- [ ] Check database size: `docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT pg_size_pretty(pg_database_size('feedback'));"`
- [ ] Create full backup
- [ ] Schedule maintenance window (30-60 min)
- [ ] Notify all stakeholders

#### Upgrade Steps (v16 → v17)

```bash
# ============================================
# POSTGRESQL 16 → 17 UPGRADE PROCEDURE
# ============================================

# Step 1: Stop application services
docker compose stop frontend

# Step 2: Create pre-upgrade backup
docker exec feedback_db pg_dumpall -U feedback_user > /tmp/gea_backups/pre_v17_upgrade_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size
ls -lh /tmp/gea_backups/

# Step 3: Stop PgBouncer and PostgreSQL
docker compose stop pgbouncer feedback_db

# Step 4: Backup the data volume (safety net)
docker run --rm \
  -v feedback_db_data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/feedback_db_data_v16_backup.tar.gz -C /source .

# Step 5: Remove old container and volume
docker compose rm -f feedback_db
docker volume rm gogeaportalv3_feedback_db_data

# Step 6: Update docker-compose.yml
# Change line 38:
# FROM: image: postgres:16-alpine
# TO:   image: postgres:17-alpine

# Step 7: Start new PostgreSQL
docker compose up -d feedback_db

# Wait for initialization
sleep 10

# Step 8: Verify new version
docker exec feedback_db psql -U feedback_user -c "SELECT version();"

# Step 9: Restore data
docker exec -i feedback_db psql -U postgres < /tmp/gea_backups/pre_v17_upgrade_*.sql

# Step 10: Verify extensions
docker exec feedback_db psql -U feedback_user -d feedback -c "\dx"

# Step 11: Verify table count
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Step 12: Start remaining services
docker compose up -d

# Step 13: Verify application
curl -I https://gea.abhirup.app/api/health

# Step 14: Run application health checks
docker logs frontend --tail 50
```

#### Rollback (if needed)

```bash
# Stop services
docker compose down

# Remove new volume
docker volume rm gogeaportalv3_feedback_db_data

# Restore docker-compose.yml
cp docker-compose.yml.backup docker-compose.yml

# Restore old data volume
docker volume create gogeaportalv3_feedback_db_data
docker run --rm \
  -v gogeaportalv3_feedback_db_data:/target \
  -v $(pwd):/backup:ro \
  alpine tar xzf /backup/feedback_db_data_v16_backup.tar.gz -C /target

# Start services
docker compose up -d
```

---

## 9. Risk Analysis

### 9.1 PostgreSQL Upgrade Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss | Very Low | Critical | Full backup before upgrade |
| Extended downtime | Low | High | Test procedure in staging |
| Application incompatibility | Very Low | Medium | No deprecated features used |
| Extension incompatibility | Very Low | High | Core extensions always available |
| Performance regression | Low | Medium | Monitor after upgrade |

### 9.2 PgBouncer Upgrade Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Connection drops | Low | Low | Graceful container restart |
| Config incompatibility | Very Low | Medium | Same env vars supported |
| Performance regression | Very Low | Low | Minor version update |

### 9.3 Current Risk: Not Upgrading PgBouncer

| Risk | Severity | Description |
|------|----------|-------------|
| CVE-2025-12819 | **Critical** | SQL injection during authentication |
| CVE-2025-2291 | Medium | Password expiry bypass |

**Recommendation:** Update PgBouncer to 1.25.1 to address security vulnerabilities.

---

## 10. Decision Matrix

### 10.1 PostgreSQL Upgrade Decision

| Factor | Weight | Stay v16 | Upgrade v17 | Upgrade v18 |
|--------|--------|----------|-------------|-------------|
| Stability | High | Proven | Good | New |
| EOL Timeline | High | Nov 2028 (2.7 yrs) | Nov 2029 (3.7 yrs) | Nov 2030 (4.7 yrs) |
| Features Needed | Low | All met | Nice to have | Nice to have |
| Effort Required | Medium | None | 30-60 min | 30-60 min |
| Risk | High | None | Low | Low-Medium |

**Recommendation: Stay on PostgreSQL 16 until Q4 2026 or Q1 2027**

Reasons:
1. PostgreSQL 16 supported until November 2028 (2.7 years)
2. No critical features needed from v17/v18
3. Current setup is stable and performant
4. Upgrade when v18 is more mature (mid-2026)

### 10.2 PgBouncer Upgrade Decision

| Factor | Weight | Stay v1.23.1 | Upgrade v1.25.1 |
|--------|--------|--------------|-----------------|
| Security | **Critical** | CVE vulnerable | **CVE fixed** |
| Stability | High | Proven | Recent, may have bugs |
| Features | Low | Sufficient | LDAP, direct TLS |
| Effort | Low | None | ~15 minutes |

**Recommendation: Upgrade PgBouncer to 1.25.1**

Reasons:
1. CVE-2025-12819 is a critical security vulnerability
2. Upgrade is low-risk (configuration unchanged)
3. Minimal downtime (~30 seconds)
4. Future-proofs the setup

### 10.3 Action Plan Summary

| Action | Priority | Timeline | Effort |
|--------|----------|----------|--------|
| Upgrade PgBouncer to 1.25.1 | **High** | This month | 15 min |
| Upgrade PostgreSQL to 17 | Low | Q4 2026 | 1 hour |
| Upgrade PostgreSQL to 18 | Low | Q2 2027 | 1 hour |

---

## Appendix A: Quick Reference

### Docker Commands

```bash
# Check PostgreSQL version
docker exec feedback_db psql -U feedback_user -c "SELECT version();"

# Check PgBouncer version
docker exec pgbouncer pgbouncer --version 2>&1 | head -1

# Check database size
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT pg_size_pretty(pg_database_size('feedback'));"

# Check active connections
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT count(*) FROM pg_stat_activity;"

# Check installed extensions
docker exec feedback_db psql -U feedback_user -d feedback -c "\dx"

# Create manual backup
docker exec feedback_db pg_dumpall -U feedback_user > backup_$(date +%Y%m%d_%H%M%S).sql

# Health check
docker compose ps
```

### Environment Variables

```bash
# PostgreSQL
FEEDBACK_DB_HOST=feedback_db    # Direct (for backups)
FEEDBACK_DB_HOST=pgbouncer      # Pooled (for app)
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user
FEEDBACK_DB_PASSWORD=<secret>

# PgBouncer
POOL_MODE=transaction
MAX_CLIENT_CONN=200
DEFAULT_POOL_SIZE=20
MIN_POOL_SIZE=5
RESERVE_POOL_SIZE=5
AUTH_TYPE=scram-sha-256
```

### Critical Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Infrastructure configuration |
| `frontend/src/lib/db.ts` | Application connection pool |
| `frontend/src/lib/backup.ts` | Backup/restore implementation |
| `database/scripts/01-init-db.sh` | Schema initialization |
| `database/config.sh` | Database configuration |

---

## Appendix B: Related Documentation

- [Database Setup Guide](../../database/docs/DATABASE_SETUP_GUIDE.md)
- [Backup Safety Features](../../database/docs/BACKUP_SAFETY_FEATURES.md)
- [Restore Backup Guide](../../database/docs/RESTORE_BACKUP_GUIDE.md)
- [Quick Deployment Guide](../../database/docs/QUICK_DEPLOYMENT_GUIDE.md)

## External Resources

- [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL Release Notes](https://www.postgresql.org/docs/release/)
- [PgBouncer Changelog](https://www.pgbouncer.org/changelog.html)
- [endoflife.date/postgresql](https://endoflife.date/postgresql)

---

**Document Maintainer:** GEA Portal Development Team
**Last Review Date:** February 22, 2026
**Next Review Date:** August 2026

**Change Log:**
- v1.0 (Feb 22, 2026): Initial assessment document
