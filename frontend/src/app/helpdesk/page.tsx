/**
 * @pageContext
 * @title Helpdesk
 * @purpose Citizens enter their ticket number to track the status of their feedback submissions and grievances
 * @audience public
 * @steps
 *   - Enter your ticket number in the format YYYYMM-XXXXXX (e.g., 202511-123456)
 *   - Click "View Ticket Status" to navigate to the ticket details page
 *   - View your ticket status, updates, and resolution timeline
 * @tips
 *   - Your ticket number is provided after submitting feedback with low ratings (average ≤ 2.0)
 *   - The ticket number format is YYYYMM-XXXXXX where YYYYMM is the year-month and XXXXXX is a unique identifier
 *   - Keep your ticket number safe to track your grievance progress
 *   - No authentication required - anyone with a valid ticket number can view its status
 * @features
 *   - Ticket number validation (format: YYYYMM-XXXXXX)
 *   - Direct navigation to ticket details page
 *   - Helpful guidance on where to find ticket numbers
 *   - Link to submit new feedback
 * @relatedPages
 *   - /helpdesk/ticket/[ticketNumber]: View detailed ticket status and updates
 *   - /feedback: Submit new feedback for government services
 *   - /: Return to homepage
 * @permissions
 *   - public: Full access - no authentication required
 * @note Feature can be disabled via Admin Settings → Integrations → Enable Public Helpdesk
 * @troubleshooting
 *   - Issue: Invalid ticket number format | Solution: Ensure format is YYYYMM-XXXXXX (e.g., 202511-494435)
 *   - Issue: Ticket not found | Solution: Double-check the ticket number for typos, or contact support if issue persists
 *   - Issue: Where do I find my ticket number | Solution: It appears on the confirmation page after submitting feedback with low ratings
 */

import { getPublicHelpdeskSettings } from '@/lib/settings';
import HelpdeskForm from '@/components/helpdesk/HelpdeskForm';
import HelpdeskDisabled from '@/components/helpdesk/HelpdeskDisabled';

export const metadata = {
  title: 'Helpdesk - Track Your Ticket',
  description: 'Track your service tickets and feedback submissions',
};

export default async function HelpdeskPage() {
  const { enabled } = await getPublicHelpdeskSettings();

  if (!enabled) {
    return <HelpdeskDisabled />;
  }

  return <HelpdeskForm />;
}
