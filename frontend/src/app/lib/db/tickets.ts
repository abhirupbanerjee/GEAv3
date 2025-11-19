/**
 * GEA Ticket System - Database Helpers
 * Version: 1.0
 * Purpose: PostgreSQL query helpers and data access
 * Location: app/lib/db/tickets.ts
 */

import { Pool, PoolClient } from 'pg';

/**
 * ============================================
 * DATABASE INITIALIZATION
 * ============================================
 */

// Connection pool (initialize in your app)
let pool: Pool;

export function initializePool(connectionString: string) {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * ============================================
 * TICKET OPERATIONS
 * ============================================
 */

/**
 * Create new ticket
 */
export async function createTicket(
  client: PoolClient,
  ticket: {
    ticket_number: string;
    service_id: string;
    entity_id: string;
    category_id: number;
    priority_id: number;
    status_id: number;
    subject: string;
    description: string;
    submitter_email?: string;
    submitter_phone?: string;
    submitter_ip_hash: string;
    channel: string;
    qr_code_id?: number;
  }
) {
  const query = `
    INSERT INTO tickets (
      ticket_number, service_id, entity_id, category_id, priority_id,
      status_id, subject, description, submitter_email, submitter_phone,
      submission_ip_hash, channel, qr_code_id, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    RETURNING ticket_id, ticket_number, status_id, created_at
  `;

  const values = [
    ticket.ticket_number,
    ticket.service_id,
    ticket.entity_id,
    ticket.category_id,
    ticket.priority_id,
    ticket.status_id,
    ticket.subject,
    ticket.description,
    ticket.submitter_email || null,
    ticket.submitter_phone || null,
    ticket.submitter_ip_hash,
    ticket.channel,
    ticket.qr_code_id || null,
  ];

  const result = await client.query(query, values);
  return result.rows[0];
}

/**
 * Get ticket by number (for public status check)
 */
export async function getTicketByNumber(
  client: PoolClient,
  ticketNumber: string
) {
  const query = `
    SELECT
      t.ticket_id,
      t.ticket_number,
      t.status_id,
      ts.status_name as status,
      t.priority_id,
      pl.priority_name as priority,
      t.category_id,
      tc.category_name as category,
      t.subject,
      t.description,
      t.assigned_to,
      t.created_at,
      t.updated_at,
      t.sla_response_target,
      t.sla_resolution_target,
      t.first_response_at,
      t.resolved_at,
      CASE
        WHEN t.sla_resolution_target < NOW() AND t.status_id != 5 THEN 'breached'
        WHEN t.sla_resolution_target < NOW() + INTERVAL '24 hours' THEN 'at_risk'
        ELSE 'on_track'
      END as sla_status
    FROM tickets t
    LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
    LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
    LEFT JOIN ticket_categories tc ON t.category_id = tc.category_id
    WHERE t.ticket_number = $1
  `;

  const result = await client.query(query, [ticketNumber]);
  return result.rows[0] || null;
}

/**
 * Get next ticket sequence number
 */
export async function getNextTicketSequence(client: PoolClient): Promise<number> {
  const query = `
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number, 8, 6) AS INTEGER)), 0) + 1
    FROM tickets
    WHERE ticket_number LIKE $1
  `;

  const now = new Date();
  const yearMonth = now.getFullYear().toString().slice(-2) + 
                    String(now.getMonth() + 1).padStart(2, '0');

  const result = await client.query(query, [`${yearMonth}-%`]);
  return result.rows[0][0];
}

/**
 * ============================================
 * SERVICE OPERATIONS
 * ============================================
 */

/**
 * Get service by ID
 */
export async function getServiceById(
  client: PoolClient,
  serviceId: string
) {
  const query = `
    SELECT
      s.service_id,
      s.service_name,
      s.entity_id,
      s.service_category,
      s.is_active
    FROM service_master s
    WHERE s.service_id = $1 AND s.is_active = true
  `;

  const result = await client.query(query, [serviceId]);
  return result.rows[0] || null;
}

/**
 * List all active services
 */
export async function listServices(
  client: PoolClient,
  entityId?: string
) {
  let query = `
    SELECT
      s.service_id,
      s.service_name,
      s.entity_id,
      s.service_category,
      e.entity_name
    FROM service_master s
    JOIN entity_master e ON s.entity_id = e.unique_entity_id
    WHERE s.is_active = true
  `;

  const values: string[] = [];

  if (entityId) {
    query += ` AND s.entity_id = $1`;
    values.push(entityId);
  }

  query += ` ORDER BY s.service_name`;

  const result = await client.query(query, values);
  return result.rows;
}

/**
 * ============================================
 * ENTITY OPERATIONS
 * ============================================
 */

/**
 * Get entity by ID
 */
export async function getEntityById(
  client: PoolClient,
  entityId: string
) {
  const query = `
    SELECT
      unique_entity_id,
      entity_name,
      entity_type,
      is_active
    FROM entity_master
    WHERE unique_entity_id = $1 AND is_active = true
  `;

  const result = await client.query(query, [entityId]);
  return result.rows[0] || null;
}

/**
 * ============================================
 * CATEGORY OPERATIONS
 * ============================================
 */

/**
 * Get category by ID
 */
export async function getCategoryById(
  client: PoolClient,
  categoryId: number
) {
  const query = `
    SELECT
      category_id,
      category_code,
      category_name,
      description,
      entity_id,
      sla_response_hours,
      sla_resolution_hours,
      is_active
    FROM ticket_categories
    WHERE category_id = $1 AND is_active = true
  `;

  const result = await client.query(query, [categoryId]);
  return result.rows[0] || null;
}

/**
 * List categories (optionally filtered)
 */
export async function listCategories(
  client: PoolClient,
  entityId?: string,
  serviceId?: string
) {
  let query = `
    SELECT
      tc.category_id,
      tc.category_code,
      tc.category_name,
      tc.description,
      tc.entity_id,
      tc.sla_response_hours,
      tc.sla_resolution_hours
    FROM ticket_categories tc
    WHERE tc.is_active = true
  `;

  const values: any[] = [];

  if (entityId) {
    query += ` AND tc.entity_id = $${values.length + 1}`;
    values.push(entityId);
  }

  query += ` ORDER BY tc.category_name`;

  const result = await client.query(query, values);
  return result.rows;
}

/**
 * ============================================
 * PRIORITY OPERATIONS
 * ============================================
 */

/**
 * Get priority by name
 */
export async function getPriorityByName(
  client: PoolClient,
  priorityName: string
) {
  const query = `
    SELECT
      priority_id,
      priority_name,
      sla_multiplier
    FROM priority_levels
    WHERE LOWER(priority_name) = LOWER($1)
  `;

  const result = await client.query(query, [priorityName]);
  return result.rows[0] || null;
}

/**
 * Get all priorities
 */
export async function listPriorities(client: PoolClient) {
  const query = `
    SELECT
      priority_id,
      priority_name,
      priority_order,
      sla_multiplier
    FROM priority_levels
    ORDER BY priority_order
  `;

  const result = await client.query(query);
  return result.rows;
}

/**
 * ============================================
 * STATUS OPERATIONS
 * ============================================
 */

/**
 * Get status by name
 */
export async function getStatusByName(
  client: PoolClient,
  statusName: string
) {
  const query = `
    SELECT
      status_id,
      status_name
    FROM ticket_status
    WHERE LOWER(status_name) = LOWER($1)
  `;

  const result = await client.query(query, [statusName]);
  return result.rows[0] || null;
}

/**
 * ============================================
 * TRANSACTION HELPERS
 * ============================================
 */

/**
 * Execute function with transaction
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * ============================================
 * ERROR HANDLING
 * ============================================
 */

/**
 * Check if error is due to foreign key constraint
 */
export function isForeignKeyError(error: any): boolean {
  return error?.code === '23503';
}

/**
 * Check if error is due to unique constraint
 */
export function isUniqueConstraintError(error: any): boolean {
  return error?.code === '23505';
}

/**
 * Check if error is database connection error
 */
export function isConnectionError(error: any): boolean {
  return error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND';
}