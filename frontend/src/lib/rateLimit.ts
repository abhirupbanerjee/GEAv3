import { pool } from './db';
import crypto from 'crypto';

export async function checkRateLimit(ip: string): Promise<boolean> {
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
  
  try {
    const result = await pool.query(`
      INSERT INTO submission_rate_limit (ip_hash, submission_count, window_start)
      VALUES ($1, 1, NOW())
      ON CONFLICT (ip_hash) 
      DO UPDATE SET 
        submission_count = CASE
          WHEN submission_rate_limit.window_start < NOW() - INTERVAL '1 hour'
          THEN 1
          ELSE submission_rate_limit.submission_count + 1
        END,
        window_start = CASE
          WHEN submission_rate_limit.window_start < NOW() - INTERVAL '1 hour'
          THEN NOW()
          ELSE submission_rate_limit.window_start
        END
      RETURNING submission_count
    `, [ipHash]);

    const count = result.rows[0].submission_count;
    return count <= 10; // Allow 10 submissions per hour
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Fail open
  }
}