# Captcha Settings Cleanup Documentation

## Background

**Date:** 2026-01-20
**Issue:** Captcha settings (hCaptcha) were manually added to the production database but never committed to version control.

**Problem:**
- Production database had `captcha_challenges` table
- Production had `HCAPTCHA_ENABLED`, `HCAPTCHA_SITE_KEY`, `HCAPTCHA_SECRET` settings
- None of this existed in the codebase
- Code comment in `/frontend/src/lib/rate-limit.ts` said "No CAPTCHA logic (out of scope)"
- Created deployment risks and code-database mismatches

**Decision:** Option 1 - Remove captcha from production to align with codebase

---

## What Was Removed

### Database Tables
- `captcha_challenges` table (5 columns)
  - `challenge_id` (SERIAL PRIMARY KEY)
  - `ip_hash` (VARCHAR 64)
  - `challenge_issued_at` (TIMESTAMP)
  - `challenge_completed_at` (TIMESTAMP)
  - `success` (BOOLEAN)

### Settings
- `HCAPTCHA_ENABLED` (boolean)
- `HCAPTCHA_SITE_KEY` (secret)
- `HCAPTCHA_SECRET` (secret)

### Audit Log Entries
- All settings_audit_log entries for captcha settings

---

## How to Execute Cleanup

### On Production

```bash
# 1. Connect to production server
ssh user@production-server

# 2. Navigate to database scripts directory
cd /path/to/gogeaportal/v3/database/scripts

# 3. Run the cleanup script
./26-remove-captcha-settings.sh
```

The script will:
1. **Back up** all captcha data to `/tmp/captcha_backup_YYYYMMDD_HHMMSS/`
2. **Remove** captcha settings from `system_settings`
3. **Remove** captcha audit log entries
4. **Drop** the `captcha_challenges` table

### Backup Files Created

The script creates these backup files:
- `captcha_settings.csv` - Settings data for rollback
- `captcha_challenges.csv` - Table data for rollback
- `captcha_challenges_schema.sql` - Table structure for rollback

**Important:** Keep these backups for at least 30 days in case rollback is needed.

---

## How to Rollback (If Needed)

If you need to restore the captcha settings:

```bash
# Run the rollback script with the backup directory
./26-remove-captcha-settings-ROLLBACK.sh /tmp/captcha_backup_20260120_143000
```

This will:
1. Restore the `captcha_challenges` table structure
2. Restore the table data
3. Restore the settings to `system_settings`

---

## Verification

After running the cleanup, verify the removal:

```sql
-- Check that captcha settings are gone
SELECT * FROM system_settings WHERE setting_key ILIKE '%captcha%';
-- Should return 0 rows

-- Check that table is gone
SELECT table_name FROM information_schema.tables WHERE table_name = 'captcha_challenges';
-- Should return 0 rows
```

---

## Impact Assessment

### Before Cleanup
- **Production:** Had captcha settings
- **Dev/Staging:** No captcha settings
- **Codebase:** No captcha implementation
- **Status:** ❌ Mismatch

### After Cleanup
- **Production:** No captcha settings
- **Dev/Staging:** No captcha settings
- **Codebase:** No captcha implementation
- **Status:** ✅ Aligned

### Affected Features
- **None** - Captcha was never implemented in the codebase
- Rate limiting still works (uses existing `submission_attempts` and `submission_rate_limit` tables)

---

## Future Considerations

If you need captcha functionality in the future:

### Option A: Use hCaptcha
1. Create proper migration script (`database/scripts/XX-add-captcha.sh`)
2. Add settings to `16-create-system-settings.sh`
3. Implement frontend captcha component
4. Add captcha verification to rate-limit logic
5. Test in dev/staging before production
6. Commit to version control
7. Deploy properly

### Option B: Use Alternative
- Google reCAPTCHA v3 (invisible)
- Cloudflare Turnstile
- Other bot protection services

---

## Related Files

**Cleanup Scripts:**
- `/database/scripts/26-remove-captcha-settings.sh` - Main cleanup script
- `/database/scripts/26-remove-captcha-settings-ROLLBACK.sh` - Rollback script
- `/database/scripts/README-captcha-cleanup.md` - This documentation

**Evidence:**
- `/database/docs/Prod_data.md` - Production schema showing captcha_challenges table
- `/frontend/src/lib/rate-limit.ts:7` - Comment saying "No CAPTCHA logic (out of scope)"

**Settings Tree:**
- `/home/ab/.claude/plans/effervescent-munching-unicorn.md` - Complete settings documentation

---

## Questions?

If you have questions or issues:
1. Check the backup files in `/tmp/captcha_backup_*/`
2. Review this documentation
3. Check the settings audit log for history
4. Use rollback script if needed

---

**Approved by:** User
**Executed on:** TBD
**Executed by:** TBD
**Backup location:** TBD
