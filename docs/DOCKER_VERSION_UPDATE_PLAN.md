# Documentation Update Plan - Docker 27.x Requirement

**Issue:** Docker 28.x/29.x incompatible with Traefik v3.x
**Solution:** Use Docker 27.5.1
**Date:** November 28, 2025

---

## Files Requiring Updates

### 1. README.md (Root)
**Location:** `/home/azureuser/GEAv3/README.md`

**Changes Required:**

#### Section: Prerequisites (Lines 30-40)
**Current:**
```markdown
| **Docker** | 24.x+ | **28.x+** |
| **Docker Compose** | v2.20+ | **v2.39+** |
```

**Update to:**
```markdown
| **Docker** | 27.5.1 | **27.5.1** (Required) |
| **Docker Compose** | v2.20+ | **v2.40+** |
```

#### Section: Tested Production Environment (Lines 45-52)
**Current:**
```markdown
| **Docker** | 28.4.0 | Official CE or Snap |
| **Docker Compose** | v2.39.1 | Plugin version |
```

**Update to:**
```markdown
| **Docker** | 27.5.1 | ⚠️ Required - v28+/29+ incompatible with Traefik |
| **Docker Compose** | v2.40.1 | Plugin version |
```

#### Add New Section After "Tested Production Environment"
**Insert at line ~53:**
```markdown
### ⚠️ Important: Docker Version Compatibility

**Use Docker 27.5.1 - Required for Traefik Compatibility**

Docker 28.x and 29.x have API compatibility issues with Traefik v3.x that cannot be resolved through configuration. The portal requires **Docker 27.5.1**.

**Symptoms of wrong version:**
```
ERR Failed to retrieve information of the docker client and server host
error="Error response from daemon: client version 1.24 is too old.
Minimum supported API version is 1.44"
```

**See:** [docs/DOCKER_TRAEFIK_COMPATIBILITY.md](docs/DOCKER_TRAEFIK_COMPATIBILITY.md) for installation instructions.
```

---

### 2. VM_SETUP_GUIDE.md
**Location:** `/home/azureuser/GEAv3/docs/VM_SETUP_GUIDE.md`

**Changes Required:**

#### Section: "Step 3: Install Docker" (Around line 150)
**Replace entire Docker installation section with:**

```markdown
## Step 3: Install Docker 27.5.1

### ⚠️ Important: Version-Specific Installation

The portal requires **Docker 27.5.1** due to Traefik v3.x compatibility. Docker 28.x and 29.x will **not work**.

**Complete installation instructions:** See [DOCKER_TRAEFIK_COMPATIBILITY.md](DOCKER_TRAEFIK_COMPATIBILITY.md)

### Quick Install (Docker 27.5.1)

```bash
# 1. Add Docker repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 2. Install Docker 27.5.1 (specific version)
sudo apt-get update
VERSION_STRING=5:27.5.1-1~ubuntu.24.04~noble
sudo apt-get install -y \
  docker-ce=$VERSION_STRING \
  docker-ce-cli=$VERSION_STRING \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# 3. Prevent auto-upgrade to incompatible versions
sudo apt-mark hold docker-ce docker-ce-cli

# 4. Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# 5. Verify installation
docker --version
# Expected: Docker version 27.5.1, build 9f9e405

docker compose version
# Expected: Docker Compose version v2.40.x+
```

### If You Accidentally Installed Docker 28+ or 29+

See complete downgrade instructions in [DOCKER_TRAEFIK_COMPATIBILITY.md](DOCKER_TRAEFIK_COMPATIBILITY.md)

**Quick downgrade:**
```bash
# Stop all containers
cd ~/GEAv3
docker compose down

# Remove Docker
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# Install correct version (follow steps above)
```
```

---

### 3. SOLUTION_ARCHITECTURE.md
**Location:** `/home/azureuser/GEAv3/docs/SOLUTION_ARCHITECTURE.md`

**Search for:** Docker version references
**Update:** Technology stack section with Docker 27.5.1 requirement

---

### 4. index.md
**Location:** `/home/azureuser/GEAv3/docs/index.md`

**Search for:** Prerequisites or requirements section
**Update:** Docker version to 27.5.1 with compatibility note

---

### 5. infra_sizing_quick_reference.md
**Location:** `/home/azureuser/GEAv3/docs/infra/infra_sizing_quick_reference.md`

**Search for:** Docker version
**Update:** Required Docker version and add Traefik compatibility note

---

### 6. Create New Compatibility Guide
**New File:** `/home/azureuser/GEAv3/docs/DOCKER_TRAEFIK_COMPATIBILITY.md`

**Content:** The Docker & Traefik Compatibility Guide you provided (already created)

---

## Update Priority

| Priority | File | Impact |
|----------|------|--------|
| 🔴 Critical | README.md | First file users see |
| 🔴 Critical | VM_SETUP_GUIDE.md | Installation instructions |
| 🔴 Critical | DOCKER_TRAEFIK_COMPATIBILITY.md | New file - detailed fix |
| 🟡 High | SOLUTION_ARCHITECTURE.md | Technical reference |
| 🟡 High | index.md | Documentation index |
| 🟢 Medium | infra_sizing_quick_reference.md | Infrastructure sizing |

---

## Verification Checklist

After updates, verify:

- [ ] All Docker version references changed to 27.5.1
- [ ] Warning about Docker 28+/29+ incompatibility added
- [ ] Link to DOCKER_TRAEFIK_COMPATIBILITY.md added in key locations
- [ ] Installation commands specify exact version (5:27.5.1-1~ubuntu.24.04~noble)
- [ ] `apt-mark hold` command included to prevent auto-upgrade
- [ ] Downgrade instructions linked/referenced
- [ ] Production environment table updated

---

## Key Messages to Communicate

1. **Docker 27.5.1 is REQUIRED** - not recommended, required
2. **Docker 28+ and 29+ will NOT work** with Traefik v3.x
3. **Use exact version string** when installing: `5:27.5.1-1~ubuntu.24.04~noble`
4. **Prevent auto-upgrade** with `apt-mark hold`
5. **Downgrade is necessary** if 28+ or 29+ is already installed

---

## Related Updates

### docker-compose.yml
**No changes required** - Works with Docker 27.5.1

### Dockerfile
**No changes required** - Already fixed (npm ci without --only=production)

### .env.example
**Add to comments section:**
```bash
# ============================================
# DOCKER VERSION REQUIREMENT
# ============================================
# This portal requires Docker 27.5.1
# Docker 28.x and 29.x are NOT compatible with Traefik v3.x
# See docs/DOCKER_TRAEFIK_COMPATIBILITY.md for details
```

---

## Testing Notes

After documentation updates:

1. Test fresh installation on Ubuntu 24.04 following updated VM_SETUP_GUIDE.md
2. Verify Docker 27.5.1 installs correctly with exact version string
3. Confirm Traefik starts without API version errors
4. Test that apt-mark hold prevents accidental upgrades
5. Verify downgrade instructions work if Docker 28+ is installed

---

## Communication Plan

**Target Audiences:**
1. **New installers** - Will see updated README.md prerequisites
2. **Existing deployments** - Need migration guide if on Docker 28+
3. **System administrators** - Need clear version pinning instructions
4. **Developers** - Need to understand compatibility constraints

**Key Documentation:**
- README.md - First touchpoint
- VM_SETUP_GUIDE.md - Detailed installation
- DOCKER_TRAEFIK_COMPATIBILITY.md - Deep dive and troubleshooting

---

## Future Considerations

**Monitor for:**
1. Traefik updates that add Docker 28+ API support
2. Docker 27.x LTS maintenance window
3. Alternative reverse proxy options if needed
4. Docker API version compatibility changes

**Update triggers:**
- New Traefik release with Docker 28+ support
- Docker 27.x reaches EOL
- Community finds workaround for API version issue

---

**Last Updated:** November 28, 2025
**Issue Tracking:** Internal documentation update
**Status:** Ready for implementation
