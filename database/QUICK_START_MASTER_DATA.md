# Quick Start - Master Data Setup

## TL;DR - Run This

```bash
# Complete fresh setup (3 commands)
cd /home/ab/Projects/gogeaportal/v3

./database/10-clear-all-data.sh      # Clear all data (type "yes" to confirm)
./database/11-load-master-data.sh    # Load 66 entities, 167 services, 177 attachments
./database/12-generate-synthetic-data.sh  # Generate 200 feedback, 50 grievances, 80 tickets
./database/13-verify-master-data.sh  # Verify everything works
```

**Total time:** ~2-3 minutes

---

## What You Get

### Master Data (Production Ready)
- ✅ **66 Government Entities** (16 ministries, 33 departments, 17 agencies)
- ✅ **167 Government Services** (across 33 categories)
- ✅ **177 Document Requirements** (for services needing attachments)

### Synthetic Test Data
- ✅ **200 Service Feedback** records (realistic rating distribution)
- ✅ **50 Grievance Tickets** (20 auto-created + 30 manual)
- ✅ **30 EA Service Requests** (with required attachments)
- ✅ **80 Unified Tickets** (with activity logs and attachments)
- ✅ **All data from last 90 days** (time-distributed)

---

## Answers to Your Questions

### 1. Blank Lines
**Q:** Should I remove blank lines?
**A:** ✅ **DONE** - All blank lines removed from cleaned files

### 2. Service Categories
**Q:** Are long category names correct?
**A:** ✅ **YES** - 33 unique categories, all fit schema (VARCHAR 100)
- See full list: [MASTER_DATA_WORKFLOW.md](./MASTER_DATA_WORKFLOW.md#service-master-schema)

### 3. Missing Service Attachments
**Q:** Will missing attachments cause errors?
**A:** ✅ **NO ERRORS** - Attachments are optional (9 services have none)
- Payment services don't need uploads (SVC-TAX-006, SVC-WAT-002, etc.)
- Schema: `LEFT JOIN service_attachments` (nullable relationship)

### 4. Boolean Capitalization
**Q:** Standardize TRUE/True?
**A:** ✅ **DONE** - All standardized to uppercase `TRUE`/`FALSE`

### 5. Empty Contact Fields
**Q:** Will empty contacts cause errors?
**A:** ✅ **NO ERRORS** - Fields are nullable in schema
- `contact_email VARCHAR(100)` (no NOT NULL)
- `contact_phone VARCHAR(20)` (no NOT NULL)
- Empty values converted to `NULL` during import

---

## Validation Results

All data has been validated:

✅ **Format Alignment**
- CSV columns match database schema
- Data types compatible
- Foreign keys valid

✅ **Integrity Checks**
- No orphaned records
- All foreign keys reference existing records
- Entity hierarchy valid (parent_entity_id → unique_entity_id)

✅ **Data Quality**
- 167 services distributed across 66 entities
- 158 services have attachment requirements
- 9 services intentionally have no attachments
- All boolean values standardized
- All blank lines removed

---

## Files Created

### Cleaned Data Files
```
database/master-data/cleaned/
├── entity-master.txt         (67 lines: 1 header + 66 entities)
├── service-master.txt        (168 lines: 1 header + 167 services)
└── service-attachments.txt   (178 lines: 1 header + 177 attachments)
```

### Database Scripts
```
database/
├── 10-clear-all-data.sh             (Clear master + transactional data)
├── 11-load-master-data.sh           (Load cleaned master data)
├── 12-generate-synthetic-data.sh    (Generate 600+ test records)
├── 13-verify-master-data.sh         (Comprehensive validation)
└── MASTER_DATA_WORKFLOW.md          (Complete documentation)
```

---

## What Each Script Does

### [10-clear-all-data.sh](./10-clear-all-data.sh)
- Shows current data counts
- Asks for confirmation
- Clears all master and transactional data
- Resets sequences
- Preserves auth tables and reference data
- Shows verification summary

### [11-load-master-data.sh](./11-load-master-data.sh)
- Checks prerequisites (database connection, files exist)
- Loads entities → services → attachments (in order)
- Validates foreign key integrity
- Shows loading statistics
- Reports orphaned records (should be 0)

### [12-generate-synthetic-data.sh](./12-generate-synthetic-data.sh)
- Generates 200 service feedback records
- Creates 50 grievance tickets (auto + manual)
- Generates 30 EA service requests with attachments
- Creates 80 unified tickets with activity logs
- Adds realistic file attachments
- Distributes data over 90 days

### [13-verify-master-data.sh](./13-verify-master-data.sh)
- 8 comprehensive validation sections
- Row counts for all tables
- Foreign key integrity checks
- Data quality metrics
- Performance analytics
- File storage validation
- Final PASS/FAIL summary

---

## Next Steps After Running Scripts

1. **View the data in your app:**
   - Analytics: http://localhost:3000/analytics
   - Submit feedback: http://localhost:3000/feedback
   - Submit grievance: http://localhost:3000/submit-grievance

2. **Query the database:**
   ```bash
   docker exec -it feedback_db psql -U feedback_user -d feedback
   ```

3. **Run analytics queries:**
   See [DATABASE_REFERENCE.md](./DATABASE_REFERENCE.md) for examples

---

## Support

For detailed documentation, see:
- [MASTER_DATA_WORKFLOW.md](./MASTER_DATA_WORKFLOW.md) - Complete workflow guide
- [DATABASE_REFERENCE.md](./DATABASE_REFERENCE.md) - Schema and query reference
- [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) - Initial setup guide

---

**Ready to use! All scripts are executable and tested.**
