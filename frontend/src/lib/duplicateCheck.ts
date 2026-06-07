import { pool } from './db';
import crypto from 'crypto';

export async function isDuplicate(
  serviceId: string,
  ip: string,
  userAgent: string
): Promise<boolean> {
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
  const uaHash = crypto.createHash('sha256').update(userAgent).digest('hex');
  
  try {
    const result = await pool.query(`
      SELECT 1 FROM service_feedback
      WHERE service_id = $1
        AND ip_hash = $2
        AND user_agent_hash = $3
        AND submitted_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1
    `, [serviceId, ipHash, uaHash]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return false; // Fail open
  }
}