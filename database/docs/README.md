# GEA Portal v3 - Database Setup

**Quick Reference Guide**

For complete setup instructions, see: **[DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md)**

---

## 🚀 Quick Start

### Recommended: One Command Setup

```bash
./database/99-consolidated-setup.sh --fresh --load-dta --create-admin
```

This single command will:
- ✅ Create all 30 database tables
- ✅ Load reference data (entities, services, etc.)
- ✅ Load DTA operational data (staff users, sample requests)
- ✅ Create admin user (interactive prompt)
- ✅ Verify everything is working

---

## 📋 Available Scripts

### Main Entry Points

| Script | Purpose |
|--------|---------|
| **99-consolidated-setup.sh** | ⭐ **Recommended** - All-in-one setup tool |
| **00-master-init.sh** | Traditional orchestrator |

### Supporting Scripts

| Script | Purpose | Called By |
|--------|---------|-----------|
| 01-init-db.sh | Core schema (30 tables) | Master scripts |
| 02-load-seed-data.sh | General test data | User (optional) |
| 03-verify-analytics.sh | Verification queries | User (optional) |
| 04-nextauth-users.sh | Auth tables | Master scripts |
| 05-add-initial-admin.sh | Admin user creation | User or consolidated |
| 06-load-dta-seed-data.sh | DTA operational data | User or consolidated |
| 07-service-request-enhancements.sh | Comments table | Master scripts |
| 09-add-missing-production-tables.sh | SLA & notes tables | Master scripts |

---

## 📊 What Gets Created

### 30 Tables in 6 Categories:

1. **Reference Data (5)**: entities, services, attachments, priorities, statuses
2. **Auth & Users (8)**: users, roles, accounts, sessions, permissions, audit
3. **Feedback & Grievances (4)**: feedback, grievances, attachments, QR codes
4. **EA Service Requests (3)**: requests, attachments, comments
5. **Tickets & Activity (7)**: tickets, status, categories, attachments, activity, notes, SLA
6. **Security (3)**: rate limiting, attempts, captcha

---

## 🔧 Common Tasks

### Fresh Setup

```bash
./database/99-consolidated-setup.sh --fresh --load-dta --create-admin
```

### Update Existing Database

```bash
./database/99-consolidated-setup.sh --update --verify
```

### Verify Current State

```bash
./database/99-consolidated-setup.sh --verify
```

### Create Admin User

```bash
ADMIN_EMAIL="admin@example.com" ADMIN_NAME="Admin User" \
./database/05-add-initial-admin.sh
```

### Load Sample Data

```bash
./database/06-load-dta-seed-data.sh
```

---

## 📖 Full Documentation

For detailed information, see:

- **[DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md)** - Complete setup guide ⭐
- **[QUICK_START.md](QUICK_START.md)** - Quick reference
- **[docs/DATABASE_REFERENCE.md](../docs/DATABASE_REFERENCE.md)** - Technical reference

---

## ✅ Production Ready

These scripts are:
- ✅ **Production-verified** (matches live database 100%)
- ✅ **Idempotent** (safe to run multiple times)
- ✅ **Documented** (comprehensive guides)
- ✅ **Tested** (verified on Azure VM)

---

**For help:** `./database/99-consolidated-setup.sh --help`
