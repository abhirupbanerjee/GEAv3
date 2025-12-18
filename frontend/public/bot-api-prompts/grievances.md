# Grievances API - Detailed Guide

## Endpoint
```
GET /api/external/grievances
```

## When to Use
Use this API when users ask about:
- Specific grievances or complaints
- Complaint records for a ministry/department
- Status of grievances (open, resolved, etc.)
- Recent complaints filed
- Grievances related to specific services

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `open`, `in_progress`, `resolved`, `closed` |
| `entity_id` | string | Filter by entity ID (e.g., `DEP-001`, `MIN-003`) |
| `entity_name` | string | Fuzzy search by entity name (e.g., "immigration", "labour") |
| `service_id` | string | Filter by service ID (e.g., `SVC-LBR-001`) |
| `service_name` | string | Fuzzy search by service name (e.g., "work permit", "passport") |
| `limit` | integer | Max records to return (default: 50, max: 100) |
| `offset` | integer | Pagination offset for fetching more results |

## Example Questions → API Calls

### By Status
| User Question | API Call |
|--------------|----------|
| "Show open grievances" | `?status=open` |
| "List resolved complaints" | `?status=resolved` |
| "Grievances in progress" | `?status=in_progress` |
| "Show closed grievances" | `?status=closed` |

### By Entity
| User Question | API Call |
|--------------|----------|
| "Complaints against Immigration" | `?entity_name=immigration` |
| "Grievances for Ministry of Health" | `?entity_name=health` |
| "Labour Department complaints" | `?entity_name=labour` |
| "Issues with Finance Ministry" | `?entity_name=finance` |

### By Service
| User Question | API Call |
|--------------|----------|
| "Grievances about work permits" | `?service_name=work permit` |
| "Complaints about passport services" | `?service_name=passport` |
| "Birth certificate issues" | `?service_name=birth certificate` |

### Combined Filters
| User Question | API Call |
|--------------|----------|
| "Open complaints at Immigration" | `?status=open&entity_name=immigration` |
| "Resolved work permit grievances" | `?status=resolved&service_name=work permit` |
| "Recent complaints (last 10)" | `?limit=10` |

## Response Structure

```json
{
  "success": true,
  "data": {
    "grievances": [
      {
        "id": "GRV-2025-001234",
        "subject": "Delayed work permit processing",
        "description": "Applied 3 months ago, still no response...",
        "status": {
          "name": "Open",
          "code": "open",
          "color": "#ef4444"
        },
        "submitter": {
          "name": "J*** D***",
          "email": "j***@example.com"
        },
        "entity": {
          "id": "DEP-012",
          "name": "Department of Labour"
        },
        "service": {
          "id": "SVC-LBR-001",
          "name": "Work Permit Application"
        },
        "created_at": "2025-12-15T09:30:00Z",
        "updated_at": "2025-12-17T14:20:00Z"
      }
    ]
  },
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "meta": {
    "filters": {
      "status": "open",
      "entity_name": "labour"
    },
    "generated_at": "2025-12-18T10:30:00Z"
  }
}
```

## PII Handling

Personal information is automatically masked:
- **Names**: "John Doe" → "J*** D***"
- **Emails**: "john.doe@email.com" → "j***@email.com"

This protects citizen privacy while still allowing analysis of grievance patterns.

## Tips for Bot Responses

1. **Summarize patterns**: When showing multiple grievances, identify common themes
2. **Include counts**: "Found 12 open grievances for Immigration Department"
3. **Highlight status**: Make it clear whether complaints are open, being worked on, or resolved
4. **Reference timeframes**: Mention when grievances were filed if relevant
5. **Don't expose PII**: Use the masked names/emails as provided

## Common Analysis Patterns

### Finding Common Complaints
```
GET /api/external/grievances?status=open&limit=50
```
Then analyze subjects/descriptions for patterns.

### Entity Performance
```
GET /api/external/grievances?entity_name=immigration&status=open
```
Check `pagination.total` to see how many unresolved complaints exist.

### Service Issues
```
GET /api/external/grievances?service_name=work permit
```
Identify if a specific service has recurring problems.
