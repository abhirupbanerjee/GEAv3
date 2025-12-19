# GEA Portal External API Guide

All requests require: `X-API-Key: <your-key>` header

## CRITICAL: Function Selection Rules

**ALWAYS call the API** - never say "no data available" without first making an API call.

| User Intent | Function to Call | Required Parameters |
|-------------|------------------|---------------------|
| "what are citizens saying", "show comments", "feedback with comments" | `get_citizen_feedback` | `has_comment=true` |
| "low ratings", "negative feedback", "1-2 stars", "bad reviews" | `get_citizen_feedback` | `has_comment=true`, `max_rating=2` |
| "positive feedback", "good reviews", "5-star" | `get_citizen_feedback` | `min_rating=4` or `min_rating=5` |
| "how many tickets", "total feedback", "statistics", "average satisfaction" | `get_dashboard_stats` | `include=feedback,tickets` |
| "satisfaction breakdown", "rating breakdown" | `get_dashboard_stats` | `include=feedback` |
| "list ministries", "show departments", "all entities" | `get_dashboard_stats` | `include=entities` |
| "list services", "available services" | `get_dashboard_stats` | `include=services` |
| "open grievances", "complaints filed", "grievances against X" | `get_grievances` | `status=open` |
| "overdue tickets", "past SLA", "urgent tickets" | `get_tickets` | `overdue=true` or `priority=urgent` |
| "documents needed", "requirements for X" | `get_service_requirements` | `service_id=SVC-XXX-NNN` |

---

## Master Data Reference

Service and Entity Master data is available in your knowledge base.

**Entity Types (ID Prefixes):**
- `MIN-XXX` = Ministry (e.g., MIN-001 = Ministry of Finance)
- `DEP-XXX` = Department (e.g., DEP-009 = Immigration Department)
- `AGY-XXX` = Agency (e.g., AGY-005 = Digital Transformation Agency)

**Service ID Format:** `SVC-XXX-NNN`
- SVC-LBR-001 = Work Permit Application
- SVC-REG-001 = Birth Certificate Copy/Extract
- SVC-IMM-001 = Passport Renewal
- SVC-DIG-001 = EA Portal Support Request

When user mentions an entity/service by name, look up the ID from master data or use `entity_name`/`service_name` parameters for fuzzy matching.

---

## API Endpoints

### 1. Dashboard Stats - `get_dashboard_stats`

**When to use:** Statistics, totals, averages, counts, lists of entities/services

**Parameters:**
- `include`: Comma-separated - `feedback`, `tickets`, `entities`, `services`, `leaderboard`, `requests`
- `entity_id`: Filter by entity (e.g., `MIN-001`)

**Response fields:**
- `data.feedback.overall.avg_satisfaction` - Overall satisfaction (1-5)
- `data.feedback.overall.avg_ease` - Ease of service (1-5)
- `data.feedback.overall.avg_clarity` - Clarity (1-5)
- `data.feedback.overall.avg_timeliness` - Timeliness (1-5)
- `data.feedback.overall.avg_trust` - Trust (1-5)
- `data.feedback.overall.total_submissions` - Total feedback count
- `data.feedback.rating_distribution` - Array of {rating, count, percentage}
- `data.tickets.total_tickets` - Total ticket count
- `data.tickets.metrics.overdue_tickets` - Overdue count

---

### 2. Citizen Feedback - `get_citizen_feedback`

**When to use:** Reading actual comments, citizen opinions, specific feedback records, ratings analysis

**Parameters:**
- `has_comment`: **Set TRUE** for "what are people saying", "show comments"
- `max_rating`: Set 2 for "low ratings", "negative", "1-2 stars"
- `min_rating`: Set 4 for "positive", Set 5 for "5-star only"
- `entity_name`: Fuzzy match - "immigration", "health", "labour"
- `service_name`: Fuzzy match - "work permit", "passport"
- `has_grievance`: TRUE for grievance-flagged feedback
- `channel`: `portal`, `qr`, `kiosk`
- `limit`: Number of records (default 20, max 100)

**Response:** Array of feedback with `ratings`, `comment`, `service`, `entity`, `channel`

---

### 3. Grievances - `get_grievances`

**When to use:** Formal complaints, grievance records, complaint tracking

**Parameters:**
- `status`: `open`, `in_progress`, `resolved`, `closed`
- `entity_name`: Fuzzy match
- `service_name`: Fuzzy match
- `limit`: Number of records

---

### 4. Tickets - `get_tickets`

**When to use:** Support tickets, SLA tracking, priority issues

**Parameters:**
- `status`: Ticket status
- `priority`: `low`, `medium`, `high`, `urgent`
- `overdue`: TRUE for past-SLA tickets
- `entity_name`: Fuzzy match
- `limit`: Number of records

---

### 5. Service Requirements - `get_service_requirements`

**When to use:** Document checklists, application requirements

**Parameters:**
- `service_id`: **REQUIRED** - format SVC-XXX-NNN

If user asks about a service by name, first look up the service_id from master data or call `get_dashboard_stats` with `include=services`.

---

## Response Handling

All responses include:
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 100, "limit": 50, "has_more": true },
  "meta": { "generated_at": "..." }
}
```

**When responding to users:**
1. Always include actual numbers from the response
2. For feedback, quote relevant comments
3. For empty results, say "No [X] found matching your criteria" not "no data available"
4. Use `pagination.total` for counts

---

## Common Mistakes to Avoid

❌ Saying "no data available" without calling the API
❌ Using `get_dashboard_stats` when user wants to see actual comments (use `get_citizen_feedback`)
❌ Forgetting `has_comment=true` when user asks "what are people saying"
❌ Forgetting `max_rating=2` when user asks for "low ratings" or "negative feedback"
❌ Using wrong endpoint for the query type
