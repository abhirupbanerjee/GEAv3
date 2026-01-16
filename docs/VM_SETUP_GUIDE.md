# GEA Portal v3 - VM Setup Guide

**Complete guide for deploying GEA Portal on a fresh Virtual Machine**

**Version:** 1.1
**Last Updated:** December 19, 2025
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [VM Requirements](#vm-requirements)
3. [Step 1: Provision VM](#step-1-provision-vm)
4. [Step 2: Initial Server Setup](#step-2-initial-server-setup)
5. [Step 3: Install Docker](#step-3-install-docker)
6. [Step 4: Clone Repository](#step-4-clone-repository)
7. [Step 5: Configure Environment](#step-5-configure-environment)
8. [Step 6: Configure DNS](#step-6-configure-dns)
9. [Step 7: Initialize Database](#step-7-initialize-database)
10. [Step 8: Deploy Application](#step-8-deploy-application)
11. [Step 9: Verify Deployment](#step-9-verify-deployment)
12. [Post-Deployment Tasks](#post-deployment-tasks)
13. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through deploying the GEA Portal v3 on a fresh virtual machine. The portal runs as a containerized application using Docker Compose with three main services:

- **Frontend** - Next.js 14 application
- **Database** - PostgreSQL 15
- **Reverse Proxy** - Traefik v3.6 with automatic SSL

**Estimated Time:** 30-45 minutes for first deployment

---

## VM Requirements

### Minimum Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **RAM** | 4 GB | 8 GB |
| **vCPUs** | 2 | 2-4 |
| **Disk** | 30 GB | 50 GB (single disk) |
| **Network** | Public IP | Static public IP |

### Required Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH access |
| 80 | TCP | HTTP (redirects to HTTPS) |
| 443 | TCP | HTTPS |

### Production Reference

The Government of Grenada portal runs on:
- **Cloud Provider:** Microsoft Azure
- **VM Size:** Standard_B2s
- **OS:** Ubuntu 24.04.3 LTS (kernel 6.14.0-azure)
- **RAM:** 4 GB
- **vCPUs:** 2
- **Disk:** 30 GB OS disk

---

## Step 1: Provision VM

### Azure

```bash
# Create resource group
az group create --name GEA-Portal-RG --location eastus

# Create VM
az vm create \
  --resource-group GEA-Portal-RG \
  --name GoGEAPortalv3 \
  --image Ubuntu2404LTS \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard
```

### AWS

```bash
# Using AWS CLI
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxx \
  --subnet-id subnet-xxxxxxxx
```

### DigitalOcean

```bash
# Using doctl CLI
doctl compute droplet create gea-portal \
  --size s-2vcpu-4gb \
  --image ubuntu-24-04-x64 \
  --region nyc1 \
  --ssh-keys your-key-id
```

---

## Step 2: Initial Server Setup

### Connect to VM

```bash
# SSH into the server
ssh azureuser@your-server-ip
# or
ssh -i your-key.pem ubuntu@your-server-ip
```

### Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nano htop
```

### Configure Firewall (Optional but Recommended)

If not using cloud provider's security groups (like Azure NSG):

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify status
sudo ufw status
```

### Create Non-Root User (if needed)

```bash
# Create user
sudo adduser geaportal

# Add to sudo group
sudo usermod -aG sudo geaportal

# Switch to new user
su - geaportal
```

---

## Step 3: Install Docker Engine

> **ℹ️ Version Info:** Docker 29.x is the current supported version. Traefik v3.6+ includes automatic Docker API version negotiation for full compatibility. Docker 27.x has reached EOL (no security patches).

### Install Docker Engine (Latest)

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker (latest supported version)
sudo apt update
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout and login)
newgrp docker
```

### Verify Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 29.x.x

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v5.0.x or higher

# Test Docker
docker run hello-world
```

### EOL Information

| Component | Version | Support Status |
|-----------|---------|----------------|
| Docker 29.x | Current | ✅ Actively supported |
| Docker 28.x | EOL | ❌ EOL since Nov 2025 |
| Docker 27.x | EOL | ❌ EOL since early 2025 |
| Traefik v3.6 | Current | ✅ Latest minor, actively supported |

> Docker follows ~1 month support after next major release. Traefik supports only the latest minor version.

---

## Step 4: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/abhirupbanerjee/GEAv3.git

# Enter project directory
cd GEAv3

# Verify structure
ls -la
# Should see: docker-compose.yml, .env.example, frontend/, database/, docs/
```

---

## Step 5: Configure Environment

### Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env
```

### Generate Secure Passwords

```bash
# Generate database password
echo "Database Password:"
openssl rand -base64 32

# Generate NextAuth secret
echo "NextAuth Secret:"
openssl rand -base64 32
```

### Required Configuration

Update these values in `.env`:

```bash
# === Domain Configuration ===
BASE_DOMAIN=your-domain.com
FRONTEND_DOMAIN=gea.your-domain.com

# === SSL Configuration ===
LETS_ENCRYPT_EMAIL=admin@your-domain.com

# === Database Configuration ===
FEEDBACK_DB_PASSWORD=<paste-generated-password>
FEEDBACK_DB_HOST=feedback_db
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user

# === NextAuth Configuration ===
NEXTAUTH_URL=https://gea.your-domain.com
NEXTAUTH_SECRET=<paste-generated-secret>

# === Google OAuth ===
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# === SendGrid Email (OPTIONAL - email notifications disabled if not set) ===
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@your-domain.com
SERVICE_ADMIN_EMAIL=admin@your-domain.com
```

### OAuth Setup

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `https://gea.your-domain.com/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`

**Microsoft OAuth (Optional):**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Add redirect URI: `https://gea.your-domain.com/api/auth/callback/azure-ad`
5. Create client secret
6. Copy Client ID, Secret, and Tenant ID to `.env`

---

## Step 6: Configure DNS

### Point Domain to Server

Create A records pointing to your server's IP address:

```
# Primary domain
gea.your-domain.com    A    <your-server-ip>

# Optional subdomains (if using)
wiki.your-domain.com   A    <your-server-ip>
dms.your-domain.com    A    <your-server-ip>
```

### Verify DNS

```bash
# Check DNS propagation
dig +short gea.your-domain.com
# Should return your server IP

# Alternative check
nslookup gea.your-domain.com
```

**Note:** DNS propagation can take up to 24-48 hours, but typically completes within 5-30 minutes.

---

## Step 7: Initialize Database

### Start Database Container

```bash
# Start only the database service
docker compose up -d feedback_db

# Wait for database to be ready
sleep 10

# Check database is healthy
docker compose ps feedback_db
# Should show: Up (healthy)
```

### Initialize Schema and Data

**Option A: Quick Setup (Recommended for first deployment)**

```bash
# Complete setup with production data + synthetic test data
./database/99-consolidated-setup.sh --fresh --load-master --generate-data
```

**Option B: Manual Setup (Production - no test data)**

```bash
# Initialize database schema
./database/scripts/01-init-db.sh

# Setup authentication tables
./database/scripts/04-nextauth-users.sh

# Load production master data
./database/scripts/11-load-master-data.sh

# Add initial admin user
ADMIN_EMAIL="admin@your-domain.com" ADMIN_NAME="Admin Name" ./database/scripts/05-add-initial-admin.sh
```

### Verify Database

```bash
# Verify data integrity
./database/99-consolidated-setup.sh --verify

# Or connect directly
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT 'Entities' AS table_name, COUNT(*) FROM entity_master
UNION ALL SELECT 'Services', COUNT(*) FROM service_master
UNION ALL SELECT 'Users', COUNT(*) FROM users;"
```

---

## Step 8: Deploy Application

### Build and Start All Services

```bash
# Build all containers
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

### Expected Output

```
NAME         STATUS                    PORTS
frontend     Up X minutes              3000/tcp
feedback_db  Up X minutes (healthy)    5432/tcp
traefik      Up X minutes              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f traefik
```

---

## Step 9: Verify Deployment

### Check Services

```bash
# All containers running
docker compose ps

# Resource usage
docker stats --no-stream
```

### Test Endpoints

```bash
# Test HTTPS access
curl -I https://gea.your-domain.com
# Should return: HTTP/2 200

# Test API endpoint
curl https://gea.your-domain.com/api/health
# Should return: {"status":"ok"}

# Test public API
curl https://gea.your-domain.com/api/tickets/categories
# Should return JSON with ticket categories
```

### Verify SSL Certificate

```bash
# Check certificate details
echo | openssl s_client -connect gea.your-domain.com:443 -servername gea.your-domain.com 2>/dev/null | openssl x509 -noout -dates

# Should show valid Let's Encrypt certificate
```

### Test Authentication

1. Navigate to `https://gea.your-domain.com/admin`
2. Click "Sign in with Google" or "Sign in with Microsoft"
3. Complete OAuth flow
4. Verify redirect to admin dashboard

---

## Post-Deployment Tasks

### 1. Add Admin Users

```bash
# Add additional admin users
ADMIN_EMAIL="user@your-domain.com" ADMIN_NAME="User Name" ./database/scripts/05-add-initial-admin.sh
```

### 2. Configure Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Manual backup
docker exec feedback_db pg_dump -U feedback_user feedback > ~/backups/gea_backup_$(date +%Y%m%d).sql

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * docker exec feedback_db pg_dump -U feedback_user feedback > ~/backups/gea_backup_$(date +\%Y\%m\%d).sql
```

### 3. Setup Monitoring

```bash
# Check resource usage
docker stats

# Monitor disk space
df -h

# Monitor memory
free -h
```

### 4. Enable Auto-Updates (Optional)

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs frontend
docker compose logs feedback_db
docker compose logs traefik

# Check .env file
cat .env | head -20

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database Connection Failed

```bash
# Check database is running
docker compose ps feedback_db

# Test connection
docker exec -it feedback_db psql -U feedback_user -d feedback -c "SELECT 1"

# Restart database
docker compose restart feedback_db
```

### SSL Certificate Not Issued

```bash
# Check Traefik logs
docker compose logs traefik | grep -i certificate

# Verify DNS
dig +short gea.your-domain.com

# Verify ports are open
sudo netstat -tuln | grep -E '80|443'

# Force certificate renewal
docker compose restart traefik
```

### OAuth Login Failed

```bash
# Check OAuth configuration
docker exec frontend env | grep -E "GOOGLE|MICROSOFT|NEXTAUTH"

# Verify callback URLs match
# Google: https://gea.your-domain.com/api/auth/callback/google
# Microsoft: https://gea.your-domain.com/api/auth/callback/azure-ad
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a

# Remove old images
docker image prune -a
```

---

## Quick Reference Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart service
docker compose restart frontend

# View logs
docker compose logs -f

# Check status
docker compose ps

# Database backup
docker exec feedback_db pg_dump -U feedback_user feedback > backup.sql

# Database restore
docker exec -i feedback_db psql -U feedback_user feedback < backup.sql

# Rebuild and deploy
docker compose build --no-cache && docker compose up -d
```

---

## See Also

- [Main README](../README.md) - Project overview
- [Database Guide](../database/README.md) - Complete DBA guide
- [API Reference](API_REFERENCE.md) - All API endpoints
- [Authentication Guide](AUTHENTICATION.md) - OAuth setup details
- [Solution Architecture](SOLUTION_ARCHITECTURE.md) - System architecture

---

**Document Version:** 1.1
**Last Updated:** December 19, 2025
**Maintained By:** GEA Portal Development Team
