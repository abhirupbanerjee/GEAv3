# Azure VM Path Issue - FIXED

## Problem
When running `./database/99-consolidated-setup.sh --fresh` from Azure VM, the script failed with:

```
/home/azureuser/GEAv3/database/scripts/00-master-init.sh: line 86: ./database/01-init-db.sh: No such file or directory
```

## Root Cause
The script `database/scripts/00-master-init.sh` was using relative paths that assumed it was being run from the project root:

```bash
./database/01-init-db.sh         # Line 86 - WRONG
./database/04-nextauth-users.sh  # Line 97 - WRONG
```

But since this script is located in `database/scripts/`, the relative paths were incorrect.

## Fix Applied
Updated `database/scripts/00-master-init.sh`:

1. **Added shared configuration sourcing:**
```bash
# Source shared configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ROOT="$(dirname "$SCRIPT_DIR")"
source "$DB_ROOT/config.sh"
```

2. **Fixed relative paths to use absolute paths:**
```bash
"$DB_ROOT/01-init-db.sh"         # Line 86 - FIXED
"$DB_ROOT/04-nextauth-users.sh"  # Line 97 - FIXED
```

## Testing

After applying the fix, the script should work from any location:

```bash
# From project root (recommended):
cd /home/azureuser/GEAv3
./database/99-consolidated-setup.sh --fresh

# Or from database directory:
cd /home/azureuser/GEAv3/database
./99-consolidated-setup.sh --fresh
```

## Files Modified
- `database/scripts/00-master-init.sh` - Lines 33-36 (added config sourcing) and Lines 86, 97 (fixed paths)
- `database/lib/csv-loader.sh` - Lines 30-42, 64-76, 98-110 (removed error suppression for debugging)

## Additional Fixes Included
As part of the Azure troubleshooting, we also:
1. Removed error suppression from CSV loading functions
2. Added diagnostic scripts: `diagnose-azure-csv.sh`, `quick-csv-check.sh`
3. Created troubleshooting guide: `AZURE_TROUBLESHOOTING.md`

## Next Steps on Azure

Now you can safely run:

```bash
cd /home/azureuser/GEAv3

# Option 1: Fresh setup (drops all tables, reloads everything)
./database/99-consolidated-setup.sh --fresh

# Option 2: Reload data only (keeps schema, reloads data)
./database/99-consolidated-setup.sh --reload

# Option 3: Verify only (check what's there)
./database/99-consolidated-setup.sh --verify
```

All commands should now work correctly!

## Commit Message
```
fix: correct relative paths in master-init script for Azure VM compatibility

- Add config.sh sourcing to database/scripts/00-master-init.sh
- Replace relative paths with $DB_ROOT absolute paths
- Fixes "No such file or directory" error when running from project root
- Improves script portability across different execution contexts
```
