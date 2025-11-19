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