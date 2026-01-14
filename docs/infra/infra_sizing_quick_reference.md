# GEA Portal v3 - Infrastructure Sizing & Recommendations

**Version:** 1.1
**Date:** January 2026
**Status:** Planning Document
**Last Reviewed:** January 2026

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

### Target Architecture

| Component | Purpose |
|-----------|---------|
| Next.js Frontend | Web application |
| PostgreSQL 15 | Primary database |
| PgBouncer | Connection pooling (future) |
| Redis | API caching + sessions (future) |
| Traefik v3.0 | Reverse proxy + SSL |

> **⚠️ Docker Requirement:** Docker 27.5.1 is required. Docker 28.x/29.x are incompatible with Traefik v3.x. See [Docker & Traefik Compatibility Guide](../DOCKER_TRAEFIK_COMPATIBILITY.md).

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
| Next.js | 150 MB | 250 MB | 400 MB |
| PostgreSQL | 100 MB | 200 MB | 500 MB |
| PgBouncer | 10 MB | 15 MB | 25 MB |
| Redis | 50 MB | 100 MB | 200 MB |
| Traefik | 80 MB | 100 MB | 150 MB |
| OS + Buffers | 800 MB | 1 GB | 1.5 GB |
| **Total** | **~1.2 GB** | **~1.7 GB** | **~2.8 GB** |
| **Recommended Minimum RAM** | **4 GB** | **4 GB** | **8 GB** |

### CPU Requirements by Phase

| Phase | Estimated CPU | Recommended vCPUs |
|-------|---------------|-------------------|
| Pre-Launch | 10-20% | 2 |
| Launch | 20-40% | 2 |
| Production | 40-60% | 2 (monitor for upgrade) |

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

### Pre-Launch (Testing) ✅ CURRENT TARGET

| Resource | Specification | Azure SKU |
|----------|---------------|-----------|
| **VM Size** | 2 vCPU, 4 GB RAM | **Standard_B2s** |
| **OS Disk** | 64 GB Standard SSD | Standard SSD LRS |
| **Region** | East US | East US |

**Rationale:** Cost-effective for testing. 4GB RAM provides 3x headroom over estimated 1.2GB usage.

### Launch (30 Users)

| Resource | Specification | Azure SKU |
|----------|---------------|-----------|
| **VM Size** | 2 vCPU, 4 GB RAM | **Standard_B2s** |
| **OS Disk** | 64 GB Standard SSD | Standard SSD LRS |

**Rationale:** Same infrastructure. 4GB RAM sufficient for ~1.7GB estimated usage. Monitor closely.

### Production (100 Users)

| Resource | Specification | Azure SKU |
|----------|---------------|-----------|
| **VM Size** | 2 vCPU, 8 GB RAM | **Standard_B2ms** |
| **OS Disk** | 64 GB Premium SSD | Premium SSD LRS |

**Rationale:** 
- 8GB RAM provides comfortable headroom for 2.8GB estimated usage
- Premium SSD improves database IOPS for better response times
- Handles traffic spikes without memory pressure

---

## 5. Cost Comparison

### Monthly Estimates (East US, Pay-as-you-go)

| Phase | VM | Disk | Total/Month |
|-------|-----|------|-------------|
| **Pre-Launch** | B2s (~$30) | 64GB Std SSD (~$5) | **~$35** |
| **Launch** | B2s (~$30) | 64GB Std SSD (~$5) | **~$35** |
| **Production** | B2ms (~$60) | 64GB Premium (~$10) | **~$70** |

> **⚠️ Pricing Disclaimer:** These estimates are from November 2025 and may be outdated. Additional costs not included:
> - Backup storage (~$5-10/month for 7-day retention)
> - Bandwidth/egress charges (varies by usage)
> - DNS/domain registration
> - Monitoring solutions (Azure Monitor, etc.)
> - CDN costs (if applicable)
>
> **Always check the [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) for current rates.**

### Cost Optimization Tips

1. **Reserved Instances:** 1-year commitment saves ~30-40%
2. **Auto-shutdown:** Enable for non-production VMs during off-hours
3. **Right-sizing:** Start with B2s, upgrade only when metrics indicate need

---

## 6. Scaling Triggers

### When to Upgrade from B2s (4GB) → B2ms (8GB)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Memory Usage | Sustained >70% (>2.8GB) | Upgrade to B2ms |
| CPU Usage | Sustained >80% | Monitor, consider upgrade |
| Response Time | P95 > 2 seconds | Investigate, likely upgrade |
| Connection Pool | >80% utilization | Increase pool, then upgrade |
| Database Connections | Frequent exhaustion | Add PgBouncer or upgrade |

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

### Phase Transition: Pre-Launch → Launch

**Actions Required:** None (same infrastructure)

**Checklist:**
- [ ] Verify backups are working
- [ ] Test restore procedure
- [ ] Confirm monitoring alerts configured
- [ ] Load test with 30 simulated users

---

### Phase Transition: Launch → Production

**Actions Required:** VM Upgrade

**Procedure:**

1. **Schedule Maintenance Window** (5-10 minutes downtime)

2. **Pre-Upgrade**
   ```bash
   # Create backup
   cd ~/GEAv3
   ./scripts/backup.sh
   
   # Verify backup
   ls -lh backups/
   ```

3. **Azure Portal Steps**
   - Stop VM
   - Go to VM → Size
   - Select **Standard_B2ms**
   - Start VM

4. **Post-Upgrade Verification**
   ```bash
   # Check memory
   free -h
   
   # Verify services
   docker compose ps
   
   # Test application
   curl -I https://gea.abhirup.app
   ```

5. **Optional: Upgrade Disk to Premium SSD**
   - Requires VM stop
   - Change disk type in Azure Portal
   - Improves database IOPS

---

## 8. Architecture Diagrams

### Current Architecture (Single VM)

```
┌─────────────────────────────────────────────────────────┐
│                    Azure VM (B2s/B2ms)                  │
│                                                         │
│  ┌─────────┐    ┌─────────────┐    ┌───────────────┐   │
│  │ Traefik │───▶│   Next.js   │───▶│  PostgreSQL   │   │
│  │  :443   │    │    :3000    │    │    :5432      │   │
│  └─────────┘    └─────────────┘    └───────────────┘   │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────┐                                           │
│  │ Let's   │                                           │
│  │ Encrypt │                                           │
│  └─────────┘                                           │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (With Optimizations)

```
┌─────────────────────────────────────────────────────────┐
│                    Azure VM (B2s/B2ms)                  │
│                                                         │
│  ┌─────────┐    ┌─────────────┐    ┌───────────────┐   │
│  │ Traefik │───▶│   Next.js   │───▶│   PgBouncer   │   │
│  │  :443   │    │    :3000    │    │    :6432      │   │
│  └─────────┘    └──────┬──────┘    └───────┬───────┘   │
│                        │                   │           │
│                        ▼                   ▼           │
│                 ┌─────────────┐    ┌───────────────┐   │
│                 │    Redis    │    │  PostgreSQL   │   │
│                 │    :6379    │    │    :5432      │   │
│                 └─────────────┘    └───────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              /backups (7-day retention)         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Summary & Recommendations

### Immediate Actions (Pre-Launch)

| Action | Priority | Status |
|--------|----------|--------|
| Deploy on Standard_B2s (4GB) | High | Pending |
| 64GB Standard SSD | High | Pending |
| Implement PgBouncer | High | Phase 1 |
| Implement automated backups | High | Phase 2 |
| Implement Redis caching | Medium | Phase 3 |

### Before Production (100 Users)

| Action | Priority |
|--------|----------|
| Upgrade to Standard_B2ms (8GB) | High |
| Upgrade to Premium SSD | Medium |
| Load test with 100 simulated users | High |
| Verify backup/restore procedures | High |
| Configure monitoring alerts | Medium |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | November 2025 | Initial document |
| 1.1 | January 2026 | Added Docker version requirement, pricing disclaimers, clarified PgBouncer/Redis as future items |

---

**Prepared for:** Government of Grenada - Digital Transformation Agency  
**Project:** GEA Portal v3