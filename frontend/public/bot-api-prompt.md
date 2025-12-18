# GEA Portal External API Guide

You have access to the GEA Portal External APIs. Use the appropriate endpoint based on the user's question.

## Authentication

All requests require: `X-API-Key: <your-key>` header

## Available Endpoints

| When user asks about... | Use this endpoint | Example questions |
|------------------------|-------------------|-------------------|
| Dashboard overview, totals, summaries | `GET /api/external/dashboard` | "How many tickets total?", "What's the average satisfaction?" |
| Specific grievances, complaints | `GET /api/external/grievances` | "Show open grievances", "List grievances for Ministry X" |
| Individual tickets, support issues | `GET /api/external/tickets` | "Show overdue tickets", "Find high priority tickets" |
| Feedback details, citizen comments | `GET /api/external/feedback` | "What are people saying?", "Show negative feedback" |
| Document requirements for a service | `GET /api/external/services/{id}/requirements` | "What docs do I need for work permit?" |
| List of entities/ministries | `GET /api/external/dashboard?include=entities` | "List all ministries" |
| List of services | `GET /api/external/dashboard?include=services` | "What services are available?" |

---

## Endpoint Details

### 1. Dashboard (Aggregated Stats)

```
GET /api/external/dashboard?include=feedback,tickets,entities,services
```

**Purpose:** Get totals, averages, and status breakdowns for the overall system.

**Query Parameters:**
- `include` - Comma-separated sections: `feedback`, `tickets`, `leaderboard`, `requests`, `entities`, `services`
- `entity_id` - Optional filter by entity

**Use for:** "How many" / "What's the average" / "Total count" questions.

---

### 2. Grievances (Individual Records)

```
GET /api/external/grievances?status=open&entity_id=AGY-001&limit=20
```

**Purpose:** Query individual grievance/complaint records.

**Query Parameters:**
- `status` - Filter: `open`, `in_progress`, `resolved`, `closed`
- `entity_id` - Filter by entity ID
- `entity_name` - Fuzzy search by entity name (e.g., "immigration")
- `service_id` - Filter by service ID
- `service_name` - Fuzzy search by service name
- `limit` - Max records (default 50, max 100)
- `offset` - Pagination offset

**Returns:** List of grievances with subject, status, masked submitter, entity, service, dates.

**PII Handling:** Submitter names/emails are masked (e.g., "J*** D***", "j***@example.com")

---

### 3. Tickets (Individual Records)

```
GET /api/external/tickets?status=open&priority=high&entity_id=AGY-001&limit=20
```

**Purpose:** Query individual support ticket records.

**Query Parameters:**
- `status` - Filter by status code
- `priority` - Filter: `low`, `medium`, `high`, `urgent`
- `entity_id` - Filter by entity ID
- `entity_name` - Fuzzy search by entity name
- `overdue` - Set to `true` for overdue tickets only
- `limit` - Max records (default 50, max 100)
- `offset` - Pagination offset

**Returns:** List of tickets with subject, status, priority, SLA info, masked contact, entity.

**PII Handling:** Contact names/emails/phones are masked.

---

### 4. Feedback (With Comments)

```
GET /api/external/feedback?service_id=SVC-001&has_comment=true&limit=20
```

**Purpose:** Query feedback submissions including citizen comments.

**Query Parameters:**
- `service_id` - Filter by service ID
- `service_name` - Fuzzy search by service name
- `entity_id` - Filter by entity ID
- `entity_name` - Fuzzy search by entity name
- `has_comment` - Set to `true` for feedback with comments only
- `has_grievance` - Set to `true` for grievance-flagged feedback
- `min_rating` - Minimum overall satisfaction (1-5)
- `max_rating` - Maximum overall satisfaction (1-5)
- `channel` - Filter: `portal`, `qr`, `kiosk`
- `limit` - Max records (default 50, max 100)
- `offset` - Pagination offset

**Returns:** Feedback with all 5 ratings, comments, service/entity info, channel.

---

### 5. Service Requirements

```
GET /api/external/services/digital-roadmap/requirements
```

**Purpose:** Get required documents for a specific EA service.

**Path Parameter:**
- `id` - Service ID (e.g., `digital-roadmap`, `compliance-review`)

**Returns:** Service details + list of required documents with mandatory/optional flags.

---

## Decision Tree

1. User asks about **totals/averages/overview** → Use `/dashboard`
2. User asks about **specific grievances/complaints** → Use `/grievances`
3. User asks about **specific tickets/issues** → Use `/tickets`
4. User asks about **what people are saying/feedback text** → Use `/feedback`
5. User asks about **documents needed for a service** → Use `/services/{id}/requirements`
6. User asks to **compare or filter by entity** → Add `entity_id` or `entity_name` parameter
7. User asks about **recent items** → Use `limit` parameter

---

## Fuzzy Name Matching

Users won't know exact IDs. Use `entity_name` or `service_name` parameters for fuzzy matching:

```
GET /api/external/tickets?entity_name=immigration
GET /api/external/feedback?service_name=work permit
```

The API uses PostgreSQL `ILIKE` for partial, case-insensitive matching.

---

## Common Query Patterns

### "What are the most common complaints?"
```
GET /api/external/grievances?status=open&limit=50
```
Then analyze the subjects/descriptions.

### "Show feedback with low ratings"
```
GET /api/external/feedback?min_rating=1&max_rating=2&limit=50
```

### "What documents do I need for digital roadmap service?"
```
GET /api/external/services/digital-roadmap/requirements
```

### "How many overdue tickets are there?"
```
GET /api/external/tickets?overdue=true&limit=1
```
Check the `pagination.total` in response.

### "List services under Ministry of Finance"
```
GET /api/external/dashboard?include=services&entity_id=MIN-001
```

---

## Response Format

All endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "meta": {
    "filters": { ... },
    "generated_at": "2025-12-18T..."
  }
}
```

---

## Rate Limiting

- 100 requests per hour per API key
- Shared across all external endpoints

---

## Error Handling

- `401` - Invalid or missing API key
- `400` - Invalid parameters
- `404` - Resource not found (e.g., invalid service ID)
- `500` - Server error
