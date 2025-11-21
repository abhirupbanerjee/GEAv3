[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=abhirupbanerjee_GEAv3&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=abhirupbanerjee_GEAv3)

# Grenada EA Portal

**Enterprise Architecture Portal for the Government of Grenada**

A modern, containerized web platform supporting digital transformation initiatives across Ministries, Departments, and Agencies (MDAs).

---

## 🎯 What's This?

Complete digital portal system with:
- **Frontend Portal** - Public-facing Next.js website
- **Wiki.js** - Knowledge management & documentation
- **Paperless-ngx** - Document management system (DMS)
- **FreeScout** - Service request management
- **AI Chatbot** - Integrated citizen assistance
- **Traefik** - Automated SSL & reverse proxy

**Status:** ✅ Production-ready | **Version:** 1.0

---

## 🚀 Quick Start

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Docker & Docker Compose installed
- Domain with DNS access
- 2GB RAM minimum (4GB recommended)

### Deploy in 3 Steps

```bash
# 1. Clone & configure
git clone <repository-url>
cd grenada-ea-portal
cp .env.example .env.dev

# 2. Update .env.dev with your values
nano .env.dev  # Set passwords & domains

# 3. Deploy
docker-compose up -d
```

**That's it!** Services will be available at your configured domains with auto-SSL.

---

## 📋 Architecture

### System Components

| Service | Purpose | URL Example | Port |
|---------|---------|-------------|------|
| **Frontend** | Main portal website | gea.domain.com | 443 |
| **Wiki.js** | Documentation & knowledge base | wiki.gea.domain.com | 443 |
| **Paperless-ngx** | Document management | dms.gea.domain.com | 443 |
| **FreeScout** | Service requests | services.gea.domain.com | 443 |
| **Traefik** | Reverse proxy & SSL | - | 80/443 |
| **PostgreSQL** | Wiki database | Internal | 5432 |
| **MariaDB** | FreeScout database | Internal | 3306 |
| **Redis** | Paperless cache | Internal | 6379 |

### Technology Stack

**Frontend:**
- Next.js 14 (TypeScript)
- Tailwind CSS
- Static Site Generation (SSG)
- Nginx web server

**Backend Services:**
- Wiki.js 2.x
- Paperless-ngx (latest)
- FreeScout (latest)

**Infrastructure:**
- Docker & Docker Compose
- Traefik v3.0 (reverse proxy)
- Let's Encrypt (SSL automation)

---

## 📁 Project Structure

```
grenada-ea-portal/
├── frontend/                 # Next.js portal application
│   ├── src/
│   │   ├── app/             # Pages (home, about)
│   │   ├── components/      # React components
│   │   └── config/          # Configuration files
│   ├── public/images/       # ⚠️ ADD YOUR IMAGES HERE
│   ├── Dockerfile           # Frontend build
│   └── nginx.conf           # Web server config
│
├── paperless/               # Document folders
│   ├── consume/            # Upload documents here
│   └── export/             # Export location
│
├── docker-compose.yml       # Service orchestration
├── traefik.yml             # Reverse proxy config
├── .env.example            # Configuration template
└── README.md               # This file
```

---

## ⚙️ Configuration

### Required: Environment Variables

Copy `.env.example` to `.env.dev` and update:

```bash
# Domains (CHANGE THESE!)
DOMAIN=gea.abhirup.app
WIKI_DOMAIN=wiki.gea.abhirup.app
DMS_DOMAIN=dms.gea.abhirup.app
SERVICES_DOMAIN=services.gea.abhirup.app

# Security (GENERATE STRONG PASSWORDS!)
WIKI_DB_PASSWORD=your_secure_password_here
PAPERLESS_ADMIN_USER=admin
PAPERLESS_ADMIN_PASSWORD=your_secure_password_here
PAPERLESS_SECRET_KEY=your_50_char_random_key_here
FREESCOUT_DB_ROOT_PASSWORD=your_secure_password_here
FREESCOUT_DB_PASSWORD=your_secure_password_here
FREESCOUT_ADMIN_EMAIL=admin@yourdomain.com
FREESCOUT_ADMIN_PASSWORD=your_secure_password_here

# Contact
CONTACT_EMAIL=eservices@gov.gd
LETS_ENCRYPT_EMAIL=your-email@domain.com
```

### Required: Add Images

Place these images in `frontend/public/images/`:

1. **grenada-coastal.jpg** - Hero banner (1920x500px)
2. **digital-strategy.jpg** - Vision section (800x600px)
3. **build-our-people.jpg** - Strategy card
4. **simplify-life.jpg** - Strategy card
5. **boost-resilience.jpg** - Strategy card

**Don't have images?** Use free stock photos from Unsplash or Pexels.

---

## 🔧 Management

### Essential Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Check status
docker-compose ps

# Update images
docker-compose pull
docker-compose up -d
```

### First-Time Setup

After deployment, configure each service:

1. **Wiki.js** (wiki.domain.com)
   - First visit triggers setup wizard
   - Create admin account
   - Configure storage & authentication

2. **Paperless-ngx** (dms.domain.com)
   - Login: `PAPERLESS_ADMIN_USER` / `PAPERLESS_ADMIN_PASSWORD`
   - Configure document types & tags
   - Set up OCR languages

3. **FreeScout** (services.domain.com)
   - Login: `FREESCOUT_ADMIN_EMAIL` / `FREESCOUT_ADMIN_PASSWORD`
   - Configure mailboxes & workflows
   - Add team members

---

## 📝 Content Management

### Update Portal Content

Edit `frontend/src/config/content.ts`:

```typescript
export const heroContent = {
  title: "Your Title",
  description: "Your description..."
};

export const aboutContent = {
  dta: {
    title: "Your Title",
    description: "Your description..."
  }
  // ... more sections
};
```

### Update Navigation

Edit `frontend/src/config/navigation.ts`:

```typescript
export const navigationItems: NavItem[] = [
  {
    label: 'About',
    href: '/about',
    type: 'internal'
  },
  // Add more menu items
];
```

### Rebuild Frontend

After content changes:

```bash
docker-compose up -d --build frontend
```

---

## 🔒 Security

### SSL/HTTPS
- Automatic via Let's Encrypt
- Certificates auto-renew
- HTTP → HTTPS redirect enabled

### Passwords
- Never commit `.env.dev` to git
- Use strong, unique passwords (20+ characters)
- Change default passwords immediately

### Firewall
```bash
# Allow only necessary ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 📊 Monitoring

### Health Checks

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Disk usage
du -sh ./

# Logs by service
docker-compose logs -f frontend
docker-compose logs -f wiki
docker-compose logs -f paperless
```

### Key Metrics to Watch
- Container health status
- Disk space (documents grow over time)
- Memory usage (especially Paperless OCR)
- SSL certificate expiry (auto-renews)

---

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs [service-name]

# Verify .env.dev exists and has values
cat .env.dev

# Ensure ports aren't in use
netstat -tuln | grep -E '80|443'
```

### SSL certificate issues
```bash
# Check Traefik logs
docker-compose logs traefik

# Verify DNS points to your server
dig +short gea.yourdomain.com

# Delete acme.json and restart (will re-issue)
rm -f traefik_acme/acme.json
docker-compose restart traefik
```

### Frontend not building
```bash
# Rebuild with no cache
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Check build logs
docker-compose logs frontend
```

### Database connection errors
```bash
# Restart database and dependent service
docker-compose restart wiki_db wiki
docker-compose restart freescout_db freescout
```

---

## 🆘 Support

### Contact
- **Email:** eservices@gov.gd
- **Portal:** https://gea.abhirup.app
- **Ticket:** https://services.gea.abhirup.app


### Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Wiki.js Documentation](https://docs.requarks.io/)
- [Paperless-ngx Documentation](https://docs.paperless-ngx.com/)

---

## 📄 License

© 2025 Government of Grenada. All rights reserved.

---

## ✅ Pre-Deployment Checklist

Before going live:

- [ ] Update all passwords in `.env.dev`
- [ ] Add all required images to `frontend/public/images/`
- [ ] Configure DNS records for all domains
- [ ] Test on staging/development environment first
- [ ] Set up regular backups (volumes + `.env.dev`)
- [ ] Configure firewall rules
- [ ] Document admin credentials securely
- [ ] Test SSL certificates on all domains
- [ ] Verify email settings in FreeScout
- [ ] Configure Wiki.js authentication

**Estimated Setup Time:** 1-2 hours for first deployment

---

**Last Updated:** November 2, 2025 | **Version:** 1.0
