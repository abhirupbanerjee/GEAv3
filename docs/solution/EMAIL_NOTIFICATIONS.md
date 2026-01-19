# Email Notifications Documentation

## Overview

The GEA Portal uses SendGrid for all transactional email notifications. This document provides a comprehensive overview of all email notification features, triggers, templates, and configuration.

**Last Updated:** 2026-01-14

---

## Table of Contents

1. [Configuration](#configuration)
2. [Email Notification Types](#email-notification-types)
3. [Email Templates](#email-templates)
4. [Trigger Points](#trigger-points)
5. [Implementation Details](#implementation-details)
6. [Testing & Monitoring](#testing--monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Configuration

### Environment Variables

**Optional Variables (Email features disabled if not set):**
```bash
SENDGRID_API_KEY=SG.your_api_key_here          # SendGrid API authentication
SENDGRID_FROM_EMAIL=noreply@gov.gd             # Sender email address
SENDGRID_FROM_NAME=GEA Portal                   # Display name in emails
SERVICE_ADMIN_EMAIL=admin@gov.gd                # Admin notification recipient
```

> **Note:** SendGrid configuration is **optional**. The application will build and run without these variables. When not configured:
> - All email notifications are silently skipped
> - A warning is logged: "SendGrid not configured - email features disabled"
> - All other features (feedback, tickets, service requests) work normally

**Configuration Files:**
- **Setup:** [frontend/src/lib/sendgrid.ts](../frontend/src/lib/sendgrid.ts)
- **Env Config:** [frontend/src/config/env.ts](../frontend/src/config/env.ts)
- **Validation:** [frontend/src/lib/validateEnv.ts](../frontend/src/lib/validateEnv.ts)

### SendGrid Package

```json
{
  "@sendgrid/mail": "^8.1.6"
}
```

### Core Functions

**Location:** [frontend/src/lib/sendgrid.ts](../frontend/src/lib/sendgrid.ts)

```typescript
// Check if email is enabled (SendGrid configured)
isEmailEnabled(): boolean

// Send single email (returns success: false if not configured)
sendEmail(emailData: EmailData): Promise<EmailResult>

// Send bulk emails to multiple recipients
sendBulkEmail(recipients: string[], subject: string, html: string): Promise<EmailResult>

// EmailResult type
interface EmailResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}
```

**Graceful Degradation:** When SendGrid is not configured, `sendEmail()` and `sendBulkEmail()` return `{ success: false, error: 'SendGrid not configured' }` instead of throwing errors.

---

## Email Notification Types

### 1. Feedback Submission Notifications

#### 1.1 User Confirmation Email
**Trigger:** When a user submits feedback AND provides an email address
**Recipient:** User-provided email (`requester_email`)
**Template:** `getFeedbackSubmittedTemplate()`
**Subject:** "Thank You - Your Feedback Received (GEA Portal)"
**API Endpoint:** `POST /api/feedback/submit`
**File:** [frontend/src/app/api/feedback/submit/route.ts](../frontend/src/app/api/feedback/submit/route.ts) (Lines 294-306)

**Content Includes:**
- Feedback ID (e.g., FB-12345)
- Service name
- Submission timestamp
- DTA contact information

**Non-Critical:** API succeeds even if email fails

#### 1.2 DTA Alert for Low Ratings
**Trigger:** When overall satisfaction rating ≤ 2 out of 5
**Recipients:** All active DTA administrators (queried from database)
**Template:** `getFeedbackTicketAdminEmail()`
**Subject:** "⚠️ ALERT: Low Service Rating - [service_id] ([rating]/5)"
**API Endpoint:** `POST /api/feedback/submit`
**File:** [frontend/src/app/api/feedback/submit/route.ts](../frontend/src/app/api/feedback/submit/route.ts) (Lines 308-339)

**Recipient Query:**
```sql
SELECT DISTINCT u.email
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.entity_id = 'AGY-005'
  AND r.role_code = 'admin_dta'
  AND u.is_active = TRUE
  AND u.email IS NOT NULL
ORDER BY u.email;
```

**Content Includes:**
- Ticket reference (FB-{id})
- Service name
- Rating score (1-5)
- "CRITICAL" flag if rating ≤ 2
- User's feedback comment

**Delivery Method:** Bulk email (efficient for multiple recipients)
**Additional Action:** If grievance flagged OR average rating ≤ 2.5, automatically creates support ticket via `POST /api/tickets/from-feedback`

---

### 2. Service Request Status Change Notification

**Trigger:** When admin updates status of an EA service request
**Recipient:** `requester_email` from `ea_service_requests` table
**Template:** `getServiceRequestStatusChangeEmail()`
**Subject:** "Service Request [request_number] - Status Updated"
**API Endpoint:** `PUT /api/admin/service-requests/[id]/status`
**File:** [frontend/src/app/api/admin/service-requests/[id]/status/route.ts](../frontend/src/app/api/admin/service-requests/[id]/status/route.ts) (Lines 152-167)

**Valid Status Transitions:**
- submitted → in_progress → under_review → completed
- submitted → rejected

**Content Includes:**
- Request number
- Requester name
- Service name
- Old status → New status (with color-coded badges)
- Optional admin comment/notes
- Direct link to view request details

**Authentication:** Admin-only endpoint (requires `roleType === 'admin'`)
**Non-Critical:** Fires asynchronously - API succeeds even if email fails

---

### 3. Service Request Creation Notifications ⭐ NEW

#### 3.1 Requester Confirmation Email
**Trigger:** When staff user submits a new EA service request
**Recipient:** Requester email (staff member who submitted)
**Template:** `getEAServiceRequestEmail()`
**Subject:** "Service Request Submitted - [request_number]"
**API Endpoint:** `POST /api/admin/service-requests`
**File:** [frontend/src/app/api/admin/service-requests/route.ts](../frontend/src/app/api/admin/service-requests/route.ts)

**Content Includes:**
- Request number (e.g., SR-202601-0001)
- Service name
- Requester name
- Status tracking link

**Non-Critical:** Email failures don't break request creation

#### 3.2 DTA Administrator Notifications
**Trigger:** When staff user submits a new EA service request
**Recipients:** All active DTA administrators
**Template:** `getDTAServiceRequestNotificationEmail()`
**Subject:** "New EA Service Request - [request_number]"
**API Endpoint:** `POST /api/admin/service-requests`
**File:** [frontend/src/app/api/admin/service-requests/route.ts](../frontend/src/app/api/admin/service-requests/route.ts)

**Recipient Query:**
```sql
SELECT DISTINCT u.email
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.entity_id = 'AGY-005'
  AND r.role_code = 'admin_dta'
  AND u.is_active = TRUE
  AND u.email IS NOT NULL
ORDER BY u.email;
```

**Content Includes:**
- Request number
- Service name
- Entity name
- Requester name and email
- Optional: Ministry, request description
- Direct link to review request

**Delivery Method:** Bulk email (efficient for multiple recipients)
**Non-Critical:** Email failures don't break request creation

---

## Email Templates

**Location:** [frontend/src/lib/emailTemplates.ts](../frontend/src/lib/emailTemplates.ts)

### Template Catalog

| Template Function | Purpose | Color Theme | Status |
|------------------|---------|-------------|--------|
| `getGrievanceConfirmationEmail()` | Grievance submission confirmation | Blue (#1e40af) | Defined (not in use) |
| `getEAServiceRequestEmail()` | EA service request confirmation | Green (#059669) | ✅ In Use |
| `getFeedbackSubmittedTemplate()` | Feedback submission confirmation | Blue (#2563eb) | ✅ In Use |
| `getFeedbackTicketAdminEmail()` | Low rating admin alert | Red (#dc2626) | ✅ In Use |
| `getServiceRequestStatusChangeEmail()` | Status update notification | Dynamic | ✅ In Use |
| `getDTAServiceRequestNotificationEmail()` | New request admin alert | Green (#059669) | ✅ In Use ⭐ NEW |

### Template Structure

All templates follow consistent HTML structure:
- **Responsive Design:** Max-width 600px container
- **Color-Coded Headers:** Visual distinction by notification type
- **Content Section:** Dynamic variables with proper null handling
- **Status Indicators:** Badges, color coding, visual hierarchy
- **Call-to-Action:** Direct links to portal pages
- **Footer:** Contact info, automated message disclaimer, copyright notice
- **Modern Styling:** Flexbox, borders, shadows, rounded corners

### Dynamic Color Mapping (Status Change Template)

```typescript
submitted:     #f59e0b (Amber)
in_progress:   #3b82f6 (Blue)
under_review:  #8b5cf6 (Purple)
completed:     #10b981 (Green)
rejected:      #ef4444 (Red)
```

---

## Trigger Points

### API Route Summary

| API Route | HTTP Method | Email Notifications | Count |
|-----------|-------------|---------------------|-------|
| `/api/feedback/submit` | POST | User confirmation + DTA admin alerts (conditional) | 1-N* |
| `/api/admin/service-requests` | POST | Requester confirmation + DTA admin notifications | 1+N* |
| `/api/admin/service-requests/[id]/status` | PUT | Status change notification | 1 |

*N = Number of active DTA administrators

### Email Flow Diagrams

#### Feedback Submission Flow
```
┌─────────────────────────────────────────────────────────┐
│              User Submits Feedback                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─→ [If email provided]
                 │   └─→ Send confirmation to user
                 │       Template: getFeedbackSubmittedTemplate()
                 │       Subject: "Thank You - Your Feedback Received"
                 │
                 ├─→ [If rating ≤ 2]
                 │   └─→ Send alert to all DTA administrators
                 │       Template: getFeedbackTicketAdminEmail()
                 │       Subject: "⚠️ ALERT: Low Service Rating"
                 │       Recipients: Query admin_dta users (AGY-005)
                 │       Method: Bulk email
                 │
                 └─→ [If grievance OR avg rating ≤ 2.5]
                     └─→ Auto-create ticket (no email)
```

#### Service Request Creation Flow ⭐ NEW
```
┌─────────────────────────────────────────────────────────┐
│         Staff Submits Service Request                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─→ Database COMMIT succeeds
                 │
                 ├─→ Send confirmation to requester
                 │   Template: getEAServiceRequestEmail()
                 │   Subject: "Service Request Submitted - [number]"
                 │
                 └─→ Send notification to all DTA admins
                     Template: getDTAServiceRequestNotificationEmail()
                     Subject: "New EA Service Request - [number]"
                     Recipients: Query admin_dta users (AGY-005)
                     Method: Bulk email
```

#### Service Request Status Change Flow
```
┌─────────────────────────────────────────────────────────┐
│         Admin Updates Request Status                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 └─→ Send status update to requester
                     Template: getServiceRequestStatusChangeEmail()
                     Subject: "Service Request [number] - Status Updated"
                     Content: Old status → New status + comments
```

---

## Implementation Details

### Error Handling Strategy

**All email operations are NON-CRITICAL:**
- Email failures do NOT break API responses
- Emails sent AFTER database commit (prevents rollback)
- Try-catch blocks around all email operations
- Errors logged but not thrown
- Request/feedback creation succeeds even if ALL emails fail

**Example Pattern:**
```typescript
// Commit transaction
await pool.query('COMMIT');

// Send emails (non-blocking)
sendEmailFunction(data).catch((error) => {
  console.error('Email failed (non-critical):', error);
});

// Return success response
return NextResponse.json({ success: true, ... });
```

### Rate Limiting

**Configuration:** [frontend/src/config/env.ts](../frontend/src/config/env.ts)

```typescript
EA_SERVICE_RATE_LIMIT: 5 submissions per hour per IP
GRIEVANCE_RATE_LIMIT: 2 submissions per hour per IP
```

**Purpose:** Prevents email spam from rapid repeated submissions
**Tracking:** IP hash-based (SHA256 salted)

### Database Queries

#### Query DTA Administrators
```sql
SELECT DISTINCT u.email
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.entity_id = 'AGY-005'          -- DTA entity
  AND r.role_code = 'admin_dta'        -- Admin role only
  AND u.is_active = TRUE               -- Active users
  AND u.email IS NOT NULL              -- Valid emails
ORDER BY u.email;
```

#### Query Service/Entity Names for Email Content
```sql
SELECT s.service_name, e.entity_name
FROM service_master s
JOIN entity_master e ON s.entity_id = e.unique_entity_id
WHERE s.service_id = $1;
```

### Security Considerations

1. **No Email-Based Authentication**
   - NextAuth uses OAuth only (Google, Microsoft Azure AD)
   - No password reset emails
   - No email verification links
   - No sign-in confirmation emails

2. **Information Disclosure**
   - DTA notifications include requester email (intentional for follow-up)
   - Status links require authentication to view details
   - No sensitive request content in subject lines

3. **SQL Injection Prevention**
   - All queries use parameterized statements ($1, $2, etc.)
   - No string interpolation in SQL

4. **Email Address Validation**
   - Uses emails from database (already validated during user creation)
   - SendGrid performs additional format validation

---

## Testing & Monitoring

### Testing Checklist

**Feedback Submission:**
- [ ] Submit feedback with email → receive confirmation
- [ ] Submit feedback with rating ≤ 2 → admin receives alert
- [ ] Submit feedback without email → no confirmation sent
- [ ] Verify email contains correct feedback ID and service name

**Service Request Creation:** ⭐ NEW
- [ ] Submit service request → requester receives confirmation
- [ ] Check all DTA admin inboxes → all receive notification
- [ ] Verify emails contain correct request number
- [ ] Verify status links navigate to correct admin page
- [ ] Test with no description → emails still send correctly
- [ ] Test with SendGrid disabled → request creation succeeds

**Status Changes:**
- [ ] Update request status → requester receives notification
- [ ] Verify old/new status displayed correctly
- [ ] Test with admin comment → comment appears in email
- [ ] Verify color coding matches new status

### Console Logs

**Success Messages:**
```
✅ Email sent to user@example.com: 202
✅ Confirmation email sent to requester@example.com
📧 Sending notifications to 3 DTA administrators
✅ DTA admin notification emails sent to 3 recipients
✅ Bulk email sent to 5 recipients
```

**Warning Messages:**
```
⚠️  No active DTA administrators found for notification
```

**Error Messages:**
```
❌ Service not found for email notifications
❌ Failed to send confirmation email (non-critical): [error details]
❌ Failed to send DTA notification emails (non-critical): [error details]
❌ SendGrid error: [error details]
❌ Email notification handler error (non-critical): [error details]
```

### Monitoring Metrics

**Key Metrics to Track:**
- Email send success rate (per notification type)
- Average DTA recipients per service request
- Email delivery time (via SendGrid dashboard)
- Failed email count by type
- Rate limit violations

**SendGrid Dashboard:**
- Access: https://app.sendgrid.com/
- Track: Deliveries, bounces, opens, clicks
- View: Email activity logs, API usage

### Email Volume Estimates

**Based on Rate Limits:**
- Feedback emails: 1-N per submission (1 confirmation + 0-N DTA admin alerts if rating ≤ 2)
- Service request creation: 1+N emails per submission (1 confirmation + N DTA admin notifications)
- Status change emails: 1 per status change (typically 2-4 per request lifecycle)

**Where N = Number of active DTA administrators** (typically 3-10)

**Daily Maximum (approximate, assuming 5 DTA admins):**
- Feedback: ~240 submissions/day × 3 avg emails (50% low ratings) = ~720 emails
- Service requests: ~50 requests/day × 6 emails (1 + 5 admins) = ~300 emails
- Status changes: ~100 updates/day = ~100 emails
- **Total: ~1,120 emails/day** (well within SendGrid free tier of 100 emails/day for testing, 40,000/month for paid)

---

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending

**Symptoms:** No emails received, warning in logs
**Possible Causes:**
- `SENDGRID_API_KEY` not set (intentional - email disabled)
- `SENDGRID_API_KEY` invalid
- SendGrid account suspended

**Expected Behavior (No SendGrid Configured):**
```
⚠️ SendGrid not configured - email features disabled
⚠️ Email not sent - SendGrid not configured
```
This is normal when SendGrid is not configured. The application works without email.

**Debug Steps (When Email Should Work):**
```bash
# Check environment variables
docker exec feedback_frontend env | grep SENDGRID

# Check app logs for initialization
docker logs feedback_frontend | grep -i sendgrid

# Verify SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

**Solution:**
- If email is needed: Set `SENDGRID_API_KEY` in `.env` file and restart
- If email is not needed: Ignore the warnings (application works normally)
- Check SendGrid dashboard for account status if configured

#### 2. Bulk Emails Only Sending to First Recipient

**Symptoms:** Only one admin receives notification
**Cause:** Bug in `sendBulkEmail()` function (FIXED in latest version)
**Solution:** Ensure using `sgMail.send(messages)` not `sgMail.send(messages[0])`

**Verification:**
```bash
# Check current implementation
grep -A 5 "sendBulkEmail" frontend/src/lib/sendgrid.ts
```

#### 3. No DTA Administrators Found

**Symptoms:** Console warning "⚠️ No active DTA administrators found"
**Cause:** No users with `entity_id = 'AGY-005'` and `role_code = 'admin_dta'`

**Debug Query:**
```sql
SELECT u.email, u.name, u.is_active, r.role_code
FROM users u
JOIN user_roles r ON u.role_id = r.role_id
WHERE u.entity_id = 'AGY-005';
```

**Solution:**
- Create DTA admin users via `/api/admin/users`
- Ensure `entity_id = 'AGY-005'` and `role_code = 'admin_dta'`
- Verify `is_active = TRUE`

#### 4. Status Links Not Working

**Symptoms:** Email links return 404 or wrong page
**Cause:** Incorrect `NEXT_PUBLIC_APP_URL` configuration

**Debug:**
```bash
# Check base URL configuration
docker exec feedback_frontend env | grep APP_URL
```

**Solution:**
- Set `NEXT_PUBLIC_APP_URL=https://your-domain.com` in production
- Use `http://localhost:3000` for local development

#### 5. Emails Going to Spam

**Symptoms:** Recipients don't receive emails (check spam folder)
**Causes:**
- SendGrid domain not verified
- No SPF/DKIM records
- High complaint rate

**Solutions:**
- Verify sender domain in SendGrid dashboard
- Configure SPF and DKIM DNS records
- Use dedicated IP (paid SendGrid plans)
- Monitor bounce/spam rates in SendGrid

---

## SendGrid Dashboard Access

**URL:** https://app.sendgrid.com/
**Features:**
- Email activity logs
- API key management
- Sender authentication
- Domain verification
- Analytics & reporting
- Suppression management

**Recommended Settings:**
- Enable click tracking: Yes (for analytics)
- Enable open tracking: Yes (for analytics)
- Unsubscribe groups: Configure for transactional vs marketing
- IP warmup: Not needed for transactional emails

---

## Future Enhancements

### Potential Improvements

1. **Email Templates:**
   - Implement `getGrievanceConfirmationEmail()` template
   - Add email templates for ticket status changes
   - Support for email attachments (e.g., PDF reports)

2. **Notification Preferences:**
   - User preference management (opt-in/opt-out)
   - Notification frequency controls
   - Digest emails (daily/weekly summaries)

3. **Advanced Features:**
   - Email retry logic with exponential backoff
   - Queue-based email system (BullMQ/Redis)
   - Email delivery status webhooks
   - A/B testing for email content
   - Multi-language support

4. **Monitoring:**
   - Email delivery metrics dashboard
   - Real-time failure alerts
   - SendGrid webhook integration
   - Email template preview tool

---

## Related Documentation

- [Database Reference](./DATABASE_REFERENCE.md) - Database schemas and relationships
- [API Documentation](./API_ENDPOINTS.md) - API endpoint specifications
- [Infrastructure Guide](./infra/README.md) - Deployment and infrastructure setup
- [SendGrid Documentation](https://docs.sendgrid.com/) - Official SendGrid API docs

---

## Support & Contact

**For Email Notification Issues:**
- DTA Help Desk: alerts.dtahelpdesk@gmail.com
- System Administrator: admin@gov.gd
- SendGrid Support: https://support.sendgrid.com/

**For Development Questions:**
- Review code in [frontend/src/lib/sendgrid.ts](../frontend/src/lib/sendgrid.ts)
- Review templates in [frontend/src/lib/emailTemplates.ts](../frontend/src/lib/emailTemplates.ts)
- Check API routes for implementation examples

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-14
**Maintained By:** GEA Portal Development Team
