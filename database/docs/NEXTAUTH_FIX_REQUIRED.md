# NextAuth Script Fix - Critical Issue

## Problem Summary

The `04-nextauth-users.sh` script is failing silently when called from `00-master-init.sh` during `--fresh` execution, causing:

1. ❌ Admin user creation fails (users table doesn't exist)
2. ❌ Verification scripts fail (users table doesn't exist)
3. ❌ Only 3 out of 8 tables are created (user_roles, users, accounts)
4. ❌ Missing tables: sessions, verification_tokens, entity_user_assignments, user_permissions, user_audit_log

## Root Cause

The script uses `set -e` (line 20) which exits immediately on any error, combined with HEREDOC syntax that doesn't properly propagate errors back to the calling script. When a HEREDOC command fails, the script exits but `00-master-init.sh` doesn't detect the failure.

## Evidence

```bash
# After running --fresh:
docker exec feedback_db psql -U feedback_user -d feedback -c "\dt" | grep -E "users|accounts|sessions"

# Result:
# users        ✓ EXISTS
# user_roles   ✓ EXISTS
# accounts     ✓ EXISTS
# sessions     ✗ MISSING
# verification_tokens  ✗ MISSING
# entity_user_assignments  ✗ MISSING
# user_permissions  ✗ MISSING
# user_audit_log  ✗ MISSING
```

## Recommended Fix (Option 1: Most Robust)

Replace HEREDOC syntax with `-c` flag commands and add proper error checking.

### File: `database/scripts/04-nextauth-users.sh`

**Changes Required:**

1. **Remove `set -e`** (line 20) - Replace with explicit error checking
2. **Replace all HEREDOC blocks** with `-c` flag commands
3. **Add error detection** after each docker exec command
4. **Add rollback capability** if any step fails

### Example Fix for Step 3 (user_roles table):

**BEFORE:**
```bash
echo "▶ Step 3: Creating user_roles table..."

docker exec feedback_db psql -U $DB_USER -d $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('admin', 'staff', 'public')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_roles (role_code, role_name, role_type, description) VALUES
    ('admin_dta', 'DTA Administrator', 'admin', 'Full system access'),
    ('staff_mda', 'MDA Staff Officer', 'staff', 'Entity-specific access'),
    ('public_user', 'Public User', 'public', 'Limited public access')
ON CONFLICT (role_code) DO NOTHING;
EOF

echo "  ✓ user_roles table created with default roles"
```

**AFTER:**
```bash
echo "▶ Step 3: Creating user_roles table..."

# Create table
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('admin', 'staff', 'public')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" > /dev/null 2>&1; then
    echo "  ✗ Failed to create user_roles table"
    exit 1
fi

# Insert default roles
if ! docker exec feedback_db psql -U $DB_USER -d $DB_NAME -c "
INSERT INTO user_roles (role_code, role_name, role_type, description) VALUES
    ('admin_dta', 'DTA Administrator', 'admin', 'Full system access - Digital Transformation Agency administrators'),
    ('staff_mda', 'MDA Staff Officer', 'staff', 'Entity-specific access - Ministry/Department/Agency officers'),
    ('public_user', 'Public User', 'public', 'Limited public access - Future use for citizen portal')
ON CONFLICT (role_code) DO NOTHING;" > /dev/null 2>&1; then
    echo "  ✗ Failed to insert default roles"
    exit 1
fi

echo "  ✓ user_roles table created with default roles"
```

### Complete Rewrite Needed

All 10 steps need similar treatment:
- ✅ Step 1: Connection verification (already has error check)
- ✅ Step 2: UUID extension (replace HEREDOC)
- ✅ Step 3: user_roles table (replace HEREDOC)
- ✅ Step 4: users table (replace HEREDOC)
- ✅ Step 5: accounts table (replace HEREDOC)
- ✅ Step 6: sessions table (replace HEREDOC)
- ✅ Step 7: verification_tokens (replace HEREDOC)
- ✅ Step 8: entity_user_assignments (replace HEREDOC)
- ✅ Step 9: user_permissions (replace HEREDOC)
- ✅ Step 10: user_audit_log (replace HEREDOC)
- ✅ Step 11: Triggers (replace HEREDOC)
- ✅ Step 12: Permissions grant (replace HEREDOC)

## Recommended Fix (Option 2: Quick Fix)

If you want a minimal change, just add error detection to `00-master-init.sh`:

### File: `database/scripts/00-master-init.sh`

**Line 98 - BEFORE:**
```bash
"$SCRIPTS_DIR/04-nextauth-users.sh"

echo "  ✓ NextAuth tables created"
```

**Line 98 - AFTER:**
```bash
if ! "$SCRIPTS_DIR/04-nextauth-users.sh"; then
    echo "  ✗ NextAuth setup FAILED"
    echo ""
    echo "ERROR: Failed to create authentication tables"
    echo "This is a critical error. Database is in incomplete state."
    echo ""
    echo "Please check the output above for errors."
    exit 1
fi

# Verify critical tables were created
if ! docker exec feedback_db psql -U feedback_user -d feedback -c "\dt users" > /dev/null 2>&1; then
    echo "  ✗ Critical table 'users' was not created"
    echo "ERROR: NextAuth migration failed silently"
    exit 1
fi

echo "  ✓ NextAuth tables created"
```

## Recommended Fix (Option 3: Nuclear Option)

Move all NextAuth table creation into `01-init-db.sh` so they're created atomically with the other tables, removing the dependency on a separate script.

## Testing the Fix

After implementing the fix:

```bash
# 1. Drop all tables
docker exec feedback_db psql -U feedback_user -d feedback -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO feedback_user;
"

# 2. Run fresh setup
./database/99-consolidated-setup.sh --fresh

# 3. Verify all auth tables exist
docker exec feedback_db psql -U feedback_user -d feedback -c "
SELECT tablename FROM pg_tables
WHERE schemaname='public'
AND tablename IN (
    'users','user_roles','accounts','sessions',
    'verification_tokens','entity_user_assignments',
    'user_permissions','user_audit_log'
)
ORDER BY tablename;
"

# Expected: 8 rows (all tables present)
```

## Impact Analysis

### Current State (Broken)
- `--fresh` flag: ❌ Fails to create admin user
- `--fresh` flag: ❌ Missing 5 critical auth tables
- Verification scripts: ❌ Fail with "users table doesn't exist"
- Admin login: ❌ Not possible (no users table)

### After Fix
- `--fresh` flag: ✅ Creates all 8 auth tables
- `--fresh` flag: ✅ Successfully creates admin user
- Verification scripts: ✅ Work correctly
- Admin login: ✅ Possible with created admin user

## Recommended Implementation Order

1. **IMMEDIATE FIX** (Option 2): Add error detection to `00-master-init.sh` - 5 minutes
2. **PROPER FIX** (Option 1): Rewrite `04-nextauth-users.sh` to use `-c` commands - 30 minutes
3. **VERIFICATION**: Test `--fresh` flag end-to-end - 10 minutes
4. **DOCUMENTATION**: Update setup flags documentation if needed - 5 minutes

## Files to Modify

### Priority 1 (Critical)
1. `database/scripts/00-master-init.sh` - Add error detection (Option 2)
2. `database/scripts/04-nextauth-users.sh` - Replace HEREDOC syntax (Option 1)

### Priority 2 (Verification)
3. `database/99-consolidated-setup.sh` - Ensure setup_fresh() checks for script success

### Priority 3 (Documentation)
4. `database/SETUP_FLAGS_EXPLAINED.md` - Update if behavior changes
5. `database/FRESH_FLAG_ENHANCED.md` - Update troubleshooting section

## Error Log Evidence

From the user's `--fresh` run:

```
▶ Step 4: Setting up NextAuth user management...
[Full script output shown]
✓ NextAuth tables created

[Later...]
ℹ Creating admin user...
ERROR:  relation "users" does not exist
LINE 1: SELECT COUNT(*) FROM users WHERE email = 'mailabhirupbanerje...
```

This proves the script claims success but fails silently.

## Next Steps

**Recommended Action:** Implement Option 2 (Quick Fix) immediately, then Option 1 (Proper Fix) for long-term stability.

Would you like me to:
1. Implement Option 1 (complete rewrite of 04-nextauth-users.sh)?
2. Implement Option 2 (quick error detection in 00-master-init.sh)?
3. Implement both (safest approach)?
