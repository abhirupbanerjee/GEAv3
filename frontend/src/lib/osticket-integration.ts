// ============================================
// OSTICKET INTEGRATION MODULE
// ============================================
// Handles automatic ticket creation for feedback
// requiring follow-up (low ratings or grievances)
// ============================================

export interface OsTicketConfig {
  apiUrl: string;
  apiKey: string;
  systemEmail: string;
}

export interface FeedbackData {
  feedback_id: number;
  service_id: string;
  entity_id: string;
  service_name: string;
  entity_name: string;
  q1_ease: number;
  q2_clarity: number;
  q3_timeliness: number;
  q4_trust: number;
  q5_overall_satisfaction: number;
  comment_text?: string;
  grievance_flag: boolean;
  channel: string;
  recipient_group?: string;
  submitted_at: string;
}

export interface TicketResult {
  ticketCreated: boolean;
  ticketNumber?: string;
  reason?: string;
  error?: string;
}

/**
 * Calculate average rating across all 5 questions
 */
function calculateAverageRating(feedback: FeedbackData): number {
  const ratings = [
    feedback.q1_ease,
    feedback.q2_clarity,
    feedback.q3_timeliness,
    feedback.q4_trust,
    feedback.q5_overall_satisfaction
  ];
  
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return sum / ratings.length;
}

/**
 * Determine if feedback requires ticket creation
 * Criteria:
 * 1. Grievance flag is set, OR
 * 2. Average rating <= 2.5 (poor experience)
 */
function requiresTicket(feedback: FeedbackData): { required: boolean; reason: string } {
  if (feedback.grievance_flag) {
    return { required: true, reason: 'Formal grievance flagged' };
  }
  
  const avgRating = calculateAverageRating(feedback);
  if (avgRating <= 2.5) {
    return { required: true, reason: `Low average rating (${avgRating.toFixed(1)}/5.0)` };
  }
  
  return { required: false, reason: 'No ticket required' };
}

/**
 * Format ticket subject line
 */
function formatTicketSubject(feedback: FeedbackData): string {
  const prefix = feedback.grievance_flag ? '[GRIEVANCE]' : '[LOW RATING]';
  return `${prefix} Service Feedback - ${feedback.service_name} (ID: ${feedback.feedback_id})`;
}

/**
 * Format detailed ticket message
 */
function formatTicketMessage(feedback: FeedbackData): string {
  const avgRating = calculateAverageRating(feedback);
  
  let message = `A citizen has submitted feedback requiring attention.\n\n`;
  message += `===========================================\n`;
  message += `FEEDBACK DETAILS\n`;
  message += `===========================================\n`;
  message += `Feedback ID: ${feedback.feedback_id}\n`;
  message += `Service: ${feedback.service_name}\n`;
  message += `Entity: ${feedback.entity_name}\n`;
  message += `Channel: ${feedback.channel}\n`;
  message += `Recipient Type: ${feedback.recipient_group || 'Not specified'}\n`;
  message += `Submitted: ${new Date(feedback.submitted_at).toLocaleString('en-US', { timeZone: 'America/Grenada' })}\n\n`;
  
  message += `===========================================\n`;
  message += `RATINGS (1=Poor, 5=Excellent)\n`;
  message += `===========================================\n`;
  message += `1. Ease of Access: ${feedback.q1_ease}/5 ${getRatingEmoji(feedback.q1_ease)}\n`;
  message += `2. Clarity of Information: ${feedback.q2_clarity}/5 ${getRatingEmoji(feedback.q2_clarity)}\n`;
  message += `3. Timeliness: ${feedback.q3_timeliness}/5 ${getRatingEmoji(feedback.q3_timeliness)}\n`;
  message += `4. Trust & Reliability: ${feedback.q4_trust}/5 ${getRatingEmoji(feedback.q4_trust)}\n`;
  message += `5. Overall Satisfaction: ${feedback.q5_overall_satisfaction}/5 ${getRatingEmoji(feedback.q5_overall_satisfaction)}\n`;
  message += `AVERAGE RATING: ${avgRating.toFixed(1)}/5.0\n\n`;
  
  if (feedback.grievance_flag) {
    message += `⚠️ FORMAL GRIEVANCE FLAGGED\n`;
    message += `This feedback has been marked as a formal grievance requiring official review.\n\n`;
  }
  
  if (feedback.comment_text) {
    message += `===========================================\n`;
    message += `CITIZEN COMMENTS\n`;
    message += `===========================================\n`;
    message += `${feedback.comment_text}\n\n`;
  }
  
  message += `===========================================\n`;
  message += `RECOMMENDED ACTIONS\n`;
  message += `===========================================\n`;
  
  if (feedback.grievance_flag) {
    message += `• Assign to appropriate service manager within 24 hours\n`;
    message += `• Conduct formal investigation\n`;
    message += `• Provide written response to feedback system\n`;
    message += `• Document resolution actions taken\n`;
  } else {
    message += `• Review service delivery process\n`;
    message += `• Contact citizen if additional information needed\n`;
    message += `• Identify improvement opportunities\n`;
    message += `• Update feedback record with resolution\n`;
  }
  
  message += `\n===========================================\n`;
  message += `This ticket was automatically generated by the\n`;
  message += `Government Enterprise Architecture Feedback System.\n`;
  message += `For questions, contact: digitalservices@gov.gd\n`;
  message += `===========================================\n`;
  
  return message;
}

/**
 * Get emoji based on rating value
 */
function getRatingEmoji(rating: number): string {
  if (rating >= 4) return '😊';
  if (rating === 3) return '😐';
  return '😞';
}

/**
 * Create ticket in osTicket system via API
 */
async function createOsTicket(
  feedback: FeedbackData,
  config: OsTicketConfig,
  reason: string
): Promise<{ success: boolean; ticketNumber?: string; error?: string }> {
  
  const ticketData: any = {
    alert: true,
    autorespond: true,
    source: 'API',
    name: 'Citizen Feedback System',  // ⭐ Changed from "Citizen Feedback System"
    email: config.systemEmail,
    subject: formatTicketSubject(feedback),
    message: formatTicketMessage(feedback),
    ip: '127.0.0.1',
    topicId: 1,
    priority: feedback.grievance_flag ? 2 : 3,
    // ⭐ CRITICAL: Use 'entity' and 'system_name' (from your test script)
    'entity': feedback.entity_name,
    'system_name': 'GEA Portal'
  };
  
  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify(ticketData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('osTicket API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return { 
        success: false, 
        error: `osTicket API returned ${response.status}: ${response.statusText}` 
      };
    }
    
    // ⭐ UPDATED: Handle both JSON and plain text responses
    const responseText = await response.text();
    
    // Try to parse as JSON first
    try {
      const result = JSON.parse(responseText);
      if (result && (result.ticket || result.ticketNumber || result.number)) {
        const ticketNumber = result.ticket || result.ticketNumber || result.number;
        return { 
          success: true, 
          ticketNumber: ticketNumber.toString() 
        };
      }
    } catch (e) {
      // If JSON parse fails, treat response as plain text ticket number
      const ticketNumber = responseText.trim();
      if (ticketNumber && ticketNumber.length > 0) {
        console.log(`✓ Ticket created (plain text response): ${ticketNumber}`);
        return { 
          success: true, 
          ticketNumber: ticketNumber
        };
      }
    }
    
    return { success: false, error: 'No ticket number in response' };
    

    
  } catch (error) {
    console.error('Failed to create osTicket:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Main function: Process feedback and create ticket if needed
 */
export async function processFeedbackForTicket(
  feedback: FeedbackData,
  config: OsTicketConfig
): Promise<TicketResult> {
  
  // Check if ticket is required
  const { required, reason } = requiresTicket(feedback);
  
  if (!required) {
    return { 
      ticketCreated: false, 
      reason: 'Feedback does not meet ticket creation criteria' 
    };
  }
  
  console.log(`Creating ticket for feedback #${feedback.feedback_id}: ${reason}`);
  
  // Create the ticket
  const result = await createOsTicket(feedback, config, reason);
  
  if (result.success && result.ticketNumber) {
    console.log(`✓ Ticket #${result.ticketNumber} created for feedback #${feedback.feedback_id}`);
    return {
      ticketCreated: true,
      ticketNumber: result.ticketNumber,
      reason
    };
  } else {
    console.error(`✗ Failed to create ticket for feedback #${feedback.feedback_id}:`, result.error);
    return {
      ticketCreated: false,
      reason,
      error: result.error
    };
  }
}

/**
 * Configuration instance - loaded from environment variables
 */
export const OSTICKET_CONFIG: OsTicketConfig = {
  apiUrl: process.env.OSTICKET_API_URL || '',
  apiKey: process.env.OSTICKET_API_KEY || '',
  systemEmail: process.env.OSTICKET_SYSTEM_EMAIL || ''
};