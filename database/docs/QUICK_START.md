# Database Quick Start

**One-page reference for common tasks**

---

## 🚀 Fresh Setup (New VM)

```bash
./database/99-consolidated-setup.sh --fresh --load-dta --create-admin
```

**Done!** This creates 30 tables, loads data, and sets up admin user.

---

## 🔄 Update Existing Database

```bash
./database/99-consolidated-setup.sh --update --verify
```

---

## ✅ Verify Database

```bash
./database/99-consolidated-setup.sh --verify
```

---

## 👤 Create Admin User

```bash
ADMIN_EMAIL="your@email.com" ADMIN_NAME="Your Name" \
./database/05-add-initial-admin.sh
```

---

## 📊 Load Sample Data

```bash
./database/06-load-dta-seed-data.sh
```

---

## 🔍 Check Tables

```bash
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

**Expected:** 30 tables

---

## 💾 Backup Database

```bash
./database/99-consolidated-setup.sh --backup
```

Saves to: `/tmp/gea_backups/feedback_backup_YYYYMMDD_HHMMSS_consolidated.sql`

---

## 🆘 Help

```bash
./database/99-consolidated-setup.sh --help
```

---

**Full Documentation:** [DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md)
