# GEA Portal v3 - Database Quick Start

## 🚀 Complete Setup in 3 Commands

```bash
# 1. Initialize everything (schema + auth + reference data)
./database/00-master-init.sh

# 2. Add your admin user
ADMIN_EMAIL=gogdtaservices@gmail.com ./database/05-add-initial-admin.sh

# 3. Load DTA operational seed data (recommended!)
./database/06-load-dta-seed-data.sh
```

**Done!** Your database is ready with:
- ✅ All 35 tables created
- ✅ 7 EA services configured
- ✅ 27 document requirements loaded
- ✅ NextAuth ready
- ✅ 7 realistic EA service requests
- ✅ 4 staff user accounts

---

## 🎯 Next Steps

### 1. Test Staff Login

Use these test accounts:
- `immigration.staff@gov.gd` (Immigration Department)
- `revenue.staff@gov.gd` (Inland Revenue)
- `registry.staff@gov.gd` (Civil Registry)
- `dta.staff@gov.gd` (DTA)

### 2. Configure OAuth

Edit `frontend/.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Start Testing

```bash
cd frontend
npm run dev
```

Navigate to:
- Admin: `http://localhost:3000/admin/service-requests`
- New Request: `http://localhost:3000/admin/service-requests/new`

---

## 📊 What You Get

### EA Services Available
1. **Digital Roadmap Support** - Help ministries plan digital transformation
2. **EA Framework Review** - Architecture compliance checking
3. **Maturity Assessment** - Readiness evaluation for new initiatives
4. **Repository Access** - Access to EA reference architectures
5. **Compliance Review** - Full architecture validation
6. **Portfolio Review** - IT systems inventory and analysis
7. **Training & Capacity** - EA training programs

### Sample Requests Loaded
- **2 submitted** - New requests waiting for review
- **2 in process** - Currently being worked on
- **1 resolved** - Completed successfully
- **2 from different ministries** - Cross-entity scenarios

---

## 🔍 Quick Verification

```bash
# Check everything was created
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT 'Tables' as type, COUNT(*)::text as count FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL SELECT 'Services', COUNT(*)::text FROM service_master WHERE entity_id = 'AGY-002'
UNION ALL SELECT 'Documents', COUNT(*)::text FROM service_attachments
UNION ALL SELECT 'Staff Users', COUNT(*)::text FROM users WHERE role_id = 2
UNION ALL SELECT 'EA Requests', COUNT(*)::text FROM ea_service_requests;
"
```

Expected output:
```
    type     | count
-------------+-------
 Tables      | 35
 Services    | 7
 Documents   | 27
 Staff Users | 4
 EA Requests | 7
```

---

## 🆘 Troubleshooting

### Database not responding?
```bash
docker ps | grep feedback_db
docker exec feedback_db psql -U feedback_user -l
```

### Need to reset?
```bash
docker exec -it feedback_db psql -U postgres -c "DROP DATABASE IF EXISTS feedback; CREATE DATABASE feedback OWNER feedback_user;"
./database/00-master-init.sh
```

### Check what's there
```bash
docker exec feedback_db psql -U feedback_user -d feedback -c "\dt"
```

---

## 📚 Full Documentation

See [README.md](./README.md) for:
- Complete script inventory
- Detailed table descriptions
- Migration guides
- Advanced troubleshooting

---

**Ready to go? Run the 3 commands at the top and you're done! 🎉**
