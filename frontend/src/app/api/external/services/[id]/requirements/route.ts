/**
 * GEA Portal - External Service Requirements API
 *
 * GET /api/external/services/[id]/requirements
 *
 * Get document requirements for a specific service.
 * Requires X-API-Key header for authentication.
 *
 * Path Parameters:
 *   - id: Service ID (e.g., "digital-roadmap", "compliance-review")
 *
 * Example:
 *   GET /api/external/services/digital-roadmap/requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // API Key validation
    const authError = validateApiKey(request);
    if (authError) return authError;

    const { id: serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // First, verify the service exists
    const serviceResult = await pool.query(
      `
      SELECT
        s.service_id,
        s.service_name,
        s.service_category,
        s.service_description,
        s.is_active,
        e.entity_name,
        e.unique_entity_id as entity_id
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      WHERE s.service_id = $1
    `,
      [serviceId]
    );

    if (serviceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Service not found: ${serviceId}` },
        { status: 404 }
      );
    }

    const service = serviceResult.rows[0];

    // Get document requirements
    const requirementsResult = await pool.query(
      `
      SELECT
        service_attachment_id,
        filename,
        file_extension,
        is_mandatory,
        description,
        sort_order
      FROM service_attachments
      WHERE service_id = $1 AND is_active = true
      ORDER BY sort_order, filename
    `,
      [serviceId]
    );

    const requirements = requirementsResult.rows.map(row => ({
      id: row.service_attachment_id,
      filename: row.filename,
      file_extension: row.file_extension,
      is_mandatory: row.is_mandatory,
      description: row.description,
    }));

    // Count mandatory vs optional
    const mandatoryCount = requirements.filter(r => r.is_mandatory).length;
    const optionalCount = requirements.length - mandatoryCount;

    return NextResponse.json({
      success: true,
      data: {
        service: {
          id: service.service_id,
          name: service.service_name,
          category: service.service_category,
          description: service.service_description,
          is_active: service.is_active,
          entity: {
            id: service.entity_id,
            name: service.entity_name,
          },
        },
        requirements,
        summary: {
          total: requirements.length,
          mandatory: mandatoryCount,
          optional: optionalCount,
        },
      },
      meta: {
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Service requirements error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
