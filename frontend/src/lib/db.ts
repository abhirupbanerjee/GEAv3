// ============================================
// DATABASE CONNECTION POOL
// ============================================
// PostgreSQL connection for feedback database
// ============================================

import { Pool, PoolConfig } from 'pg';

// Database configuration
const config: PoolConfig = {
  host: process.env.FEEDBACK_DB_HOST || 'feedback_db',
  port: parseInt(process.env.FEEDBACK_DB_PORT || '5432'),
  database: process.env.FEEDBACK_DB_NAME || 'feedback',
  user: process.env.FEEDBACK_DB_USER || 'feedback_user',
  password: process.env.FEEDBACK_DB_PASSWORD,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return error after 5 seconds if connection can't be established
};

// Create connection pool
const pool = new Pool(config);

// Error handler
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Connection test
pool.on('connect', () => {
  console.log('✓ Feedback database connected');
});

// Export pool for use in API routes
export { pool };

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
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

// Helper function for safe queries
export async function safeQuery(
  text: string,
  params?: any[]
): Promise<any> {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error('Database query failed');
  }
}