/**
 * GET /api/tickets/categories
 * 
 * Public endpoint to list available ticket categories
 * Optional filters by service_id and entity_id
 * 
 * Rate Limit: 30 requests per hour per IP
 * No authentication required
 * 
 * Query Parameters:
 *   - service_id: Optional (filter by service)
 *   - entity_id: Optional (filter by entity)
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import {
  respondSuccess,
  respondError,
  respondServerError,
  ErrorCodes,
  generateRequestId,
  logRequest,
  logError,
} from '@/lib/response'
import {
  checkRateLimit,
  recordAttempt,
  getClientIP,
  hashIP,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface CategoryResult {
  category_id: string
  category_name: string
  description: string | null
  icon: string | null
  service_id: string
  entity_id: string
  is_active: boolean
  avg_resolution_hours: number | null
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  try {
    // 1. EXTRACT CLIENT IP AND CHECK RATE LIMIT
    const clientIP = getClientIP(request)
    const ipHash = hashIP(clientIP)
    const rateLimitStatus = await checkRateLimit(ipHash, 'feedback')
    
    if (!rateLimitStatus.allowed) {
      logRequest('GET', '/api/tickets/categories', 429, Date.now() - startTime, requestId, {
        reason: 'rate_limit_exceeded',
      })
      return respondError(ErrorCodes.RATE_LIMIT_EXCEEDED, { requestId })
    }
    
    // 2. EXTRACT QUERY PARAMETERS
    const searchParams = request.nextUrl.searchParams
    const serviceId = searchParams.get('service_id')
    const entityId = searchParams.get('entity_id')
    
    // 3. BUILD QUERY DYNAMICALLY
    let query = `
      SELECT 
        tc.category_id,
        tc.category_name,
        tc.description,
        tc.icon,
        tc.service_id,
        tc.entity_id,
        tc.is_active,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600), 1) as avg_resolution_hours
      FROM ticket_categories tc
      LEFT JOIN tickets t ON tc.category_id = t.category_id 
      WHERE tc.is_active = TRUE
    `
    
    const params: any[] = []
    
    // Add optional filters
    if (serviceId) {
      query += ` AND tc.service_id = $${params.length + 1}`
      params.push(serviceId)
    }
    
    if (entityId) {
      query += ` AND tc.entity_id = $${params.length + 1}`
      params.push(entityId)
    }
    
    // Add grouping and ordering
    query += `
      GROUP BY tc.category_id, tc.category_name, tc.description, tc.icon, tc.service_id, tc.entity_id, tc.is_active
      ORDER BY tc.category_name ASC
    `
    
    // 4. FETCH CATEGORIES
    const result = await executeQuery<CategoryResult>(query, params)
    
    if (result.rows.length === 0) {
      logRequest('GET', '/api/tickets/categories', 200, Date.now() - startTime, requestId, {
        total: 0,
        filtered: true,
        service_id: serviceId,
        entity_id: entityId,
      })
      
      return respondSuccess(
        {
          categories: [],
          total: 0,
        },
        { status: 200, message: 'No categories found with the given filters' }
      )
    }
    
    // 5. RECORD SUCCESSFUL ATTEMPT AND LOG
    await recordAttempt(ipHash, 'feedback', true)
    
    logRequest('GET', '/api/tickets/categories', 200, Date.now() - startTime, requestId, {
      total: result.rows.length,
      service_id: serviceId,
      entity_id: entityId,
    })
    
    // 6. RETURN RESPONSE
    return respondSuccess(
      {
        categories: result.rows.map(row => ({
          category_id: row.category_id,
          category_name: row.category_name,
          description: row.description,
          icon: row.icon,
          service_id: row.service_id,
          entity_id: row.entity_id,
          is_active: row.is_active,
          avg_resolution_hours: row.avg_resolution_hours,
        })),
        total: result.rows.length,
      },
      { status: 200 }
    )
    
  } catch (error) {
    const duration = Date.now() - startTime
    logError('GET', '/api/tickets/categories', error instanceof Error ? error.message : String(error), requestId)
    return respondServerError(error, requestId)
  }
}