/**
 * GEA Portal - Entity Filter Utility
 *
 * Centralized utility functions for role-based entity filtering
 * Used across API routes to enforce data isolation for staff users
 */

import { Session } from 'next-auth';

/**
 * Get entity filter for current user
 * Returns entityId for both admin and staff users (if assigned)
 * Feature 1.6: Admin users now default to their agency (can override via UI)
 *
 * @param session - NextAuth session object
 * @returns Entity ID for the user's assigned agency, or null if none assigned
 */
export function getEntityFilter(session: Session | null): string | null {
  if (!session?.user) return null;

  // Both admin and staff default to their assigned entity
  // Admin can override via UI dropdown, staff cannot
  return session.user.entityId || null;
}

/**
 * Build WHERE clause with entity filter
 * Generates parameterized SQL WHERE clause for entity filtering
 *
 * @param entityId - Entity ID to filter by (null for no filter)
 * @param tableAlias - Table alias to use in SQL (default: empty string)
 * @param paramIndex - Starting parameter index for SQL placeholders (default: 1)
 * @returns Object with SQL clause and parameter values
 */
export function buildEntityWhereClause(
  entityId: string | null,
  tableAlias: string = '',
  paramIndex: number = 1
): { clause: string; params: string[] } {
  if (!entityId) {
    return { clause: '', params: [] };
  }

  const prefix = tableAlias ? `${tableAlias}.` : '';
  return {
    clause: `${prefix}entity_id = $${paramIndex}`,
    params: [entityId],
  };
}

/**
 * Validate entity access for staff users
 * Checks if a user has permission to access a specific entity's data
 *
 * @param session - NextAuth session object
 * @param requestedEntityId - Entity ID being accessed
 * @returns true if access is allowed, false otherwise
 */
export function validateEntityAccess(
  session: Session | null,
  requestedEntityId: string
): boolean {
  if (!session?.user) return false;

  // Admin can access all entities
  if (session.user.roleType === 'admin') return true;

  // Staff can only access their assigned entity
  return session.user.entityId === requestedEntityId;
}

/**
 * Add entity filter to query parameters
 * Helper function to add entity filter to URLSearchParams
 *
 * @param params - URLSearchParams object
 * @param session - NextAuth session object
 */
export function addEntityFilterToParams(
  params: URLSearchParams,
  session: Session | null
): void {
  const entityId = getEntityFilter(session);
  if (entityId) {
    params.set('entity_id', entityId);
  }
}

/**
 * Get entity filter query string
 * Returns URL query string for entity filtering
 *
 * @param session - NextAuth session object
 * @returns Query string like "?entity_id=AGY-001" or empty string
 */
export function getEntityFilterQuery(session: Session | null): string {
  const entityId = getEntityFilter(session);
  return entityId ? `?entity_id=${entityId}` : '';
}
