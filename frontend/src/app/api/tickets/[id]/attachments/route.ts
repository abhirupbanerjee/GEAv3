// ============================================
// TICKET ATTACHMENT UPLOAD ENDPOINT
// ============================================
// POST /api/tickets/:id/attachments
// Admin endpoint for uploading files to tickets
// Stores files directly in database as BYTEA
// 
// Database Alignment:
// • Stores in ticket_attachments table (NEW)
// • Validates file_size (max 5MB per schema)
// • Associates with ticket_id (FK constraint)
// • Stores mimetype for proper retrieval
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Constraints from ticket_attachments schema
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed file types for government documents
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Validate file mimetype
function isAllowedMimetype(mimetype: string): boolean {
  return ALLOWED_MIMETYPES.includes(mimetype);
}

// Validate ticket exists
async function validateTicketExists(ticketId: string) {
  const result = await pool.query(
    `SELECT ticket_id, ticket_number, status
     FROM tickets
     WHERE ticket_id = $1`,
    [ticketId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Ticket not found: ${ticketId}`);
  }
  
  return result.rows[0];
}

// Extract ticket ID from route parameter
function getTicketIdFromParams(params: any): string {
  const id = params?.id;
  if (!id) {
    throw new Error('Ticket ID is required in URL');
  }
  return id;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    // Get ticket ID from route params
    const ticketId = id;
    
    // ============================================
    // STEP 1: Validate ticket exists
    // ============================================
    const ticket = await validateTicketExists(ticketId);
    console.log(`✓ Ticket validated: ${ticket.ticket_number}`);
    
    // ============================================
    // STEP 2: Parse multipart form data
    // ============================================
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { 
          error: 'No file provided. Please upload a file with key "file"',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    // ============================================
    // STEP 3: Validate file properties
    // ============================================
    const filename = file.name;
    const mimetype = file.type;
    const fileSize = file.size;
    
    // Validate filename
    if (!filename || filename.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Filename is required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    // Validate file size (FK constraint in schema)
    if (fileSize === 0) {
      return NextResponse.json(
        { 
          error: 'File is empty',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          file_size_bytes: fileSize,
          max_size_bytes: MAX_FILE_SIZE,
          timestamp: new Date().toISOString()
        },
        { status: 413 }
      );
    }
    
    // Validate mimetype
    if (!isAllowedMimetype(mimetype)) {
      return NextResponse.json(
        { 
          error: 'File type not allowed',
          provided_type: mimetype,
          allowed_types: ALLOWED_MIMETYPES,
          timestamp: new Date().toISOString()
        },
        { status: 415 }
      );
    }
    
    console.log(`✓ File validated: ${filename} (${fileSize} bytes, ${mimetype})`);
    
    // ============================================
    // STEP 4: Convert file to Buffer for BYTEA storage
    // ============================================
    const fileBuffer = await file.arrayBuffer();
    
    // ============================================
    // STEP 5: Store in ticket_attachments table
    // ============================================
    const attachmentResult = await pool.query(
      `INSERT INTO ticket_attachments (
        ticket_id,
        filename,
        mimetype,
        file_content,
        file_size,
        uploaded_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING attachment_id, created_at`,
      [
        ticketId,
        filename,
        mimetype,
        Buffer.from(fileBuffer), // BYTEA storage
        fileSize,
        'system', // Could be auth user in future
        new Date()
      ]
    );
    
    if (attachmentResult.rows.length === 0) {
      throw new Error('Failed to store attachment in database');
    }
    
    const attachment = attachmentResult.rows[0];
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Attachment stored: ${attachment.attachment_id} (${processingTime}ms)`);
    
    // ============================================
    // STEP 6: Return success response
    // ============================================
    return NextResponse.json({
      success: true,
      attachment: {
        attachment_id: attachment.attachment_id,
        ticket_id: ticketId,
        ticket_number: ticket.ticket_number,
        filename: filename,
        mimetype: mimetype,
        file_size_bytes: fileSize,
        created_at: attachment.created_at
      },
      metadata: {
        processing_time_ms: processingTime,
        max_file_size_bytes: MAX_FILE_SIZE
      },
      message: 'File successfully uploaded to ticket'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error uploading attachment:', error);
    
    // Specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Ticket not found')) {
        return NextResponse.json(
          { 
            error: error.message,
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to upload attachment',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/tickets/:id/attachments
// ============================================
// List all attachments for a ticket (metadata only, no file content)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ticketId = id;
    
    // Validate ticket exists
    const ticket = await validateTicketExists(ticketId);
    
    // Get attachments (metadata only, no file_content)
    const result = await pool.query(
      `SELECT 
        attachment_id,
        filename,
        mimetype,
        file_size,
        created_at
      FROM ticket_attachments
      WHERE ticket_id = $1
      ORDER BY created_at DESC`,
      [ticketId]
    );
    
    return NextResponse.json({
      success: true,
      ticket_id: ticketId,
      ticket_number: ticket.ticket_number,
      attachments: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error listing attachments:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Ticket not found')) {
        return NextResponse.json(
          { error: error.message, timestamp: new Date().toISOString() },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve attachments',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}