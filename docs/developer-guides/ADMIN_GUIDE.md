# Administrator Guide - Configuration Management

## Overview

This guide explains how to configure the Government of Grenada EA Portal system. Understanding the difference between environment-controlled and runtime-controlled settings is crucial for effective system administration.

---

## Configuration Architecture

The portal uses two primary configuration sources:

1. **Environment Variables** (`.env` file) - Build-time configuration
2. **Database Settings** - Runtime configuration via Admin UI

### When to Use Each

| Use Environment Variables (.env) | Use Database Settings (Admin UI) |
|----------------------------------|----------------------------------|
| Infrastructure settings (URLs, domains) | Content and display settings |
| Security credentials (API keys, secrets) | Email configuration (from name, from email) |
| Site identity (name, branding) | Feature toggles and rate limits |
| Settings that rarely change | Settings that change frequently |
| **Requires Docker rebuild** | **Changes apply immediately** |

---

## Environment-Controlled Settings

These settings are defined in the `.env` file and **require a Docker rebuild** to take effect.

### Changing Site Name

The site name that appears in browser tabs is controlled by the `NEXT_PUBLIC_SITE_NAME` environment variable.

**Steps to change the site name:**

1. Edit the `.env` file in the project root:
   ```bash
   nano /home/ab/Projects/gogeaportal/v3/.env
   ```

2. Update the `NEXT_PUBLIC_SITE_NAME` variable:
   ```bash
   NEXT_PUBLIC_SITE_NAME=Your New Site Name
   ```

3. Rebuild and restart the Docker containers:
   ```bash
   cd /home/ab/Projects/gogeaportal/v3
   docker compose down
   docker compose up -d --build
   ```

4. Wait for the containers to fully start (typically 2-3 minutes)

5. Refresh your browser to see the new site name

**Note:** The SITE_NAME field in Settings > System is **read-only** and displays the current value from the `.env` file. You cannot change it through the Admin UI.

### Other Environment-Controlled Settings

The following settings are also controlled by the `.env` file and require Docker rebuild:

| Setting | Environment Variable | Purpose |
|---------|---------------------|---------|
| Site Name | `NEXT_PUBLIC_SITE_NAME` | Application name in browser tabs and headers |
| Site Short Name | `NEXT_PUBLIC_SITE_SHORT_NAME` | Abbreviated name for compact displays |
| Frontend URL | `NEXT_PUBLIC_FRONTEND_URL` | Base URL for the application |
| Base Domain | `NEXT_PUBLIC_BASE_DOMAIN` | Root domain for the deployment |

### Security Credentials

The following credentials **must** remain in the `.env` file and should **never** be stored in the database:

- `SENDGRID_API_KEY` - Email service API key
- `ADMIN_PASSWORD` - Admin account password
- `ADMIN_SESSION_SECRET` - Session encryption secret
- `NEXTAUTH_SECRET` - NextAuth.js authentication secret
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth secret
- `EXTERNAL_API_KEY` - External service API key
- `FEEDBACK_DB_PASSWORD` - Database password

---

## Runtime-Controlled Settings

These settings can be changed directly through the Admin UI and take effect immediately (may require page refresh).

### Accessing Settings

1. Log in to the admin panel
2. Navigate to **Settings** in the sidebar
3. Choose the appropriate category:
   - **System** - Technical configuration
   - **Content** - Text and display settings
   - **Email** - Email notification settings
   - **Footer** - Footer links and copyright

### System Settings

Navigate to **Settings > System** to configure:

- **Session Duration** - How long admin sessions remain active
- **File Upload Limits** - Maximum file sizes for uploads
- **Rate Limits** - API request throttling
- **Backup Schedule** - Automated backup timing

### Content Settings

Navigate to **Settings > Content** to configure:

- **Welcome Messages** - Homepage banner text
- **About Section** - Organization information
- **Copyright Text** - Footer copyright notice
- **Contact Information** - Public contact details

### Email Settings

Navigate to **Settings > Email** to configure:

- **From Email Address** - Sender email for system notifications
- **From Name** - Display name for system emails
- **Admin Email** - Recipient for service requests
- **Contact Email** - Public contact address

### Footer Settings

Navigate to **Settings > Footer** to configure:

- **Footer Links** - Quick links in footer
- **Social Media** - Social media URLs
- **Copyright Text** - Custom copyright notice

---

## Best Practices

### Configuration Changes

1. **Test in Development First**
   - Always test configuration changes in a development environment
   - Verify the changes work as expected before applying to production

2. **Document Changes**
   - The system automatically logs all settings changes in the audit log
   - Add meaningful change reasons when updating settings

3. **Backup Before Major Changes**
   - Create a database backup before making significant configuration changes
   - Export current `.env` file before modifying environment variables

4. **Coordinate Rebuilds**
   - Schedule Docker rebuilds during maintenance windows
   - Notify users before taking the system offline for rebuilds

### Security

1. **Protect the .env File**
   - Never commit `.env` to version control
   - Restrict file permissions: `chmod 600 .env`
   - Use different secrets for development and production

2. **Rotate Secrets Regularly**
   - Update API keys and secrets periodically
   - Use strong, randomly generated secrets

3. **Monitor Access**
   - Review settings audit logs regularly
   - Investigate unexpected configuration changes

### Troubleshooting

#### Changes Not Appearing

**Symptom:** Settings changed in Admin UI don't take effect

**Solutions:**
1. Check if the setting is environment-controlled (appears greyed out in UI)
2. Clear browser cache and refresh
3. Check if the setting requires application restart
4. Review audit logs to confirm the change was saved

**Symptom:** Environment variable changes not taking effect

**Solutions:**
1. Verify you edited the correct `.env` file
2. Confirm you ran `docker compose down` before rebuilding
3. Check Docker logs for build errors: `docker compose logs frontend`
4. Verify environment variable syntax (no spaces around `=`)

#### Common Errors

**Error:** "SITE_NAME is controlled by the .env file"

**Cause:** Attempting to save SITE_NAME through the Admin UI

**Solution:** Update `NEXT_PUBLIC_SITE_NAME` in `.env` and rebuild containers

**Error:** "Setting requires application restart"

**Cause:** Some settings need the application to restart to take effect

**Solution:** Navigate to System > Restart or manually restart containers:
```bash
docker compose restart frontend
```

---

## Advanced Configuration

### Custom Environment Variables

To add new environment-controlled settings:

1. Add the variable to `.env`
2. Add it to `docker-compose.yml` build args
3. Add it to `frontend/Dockerfile` ARG declarations
4. Update `frontend/src/config/env.ts` to read the variable
5. Rebuild containers

### Database Settings Schema

Settings are stored in the `system_settings` table with:
- `setting_key` - Unique identifier
- `setting_value` - Current value
- `setting_type` - Data type (string, number, boolean, etc.)
- `category` - Grouping (SYSTEM, CONTENT, EMAIL, FOOTER)
- `is_runtime` - Whether changes apply without restart

All changes are logged in `settings_audit_log` with:
- Timestamp
- User who made the change
- Old and new values
- Change reason

---

## Support

For technical issues or questions:

1. Check the [ENV_OPTIMIZATION.md](./ENV_OPTIMIZATION.md) guide for detailed configuration analysis
2. Review the [README.md](../../README.md) for deployment instructions
3. Contact the development team for assistance

---

## Changelog

### 2026-02-20
- Initial guide created
- Documented environment vs runtime settings
- Added troubleshooting section
- Explained site name configuration

---

**Last Updated:** 2026-02-20
**Version:** 1.0
