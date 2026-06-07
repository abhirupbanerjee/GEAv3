/**
 * GEA Portal - External Entity Name Search API
 *
 * GET /api/external/search/entity-name
 *
 * Fuzzy search for entities by name. Splits the query into individual
 * words and matches each word against entity_name using ILIKE (AND logic).
 * The more words supplied, the narrower the results.
 *
 * Pass q=all to return every active entity.
 *
 * Requires X-API-Key header for authentication.
 *
 * Query Parameters:
 *   - q: Search query string (required). Use "all" to list every entity.
 *   - limit: Maximum records (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 *
 * Examples:
 *   GET /api/external/search/entity-name?q=all
 *   GET /api/external/search/entity-name?q=Authority
 *   GET /api/external/search/entity-name?q=Grenada+Tourism+Authority
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

    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '') || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '') || 0);

    const isAll = rawQuery.toLowerCase() === 'all';

    let total: number;
    let result: any;

    if (isAll) {
      // Return all active entities
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total FROM entity_master e WHERE e.is_active = true`
      );
      total = parseInt(countResult.rows[0]?.total || '0');

      result = await pool.query(
        `SELECT
           e.unique_entity_id AS entity_id,
           e.entity_name,
           e.entity_type,
           e.parent_entity_id,
           p.entity_name AS parent_entity_name,
           e.contact_email,
           e.contact_phone,
           e.created_at,
           e.updated_at
         FROM entity_master e
         LEFT JOIN entity_master p ON e.parent_entity_id = p.unique_entity_id
         WHERE e.is_active = true
         ORDER BY e.entity_name
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      // Fuzzy search
      const words = rawQuery.split(/\s+/).filter(w => w.length > 0).map(w => `%${w}%`);

      if (words.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Query must contain at least one word' },
          { status: 400 }
        );
      }

      const ilikeClauses: string[] = [];
      words.forEach((_, i) => {
        ilikeClauses.push(`e.entity_name ILIKE $${i + 1}`);
      });
      const whereFragment = ilikeClauses.join(' AND ');
      const limitIdx = words.length + 1;
      const offsetIdx = words.length + 2;

      const countResult = await pool.query(
        `SELECT COUNT(*) AS total
         FROM entity_master e
         WHERE e.is_active = true AND ${whereFragment}`,
        words
      );
      total = parseInt(countResult.rows[0]?.total || '0');

      result = await pool.query(
        `SELECT
           e.unique_entity_id AS entity_id,
           e.entity_name,
           e.entity_type,
           e.parent_entity_id,
           p.entity_name AS parent_entity_name,
           e.contact_email,
           e.contact_phone,
           e.created_at,
           e.updated_at
         FROM entity_master e
         LEFT JOIN entity_master p ON e.parent_entity_id = p.unique_entity_id
         WHERE e.is_active = true AND ${whereFragment}
         ORDER BY e.entity_name
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        [...words, limit, offset]
      );
    }

    const entities = result.rows.map((r: any) => ({
      entity_id: r.entity_id,
      entity_name: r.entity_name,
      entity_type: r.entity_type,
      parent_entity_id: r.parent_entity_id || null,
      parent_entity_name: r.parent_entity_name || null,
      contact_email: r.contact_email || null,
      contact_phone: r.contact_phone || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: entities,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + entities.length < total,
      },
      meta: {
        query: rawQuery,
        word_count: isAll ? 0 : rawQuery.split(/\s+/).filter(w => w.length > 0).length,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Entity name search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
