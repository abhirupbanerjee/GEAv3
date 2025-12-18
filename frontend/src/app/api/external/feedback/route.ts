/**
 * GEA Portal - External Feedback API
 *
 * GET /api/external/feedback
 *
 * Query individual feedback records with filtering.
 * Requires X-API-Key header for authentication.
 *
 * Query Parameters:
 *   - service_id: Filter by service ID
 *   - service_name: Fuzzy search by service name (ILIKE)
 *   - entity_id: Filter by entity ID
 *   - entity_name: Fuzzy search by entity name (ILIKE)
 *   - has_comment: Filter to only records with comments (true/false)
 *   - has_grievance: Filter to only records flagged as grievances (true/false)
 *   - min_rating: Minimum overall satisfaction rating (1-5)
 *   - max_rating: Maximum overall satisfaction rating (1-5)
 *   - channel: Filter by submission channel (portal, qr, kiosk)
 *   - limit: Maximum records to return (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 *
 * Example:
 *   GET /api/external/feedback?has_comment=true&min_rating=1&max_rating=2&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    // API Key validation
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const serviceId = searchParams.get('service_id');
    const serviceName = searchParams.get('service_name');
    const entityId = searchParams.get('entity_id');
    const entityName = searchParams.get('entity_name');
    const hasComment = searchParams.get('has_comment');
    const hasGrievance = searchParams.get('has_grievance');
    const minRating = searchParams.get('min_rating');
    const maxRating = searchParams.get('max_rating');
    const channel = searchParams.get('channel');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Parse pagination
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '') || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(offsetParam || '') || 0);

    // Validate rating parameters
    const minRatingNum = minRating ? parseInt(minRating) : null;
    const maxRatingNum = maxRating ? parseInt(maxRating) : null;

    if (minRatingNum !== null && (minRatingNum < 1 || minRatingNum > 5)) {
      return NextResponse.json(
        { success: false, error: 'min_rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (maxRatingNum !== null && (maxRatingNum < 1 || maxRatingNum > 5)) {
      return NextResponse.json(
        { success: false, error: 'max_rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Build query
    const conditions: string[] = ['f.is_active = true'];
    const params: any[] = [];
    let paramIndex = 1;

    if (serviceId) {
      conditions.push(`f.service_id = $${paramIndex++}`);
      params.push(serviceId);
    }

    if (serviceName) {
      conditions.push(`s.service_name ILIKE $${paramIndex++}`);
      params.push(`%${serviceName}%`);
    }

    if (entityId) {
      conditions.push(`f.entity_id = $${paramIndex++}`);
      params.push(entityId);
    }

    if (entityName) {
      conditions.push(`e.entity_name ILIKE $${paramIndex++}`);
      params.push(`%${entityName}%`);
    }

    if (hasComment === 'true') {
      conditions.push(`f.comment_text IS NOT NULL`);
      conditions.push(`f.comment_text != ''`);
    } else if (hasComment === 'false') {
      conditions.push(`(f.comment_text IS NULL OR f.comment_text = '')`);
    }

    if (hasGrievance === 'true') {
      conditions.push(`f.grievance_flag = true`);
    } else if (hasGrievance === 'false') {
      conditions.push(`f.grievance_flag = false`);
    }

    if (minRatingNum !== null) {
      conditions.push(`f.q5_overall_satisfaction >= $${paramIndex++}`);
      params.push(minRatingNum);
    }

    if (maxRatingNum !== null) {
      conditions.push(`f.q5_overall_satisfaction <= $${paramIndex++}`);
      params.push(maxRatingNum);
    }

    if (channel) {
      conditions.push(`f.channel = $${paramIndex++}`);
      params.push(channel.toLowerCase());
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM service_feedback f
      JOIN service_master s ON f.service_id = s.service_id
      JOIN entity_master e ON f.entity_id = e.unique_entity_id
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get feedback records
    const result = await pool.query(
      `
      SELECT
        f.feedback_id,
        f.q1_ease,
        f.q2_clarity,
        f.q3_timeliness,
        f.q4_trust,
        f.q5_overall_satisfaction,
        f.grievance_flag,
        f.comment_text,
        f.recipient_group,
        f.channel,
        f.created_at,
        s.service_name,
        s.service_id,
        s.service_category,
        e.entity_name,
        e.unique_entity_id as entity_id
      FROM service_feedback f
      JOIN service_master s ON f.service_id = s.service_id
      JOIN entity_master e ON f.entity_id = e.unique_entity_id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `,
      [...params, limit, offset]
    );

    // Format results (no PII in feedback records)
    const feedback = result.rows.map(row => ({
      feedback_id: row.feedback_id,
      ratings: {
        ease: row.q1_ease,
        clarity: row.q2_clarity,
        timeliness: row.q3_timeliness,
        trust: row.q4_trust,
        overall_satisfaction: row.q5_overall_satisfaction,
      },
      grievance_flag: row.grievance_flag,
      comment: row.comment_text || null,
      recipient_group: row.recipient_group,
      channel: row.channel,
      created_at: row.created_at,
      service: {
        id: row.service_id,
        name: row.service_name,
        category: row.service_category,
      },
      entity: {
        id: row.entity_id,
        name: row.entity_name,
      },
    }));

    return NextResponse.json({
      success: true,
      data: feedback,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + feedback.length < total,
      },
      meta: {
        filters: {
          service_id: serviceId || null,
          service_name: serviceName || null,
          entity_id: entityId || null,
          entity_name: entityName || null,
          has_comment: hasComment === 'true' ? true : hasComment === 'false' ? false : null,
          has_grievance: hasGrievance === 'true' ? true : hasGrievance === 'false' ? false : null,
          min_rating: minRatingNum,
          max_rating: maxRatingNum,
          channel: channel || null,
        },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Feedback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
