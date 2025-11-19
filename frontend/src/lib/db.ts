/**
 * Database Connection Utility
 * 
 * Manages PostgreSQL connection pooling with proper error handling
 * and connection lifecycle management.
 * 
 * Usage:
 *   const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId])
 */

import { Pool, PoolClient, QueryResult } from 'pg'

// Singleton pool instance (internal)
let poolInstance: Pool | null = null

/**
 * Initialize database connection pool
 * Called once at application startup
 */
export function initializePool(): Pool {
  if (poolInstance) {
    console.log('Pool already initialized')
    return poolInstance
  }

  const config = {
    user: process.env.FEEDBACK_DB_USER || 'feedback_user',
    password: process.env.FEEDBACK_DB_PASSWORD || '',
    host: process.env.FEEDBACK_DB_HOST || 'localhost',
    port: parseInt(process.env.FEEDBACK_DB_PORT || '5432'),
    database: process.env.FEEDBACK_DB_NAME || 'feedback',
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
  }

  poolInstance = new Pool(config)

  // Pool event handlers
  poolInstance.on('error', (err) => {
    console.error('Unexpected error on idle client:', err)
  })

  poolInstance.on('connect', () => {
    console.log('New connection established to database')
  })

  poolInstance.on('remove', () => {
    console.log('Connection removed from pool')
  })

  console.log(`Database pool initialized: ${config.user}@${config.host}:${config.port}/${config.database}`)

  return poolInstance
}

/**
 * Get the connection pool
 * Initializes if not already done
 */
export function getPool(): Pool {
  if (!poolInstance) {
    return initializePool()
  }
  return poolInstance
}

/**
 * Execute a query with the pool
 * 
 * @param query SQL query string with numbered parameters ($1, $2, etc)
 * @param values Array of values for parameterized query
 * @returns Query result
 * 
 * Example:
 *   const result = await executeQuery(
 *     'SELECT * FROM tickets WHERE status = $1 AND priority = $2',
 *     ['open', 'high']
 *   )
 */
export async function executeQuery<T = any>(
  query: string,
  values: any[] = []
): Promise<QueryResult<T>> {
  const p = getPool()

  try {
    const result = await p.query<T>(query, values)
    return result
  } catch (error) {
    console.error('Database query error:', {
      query,
      values: values.length > 0 ? '[REDACTED]' : 'none',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Execute multiple queries in a transaction
 * All queries succeed or all are rolled back
 * 
 * @param callback Async function that receives client and runs queries
 * @returns Result of callback
 * 
 * Example:
 *   const result = await withTransaction(async (client) => {
 *     await client.query('INSERT INTO tickets (...)')
 *     await client.query('UPDATE service_feedback SET ticket_created = true')
 *     return 'success'
 *   })
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getPool()
  const client = await p.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Transaction error:', error instanceof Error ? error.message : String(error))
    throw error
  } finally {
    client.release()
  }
}

/**
 * Close all connections in the pool
 * Call this on application shutdown
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end()
    poolInstance = null
    console.log('Database pool closed')
  }
}

/**
 * Get pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
  if (!poolInstance) {
    return { error: 'Pool not initialized' }
  }

  return {
    totalConnections: poolInstance.totalCount,
    idleConnections: poolInstance.idleCount,
    activeConnections: poolInstance.totalCount - poolInstance.idleCount,
  }
}

/**
 * Health check - verify database connection
 */
export async function healthCheck(): Promise<{
  status: 'ok' | 'error'
  message: string
  latency: number
}> {
  const start = Date.now()

  try {
    const result = await executeQuery('SELECT NOW()')
    const latency = Date.now() - start

    return {
      status: 'ok',
      message: 'Database connection healthy',
      latency,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - start,
    }
  }
}

// Export pool for backward compatibility with existing code
export const pool = {
  query: async <T = any>(query: string, values?: any[]): Promise<QueryResult<T>> => {
    const p = getPool()
    return p.query<T>(query, values || [])
  }
}

export default {
  initializePool,
  getPool,
  executeQuery,
  withTransaction,
  closePool,
  getPoolStats,
  healthCheck,
}