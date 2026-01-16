# GEA Portal v3 - Fresh Installation Manual

**Complete Step-by-Step Guide for First-Time Installation**

**Version:** 1.1
**Last Updated:** January 14, 2026
**Status:** Production Ready
**Repository:** https://github.com/abhirupbanerjee/GEAv3

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Installation Checklist](#pre-installation-checklist)
4. [Installation Steps](#installation-steps)
   - [Step 1: Initial Server Setup](#step-1-initial-server-setup)
   - [Step 2: Install Docker 27.5.1](#step-2-install-docker-2751)
   - [Step 3: Clone Repository](#step-3-clone-repository)
   - [Step 4: Configure Environment](#step-4-configure-environment)
   - [Step 5: Configure DNS](#step-5-configure-dns)
   - [Step 6: Build and Deploy](#step-6-build-and-deploy)
   - [Step 7: Initialize Database](#step-7-initialize-database)
   - [Step 8: Load Master Data Only](#step-8-load-master-data-only)
   - [Step 9: Create Admin User](#step-9-create-admin-user)
   - [Step 10: Verify Deployment](#step-10-verify-deployment)
5. [Post-Installation Configuration](#post-installation-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Appendices](#appendices)

---

## Overview

This manual provides complete instructions for performing a **fresh installation** of the GEA Portal v3 on a new virtual machine. This installation will:

✅ Set up all infrastructure components (Docker, PostgreSQL, Next.js, Traefik)
✅ Initialize the database schema (33 tables, 44+ indexes)
✅ Load **master data only** (entities, services, service attachments)
✅ Load **system settings** (~40 configurable admin settings)
✅ Create initial admin user(s)
✅ Configure OAuth authentication
✅ Enable SSL certificates

❌ **Excludes feedback data** (service feedback, grievances, tickets, EA requests)

### Installation Timeline

- **Prerequisites setup:** 15-20 minutes
- **Docker installation:** 10-15 minutes
- **Application deployment:** 10-15 minutes
- **Database initialization:** 5-10 minutes
- **Verification:** 5-10 minutes

**Total time:** 45-70 minutes

---

## Prerequisites

### 1. Virtual Machine Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **Operating System** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS | Fresh installation |
| **RAM** | 4 GB | 8 GB | 4GB sufficient for production |
| **vCPUs** | 2 | 2-4 | More cores improve build time |
| **Disk Space** | 128 GB | 512 GB | Single disk, SSD preferred |
| **Network** | Public IP | Static Public IP | Required for SSL certificates |

### 2. Network Requirements

| Port | Protocol | Purpose | Required |
|------|----------|---------|----------|
| 22 | TCP | SSH access | Yes |
| 80 | TCP | HTTP (redirects to HTTPS) | Yes |
| 443 | TCP | HTTPS | Yes |

### 3. External Services Required

You will need accounts and credentials for:

1. **Domain Name** with DNS management access
   - Example: `your-domain.com`
   - Ability to create A records

2. **SendGrid Account** (for email notifications) - **OPTIONAL**
   - Free tier available
   - Sign up: https://app.sendgrid.com/
   - API key optional - application works without email notifications

3. **hCaptcha Account** (for spam protection) *** Optional ***
   - Free tier available
   - Sign up: https://www.hcaptcha.com
   - Site key and secret required

4. **OAuth Providers** (at least one)
   - **Google OAuth:** https://console.cloud.google.com/
   - **Microsoft OAuth** (optional): https://portal.azure.com/

### 4. Local Machine Requirements

- SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- Basic command-line knowledge
- Text editor (nano, vim, or VS Code with SSH extension)

---

## Pre-Installation Checklist

Before starting the installation, ensure you have:

- [ ] VM provisioned with Ubuntu 22.04+ and public IP address
- [ ] SSH access to the VM (root or sudo user)
- [ ] Domain name registered and DNS access configured
- [ ] SendGrid API key obtained (optional - for email notifications)
- [ ] hCaptcha site key and secret obtained
- [ ] Google OAuth client ID and secret obtained (or Microsoft)
- [ ] Firewall rules allow ports 22, 80, 443
- [ ] VM time zone configured correctly
- [ ] VM hostname set appropriately

---

## Installation Steps

### Step 1: Initial Server Setup

#### 1.1 Connect to Virtual Machine

```bash
# Connect via SSH (replace with your VM details)
ssh azureuser@your-vm-ip-address

# Or if using a key file
ssh -i /path/to/your-key.pem ubuntu@your-vm-ip-address
```

#### 1.2 Update System Packages

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nano htop unzip
```

**Expected output:**
```
Reading package lists... Done
Building dependency tree... Done
...
0 upgraded, 0 newly installed, 0 to remove
```

#### 1.3 Configure System Settings

```bash
# Set timezone (adjust for your location)
sudo timedatectl set-timezone America/Grenada

# Verify timezone
timedatectl

# Set hostname (optional but recommended)
sudo hostnamectl set-hostname gea-portal

# Verify hostname
hostname
```

#### 1.4 Configure Firewall (if not using cloud security groups)

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Verify firewall status
sudo ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

### Step 2: Install Docker 27.5.1

> **⚠️ CRITICAL:** GEA Portal v3 requires **Docker version 27.5.1 exactly**. Docker 28.x and 29.x have API compatibility issues with Traefik v3.x and **will not work**.

#### 2.1 Remove Old Docker Versions (if any)

```bash
# Remove any existing Docker installations
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Clean up old Docker data (optional, only if reinstalling)
# sudo rm -rf /var/lib/docker
# sudo rm -rf /var/lib/containerd
```

#### 2.2 Install Docker Prerequisites

```bash
# Install required packages
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Create keyrings directory
sudo install -m 0755 -d /etc/apt/keyrings

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set permissions
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

#### 2.3 Add Docker Repository

```bash
# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package lists
sudo apt update
```

#### 2.4 Install Docker 27.5.1 (Specific Version)

```bash
# For Ubuntu 24.04
VERSION_STRING=5:27.5.1-1~ubuntu.24.04~noble

# For Ubuntu 22.04, use this instead:
# VERSION_STRING=5:27.5.1-1~ubuntu.22.04~jammy

# Install Docker with specific version
sudo apt install -y \
    docker-ce=$VERSION_STRING \
    docker-ce-cli=$VERSION_STRING \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Prevent auto-upgrade to incompatible versions
sudo apt-mark hold docker-ce docker-ce-cli
```

**Expected output:**
```
docker-ce set on hold.
docker-ce-cli set on hold.
```

#### 2.5 Configure Docker for Non-Root User

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout and login again)
newgrp docker
```

#### 2.6 Verify Docker Installation

```bash
# Check Docker version
docker --version
```

**Expected output:**
```
Docker version 27.5.1, build 9f9e405
```

```bash
# Check Docker Compose version
docker compose version
```

**Expected output:**
```
Docker Compose version v2.40.x
```

```bash
# Test Docker
docker run hello-world
```

**Expected output:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

#### 2.7 Enable Docker to Start on Boot

```bash
# Enable Docker service
sudo systemctl enable docker

# Verify Docker service status
sudo systemctl status docker
```

---

### Step 3: Clone Repository

#### 3.1 Clone from GitHub

```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/abhirupbanerjee/GEAv3.git

# Enter project directory
cd GEAv3

# Verify repository structure
ls -la
```

**Expected output:**
```
total XX
drwxr-xr-x  8 user user  4096 Jan  9 10:00 .
drwxr-xr-x 10 user user  4096 Jan  9 10:00 ..
drwxr-xr-x  4 user user  4096 Jan  9 10:00 database
-rw-r--r--  1 user user  XXXX Jan  9 10:00 docker-compose.yml
drwxr-xr-x  3 user user  4096 Jan  9 10:00 docs
-rw-r--r--  1 user user  XXXX Jan  9 10:00 .env.example
drwxr-xr-x  6 user user  4096 Jan  9 10:00 frontend
-rw-r--r--  1 user user  XXXX Jan  9 10:00 .gitignore
-rw-r--r--  1 user user  XXXX Jan  9 10:00 README.md
-rw-r--r--  1 user user  XXXX Jan  9 10:00 traefik.yml
```

#### 3.2 Verify File Integrity

```bash
# Check that key files exist
ls -l docker-compose.yml .env.example traefik.yml

# Check database scripts
ls -l database/scripts/

# Check frontend
ls -l frontend/
```

---

### Step 4: Configure Environment

#### 4.1 Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Set proper permissions (important for security)
chmod 600 .env
```

#### 4.2 Generate Secure Passwords

Generate all required passwords before editing the `.env` file:

```bash
# Generate database password (copy this output)
echo "=== DATABASE PASSWORD ==="
openssl rand -base64 32

# Generate NextAuth secret (copy this output)
echo "=== NEXTAUTH SECRET ==="
openssl rand -base64 32

# Generate admin session secret (copy this output)
echo "=== ADMIN SESSION SECRET ==="
openssl rand -base64 32

# Generate external API key (copy this output)
echo "=== EXTERNAL API KEY ==="
openssl rand -hex 32
```

**Save these generated values** - you'll need them in the next step.

#### 4.3 Edit Environment Configuration

```bash
# Edit the .env file
nano .env
```

#### 4.4 Configure Required Environment Variables

Update the following sections in the `.env` file. **All values marked with `REQUIRED` must be changed.**

##### A. Deployment Environment

```bash
# For production deployment
DEPLOYMENT_ENV=prod
NODE_ENV=production
LOG_LEVEL=info
```

##### B. Domain Configuration (REQUIRED)

```bash
# Replace 'your-domain.com' with your actual domain
BASE_DOMAIN=your-domain.com                    # REQUIRED
FRONTEND_DOMAIN=gea.your-domain.com           # REQUIRED

# Update all domain references
DMS_DOMAIN=dms.gea.your-domain.com
GIT_DOMAIN=git.gea.your-domain.com

# Update computed URLs
FRONTEND_URL=https://gea.your-domain.com      # REQUIRED
NEXTAUTH_URL=https://gea.your-domain.com      # REQUIRED

# Browser accessible variables
NEXT_PUBLIC_FRONTEND_URL=https://gea.your-domain.com  # REQUIRED
NEXT_PUBLIC_BASE_DOMAIN=your-domain.com               # REQUIRED
```

##### C. SSL Configuration (REQUIRED)

```bash
# Use a valid email for SSL certificate notifications
LETS_ENCRYPT_EMAIL=admin@your-domain.com      # REQUIRED
```

##### D. Database Configuration (REQUIRED)

```bash
# Database connection (leave host/port/name/user as default)
FEEDBACK_DB_HOST=feedback_db
FEEDBACK_DB_PORT=5432
FEEDBACK_DB_NAME=feedback
FEEDBACK_DB_USER=feedback_user

# Database password (paste generated password from step 4.2)
FEEDBACK_DB_PASSWORD=<paste-your-generated-db-password>  # REQUIRED
```

##### E. SendGrid Email Configuration (OPTIONAL)

> **Note:** SendGrid is optional. If not configured, the application will work normally but email notifications will be disabled.

```bash
# SendGrid API key (get from https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here         # OPTIONAL - leave empty to disable email
SENDGRID_FROM_EMAIL=noreply@your-domain.com            # OPTIONAL
SENDGRID_FROM_NAME=GEA Portal

# Admin email (receives notifications)
SERVICE_ADMIN_EMAIL=admin@your-domain.com              # OPTIONAL
REPLY_TO_EMAIL=admin@your-domain.com
```

##### F. NextAuth Configuration (REQUIRED)

```bash
# NextAuth secret (paste generated secret from step 4.2)
NEXTAUTH_SECRET=<paste-your-generated-nextauth-secret>  # REQUIRED

# Google OAuth credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com     # REQUIRED
GOOGLE_CLIENT_SECRET=your-google-client-secret                 # REQUIRED

# Microsoft OAuth (optional - uncomment if using)
# MICROSOFT_CLIENT_ID=your-microsoft-client-id
# MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
# MICROSOFT_TENANT_ID=common
```

##### G. Admin Authentication (REQUIRED)

```bash
# Admin password (create a strong password)
ADMIN_PASSWORD=<your-strong-admin-password>             # REQUIRED

# Admin session secret (paste generated secret from step 4.2)
ADMIN_SESSION_SECRET=<paste-your-admin-session-secret> # REQUIRED
```

##### H. CAPTCHA Configuration (REQUIRED)

```bash
# hCaptcha keys (get from https://www.hcaptcha.com)
NEXT_PUBLIC_HCAPTCHA_SITEKEY=your-hcaptcha-sitekey    # REQUIRED
HCAPTCHA_SECRET=your-hcaptcha-secret                   # REQUIRED
```

##### I. External API Access (OPTIONAL)

```bash
# External API key for bot/integration access (paste generated key from step 4.2)
EXTERNAL_API_KEY=<paste-your-external-api-key>        # OPTIONAL
# Leave empty to disable external API access
```

##### J. File Upload and Rate Limiting (Keep Defaults)

```bash
# File upload limits
MAX_FILE_SIZE=5242880                    # 5MB per file
MAX_TOTAL_UPLOAD_SIZE=26214400          # 25MB total per submission
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,gif,doc,docx,xls,xlsx

# Rate limiting (submissions per hour per IP)
FEEDBACK_RATE_LIMIT=60
GRIEVANCE_RATE_LIMIT=60
EA_SERVICE_RATE_LIMIT=10
```

#### 4.5 Save and Exit

```bash
# In nano editor:
# Press Ctrl+O to save
# Press Enter to confirm
# Press Ctrl+X to exit

# Verify file was saved
ls -lh .env
```

#### 4.6 Verify Configuration

```bash
# Check that all REQUIRED variables are set (should NOT show REPLACE or your-domain)
grep -E "REPLACE|your-domain.com|your-email" .env

# If the above command shows results, those values still need to be updated!
```

---

### Step 5: Configure DNS

#### 5.1 Create DNS A Records

Log in to your domain registrar or DNS management console and create the following A records:

| Hostname | Type | Value | TTL |
|----------|------|-------|-----|
| `gea.your-domain.com` | A | `<your-vm-ip>` | 300 |
| `dms.gea.your-domain.com` | A | `<your-vm-ip>` | 300 |

Replace:
- `your-domain.com` with your actual domain
- `<your-vm-ip>` with your VM's public IP address

#### 5.2 Verify DNS Propagation

```bash
# Check DNS resolution (from your VM)
dig +short gea.your-domain.com

# Expected output: Your VM's IP address
# Example: 20.123.45.67
```

```bash
# Alternative check using nslookup
nslookup gea.your-domain.com

# Expected output:
# Server: 8.8.8.8
# Address: 8.8.8.8#53
#
# Non-authoritative answer:
# Name: gea.your-domain.com
# Address: <your-vm-ip>
```

**Note:** DNS propagation typically takes 5-30 minutes but can take up to 24-48 hours.

---

### Step 6: Build and Deploy

#### 6.1 Build Docker Containers

```bash
# Ensure you're in the project root directory
cd ~/GEAv3

# Build all containers (this will take 3-5 minutes)
docker compose build 
docker compose build --no-cache # for rebuilds
```

**Expected output:**
```
[+] Building 180.5s (23/23) FINISHED
 => [frontend internal] load build definition from Dockerfile
 => => transferring dockerfile: 1.23kB
 => [frontend internal] load .dockerignore
 ...
 => [frontend] exporting to image
 => [frontend] => writing image sha256:...
Successfully built
```

#### 6.2 Start All Services

```bash
# Start all services in detached mode
docker compose up -d

# Wait for services to initialize (10-15 seconds)
sleep 15
```

**Expected output:**
```
[+] Running 4/4
 ✔ Network geav3_network    Created
 ✔ Container traefik        Started
 ✔ Container feedback_db    Started
 ✔ Container frontend       Started
```

#### 6.3 Check Service Status

```bash
# Check that all containers are running
docker compose ps
```

**Expected output:**
```
NAME          STATUS                    PORTS
frontend      Up X minutes              3000/tcp
feedback_db   Up X minutes (healthy)    5432/tcp
traefik       Up X minutes              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

All containers should show **"Up"** status. Database should show **"(healthy)"**.

#### 6.4 Monitor Logs

```bash
# View logs from all services
docker compose logs -f

# Press Ctrl+C to stop viewing logs (services continue running)
```

Look for:
- ✅ Traefik: "Configuration loaded successfully"
- ✅ Database: "database system is ready to accept connections"
- ✅ Frontend: "Ready in XXms"

---

### Step 7: Initialize Database

#### 7.1 Wait for Database to be Ready

```bash
# Check database health
docker compose ps feedback_db

# Should show: Up X minutes (healthy)
# If not healthy, wait 30 seconds and check again
```

#### 7.2 Run Database Initialization Script

This script creates all tables, indexes, reference data, and system settings.

```bash
# Navigate to database directory
cd ~/GEAv3/database

# Run master initialization script (recommended - runs all setup scripts)
./scripts/00-master-init.sh
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - MASTER DATABASE INITIALIZATION v7.0                ║
║   Complete setup: Schema + Auth + Reference Data                  ║
╚═══════════════════════════════════════════════════════════════════╝

▶ Step 1: Verifying database connection...
  ✓ Database connection successful

▶ Step 2: Detecting existing database state...
  ℹ️  Database is empty, creating fresh schema

▶ Step 3: Running main schema initialization...
  ✓ Main schema initialized

▶ Step 4: Setting up NextAuth user management...
  ✓ NextAuth tables created

▶ Step 5: Adding service request comments/notes...
  ✓ Service request enhancements added

▶ Step 6: Adding production-specific tables...
  ✓ Production tables added

▶ Step 7: Updating file_extension column size...
  ✓ File extensions updated to support multiple formats

▶ Step 8: Creating system settings and leadership contacts tables...
  ✓ System settings and leadership contacts tables created

▶ Step 9: Adding service provider flag to entity_master...
  ✓ Service provider flag added (DTA enabled by default)

╔═══════════════════════════════════════════════════════════════════╗
║                    VERIFICATION SUMMARY                           ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Total tables created: 33

📊 Summary:
  ✓ Core schema created (all Phase 2b tables)
  ✓ NextAuth authentication ready
  ✓ Service request comments enabled
  ✓ File extensions support multiple formats
  ✓ Reference data loaded
  ✓ 27 EA service attachment requirements configured
  ✓ System settings and leadership contacts tables created
  ✓ ~40 configurable settings seeded
  ✓ Service provider entities configured

✓ MASTER INITIALIZATION COMPLETE
```

#### 7.3 Verify Database Tables

```bash
# Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

# List all tables
\dt

# Expected output: Should see 33 tables
# entity_master, service_master, users, tickets, system_settings, leadership_contacts, etc.

# Check table counts
SELECT
    'entity_master' AS table_name, COUNT(*) AS records FROM entity_master
UNION ALL SELECT 'service_master', COUNT(*) FROM service_master
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles;

# Exit PostgreSQL
\q
```

---

### Step 8: Load Master Data Only

This step loads **only master data** (entities, services, service attachments). No feedback, grievances, or tickets will be loaded.

#### 8.1 Run Master Data Load Script

```bash
# Navigate to database scripts directory
cd ~/GEAv3/database/scripts

# Load master data (entities, services, attachments)
./11-load-master-data.sh --clear
```

The `--clear` flag ensures any sample data is removed before loading production data.

**Expected output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - LOAD MASTER DATA v2.1                              ║
╚═══════════════════════════════════════════════════════════════════╝

▶ Step 1: Verifying prerequisites...
  ✓ Database connection successful
  ✓ All cleaned data files found
  ✓ All SQL templates found

▶ Step 2: Checking existing data...
  ✓ Master tables are empty - ready to load

▶ Step 2.5: Verifying entity_master schema...
  ✓ Schema is up to date (contact columns present)

▶ Step 3: Loading entity_master...
  ✓ Loaded 66 entities from CSV

▶ Step 4: Loading service_master...
  ✓ Loaded 167 services from CSV

▶ Step 5: Loading service_attachments...
  ✓ Loaded 177 attachment requirements from CSV

▶ Step 6: Validating data integrity...
  ✓ All foreign key relationships valid
  ✓ No orphaned records detected

╔═══════════════════════════════════════════════════════════════════╗
║                    DATA LOAD SUMMARY                              ║
╚═══════════════════════════════════════════════════════════════════╝

Record counts:
  Entities: 66
  Services: 167
  Service Attachments: 177

✓ MASTER DATA LOAD COMPLETE
```

#### 8.2 Verify Master Data Loaded

```bash
# Run verification script
cd ~/GEAv3/database/scripts
./13-verify-master-data.sh
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - MASTER DATA VERIFICATION v1.0                      ║
╚═══════════════════════════════════════════════════════════════════╝

✓ Master Data Counts:
  Entities: 66
  Services: 167
  Service Attachments: 177

✓ Entity Types Distribution:
  Ministry: 15
  Department: 28
  Agency: 23

✓ Foreign Key Integrity:
  All services have valid entity references
  All attachments have valid service references
  No orphaned records detected

✓ VERIFICATION PASSED
```

#### 8.3 Confirm No Feedback Data

```bash
# Verify that transactional tables are empty
docker exec -it feedback_db psql -U feedback_user -d feedback -c "
SELECT
    'Service Feedback' AS table_name, COUNT(*) AS records FROM service_feedback
UNION ALL SELECT 'Grievance Tickets', COUNT(*) FROM grievance_tickets
UNION ALL SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'EA Service Requests', COUNT(*) FROM ea_service_requests;
"
```

**Expected output:**
```
    table_name       | records
---------------------+---------
 EA Service Requests |       0
 Grievance Tickets   |       0
 Service Feedback    |       0
 Tickets             |       0
```

All counts should be **0** (zero).

---

### Step 9: Create Admin User

At least one admin user is required to access the admin portal.

#### 9.1 Run Admin Creation Script

```bash
# Navigate to scripts directory
cd ~/GEAv3/database/scripts

# Run admin creation script interactively
./05-add-initial-admin.sh
```

#### 9.2 Provide Admin Details

The script will prompt you for:

```
Enter admin user email: admin@your-domain.com
Enter admin user name: System Administrator
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║   GEA PORTAL - ADD INITIAL ADMIN USER                             ║
╚═══════════════════════════════════════════════════════════════════╝

  Email: admin@your-domain.com
  Name: System Administrator
  Role: Admin (full system access)

✓ Admin user created successfully!

Admin user can now log in using OAuth providers configured in .env:
  - Google OAuth
  - Microsoft OAuth (if enabled)

Next steps:
  1. Configure OAuth provider with this email
  2. Navigate to https://gea.your-domain.com/admin
  3. Sign in with OAuth

✓ ADMIN USER SETUP COMPLETE
```

#### 9.3 Add Additional Admin Users (Optional)

```bash
# To add more admin users, run the script again
ADMIN_EMAIL="another-admin@your-domain.com" \
ADMIN_NAME="Another Admin" \
./05-add-initial-admin.sh
```

---

### Step 10: Verify Deployment

#### 10.1 Check All Services Running

```bash
# Check Docker containers
docker compose ps

# All should show "Up" status
```

#### 10.2 Test HTTPS Access

```bash
# Test HTTPS endpoint
curl -I https://gea.your-domain.com
```

**Expected output:**
```
HTTP/2 200
server: nginx/1.x.x
content-type: text/html
...
```

Look for `HTTP/2 200` - this confirms HTTPS is working.

#### 10.3 Test API Endpoints

```bash
# Test health endpoint
curl https://gea.your-domain.com/api/health

# Expected output:
{"status":"ok"}
```

```bash
# Test public API - ticket categories
curl https://gea.your-domain.com/api/tickets/categories

# Expected output: JSON array with categories
[
  {"category_code":"GEN","category_name":"General Inquiry",...},
  ...
]
```

#### 10.4 Verify SSL Certificate

```bash
# Check SSL certificate details
echo | openssl s_client -connect gea.your-domain.com:443 -servername gea.your-domain.com 2>/dev/null | openssl x509 -noout -dates
```

**Expected output:**
```
notBefore=Jan  9 10:00:00 2026 GMT
notAfter=Apr  9 10:00:00 2026 GMT
```

This confirms Let's Encrypt SSL certificate is installed.

#### 10.5 Test Admin Portal Access

Open a web browser and navigate to:

```
https://gea.your-domain.com/admin
```

You should see:
1. **Admin Login Page** with OAuth provider buttons
2. Click "Sign in with Google" (or Microsoft)
3. Complete OAuth authentication
4. Should redirect to **Admin Dashboard**

If successful, you should see:
- Navigation menu with dashboard sections
- Entity statistics
- Service listings
- User management options

---

## Post-Installation Configuration

### 1. Configure OAuth Providers

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URI:
   ```
   https://gea.your-domain.com/api/auth/callback/google
   ```
7. Copy **Client ID** and **Client Secret**
8. Update `.env` file with these credentials
9. Restart frontend container:
   ```bash
   docker compose restart frontend
   ```

#### Microsoft OAuth Setup (Optional)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: `GEA Portal`
5. Redirect URI: `https://gea.your-domain.com/api/auth/callback/azure-ad`
6. Register the application
7. Go to **Certificates & secrets** → Create new client secret
8. Copy **Application (client) ID**, **Client Secret**, and **Directory (tenant) ID**
9. Update `.env` file:
   ```bash
   MICROSOFT_CLIENT_ID=<your-client-id>
   MICROSOFT_CLIENT_SECRET=<your-client-secret>
   MICROSOFT_TENANT_ID=<your-tenant-id>
   ```
10. Restart frontend container

### 2. Configure Automated Backups

```bash
# Create backup directory
mkdir -p ~/backups/gea-portal

# Create backup script
cat > ~/backup-gea.sh << 'EOF'
#!/bin/bash
# GEA Portal Automated Backup Script

BACKUP_DIR=~/backups/gea-portal
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gea_backup_$DATE.sql"

# Create backup
docker exec feedback_db pg_dump -U feedback_user feedback > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "gea_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

# Make script executable
chmod +x ~/backup-gea.sh

# Test backup
~/backup-gea.sh
```

#### Schedule Daily Backups with Cron

```bash
# Edit crontab
crontab -e

# Add this line (runs backup at 2 AM daily)
0 2 * * * /home/$(whoami)/backup-gea.sh >> /home/$(whoami)/backup.log 2>&1
```

### 3. Configure Monitoring (Optional)

```bash
# Create monitoring script
cat > ~/monitor-gea.sh << 'EOF'
#!/bin/bash
# GEA Portal Monitoring Script

echo "=== GEA Portal Status $(date) ==="
echo ""

# Check containers
echo "Container Status:"
docker compose ps

echo ""
echo "Resource Usage:"
docker stats --no-stream

echo ""
echo "Disk Usage:"
df -h | grep -E "Filesystem|/$"

echo ""
echo "Database Size:"
docker exec feedback_db psql -U feedback_user -d feedback -c \
  "SELECT pg_size_pretty(pg_database_size('feedback'));"
EOF

# Make script executable
chmod +x ~/monitor-gea.sh

# Run monitoring
~/monitor-gea.sh
```

### 4. Set Up Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/gea-portal << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF

# Test logrotate
sudo logrotate -f /etc/logrotate.d/gea-portal
```

### 5. Enable System Monitoring

```bash
# Install htop for system monitoring
sudo apt install -y htop

# Monitor system resources
htop

# View Docker container stats
docker stats
```

---

## Troubleshooting

### Issue 1: Containers Not Starting

**Symptoms:**
```
Error response from daemon: driver failed programming external connectivity
```

**Solution:**
```bash
# Check if ports are already in use
sudo lsof -i :80
sudo lsof -i :443

# If Apache or nginx is running, stop it
sudo systemctl stop apache2
sudo systemctl stop nginx

# Restart Docker Compose
docker compose down
docker compose up -d
```

### Issue 2: Database Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED
```

**Solution:**
```bash
# Check database container status
docker compose ps feedback_db

# Check database logs
docker compose logs feedback_db

# Restart database
docker compose restart feedback_db

# Wait for healthy status
watch -n 2 'docker compose ps feedback_db'
```

### Issue 3: SSL Certificate Not Issued

**Symptoms:**
- Browser shows "Connection not secure"
- Certificate errors in Traefik logs

**Solution:**
```bash
# Check Traefik logs
docker compose logs traefik | grep -i certificate

# Verify DNS is correct
dig +short gea.your-domain.com

# Ensure ports 80 and 443 are accessible from internet
curl -I http://gea.your-domain.com

# Restart Traefik
docker compose restart traefik

# Wait 2-3 minutes for certificate issuance
```

### Issue 4: Master Data Load Failed

**Symptoms:**
```
Error: Failed to load entity master
```

**Solution:**
```bash
# Check CSV files exist
ls -l ~/GEAv3/database/master-data/

# Re-run load script with verbose output
cd ~/GEAv3/database/scripts
bash -x ./11-load-master-data.sh --clear

# If still failing, manually check database
docker exec -it feedback_db psql -U feedback_user -d feedback
\dt
SELECT COUNT(*) FROM entity_master;
\q
```

### Issue 5: Admin User Cannot Login

**Symptoms:**
- OAuth login succeeds but redirects to error page
- "Unauthorized" message

**Solution:**
```bash
# Check if admin user exists in database
docker exec -it feedback_db psql -U feedback_user -d feedback -c \
  "SELECT email, name, role_code FROM users WHERE email = 'admin@your-domain.com';"

# Verify user role is 'admin'
# If not found, recreate admin user
cd ~/GEAv3/database/scripts
ADMIN_EMAIL="admin@your-domain.com" ADMIN_NAME="Admin" ./05-add-initial-admin.sh

# Verify OAuth email matches user email exactly
# Check .env for correct OAuth credentials
grep -E "GOOGLE_CLIENT|MICROSOFT_CLIENT" ~/GEAv3/.env
```

### Issue 6: Out of Disk Space

**Symptoms:**
```
no space left on device
```

**Solution:**
```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a

# Remove old Docker images
docker image prune -a

# Remove old backups
find ~/backups -mtime +30 -delete

# Check disk usage again
df -h
```

### Issue 7: Frontend Build Failed

**Symptoms:**
```
ERROR: failed to solve: process "/bin/sh -c npm run build" did not complete successfully
```

**Solution:**
```bash
# Check .env file has all required variables
grep -E "^[A-Z_]+=.*$" ~/GEAv3/.env | wc -l
# Should be 40+ lines

# Rebuild without cache
cd ~/GEAv3
docker compose build --no-cache frontend

# Check build logs
docker compose logs frontend

# If still failing, check Node.js memory
# Edit docker-compose.yml and add to frontend service:
# environment:
#   - NODE_OPTIONS=--max-old-space-size=4096
```

### Issue 8: SendGrid Emails Not Sending

**Symptoms:**
- No email notifications received
- Warning logs: "SendGrid not configured - email features disabled"

**Expected Behavior (No SendGrid):**
This is normal if SendGrid is not configured. The application works without email.

**Solution (If Email is Needed):**
```bash
# Verify SendGrid API key is set
grep SENDGRID_API_KEY ~/GEAv3/.env

# Test SendGrid API key manually
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@your-domain.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test email"}]
  }'

# Check SendGrid dashboard for errors
# https://app.sendgrid.com/

# Verify sender email is verified in SendGrid

# Restart frontend after adding/updating SendGrid config
docker compose restart frontend
```

---

## Appendices

### Appendix A: Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BASE_DOMAIN` | Yes | Your base domain | `gov.gd` |
| `FRONTEND_DOMAIN` | Yes | Portal subdomain | `gea.gov.gd` |
| `LETS_ENCRYPT_EMAIL` | Yes | Email for SSL cert notifications | `admin@gov.gd` |
| `FEEDBACK_DB_PASSWORD` | Yes | PostgreSQL password | `<generated>` |
| `SENDGRID_API_KEY` | No | SendGrid API key (for email notifications) | `SG.xxxxx` |
| `SENDGRID_FROM_EMAIL` | No | Sender email address | `noreply@gov.gd` |
| `SERVICE_ADMIN_EMAIL` | No | Admin notification recipient | `admin@gov.gd` |
| `NEXTAUTH_SECRET` | Yes | NextAuth encryption secret | `<generated>` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID | `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth secret | `<from Google>` |
| `ADMIN_PASSWORD` | Yes | Admin login password | `<strong password>` |
| `ADMIN_SESSION_SECRET` | Yes | Admin session encryption | `<generated>` |
| `HCAPTCHA_SITEKEY` | Yes | hCaptcha site key | `<from hCaptcha>` |
| `HCAPTCHA_SECRET` | Yes | hCaptcha secret | `<from hCaptcha>` |
| `EXTERNAL_API_KEY` | No | External API access | `<generated or empty>` |

> **Note:** SendGrid variables are optional. When not configured, email notifications are disabled but the application works normally.

### Appendix B: Database Schema Overview

**33 Tables Organized by Category:**

**Master Data (7 tables):**
- `entity_master` - Government entities (66 entities)
- `service_master` - Government services (167 services)
- `service_attachments` - Document requirements (177 attachments)
- `priority_levels` - Priority definitions
- `ticket_status` - Ticket workflow states
- `ticket_categories` - Ticket categorization
- `grievance_status` - Grievance workflow states

**Transactional Data (7 tables) - Empty after fresh install:**
- `service_feedback` - Citizen feedback ratings
- `grievance_tickets` - Grievance submissions
- `grievance_attachments` - Grievance file attachments
- `tickets` - Unified ticketing system
- `ticket_activity` - Ticket activity timeline
- `ticket_attachments` - Ticket file attachments
- `ea_service_requests` - EA service requests

**Authentication (8 tables):**
- `users` - User accounts (created by OAuth)
- `user_roles` - Role definitions (admin, staff, public)
- `accounts` - OAuth provider data
- `sessions` - Active sessions
- `verification_tokens` - Email verification
- `entity_user_assignments` - User-entity mapping
- `user_permissions` - Fine-grained permissions
- `user_audit_log` - User activity audit

**Admin Settings (3 tables):**
- `system_settings` - Admin-configurable application settings (~40 settings)
- `settings_audit_log` - Settings change history
- `leadership_contacts` - Dynamic leadership contacts for About page

**Security & Audit (3 tables):**
- `submission_rate_limit` - Rate limiting
- `submission_attempts` - Submission audit trail
- `captcha_challenges` - CAPTCHA verification

**QR Codes (1 table):**
- `qr_codes` - QR code deployment tracking

### Appendix C: Docker Commands Reference

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart specific service
docker compose restart frontend

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f frontend

# Check service status
docker compose ps

# Enter container shell
docker exec -it frontend /bin/sh

# Database backup
docker exec feedback_db pg_dump -U feedback_user feedback > backup.sql

# Database restore
docker exec -i feedback_db psql -U feedback_user feedback < backup.sql

# Clean Docker resources
docker system prune -a

# Rebuild and restart
docker compose build --no-cache && docker compose up -d
```

### Appendix D: Useful Database Queries

```sql
-- Connect to database
docker exec -it feedback_db psql -U feedback_user -d feedback

-- Check master data counts
SELECT
    'Entities' AS table_name, COUNT(*) FROM entity_master
UNION ALL SELECT 'Services', COUNT(*) FROM service_master
UNION ALL SELECT 'Attachments', COUNT(*) FROM service_attachments;

-- List all entities
SELECT entity_id, entity_name, entity_type FROM entity_master ORDER BY entity_name;

-- List all services
SELECT service_id, service_name, entity_id FROM service_master ORDER BY service_name;

-- Check users and roles
SELECT u.email, u.name, r.role_type, r.role_name
FROM users u
JOIN user_roles r ON u.role_code = r.role_code;

-- Verify transactional tables are empty
SELECT
    'Feedback' AS table_name, COUNT(*) FROM service_feedback
UNION ALL SELECT 'Grievances', COUNT(*) FROM grievance_tickets
UNION ALL SELECT 'Tickets', COUNT(*) FROM tickets
UNION ALL SELECT 'EA Requests', COUNT(*) FROM ea_service_requests;

-- Database size
SELECT pg_size_pretty(pg_database_size('feedback'));

-- Exit
\q
```

### Appendix E: File Locations

| File/Directory | Path | Purpose |
|----------------|------|---------|
| Project root | `~/GEAv3/` | Main repository |
| Environment config | `~/GEAv3/.env` | Configuration file |
| Docker Compose | `~/GEAv3/docker-compose.yml` | Service definitions |
| Database scripts | `~/GEAv3/database/scripts/` | SQL initialization scripts |
| Master data CSVs | `~/GEAv3/database/master-data/` | Entity/service data |
| Frontend code | `~/GEAv3/frontend/` | Next.js application |
| Documentation | `~/GEAv3/docs/` | All documentation |
| Backups | `~/backups/gea-portal/` | Database backups |
| Docker volumes | `/var/lib/docker/volumes/` | Persistent data |
| Container logs | `/var/lib/docker/containers/` | Application logs |

### Appendix F: Port Mappings

| Service | Internal Port | External Port | Protocol | Purpose |
|---------|---------------|---------------|----------|---------|
| Traefik | - | 80 | HTTP | HTTP → HTTPS redirect |
| Traefik | - | 443 | HTTPS | SSL termination |
| Frontend | 3000 | - | HTTP | Next.js application |
| PostgreSQL | 5432 | - | TCP | Database access |

All services communicate via the `geav3_network` Docker bridge network.

### Appendix G: Security Checklist

Post-installation security review:

- [ ] All `.env` passwords are strong and unique
- [ ] `.env` file permissions set to 600 (not world-readable)
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSH key-based authentication enabled (disable password auth)
- [ ] SSL certificate issued and valid (check browser)
- [ ] OAuth providers configured with correct redirect URIs
- [ ] Database accessible only from Docker network (not public)
- [ ] Regular backups scheduled (cron job)
- [ ] System updates configured (unattended-upgrades)
- [ ] Admin users use strong OAuth accounts
- [ ] SendGrid API key has minimal required permissions
- [ ] hCaptcha enabled on all public forms
- [ ] Rate limiting configured (default: 3-5 per hour)
- [ ] External API key secured (if enabled)
- [ ] Docker containers run as non-root users

---

## Next Steps

After completing the fresh installation:

1. **Configure Admin Settings** (RECOMMENDED)
   - Navigate to Admin Portal → Settings
   - Review and update configurable settings:
     - **System Tab**: Site name, branding (logo/favicon), contact emails
     - **Authentication Tab**: OAuth provider credentials (Google/Microsoft)
     - **Integrations Tab**: SendGrid API key, chatbot URL
     - **Business Rules Tab**: Rate limits, thresholds, file upload limits
     - **Content Tab**: Footer URLs, leadership contacts
     - **Service Providers Tab**: Configure which entities can receive service requests
   - Settings are pre-seeded with defaults but should be customized
   - DTA (AGY-005) is enabled as the default service provider

2. **Add Government Entities and Services** (if not using default master data)
   - Navigate to Admin Portal → Manage Data → Entities
   - Add or update government entities
   - Add or update services

3. **Configure Staff Users**
   - Navigate to Admin Portal → User Management
   - Add staff users from government entities
   - Assign entity access permissions

4. **Test Citizen-Facing Features**
   - Test feedback submission form
   - Test grievance submission
   - Test service request form
   - Verify email notifications work

5. **Generate QR Codes** (for physical locations)
   - Navigate to Admin Portal → QR Codes
   - Generate QR codes for services
   - Print and deploy to service locations

6. **Review Analytics Dashboard**
   - Navigate to Admin Portal → Analytics
   - Review feedback trends
   - Check service performance
   - Monitor SLA compliance

7. **Configure Additional Features**
   - Set up external API access (if needed)
   - Configure AI bot integration (if using)
   - Customize branding and content via Settings

---

## Support

- **Repository:** https://github.com/abhirupbanerjee/GEAv3
- **Documentation:** [docs/index.md](index.md)
- **API Reference:** [docs/API_REFERENCE.md](API_REFERENCE.md)
- **Database Reference:** [docs/DATABASE_REFERENCE.md](DATABASE_REFERENCE.md)
- **Issues:** https://github.com/abhirupbanerjee/GEAv3/issues

---

**Document Version:** 1.1
**Last Updated:** January 14, 2026
**Status:** Production Ready
**Maintained By:** GEA Portal Development Team
