// ============================================
// FEEDBACK SUBMISSION ENDPOINT - UPDATED
// ============================================
// POST /api/feedback/submit
// Updated to validate requester_category field (NEW)
// 
// Database Alignment:
// • Validates recipient_group against allowed categories
// • Maps to tickets.requester_category for future ticket creation
// • Still stores in service_feedback as before
// • All existing functionality preserved
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/sendgrid';
import { 
  getFeedbackSubmittedTemplate,
  getFeedbackTicketAdminEmail 
} from '@/lib/emailTemplates';

// NEW: Valid requester categories (from new tickets.requester_category field)
const VALID_REQUESTER_CATEGORIES = [
  'citizen',
  'tourist',
  'gov_employee',
  'student',
  'officer'
];

// Get client IP safely
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') ||
             'unknown';
  return ip.trim();
}

// Hash IP for tracking without storing PII
function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_SALT || 'salt')
    .digest('hex')
    .substring(0, 16);
}

// Hash user agent for device tracking
function hashUserAgent(userAgent: string): string {
  return crypto
    .createHash('sha256')
    .update(userAgent)
    .digest('hex')
    .substring(0, 16);
}

// NEW: Validate requester category
function isValidRequesterCategory(category: string | null | undefined): boolean {
  if (!category) return true; // Optional field
  return VALID_REQUESTER_CATEGORIES.includes(category.toLowerCase());
}

// Check rate limit (existing function)
async function checkRateLimit(ipHash: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM service_feedback
     WHERE ip_hash = $1 AND submitted_at > $2`,
    [ipHash, oneHourAgo]
  );
  
  const count = parseInt(result.rows[0].count);
  return count < 5; // Max 5 per hour
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // ============================================
    // VALIDATION: Required fields (unchanged)
    // ============================================
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

    // ============================================
    // VALIDATION: Rating values (unchanged)
    // ============================================
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

    // ============================================
    // VALIDATION: Channel (unchanged)
    // ============================================
    const validChannels = ['ea_portal', 'qr_code'];
    if (!validChannels.includes(body.channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be ea_portal or qr_code' },
        { status: 400 }
      );
    }

    // ============================================
    // VALIDATION: Recipient group → NEW validation
    // ============================================
    if (body.recipient_group) {
      // NEW: Check against valid categories (mapped to requester_category)
      if (!isValidRequesterCategory(body.recipient_group)) {
        return NextResponse.json(
          { 
            error: 'Invalid recipient_group. Must be one of: ' + 
                   VALID_REQUESTER_CATEGORIES.join(', '),
            provided_value: body.recipient_group,
            valid_values: VALID_REQUESTER_CATEGORIES
          },
          { status: 400 }
        );
      }
    }

    // ============================================
    // VALIDATION: Other optional fields (unchanged)
    // ============================================
    if (body.recipient_group) {
      const validGroups = VALID_REQUESTER_CATEGORIES;
      if (!validGroups.includes(body.recipient_group.toLowerCase())) {
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

    // ============================================
    // Check rate limit (unchanged)
    // ============================================
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

    // ============================================
    // VALIDATION: Service and entity (unchanged)
    // ============================================
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

    if (serviceCheck.rows[0].entity_id !== body.entity_id) {
      return NextResponse.json(
        { error: 'Entity ID does not match service' },
        { status: 400 }
      );
    }

    // ============================================
    // INSERT: Into service_feedback table
    // ============================================
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

    const feedbackId = result.rows[0].feedback_id;
    const submittedAt = result.rows[0].submitted_at;

// ============================================
// NEW: Log mapping for audit trail
// ============================================
if (body.recipient_group) {
  console.log(`✓ Feedback ${feedbackId}: recipient_group "${body.recipient_group}" validated`);
}

// ============================================
// EMAIL: Send confirmation & alerts (NEW)
// ============================================

// Send confirmation to requester (if email provided)
if (body.requester_email) {
  try {
    await sendEmail({
      to: body.requester_email,
      subject: 'Thank You - Your Feedback Received (GEA Portal)',
      html: getFeedbackSubmittedTemplate(feedbackId, body.service_id)
    });
    console.log(`✅ Confirmation email sent to ${body.requester_email}`);
  } catch (error) {
    console.error('❌ Confirmation email failed (non-critical):', error);
    // Don't fail the API response - email is optional
  }
}

// Send DTA alert for poor ratings
const overallRating = body.q5_overall_satisfaction;
if (overallRating <= 2) {
  try {
    const adminEmail = process.env.SERVICE_ADMIN_EMAIL || 'alerts.dtahelpdesk@gmail.com';
    
    await sendEmail({
      to: adminEmail,
      subject: `⚠️ ALERT: Low Service Rating - ${body.service_id} (${overallRating}/5)`,
      html: getFeedbackTicketAdminEmail(
        `FB-${feedbackId}`,
        body.service_id,
        overallRating,
        body.comment_text || 'No comment provided'
      )
    });
    console.log(`✅ DTA alert sent to ${adminEmail}`);
  } catch (error) {
    console.error('❌ DTA alert email failed (non-critical):', error);
    // Don't fail the API response
  }
}

// ============================================
// RESPONSE: Success
// ============================================
    return NextResponse.json({
      success: true,
      feedback_id: feedbackId,
      submitted_at: submittedAt,
      message: 'Thank you for your feedback!',
      metadata: {
        requester_category_validation: body.recipient_group ? 'passed' : 'not_provided',
        channel: body.channel
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}