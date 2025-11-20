// ============================================
// CREATE TICKET FROM FEEDBACK - CRITICAL ENDPOINT
// ============================================
// POST /api/tickets/from-feedback
// Internal endpoint called by feedback system
// Converts grievance feedback into tickets with new schema fields
// 
// Database Alignment:
// • Maps feedback.recipient_group → tickets.requester_category
// • Maps feedback.service_id → tickets.service_id
// • Validates against service_master FK
// • Checks service_attachments for required docs
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';
import { checkGrievanceRateLimit, hashIP } from '@/lib/rate-limit'

// Valid requester categories - NEW FIELD
const VALID_REQUESTER_CATEGORIES = [
  'citizen',
  'business',        
  'government',     
  'tourist',
  'student',
  'other'
];

// Ticket priority mapping based on feedback rating
function getPriorityFromRating(avgRating: number, grievanceFlag: boolean): string {
  if (grievanceFlag) return 'high';
  if (avgRating <= 1.5) return 'urgent';
  if (avgRating <= 2.5) return 'high';
  return 'medium';
}

// Generate unique ticket number in format YYYYMM-XXXXXX
function generateTicketNumber(): string {
  const now = new Date();
  const yearMonth = now.getFullYear().toString() + 
                   String(now.getMonth() + 1).padStart(2, '0');
  const randomPart = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `${yearMonth}-${randomPart}`;
}


// Map feedback recipient_group to ticket requester_category
function mapRecipientGroupToCategory(recipientGroup: string | null): string {
  if (!recipientGroup) return 'citizen'; // Default
  
  const mapping: Record<string, string> = {
  'citizen': 'citizen',
  'business': 'business',
  'government': 'government',
  'visitor': 'tourist',
  'student': 'student',
  'other': 'other'  
  };
  
  return mapping[recipientGroup.toLowerCase()] || 'citizen';
}

// Calculate average rating from 5-point feedback
function calculateAverageRating(
  q1: number,
  q2: number,
  q3: number,
  q4: number,
  q5: number
): number {
  return (q1 + q2 + q3 + q4 + q5) / 5;
}

// Validate service exists and is active
async function validateService(serviceId: string) {
  const result = await pool.query(
    `SELECT service_id, service_name, entity_id, is_active
     FROM service_master
     WHERE service_id = $1`,
    [serviceId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  
  if (!result.rows[0].is_active) {
    throw new Error(`Service is inactive: ${serviceId}`);
  }
  
  return result.rows[0];
}

// Check mandatory attachments required for service
async function checkMandatoryAttachments(serviceId: string) {
  const result = await pool.query(
    `SELECT service_attachment_id, filename, is_mandatory, description
     FROM service_attachments
     WHERE service_id = $1 AND is_mandatory = TRUE
     ORDER BY filename`,
    [serviceId]
  );
  
  return result.rows;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'feedback_id',
      'service_id',
      'entity_id',
      'q1_ease',
      'q2_clarity',
      'q3_timeliness',
      'q4_trust',
      'q5_overall_satisfaction'
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            error: `Missing required field: ${field}`,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
    }

    // Get and hash IP address for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const ipHash = hashIP(ip);

    // Check grievance rate limit
    const rateLimitStatus = await checkGrievanceRateLimit(ipHash)

      if (!rateLimitStatus.allowed) {
        return NextResponse.json(
          { 
            error: `Rate limit exceeded. Maximum ${rateLimitStatus.limit} grievances per hour.`,
            retry_after: 3600,
            remaining: rateLimitStatus.remaining,
            resetAt: rateLimitStatus.resetAt
          },
          { status: 429 }
        );
      }

    // Extract fields
    const {
      feedback_id,
      service_id,
      entity_id,
      recipient_group,
      grievance_flag,
      comment_text,
      q1_ease,
      q2_clarity,
      q3_timeliness,
      q4_trust,
      q5_overall_satisfaction
    } = body;
    
    // ============================================
    // STEP 1: Validate Service (FK validation)
    // ============================================
    const service = await validateService(service_id);
    console.log(`✓ Service validated: ${service.service_name}`);
    
    // ============================================
    // STEP 2: Check Mandatory Attachments
    // ============================================
    const mandatoryAttachments = await checkMandatoryAttachments(service_id);
    
    let attachmentWarning = null;
    if (mandatoryAttachments.length > 0) {
      attachmentWarning = {
        message: 'Service requires mandatory attachments',
        required_count: mandatoryAttachments.length,
        attachments: mandatoryAttachments.map(a => ({
          filename: a.filename,
          description: a.description
        }))
      };
      console.log(`⚠️  Mandatory attachments required: ${mandatoryAttachments.length}`);
    }
    
    // ============================================
    // STEP 3: Map feedback fields to ticket format
    // ============================================
    const avgRating = calculateAverageRating(
      q1_ease,
      q2_clarity,
      q3_timeliness,
      q4_trust,
      q5_overall_satisfaction
    );
    
    // Map recipient_group to requester_category (NEW FIELD)
    const requesterCategory = mapRecipientGroupToCategory(recipient_group);
    
    // Determine priority based on grievance or low rating
    const priority = getPriorityFromRating(avgRating, grievance_flag || false);
    
    // Build ticket description from feedback
    const description = `
Ticket created from citizen feedback

Service: ${service.service_name}
Requester Type: ${requesterCategory}
Grievance: ${grievance_flag ? 'Yes' : 'No'}
Average Rating: ${avgRating.toFixed(2)}/5.0

Ratings:
• Ease of Access: ${q1_ease}/5
• Clarity: ${q2_clarity}/5
• Timeliness: ${q3_timeliness}/5
• Trust: ${q4_trust}/5
• Overall Satisfaction: ${q5_overall_satisfaction}/5

${comment_text ? `\nCitizen Comments:\n${comment_text}` : ''}
    `.trim();
    
    // ============================================
    // STEP 4: Create ticket with new schema fields
    // ============================================
    const ticketNumber = generateTicketNumber();
    const now = new Date();
    
    const ticketResult = await pool.query(
      `INSERT INTO tickets (
        ticket_number,
        service_id,
        entity_id,
        requester_category,
        linked_feedback_id,
        description,
        priority,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING ticket_id, ticket_number, created_at`,
      [
        ticketNumber,
        service_id,
        entity_id,
        requesterCategory,
        feedback_id,
        description,
        priority,
        'open',
        now,
        now
      ]
    );
    
    if (ticketResult.rows.length === 0) {
      throw new Error('Failed to create ticket');
    }
    
    const ticket = ticketResult.rows[0];
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Ticket created: ${ticket.ticket_number} (${processingTime}ms)`);
    
    // ============================================
    // STEP 5: Return success response
    // ============================================
    return NextResponse.json({
      success: true,
      ticket: {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        service_id: service_id,
        requester_category: requesterCategory,
        status: 'open',
        priority: priority,
        linked_feedback_id: feedback_id,
        created_at: ticket.created_at,
        avg_rating: parseFloat(avgRating.toFixed(2))
      },
      warnings: attachmentWarning ? [attachmentWarning] : [],
      metadata: {
        processing_time_ms: processingTime,
        feedback_mapping: {
          recipient_group: recipient_group,
          mapped_to_requester_category: requesterCategory
        }
      },
      message: 'Ticket successfully created from feedback'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating ticket from feedback:', error);
    
    // Specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Service not found')) {
        return NextResponse.json(
          { 
            error: error.message,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }
      
      if (error.message.includes('inactive')) {
        return NextResponse.json(
          { 
            error: error.message,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create ticket from feedback',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}