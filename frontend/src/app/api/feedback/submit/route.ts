// ============================================
// FEEDBACK SUBMISSION API
// ============================================
// POST /api/feedback/submit
// Accepts feedback with rate limiting & validation
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_SUBMISSIONS_PER_HOUR = 5;

// Hash function for IP addresses
function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Hash function for user agents
function hashUserAgent(ua: string): string {
  return crypto.createHash('sha256').update(ua).digest('hex');
}

// Get client IP from request
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// Check rate limit
async function checkRateLimit(ipHash: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT submission_count, window_start 
     FROM submission_rate_limit 
     WHERE ip_hash = $1`,
    [ipHash]
  );

  if (result.rows.length === 0) {
    // First submission from this IP
    await pool.query(
      `INSERT INTO submission_rate_limit (ip_hash, submission_count, window_start)
       VALUES ($1, 1, NOW())`,
      [ipHash]
    );
    return true;
  }

  const { submission_count, window_start } = result.rows[0];
  const windowAge = Date.now() - new Date(window_start).getTime();

  if (windowAge > RATE_LIMIT_WINDOW) {
    // Reset window
    await pool.query(
      `UPDATE submission_rate_limit 
       SET submission_count = 1, window_start = NOW()
       WHERE ip_hash = $1`,
      [ipHash]
    );
    return true;
  }

  if (submission_count >= MAX_SUBMISSIONS_PER_HOUR) {
    return false;
  }

  // Increment count
  await pool.query(
    `UPDATE submission_rate_limit 
     SET submission_count = submission_count + 1
     WHERE ip_hash = $1`,
    [ipHash]
  );
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'service_id',
      'entity_id',
      'channel',
      'q1_ease',
      'q2_clarity',
      'q3_timeliness',
      'q4_trust',
      'q5_overall_satisfaction'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate ratings (1-5)
    const ratings = [
      body.q1_ease,
      body.q2_clarity,
      body.q3_timeliness,
      body.q4_trust,
      body.q5_overall_satisfaction
    ];

    for (const rating of ratings) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'All ratings must be integers between 1 and 5' },
          { status: 400 }
        );
      }
    }

    // Validate channel
    const validChannels = ['ea_portal', 'qr_code'];
    if (!validChannels.includes(body.channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be ea_portal or qr_code' },
        { status: 400 }
      );
    }

    // Validate recipient_group if provided
    if (body.recipient_group) {
      const validGroups = ['citizen', 'business', 'government', 'visitor', 'other'];
      if (!validGroups.includes(body.recipient_group)) {
        return NextResponse.json(
          { error: 'Invalid recipient_group' },
          { status: 400 }
        );
      }
    }

    // Get and hash client information
    const clientIP = getClientIP(request);
    const ipHash = hashIP(clientIP);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userAgentHash = hashUserAgent(userAgent);

    // Check rate limit
    const canSubmit = await checkRateLimit(ipHash);
    if (!canSubmit) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Maximum 5 submissions per hour.',
          retry_after: 3600 
        },
        { status: 429 }
      );
    }

    // Verify service exists and is active
    const serviceCheck = await pool.query(
      `SELECT s.service_id, s.entity_id, s.is_active
       FROM service_master s
       WHERE s.service_id = $1 AND s.is_active = TRUE`,
      [body.service_id]
    );

    if (serviceCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      );
    }

    // Verify entity matches
    if (serviceCheck.rows[0].entity_id !== body.entity_id) {
      return NextResponse.json(
        { error: 'Entity ID does not match service' },
        { status: 400 }
      );
    }

    // Insert feedback
    const result = await pool.query(
      `INSERT INTO service_feedback (
        service_id,
        entity_id,
        channel,
        qr_code_id,
        recipient_group,
        q1_ease,
        q2_clarity,
        q3_timeliness,
        q4_trust,
        q5_overall_satisfaction,
        comment_text,
        grievance_flag,
        ip_hash,
        user_agent_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING feedback_id, submitted_at`,
      [
        body.service_id,
        body.entity_id,
        body.channel,
        body.qr_code_id || null,
        body.recipient_group || null,
        body.q1_ease,
        body.q2_clarity,
        body.q3_timeliness,
        body.q4_trust,
        body.q5_overall_satisfaction,
        body.comment_text || null,
        body.grievance_flag || false,
        ipHash,
        userAgentHash
      ]
    );

    return NextResponse.json({
      success: true,
      feedback_id: result.rows[0].feedback_id,
      submitted_at: result.rows[0].submitted_at,
      message: 'Thank you for your feedback!'
    }, { status: 201 });

  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}