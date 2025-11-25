# Admin User Entity ID Correction

## Issue Identified

Admin users were being created with incorrect entity assignment:
- ❌ **Old:** AGY-002 (Royal Grenada Police Force)
- ✅ **New:** AGY-005 (Digital Transformation Agency)

## What Was Changed

**File:** `database/scripts/05-add-initial-admin.sh` (v2.0 → v2.1)

**Changes Made:**
1. Line 104: UPDATE statement entity_id changed from 'AGY-002' to 'AGY-005'
2. Line 130: INSERT statement entity_id changed from 'AGY-002' to 'AGY-005'
3. Line 140: Error message updated to reference 'AGY-005'
4. Line 192: Display message updated to show "AGY-005 (Digital Transformation Agency)"

## Why This Change

The Digital Transformation Agency (AGY-005) is the appropriate entity for DTA Administrator users, as they:
- Manage the overall system
- Have cross-entity administrative access
- Are responsible for system-wide configuration

The Royal Grenada Police Force (AGY-002) is a specific law enforcement agency and is not the appropriate administrative entity for system administrators.

## Impact

### Existing Users (Azure VM)
✅ **Already Fixed:** The existing admin user on Azure VM was updated:

```sql
UPDATE users SET entity_id = 'AGY-005' WHERE email = 'mailabhirupbanerjee@gmail.com';
```

**Verification:**
```
             email             | name  | entity_id |          entity_name
-------------------------------+-------+-----------+-------------------------------
 mailabhirupbanerjee@gmail.com | admin | AGY-005   | Digital Transformation Agency
```

### Future Users
✅ **Automatic:** All new admin users created by the script will be assigned to AGY-005

## Entity Reference

From `entity_master` table:

| Entity ID | Entity Name | Type |
|-----------|-------------|------|
| AGY-001 | Office of the Governor-General | agency |
| AGY-002 | Royal Grenada Police Force | agency |
| AGY-003 | Houses of Parliament | agency |
| **AGY-005** | **Digital Transformation Agency** | **agency** |
| AGY-006 | Grenada Development Bank | agency |
| AGY-007 | Grenada Investment Development Corporation (GIDC) | agency |

## Testing

**Local Test:**
```bash
ADMIN_EMAIL="test@example.com" ADMIN_NAME="Test User" ./scripts/05-add-initial-admin.sh

# Output shows:
# entity_id | AGY-005
# Entity: AGY-005 (Digital Transformation Agency)
```

✅ Verified working correctly

## Version History

- **v2.0:** Fixed HEREDOC silent failures + Used AGY-002 (incorrect)
- **v2.1:** Corrected entity_id to AGY-005 (Digital Transformation Agency)

---

**Date:** November 25, 2025
**Status:** ✅ Fixed in code + Azure VM updated
**Impact:** Existing user updated, future users will use correct entity
