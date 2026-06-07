/**
 * GEA Portal - Role Utility Functions
 *
 * Centralized role-checking helpers for the reporting role feature.
 * The 'reporting' role has the same VIEW access as 'admin' but no write/edit access.
 */

/** Roles that have admin-level view access (can see all data, all pages) */
const ADMIN_VIEW_ROLES = ['admin', 'reporting'];

/** All authenticated internal roles (for API access checks) */
const INTERNAL_ROLES = ['admin', 'staff', 'reporting'];

/**
 * Check if the role has admin-level view access.
 * Returns true for 'admin' and 'reporting' roles.
 * Use this for data scope checks and page visibility.
 */
export function hasAdminView(roleType: string | undefined | null): boolean {
  return !!roleType && ADMIN_VIEW_ROLES.includes(roleType);
}

/**
 * Check if the role has write/edit access.
 * Returns true only for 'admin' role.
 * Use this for create/update/delete operations.
 */
export function hasWriteAccess(roleType: string | undefined | null): boolean {
  return roleType === 'admin';
}

/**
 * Check if the role is an internal role (admin, staff, or reporting).
 * Use this for general API access checks.
 */
export function isInternalRole(roleType: string | undefined | null): boolean {
  return !!roleType && INTERNAL_ROLES.includes(roleType);
}
