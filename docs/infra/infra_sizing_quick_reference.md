# GEA Portal v3 - Infrastructure Sizing & Recommendations

**Version:** 1.3
**Date:** January 19, 2026
**Status:** Production Operations Document
**Last Reviewed:** January 19, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Growth Phases](#2-growth-phases)
3. [Resource Estimation](#3-resource-estimation)
4. [Infrastructure Recommendations](#4-infrastructure-recommendations)
5. [Cost Comparison](#5-cost-comparison)
6. [Scaling Triggers](#6-scaling-triggers)
7. [Migration Path](#7-migration-path)

---

## 1. Executive Summary

This document provides infrastructure sizing recommendations for the GEA Portal across three deployment phases: Pre-Launch (Testing), Launch, and Production.

### Current Baseline (Idle)

| Container | Memory Usage |
|-----------|--------------|
| frontend (Next.js) | 82 MB |
| feedback_db (PostgreSQL) | 21 MB |
| traefik | 76 MB |
| **Total** | **~180 MB** |

### Deployed Architecture

| Component | Purpose |
|-----------|---------|
| Next.js 16.x Frontend | Web application |
| PostgreSQL 16 | Primary database |
| PgBouncer 1.23.x | Connection pooling |
| Redis 7.4.x | Analytics caching |
| Traefik v3.6 | Reverse proxy + SSL |

> **ℹ️ Version Info:** Docker 29.x is the current supported version (Docker 27.x is EOL). Traefik v3.6+ includes automatic Docker API version negotiation.

---

## 2. Growth Phases

| Phase | Users | Concurrent | Timeline |
|-------|-------|------------|----------|
| **Pre-Launch** | 10 | 5-10 | Testing period |
| **Launch** | 30 | 15-20 | Initial go-live |
| **Production** | 100 | 50-75 | Steady state |

---

## 3. Resource Estimation

### Memory Requirements by Phase

| Component | Pre-Launch (10) | Launch (30) | Production (100) |
|-----------|-----------------|-------------|------------------|
| Next.js | 150 MB | 250 MB | 500 MB |
| PostgreSQL | 100 MB | 200 MB | 800 MB |
| PgBouncer | 10 MB | 15 MB | 30 MB |
| Redis | 50 MB | 100 MB | 256 MB |
| Traefik | 80 MB | 100 MB | 150 MB |
| OS + Buffers | 800 MB | 1.5 GB | 2.5 GB |
| Docker Overhead | 200 MB | 300 MB | 500 MB |
| Build Cache | 500 MB | 800 MB | 1.5 GB |
| **Total Estimated** | **~1.9 GB** | **~3.3 GB** | **~6.2 GB** |
| **Deployed RAM** | **8 GB (D2s_v4)** | **8 GB (D2s_v4)** | **16 GB (D2s_v5)** |
| **Headroom** | **~320%** | **~140%** | **~160%** |

### CPU Requirements by Phase

| Phase | Estimated CPU | Deployed vCPUs | Notes |
|-------|---------------|----------------|-------|
| Pre-Launch | 10-20% | 2 (D2s_v4) | Consistent performance |
| Launch | 20-40% | 2 (D2s_v4) | Handles builds without throttling |
| Production | 40-70% | 2 (D2s_v5) | D-series = no burstable limits |

> **Note:** D-series VMs provide consistent CPU performance unlike B-series burstable VMs. This eliminates CPU throttling during Docker builds and peak traffic.

### Disk Requirements

| Component | Size | Notes |
|-----------|------|-------|
| OS + Packages | 5 GB | Ubuntu 24.04 LTS |
| GEAv3 Codebase | 1 GB | Including node_modules |
| Docker Images | 3 GB | All containers |
| Docker Build Cache | 4 GB | ~10 builds retained |
| PostgreSQL Data | 2 GB | Current + 1 year growth |
| Redis Data | 0.5 GB | Cache storage |
| Backups (7 days) | 1.5 GB | ~200MB/day compressed |
| Headroom (20%) | 3.5 GB | Buffer for growth |
| **Total** | **~21 GB** | |
| **Recommended** | **32-64 GB** | Single SSD |

### Database Connections

| Phase | App Connections | PgBouncer Pool | PostgreSQL Max |
|-------|-----------------|----------------|----------------|
| Pre-Launch | 10-20 | 50 | 100 |
| Launch | 20-40 | 100 | 100 |
| Production | 50-100 | 200 | 100 |

---

## 4. Infrastructure Recommendations

### Current Deployment ✅ DEPLOYED

| Resource | Specification | Azure SKU |
|----------|---------------|-----------|
| **VM Size** | 2 vCPU, 8 GB RAM | **Standard_D2s_v4** |
| **OS Disk** | 64 GB Premium SSD | Premium SSD LRS |
| **Region** | East US | East US |

**Rationale:**
- Upgraded from B-series burstable to D-series for consistent performance
- 8GB RAM provides stable performance for builds and operations
- Premium SSD ensures reliable database IOPS
- Better suited for production workloads than burstable B-series

### Launch (30 Users) ✅ CURRENT CAPACITY

| Resource | Specification | Notes |
|----------|---------------|-------|
| **VM Size** | 2 vCPU, 8 GB RAM | Same as current deployment |
| **Capacity** | 30 concurrent users | Within current spec |

**Status:** Current infrastructure handles this phase comfortably.

### Production (100 Users) - UPGRADE PATH

| Resource | Specification | Azure SKU |
|----------|---------------|-----------|
| **VM Size** | 2 vCPU, 16 GB RAM | **Standard_D2s_v5** or **D4s_v4** |
| **OS Disk** | 64 GB Premium SSD | Premium SSD LRS |

**Rationale:**
- 16GB RAM provides 2x current capacity for growth
- Supports up to 100 concurrent users with headroom
- D-series maintains consistent CPU performance under load
- Handles memory-intensive operations (builds, analytics) without degradation

---

## 5. Cost Comparison

### Monthly Estimates (East US, Pay-as-you-go)

| Phase | VM | Disk | Total/Month |
|-------|-----|------|-------------|
| **Current (D2s_v4)** | D2s_v4 (~$70) | 64GB Premium SSD (~$10) | **~$80** |
| **Launch (30 users)** | D2s_v4 (~$70) | 64GB Premium SSD (~$10) | **~$80** |
| **Production (100 users)** | D2s_v5/D4s_v4 (~$140-160) | 64GB Premium SSD (~$10) | **~$150-170** |

> **⚠️ Pricing Disclaimer:** These estimates are approximations from January 2026 and should be verified. Actual costs may vary. Additional costs not included:
> - Backup storage (~$5-10/month for 7-day retention)
> - Bandwidth/egress charges (varies by usage)
> - DNS/domain registration
> - Monitoring solutions (Azure Monitor, etc.)
> - CDN costs (if applicable)
>
> **Always check the [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) for current rates.**

### Cost Optimization Tips

1. **Reserved Instances:** 1-year commitment saves ~30-40% (~$50-56/month vs ~$80/month)
2. **Auto-shutdown:** Enable for dev/staging VMs during off-hours
3. **Monitoring:** Track metrics to upgrade only when needed (avoid over-provisioning)
4. **Spot Instances:** Consider for non-production environments (up to 90% savings)

---

## 6. Scaling Triggers

### When to Upgrade from D2s_v4 (8GB) → D2s_v5/D4s_v4 (16GB)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Memory Usage | Sustained >75% (>6GB) | Plan upgrade to 16GB |
| CPU Usage | Sustained >80% | Monitor, consider CPU upgrade |
| Response Time | P95 > 2 seconds | Investigate bottlenecks |
| Connection Pool | >80% utilization | Review pool config, consider upgrade |
| Build Performance | Builds taking >5 min | Memory upgrade recommended |
| Concurrent Users | Approaching 80+ users | Prepare for 16GB upgrade |

### Monitoring Commands

```bash
# Memory usage
free -h
docker stats --no-stream

# CPU usage
top -bn1 | head -5

# Database connections
docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT count(*) FROM pg_stat_activity;"

# Disk usage
df -h
```

### Recommended Monitoring Setup

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Memory | `free -h` / cron script | >70% for 5 min |
| CPU | `top` / cron script | >80% for 5 min |
| Disk | `df -h` / cron script | >80% used |
| DB Connections | PostgreSQL query | >80 active |

---

## 7. Migration Path

### Phase Transition: Pre-Launch → Launch ✅ COMPLETED

**Status:** Already deployed on D2s_v4 (8GB) with Premium SSD

**Completed Actions:**
- ✅ Upgraded from B2s to D2s_v4 for consistent performance
- ✅ Upgraded to Premium SSD for database IOPS
- ✅ PgBouncer and Redis deployed
- ✅ Backup system configured

---

### Phase Transition: Launch (30) → Production (100)

**Actions Required:** VM Memory Upgrade (8GB → 16GB)

**Procedure:**

1. **Schedule Maintenance Window** (10-15 minutes downtime)

2. **Pre-Upgrade Checklist**
   ```bash
   # Verify current resource usage
   free -h
   docker stats --no-stream

   # Create backup
   cd ~/GEAv3
   ./scripts/backup.sh

   # Verify backup
   ls -lh backups/

   # Document current configuration
   az vm show -g <resource-group> -n <vm-name> --query "hardwareProfile"
   ```

3. **Azure Portal Upgrade Steps**
   - Stop VM: `az vm deallocate -g <resource-group> -n <vm-name>`
   - Resize VM: `az vm resize -g <resource-group> -n <vm-name> --size Standard_D2s_v5`
     - Alternative: `Standard_D4s_v4` (if D2s_v5 unavailable)
   - Start VM: `az vm start -g <resource-group> -n <vm-name>`

4. **Post-Upgrade Verification**
   ```bash
   # Verify new memory allocation
   free -h | grep Mem

   # Check all services started correctly
   docker compose ps

   # Verify database connections
   docker exec feedback_db psql -U feedback_user -d feedback -c "SELECT version();"

   # Test application endpoints
   curl -I https://gea.abhirup.app
   curl https://gea.abhirup.app/api/health

   # Monitor resource usage under load
   docker stats
   ```

5. **Performance Baseline**
   - Run load test with 100 simulated users
   - Document response times and resource usage
   - Verify memory headroom remains >25%

---

## 8. Architecture Diagrams

### Current Deployed Architecture (Single VM)

```
┌──────────────────────────────────────────────────────────────┐
│            Azure VM - Standard_D2s_v4                        │
│            2 vCPU | 8GB RAM | 64GB Premium SSD               │
│                                                              │
│  ┌─────────┐    ┌─────────────┐    ┌───────────────┐        │
│  │ Traefik │───▶│   Next.js   │───▶│   PgBouncer   │        │
│  │  v3.6   │    │   16.x      │    │   v1.23.1     │        │
│  │  :443   │    │   :3000     │    │   :6432       │        │
│  └────┬────┘    └──────┬──────┘    └───────┬───────┘        │
│       │                │                   │                │
│       │                ▼                   ▼                │
│       │         ┌─────────────┐    ┌───────────────┐        │
│       │         │   Redis     │    │ PostgreSQL 16 │        │
│       │         │   7.4.4     │    │   (Alpine)    │        │
│       │         │   :6379     │    │   :5432       │        │
│       │         │             │    │               │        │
│       │         │ 256MB max   │    │  Persistent   │        │
│       │         │ LRU evict   │    │    volumes    │        │
│       │         └─────────────┘    └───────────────┘        │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐                                                │
│  │ Let's   │    ✅ D-series: Consistent performance         │
│  │ Encrypt │    ✅ PgBouncer: Connection pooling (200 max)  │
│  │  (TLS)  │    ✅ Redis: Analytics caching                 │
│  └─────────┘    ✅ Premium SSD: High IOPS for DB            │
│                 ✅ Automated backups: 7-day retention        │
└──────────────────────────────────────────────────────────────┘
```

> **✅ Status:** Production-grade infrastructure deployed with D-series VMs for consistent performance. All core components operational.

---

## 9. Summary & Recommendations

### Completed Infrastructure (✅ Deployed)

| Component | Status | Specification |
|-----------|--------|---------------|
| Azure VM (D2s_v4) | ✅ Deployed | 2 vCPU, 8GB RAM, East US |
| Premium SSD | ✅ Deployed | 64GB, high IOPS |
| PgBouncer | ✅ Deployed | Connection pooling (200 max) |
| Redis caching | ✅ Deployed | 256MB, LRU eviction |
| PostgreSQL 16 | ✅ Deployed | Alpine, persistent volumes |
| Automated backups | ✅ Configured | 7-day retention |
| Traefik + Let's Encrypt | ✅ Deployed | TLS termination |

### Infrastructure Advantages (B-series → D-series)

| Improvement | Benefit |
|-------------|---------|
| **Consistent CPU** | No burstable throttling during builds |
| **Double RAM** | 4GB → 8GB for stable operations |
| **Premium SSD** | Better database IOPS and reliability |
| **Production-ready** | Suitable for 24/7 workloads |

### Before Production Scale (100 Users)

| Action | Priority | Timeline |
|--------|----------|----------|
| Upgrade to 16GB RAM (D2s_v5/D4s_v4) | High | When users >50 |
| Load test with 100 simulated users | High | Before scale-up |
| Verify backup/restore procedures | High | Quarterly |
| Configure monitoring alerts | Medium | Next phase |
| Document runbooks | Medium | Ongoing |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | November 2025 | Initial document |
| 1.1 | January 2026 | Added Docker version requirement, pricing disclaimers, clarified PgBouncer/Redis as future items |
| 1.2 | January 19, 2026 | **Updated to reflect current deployment:** PostgreSQL 15→16, added version numbers for all components, updated architecture diagram to show deployed state (PgBouncer + Redis active), updated status tables to reflect completed infrastructure, revised pricing disclaimer |
| 1.3 | January 19, 2026 | **Major infrastructure update:** Documented upgrade from B2s (4GB) to **D2s_v4 (8GB)** for consistent performance. Updated production specs to **16GB** (D2s_v5/D4s_v4). Revised cost estimates (~$80/month current, ~$150-170/month for 16GB). Updated all recommendations, scaling triggers, and migration procedures to reflect D-series deployment. Added infrastructure advantages comparison. |

---

**Prepared for:** Government of Grenada - Digital Transformation Agency  
**Project:** GEA Portal v3