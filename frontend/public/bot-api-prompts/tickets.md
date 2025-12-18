# Tickets API - Detailed Guide

## Endpoint
```
GET /api/external/tickets
```

## When to Use
Use this API when users ask about:
- Support tickets and their status
- Overdue or urgent tickets
- Priority-based ticket queries
- SLA compliance and deadlines
- Tickets assigned to specific departments

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status code (e.g., `open`, `in_progress`, `resolved`) |
| `priority` | string | Filter by priority: `low`, `medium`, `high`, `urgent` |
| `entity_id` | string | Filter by entity ID (e.g., `AGY-005`) |
| `entity_name` | string | Fuzzy search by entity name (e.g., "digital", "transformation") |
| `overdue` | boolean | Set to `true` to get only overdue tickets |
| `limit` | integer | Max records to return (default: 50, max: 100) |
| `offset` | integer | Pagination offset for fetching more results |

## Example Questions → API Calls

### By Priority
| User Question | API Call |
|--------------|----------|
| "Show urgent tickets" | `?priority=urgent` |
| "High priority issues" | `?priority=high` |
| "List low priority tickets" | `?priority=low` |
| "What needs immediate attention?" | `?priority=urgent&status=open` |

### By Status
| User Question | API Call |
|--------------|----------|
| "Open tickets" | `?status=open` |
| "Tickets in progress" | `?status=in_progress` |
| "Resolved tickets" | `?status=resolved` |

### Overdue/SLA
| User Question | API Call |
|--------------|----------|
| "Show overdue tickets" | `?overdue=true` |
| "Tickets past SLA" | `?overdue=true` |
| "What's behind schedule?" | `?overdue=true` |
| "How many tickets are overdue?" | `?overdue=true&limit=1` (check pagination.total) |

### By Entity
| User Question | API Call |
|--------------|----------|
| "Tickets for Digital Transformation" | `?entity_name=digital` |
| "EA Portal issues" | `?entity_name=digital` |
| "Immigration tickets" | `?entity_name=immigration` |

### Combined Filters
| User Question | API Call |
|--------------|----------|
| "Urgent open tickets" | `?priority=urgent&status=open` |
| "Overdue high priority" | `?overdue=true&priority=high` |
| "Open tickets at Immigration" | `?status=open&entity_name=immigration` |

## Response Structure

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "TKT-2025-005678",
        "subject": "Unable to access EA Portal account",
        "status": {
          "name": "Open",
          "code": "open",
          "color": "#ef4444"
        },
        "priority": {
          "name": "High",
          "code": "high",
          "color": "#f97316"
        },
        "requester_category": "citizen",
        "contact_name": "M*** S***",
        "contact_email": "m***@example.com",
        "contact_phone": "***-***-4567",
        "sla": {
          "response_target": "2025-12-16T10:00:00Z",
          "resolution_target": "2025-12-18T17:00:00Z",
          "first_response_at": "2025-12-16T09:45:00Z",
          "resolved_at": null,
          "status": "at_risk"
        },
        "entity": {
          "id": "AGY-005",
          "name": "Digital Transformation Agency"
        },
        "created_at": "2025-12-15T14:30:00Z",
        "updated_at": "2025-12-17T11:20:00Z"
      }
    ]
  },
  "pagination": {
    "total": 23,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "meta": {
    "filters": {
      "priority": "high",
      "overdue": false
    },
    "generated_at": "2025-12-18T10:30:00Z"
  }
}
```

## SLA Status Values

| Status | Meaning |
|--------|---------|
| `on_track` | Within SLA timeframe, progressing normally |
| `at_risk` | Approaching SLA deadline |
| `breached` | Past SLA deadline (overdue) |
| `met` | Resolved within SLA |

## PII Handling

Contact information is automatically masked:
- **Names**: "Maria Santos" → "M*** S***"
- **Emails**: "maria@email.com" → "m***@email.com"
- **Phones**: "473-555-1234" → "***-***-1234"

## Tips for Bot Responses

1. **Prioritize urgency**: Always highlight urgent and overdue tickets first
2. **Include SLA info**: Mention if tickets are at risk or breached
3. **Count summaries**: "There are 5 overdue tickets requiring attention"
4. **Group by priority**: When showing multiple tickets, organize by priority level
5. **Action-oriented**: Suggest which tickets need immediate action

## Common Analysis Patterns

### Workload Assessment
```
GET /api/external/tickets?status=open
```
Check `pagination.total` for open ticket count.

### Critical Issues
```
GET /api/external/tickets?priority=urgent&status=open
GET /api/external/tickets?overdue=true
```
Combine results to show what needs immediate attention.

### Department Performance
```
GET /api/external/tickets?entity_name=immigration&overdue=true
```
Check if specific departments have SLA issues.

### SLA Compliance Check
```
GET /api/external/tickets?overdue=true&limit=100
```
Review `pagination.total` to see overall SLA compliance.
