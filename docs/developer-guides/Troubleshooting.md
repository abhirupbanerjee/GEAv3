
## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker compose logs frontend
docker compose logs feedback_db

# Verify .env file exists
cat .env

# Check ports aren't in use
netstat -tuln | grep -E '80|443'
```

### SSL certificate issues
```bash
# Check Traefik logs
docker compose logs traefik

# Verify DNS
dig +short gea.your-domain.com

# Force certificate refresh
rm -f traefik_acme/acme.json
docker compose restart traefik
```

### Database connection errors
```bash
# Check database is running
docker compose ps feedback_db

# Test connection
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"

# Restart database
docker compose restart feedback_db
```

### Authentication issues
```bash
# Verify user exists
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT email, is_active FROM users WHERE email='user@example.com';"

# Check OAuth configuration
docker exec frontend env | grep -E "NEXTAUTH|GOOGLE|MICROSOFT"

# View auth logs
docker compose logs frontend | grep -i "nextauth"
```

---

## 📈 Monitoring

### Health Checks

```bash
# Service status
docker compose ps

# Resource usage
docker stats

# Disk usage
du -sh ./
df -h

# Docker disk usage
docker system df

# Database size
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT pg_size_pretty(pg_database_size('feedback')) AS database_size;"
```

### Key Metrics to Watch
- Container health status
- Database disk space (grows with documents/tickets)
- Memory usage (especially during peak hours)
- SSL certificate expiry (auto-renews 30 days before)
- Failed login attempts (check audit logs)

---

## ✅ Pre-Deployment Checklist

Before going live:

**Configuration:**
- [ ] Environment variables configured in `.env` (~62 variables)
- [ ] Strong passwords generated for database
- [ ] NextAuth secret generated (`openssl rand -base64 32`)
- [ ] Admin session secret generated
- [ ] OAuth credentials obtained (Google/Microsoft)
- [ ] SendGrid API key configured

**Infrastructure:**
- [ ] DNS records configured for domain
- [ ] Ports 80 and 443 available
- [ ] Firewall rules configured (Azure NSG or UFW)
- [ ] Docker and Docker Compose installed
- [ ] Sufficient disk space (50GB+ recommended)

**Database:**
- [ ] Database initialized (`99-consolidated-setup.sh --fresh`)
- [ ] Master data loaded (`99-consolidated-setup.sh --reload`)
- [ ] Authentication tables created (`04-nextauth-users.sh`)
- [ ] Admin user added (`database/scripts/05-add-initial-admin.sh`)
- [ ] Data integrity verified (`99-consolidated-setup.sh --verify`)
- [ ] Backup strategy configured

**Automated Testing (CI/CD):**
- [ ] Tests pass: `cd frontend && npm run test:run` (121 tests)
- [ ] ESLint passes: `npm run lint` (0 errors)
- [ ] TypeScript compiles: `npx tsc --noEmit` (0 errors)
- [ ] GitHub Actions workflow passes on PR

**Manual Testing:**
- [ ] All containers running: `docker compose ps`
- [ ] Frontend accessible via HTTPS
- [ ] SSL certificate issued successfully
- [ ] OAuth sign-in working (Google/Microsoft)
- [ ] Admin portal accessible
- [ ] Ticket submission working
- [ ] Email notifications sending

---
