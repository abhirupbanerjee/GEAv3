// ============================================
// SERVICE SEARCH API
// ============================================
// Fuzzy search for services
// GET /api/feedback/search?q=passport
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  // Validate query
  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // Fuzzy search using pg_trgm similarity
    const result = await pool.query(`
      SELECT 
        s.service_id,
        s.service_name,
        s.service_category,
        s.service_description,
        s.entity_id,
        e.entity_name,
        e.entity_type,
        SIMILARITY(s.service_name, $1) as name_similarity,
        SIMILARITY(s.service_description, $1) as desc_similarity
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      WHERE 
        s.is_active = TRUE
        AND e.is_active = TRUE
        AND (
          s.service_name % $1
          OR s.service_description % $1
          OR s.service_name ILIKE $2
          OR s.service_description ILIKE $2
        )
      ORDER BY 
        GREATEST(
          SIMILARITY(s.service_name, $1),
          SIMILARITY(s.service_description, $1)
        ) DESC,
        s.service_name
      LIMIT 20
    `, [query, `%${query}%`]);

    return NextResponse.json({
      query: query,
      count: result.rows.length,
      results: result.rows.map(row => ({
        service_id: row.service_id,
        service_name: row.service_name,
        service_category: row.service_category,
        service_description: row.service_description,
        entity_id: row.entity_id,
        entity_name: row.entity_name,
        entity_type: row.entity_type,
        relevance: Math.max(row.name_similarity, row.desc_similarity)
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}