# Dashboard API - Detailed Guide

## Endpoint
```
GET /api/external/dashboard
```

## When to Use
Use this API when users ask about:
- Overall statistics and totals
- Averages and aggregated metrics
- Status breakdowns and distributions
- Lists of entities (ministries, departments, agencies)
- Lists of available services

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `include` | string | Comma-separated sections to include: `feedback`, `tickets`, `leaderboard`, `requests`, `entities`, `services` |
| `entity_id` | string | Filter all stats by specific entity (e.g., `MIN-001`, `DEP-012`) |

## Example Questions → API Calls

### Statistics Questions
| User Question | API Call |
|--------------|----------|
| "How many tickets have been submitted?" | `?include=tickets` |
| "What's the average satisfaction rating?" | `?include=feedback` |
| "How many grievances are there?" | `?include=requests` |
| "Show me the ticket status breakdown" | `?include=tickets` |
| "What percentage of tickets are resolved?" | `?include=tickets` |
| "Give me overall portal statistics" | `?include=feedback,tickets,requests` |

### Entity/Service Listing Questions
| User Question | API Call |
|--------------|----------|
| "List all government ministries" | `?include=entities` |
| "What departments exist?" | `?include=entities` |
| "Show all agencies" | `?include=entities` |
| "What services are available?" | `?include=services` |
| "List services under Ministry of Finance" | `?include=services&entity_id=MIN-005` |

### Filtered Statistics
| User Question | API Call |
|--------------|----------|
| "How is Immigration Department performing?" | `?include=feedback,tickets&entity_id=DEP-001` |
| "Statistics for Labour Department" | `?include=feedback,tickets&entity_id=DEP-012` |

## Response Structure

```json
{
  "success": true,
  "data": {
    "feedback": {
      "overall": {
        "total_submissions": 1250,
        "avg_satisfaction": 4.2,
        "avg_ease_of_service": 4.0,
        "avg_service_quality": 4.1,
        "avg_timeliness": 3.8,
        "avg_staff_professionalism": 4.3
      },
      "rating_distribution": {
        "5_star": 450,
        "4_star": 380,
        "3_star": 250,
        "2_star": 100,
        "1_star": 70
      },
      "with_comments": 340,
      "grievance_flagged": 45
    },
    "tickets": {
      "total": 890,
      "by_status": {
        "open": 120,
        "in_progress": 85,
        "resolved": 650,
        "closed": 35
      },
      "by_priority": {
        "urgent": 15,
        "high": 45,
        "medium": 280,
        "low": 550
      },
      "overdue": 12
    },
    "entities": [
      {
        "id": "MIN-001",
        "name": "Ministry of Finance",
        "type": "ministry",
        "is_active": true
      }
    ],
    "services": [
      {
        "id": "SVC-LBR-001",
        "name": "Work Permit Application",
        "category": "business_and_commerce",
        "entity_id": "DEP-012",
        "entity_name": "Department of Labour"
      }
    ]
  },
  "meta": {
    "generated_at": "2025-12-18T10:30:00Z",
    "filters": { "entity_id": null }
  }
}
```

## Key Response Fields to Reference

| User asks about... | Reference this field |
|-------------------|---------------------|
| Total tickets | `data.tickets.total_tickets` |
| Open tickets | `data.tickets.status_breakdown.open.count` |
| Overdue tickets count | `data.tickets.metrics.overdue_tickets` |
| Average satisfaction | `data.feedback.overall.avg_satisfaction` |
| Total feedback | `data.feedback.overall.total_submissions` |
| Grievance count | `data.feedback.overall.grievance_count` |

### Satisfaction Score Breakdown

When users ask "What's the breakdown of the satisfaction score?" or "Explain the ratings", use these fields from `data.feedback.overall`:

| Field | Description | Scale |
|-------|-------------|-------|
| `avg_satisfaction` | Overall satisfaction rating | 1-5 |
| `avg_ease` | Ease of using the service | 1-5 |
| `avg_clarity` | Clarity of information provided | 1-5 |
| `avg_timeliness` | Speed and punctuality | 1-5 |
| `avg_trust` | Trust in the service/entity | 1-5 |

**Example response for "Show satisfaction breakdown":**
> The citizen satisfaction scores are:
> - **Overall Satisfaction**: 4.2/5
> - **Ease of Service**: 4.0/5
> - **Clarity of Information**: 3.9/5
> - **Timeliness**: 3.5/5
> - **Trust**: 4.1/5

### Rating Distribution

The `data.feedback.rating_distribution` array shows how many submissions for each star rating:

```json
[
  { "rating": 5, "count": 450, "percentage": 36.00 },
  { "rating": 4, "count": 380, "percentage": 30.40 },
  { "rating": 3, "count": 250, "percentage": 20.00 },
  { "rating": 2, "count": 100, "percentage": 8.00 },
  { "rating": 1, "count": 70, "percentage": 5.60 }
]
```

### Channel Breakdown

The `data.feedback.by_channel` array shows feedback by submission method:

```json
[
  { "channel": "portal", "count": 800, "avg_satisfaction": 4.3 },
  { "channel": "qr", "count": 350, "avg_satisfaction": 4.0 },
  { "channel": "kiosk", "count": 100, "avg_satisfaction": 3.8 }
]
```

## Tips for Bot Responses

1. **For statistics questions**: Always include the actual numbers in your response
2. **For percentage questions**: Calculate from the raw numbers (e.g., resolved/total × 100)
3. **For entity listings**: Group by type (ministries, departments, agencies)
4. **For service listings**: Can filter by entity if user mentions a specific ministry/department
5. **For comparisons**: May need multiple calls with different `entity_id` values
