// lib/emailTemplates.ts
// ============================================
// Email Templates for Phase 2b
// ============================================

export function getGrievanceConfirmationEmail(
  ticketNumber: string,
  serviceName: string,
  submitterName: string,
  statusLink: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; border-radius: 5px; }
          .content { padding: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; }
          .button { background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Grievance Submitted</h1>
          </div>
          
          <div class="content">
            <p>Dear ${submitterName},</p>
            
            <p>Thank you for submitting your grievance regarding <strong>${serviceName}</strong>.</p>
            
            <p><strong>Your Ticket Reference:</strong> ${ticketNumber}</p>
            
            <p>We have received your grievance and will review it within the next 24 hours. You can check the status of your grievance at any time using your ticket reference.</p>
            
            <p>
              <a href="${statusLink}" class="button">Check Grievance Status</a>
            </p>
            
            <p>If you have any questions, please reply to this email or contact the DTA Helpdesk.</p>
            
            <p>Best regards,<br/>Government of Grenada<br/>Digital Transformation Agency</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply with attachments.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return html;
}

export function getEAServiceRequestEmail(
  ticketNumber: string,
  serviceName: string,
  requesterName: string,
  statusLink: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; border-radius: 5px; }
          .content { padding: 20px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; }
          .button { background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EA Service Request Received</h1>
          </div>
          
          <div class="content">
            <p>Dear ${requesterName},</p>
            
            <p>Your request for <strong>${serviceName}</strong> has been submitted successfully.</p>
            
            <p><strong>Your Ticket Reference:</strong> ${ticketNumber}</p>
            
            <p>The DTA team will review your request and contact you with next steps.</p>
            
            <p>
              <a href="${statusLink}" class="button">View Request Status</a>
            </p>
            
            <p>Best regards,<br/>Government of Grenada<br/>Digital Transformation Agency</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply with attachments.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return html;
}

export function getFeedbackTicketAdminEmail(
  ticketNumber: string,
  serviceName: string,
  rating: number,
  feedback: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px; }
          .content { padding: 20px 0; }
          .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ New Feedback Ticket Created</h1>
          </div>
          
          <div class="content">
            <div class="alert">
              <p><strong>Ticket Reference:</strong> ${ticketNumber}</p>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Rating:</strong> ${rating}/5 ${rating <= 2 ? '(CRITICAL)' : '(Low)'}</p>
            </div>
            
            <p><strong>Feedback Summary:</strong></p>
            <p>${feedback}</p>
            
            <p>This ticket requires immediate attention.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return html;
}

/**
 * Feedback Confirmation Email Template
 * Sent to citizen who submitted feedback
 */
export function getFeedbackSubmittedTemplate(
  feedbackId: number,
  serviceId: string
): string {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            color: #333; 
            margin: 0; 
            padding: 0; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f9fafb; 
          }
          .content { 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          }
          .header { 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .header h1 { 
            color: #2563eb; 
            margin: 0; 
            font-size: 24px; 
          }
          .reference { 
            background: #eff6ff; 
            border-left: 4px solid #2563eb; 
            padding: 15px; 
            margin: 20px 0; 
          }
          .reference p { 
            margin: 8px 0; 
            color: #1e40af; 
            font-weight: bold; 
          }
          .message { 
            color: #374151; 
            line-height: 1.6; 
            margin: 15px 0; 
          }
          .footer { 
            border-top: 1px solid #e5e7eb; 
            padding-top: 20px; 
            margin-top: 30px; 
            color: #6b7280; 
            font-size: 12px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="header">
              <h1>✅ Thank You for Your Feedback</h1>
            </div>
            
            <p class="message">Dear Valued Citizen,</p>
            
            <p class="message">We have successfully received your feedback regarding government services. Your input is important and helps us improve our service delivery.</p>
            
            <div class="reference">
              <p>📋 Feedback ID: ${feedbackId}</p>
              <p>🏢 Service: ${serviceId}</p>
              <p>📅 Date: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p class="message">Your feedback has been recorded and will be reviewed by our team. If you provided contact information, we may reach out with follow-up questions.</p>
            
            <p class="message">Thank you for helping us serve you better!</p>
            
            <div class="footer">
              <p>This is an automated message from the Government of Grenada Enterprise Architecture Portal.</p>
              <p>If you have urgent questions, please contact: alerts.dtahelpdesk@gmail.com</p>
              <p style="margin-top: 20px; color: #9ca3af;">© Government of Grenada - All Rights Reserved</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return html;
}
/**
 * Service Request Status Change Email Template
 * Sent to requester when status changes
 */
export function getServiceRequestStatusChangeEmail(
  requestNumber: string,
  requesterName: string,
  serviceName: string,
  oldStatus: string,
  newStatus: string,
  comment: string | null,
  statusLink: string
): string {
  const statusColors: Record<string, string> = {
    submitted: '#f59e0b',
    in_progress: '#3b82f6',
    under_review: '#8b5cf6',
    completed: '#10b981',
    rejected: '#ef4444',
  };

  const statusColor = statusColors[newStatus] || '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
          .content { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid ${statusColor}; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: ${statusColor}; margin: 0; font-size: 24px; }
          .status-change { background: #f3f4f6; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 16px; font-size: 14px; font-weight: 600; text-transform: uppercase; }
          .status-old { background: #fee2e2; color: #991b1b; }
          .status-new { background-color: ${statusColor}; color: white; }
          .comment-box { background: #fffbeb; border: 1px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .button { display: inline-block; background: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="header">
              <h1>📋 Service Request Status Update</h1>
            </div>

            <p>Dear ${requesterName},</p>

            <p>The status of your service request has been updated.</p>

            <div class="status-change">
              <p><strong>Request Number:</strong> ${requestNumber}</p>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p style="margin-top: 15px;">
                <span class="status-badge status-old">${oldStatus.replace('_', ' ')}</span>
                →
                <span class="status-badge status-new">${newStatus.replace('_', ' ')}</span>
              </p>
            </div>

            ${
              comment
                ? `
            <div class="comment-box">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">📝 Update Notes:</p>
              <p style="margin: 0; color: #78350f;">${comment}</p>
            </div>
            `
                : ''
            }

            <p>You can view the full details of your request using the link below:</p>

            <p style="text-align: center;">
              <a href="${statusLink}" class="button">View Request Details</a>
            </p>

            <p>If you have any questions about this update, please contact the DTA team.</p>

            <p>Best regards,<br/>Government of Grenada<br/>Digital Transformation Agency</p>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>For assistance, contact: alerts.dtahelpdesk@gmail.com</p>
              <p style="margin-top: 20px; color: #9ca3af;">© Government of Grenada - All Rights Reserved</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
}

/**
 * DTA Admin Notification Email Template
 * Sent to DTA admins when a new service request is submitted
 */
export function getDTAServiceRequestNotificationEmail(
  requestNumber: string,
  serviceName: string,
  requesterName: string,
  requesterEmail: string,
  requesterMinistry: string | null,
  entityName: string,
  requestDescription: string | null,
  requestLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
          .content { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { color: #059669; margin: 0; font-size: 24px; }
          .info-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .info-row { margin: 10px 0; }
          .info-label { font-weight: bold; color: #065f46; }
          .description-box { background: #f9fafb; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <div class="header">
              <h1>🔔 New EA Service Request</h1>
            </div>

            <p>A new EA service request has been submitted and requires DTA attention.</p>

            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Request Number:</span> ${requestNumber}
              </div>
              <div class="info-row">
                <span class="info-label">Service:</span> ${serviceName}
              </div>
              <div class="info-row">
                <span class="info-label">Entity:</span> ${entityName}
              </div>
              <div class="info-row">
                <span class="info-label">Requester:</span> ${requesterName}
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span> ${requesterEmail}
              </div>
              ${requesterMinistry ? `
              <div class="info-row">
                <span class="info-label">Ministry:</span> ${requesterMinistry}
              </div>
              ` : ''}
            </div>

            ${requestDescription ? `
            <div class="description-box">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Request Description:</p>
              <p style="margin: 0; color: #374151;">${requestDescription}</p>
            </div>
            ` : ''}

            <p style="text-align: center;">
              <a href="${requestLink}" class="button">View Request Details</a>
            </p>

            <p style="color: #6b7280; font-size: 14px;">
              Please review this request and take appropriate action through the admin portal.
            </p>

            <div class="footer">
              <p>This is an automated notification from the GEA Portal.</p>
              <p>You received this email because you are a DTA administrator.</p>
              <p style="margin-top: 20px; color: #9ca3af;">© Government of Grenada - All Rights Reserved</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
