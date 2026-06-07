/**
 * GEA Portal - External Entity Name → Services API
 *
 * GET /api/external/search/entity-name-service
 *
 * Fuzzy-searches entity names, then returns all services under the
 * matched entities. Optionally filter services by name with &service=
 *
 * Requires X-API-Key header for authentication.
 *
 * Query Parameters:
 *   - q: Entity name search string (required). Fuzzy AND logic per word.
 *   - service: Optional service name filter (fuzzy ILIKE)
 *   - limit: Maximum services returned (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 *
 * Examples:
 *   GET /api/external/search/entity-name-service?q=Ministry
 *   GET /api/external/search/entity-name-service?q=Ministry+Education
 *   GET /api/external/search/entity-name-service?q=Immigration&service=Passport
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

export async function GET(request: NextRequest) {
  try {
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;

    const rawQuery = (searchParams.get('q') || '').trim();
    if (!rawQuery) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (rawQuery.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Query must be ${MAX_QUERY_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const serviceFilter = (searchParams.get('service') || '').trim();
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '') || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '') || 0);

    const words = rawQuery.split(/\s+/).filter(w => w.length > 0).map(w => `%${w}%`);

    if (words.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query must contain at least one word' },
        { status: 400 }
      );
    }

    // Step 1: Fuzzy-match entity names (AND logic per word)
    const entityIlike: string[] = [];
    words.forEach((_, i) => {
      entityIlike.push(`e.entity_name ILIKE $${i + 1}`);
    });
    const entityWhere = entityIlike.join(' AND ');

    const entityResult = await pool.query(
      `SELECT e.unique_entity_id AS entity_id, e.entity_name, e.entity_type
       FROM entity_master e
       WHERE e.is_active = true AND ${entityWhere}
       ORDER BY e.entity_name`,
      words
    );

    if (entityResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          has_more: false,
        },
        meta: {
          query: rawQuery,
          service_filter: serviceFilter || null,
          word_count: words.length,
          entities_matched: 0,
          generated_at: new Date().toISOString(),
        },
      });
    }

    // Step 2: Get services under matched entities, optionally filtered by service name
    const entityIds = entityResult.rows.map((r: any) => r.entity_id) as string[];
    const inParams = entityIds.map((_, i) => `$${i + 1}`).join(', ');

    let serviceWhere = `s.is_active = true AND s.entity_id IN (${inParams})`;
    const queryValues: Array<string | number> = [...entityIds];
    let nextIdx = entityIds.length + 1;

    if (serviceFilter) {
      // Fuzzy filter on service name too
      const serviceWords = serviceFilter.split(/\s+/).filter(w => w.length > 0).map(w => `%${w}%`);
      for (const sw of serviceWords) {
        serviceWhere += ` AND s.service_name ILIKE $${nextIdx++}`;
        queryValues.push(sw);
      }
    }

    // Count
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM service_master s
       WHERE ${serviceWhere}`,
      queryValues
    );
    const totalServices = parseInt(countResult.rows[0]?.total || '0');

    const limitIdx = nextIdx++;
    const offsetIdx = nextIdx++;

    const serviceResult = await pool.query(
      `SELECT
         s.service_id,
         s.service_name,
         s.service_category,
         s.service_description,
         s.entity_id,
         e.entity_name,
         e.entity_type
       FROM service_master s
       JOIN entity_master e ON s.entity_id = e.unique_entity_id
       WHERE ${serviceWhere}
       ORDER BY e.entity_name, s.service_name
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...queryValues, limit, offset]
    );

    const services = serviceResult.rows.map((r: any) => ({
      service_id: r.service_id,
      service_name: r.service_name,
      service_category: r.service_category,
      service_description: r.service_description,
      entity_id: r.entity_id,
      entity_name: r.entity_name,
      entity_type: r.entity_type,
    }));

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        total: totalServices,
        limit,
        offset,
        has_more: offset + services.length < totalServices,
      },
      meta: {
        query: rawQuery,
        service_filter: serviceFilter || null,
        word_count: words.length,
        entities_matched: entityResult.rows.length,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Entity name service search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
