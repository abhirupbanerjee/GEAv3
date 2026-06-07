/**
 * @pageContext
 * @title Ticket Status Details
 * @purpose View detailed information about a specific grievance or feedback ticket, including status, priority, and activity history
 * @audience public
 * @routePattern /helpdesk/ticket/:ticketNumber
 * @routeParams
 *   - ticketNumber: Ticket identifier in format YYYYMM-XXXXXX (e.g., 202511-123456)
 * @features
 *   - Ticket status display with color-coded indicators (Open, In Progress, Resolved, Closed)
 *   - Priority level badge (Critical, High, Medium, Low)
 *   - Service and entity information
 *   - Detailed ticket description
 *   - Activity timeline showing all status changes and updates
 *   - Copy ticket number to clipboard functionality
 *   - Timestamps for creation and last update
 * @tips
 *   - Ticket status colors: Green (Resolved/Closed), Blue (In Progress), Yellow (Open), Red (Critical)
 *   - Activity timeline shows chronological history of all changes
 *   - Bookmark this page URL to easily check your ticket status later
 *   - Tickets are automatically created when feedback ratings average ≤ 2.0
 * @relatedPages
 *   - /helpdesk: Enter a different ticket number
 *   - /feedback: Submit new feedback
 *   - /: Return to homepage
 * @permissions
 *   - public: Anyone with valid ticket number can view ticket details
 * @note Feature can be disabled via Admin Settings → Integrations → Enable Public Helpdesk
 * @troubleshooting
 *   - Issue: Ticket not found | Solution: Verify ticket number format is YYYYMM-XXXXXX and check for typos
 *   - Issue: Unable to load ticket | Solution: Check your internet connection or try refreshing the page
 *   - Issue: Activity timeline not loading | Solution: Refresh the page or contact support if issue persists
 */

import { getPublicHelpdeskSettings } from '@/lib/settings';
import TicketDetailsClient from '@/components/helpdesk/TicketDetailsClient';
import HelpdeskDisabled from '@/components/helpdesk/HelpdeskDisabled';

export default async function TicketDetailsPage({
  params
}: {
  params: Promise<{ ticketNumber: string }>
}) {
  const { enabled } = await getPublicHelpdeskSettings();

  if (!enabled) {
    return <HelpdeskDisabled />;
  }

  const { ticketNumber } = await params;

  return <TicketDetailsClient ticketNumber={ticketNumber} />;
}
