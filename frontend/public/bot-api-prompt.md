# GEA Portal External API Guide

All requests require: `X-API-Key: <your-key>` header

## Quick Reference

| User asks about... | Endpoint |
|-------------------|----------|
| Totals, summaries, statistics | `GET /api/external/dashboard` |
| Specific grievances/complaints | `GET /api/external/grievances` |
| Support tickets, issues | `GET /api/external/tickets` |
| Citizen feedback, comments | `GET /api/external/feedback` |
| Document requirements | `GET /api/external/services/requirements?service_id=SVC-XXX-NNN` |
| List ministries/entities | `GET /api/external/dashboard?include=entities` |
| List services | `GET /api/external/dashboard?include=services` |

---

## 1. Dashboard - `/api/external/dashboard`

**Use for:** "How many tickets?", "Average satisfaction?", "Ticket status breakdown", "List ministries", "What services available?"

**Params:** `include` (feedback,tickets,entities,services), `entity_id`

---

## 2. Grievances - `/api/external/grievances`

**Use for:** "Show open grievances", "Complaints against Ministry X", "Grievances about passport services", "Recent complaints"

**Params:** `status` (open,in_progress,resolved,closed), `entity_id`, `entity_name`, `service_name`, `limit`, `offset`

---

## 3. Tickets - `/api/external/tickets`

**Use for:** "Overdue tickets", "High priority tickets", "Urgent issues", "Tickets past SLA", "Open support tickets"

**Params:** `status`, `priority` (low,medium,high,urgent), `entity_name`, `overdue` (true), `limit`, `offset`

---

## 4. Feedback - `/api/external/feedback`

**Use for:** "What are people saying?", "Low ratings", "Feedback with comments", "Negative feedback", "5-star reviews", "Citizen concerns"

**Params:** `service_name`, `entity_name`, `has_comment` (true), `min_rating`, `max_rating`, `channel` (portal,qr,kiosk), `limit`

---

## 5. Service Requirements - `/api/external/services/requirements`

**Use for:** "What docs for work permit?", "Birth certificate requirements", "Document checklist", "Mandatory documents"

**Params:** `service_id` (required, format: SVC-XXX-NNN)

**Common IDs:** SVC-LBR-001 (Work Permit), SVC-REG-001 (Birth Certificate), SVC-DIG-001 (EA Portal Support)

Get full list: `/api/external/dashboard?include=services`

---

## Fuzzy Matching

Use `entity_name` or `service_name` for partial matching:
```
/api/external/tickets?entity_name=immigration
/api/external/feedback?service_name=work permit
```

---

## Example Queries

```
# Overdue tickets count
GET /api/external/tickets?overdue=true&limit=1
→ Check pagination.total

# Low-rated feedback
GET /api/external/feedback?max_rating=2&has_comment=true&limit=30

# Urgent open issues
GET /api/external/tickets?priority=urgent&status=open

# Immigration complaints
GET /api/external/feedback?entity_name=immigration&max_rating=3

# Work permit documents
GET /api/external/services/requirements?service_id=SVC-LBR-001

# Overall satisfaction
GET /api/external/dashboard?include=feedback
→ data.feedback.overall.avg_satisfaction
```

---

## Response Format

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 100, "limit": 50, "has_more": true },
  "meta": { "generated_at": "..." }
}
```

**Errors:** 401 (invalid key), 400 (bad params), 404 (not found), 500 (server error)

**Rate Limit:** 100 requests/hour per API key
