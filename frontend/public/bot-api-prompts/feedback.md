# Feedback API - Detailed Guide

## Endpoint
```
GET /api/external/feedback
```

## When to Use
Use this API when users ask about:
- Citizen comments and opinions
- Service ratings and reviews
- Negative or positive feedback
- Feedback patterns for specific services/entities
- Grievance-flagged submissions

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `service_id` | string | Filter by service ID (e.g., `SVC-LBR-001`) |
| `service_name` | string | Fuzzy search by service name (e.g., "work permit") |
| `entity_id` | string | Filter by entity ID (e.g., `DEP-012`) |
| `entity_name` | string | Fuzzy search by entity name (e.g., "immigration") |
| `has_comment` | boolean | Set to `true` for feedback with written comments only |
| `has_grievance` | boolean | Set to `true` for grievance-flagged feedback only |
| `min_rating` | integer | Minimum satisfaction rating (1-5) |
| `max_rating` | integer | Maximum satisfaction rating (1-5) |
| `channel` | string | Filter by submission channel: `portal`, `qr`, `kiosk` |
| `limit` | integer | Max records to return (default: 50, max: 100) |
| `offset` | integer | Pagination offset |

## Example Questions → API Calls

### By Rating
| User Question | API Call |
|--------------|----------|
| "Show negative feedback" | `?max_rating=2` |
| "Low-rated reviews" | `?max_rating=2&has_comment=true` |
| "5-star feedback" | `?min_rating=5&max_rating=5` |
| "Positive reviews" | `?min_rating=4` |
| "Average ratings (3 stars)" | `?min_rating=3&max_rating=3` |

### By Comments
| User Question | API Call |
|--------------|----------|
| "What are citizens saying?" | `?has_comment=true` |
| "Show feedback with comments" | `?has_comment=true` |
| "Recent citizen comments" | `?has_comment=true&limit=20` |
| "What are people complaining about?" | `?has_comment=true&max_rating=2` |

### By Entity
| User Question | API Call |
|--------------|----------|
| "Feedback for Immigration" | `?entity_name=immigration` |
| "What do people think of Labour Department?" | `?entity_name=labour&has_comment=true` |
| "Ministry of Health reviews" | `?entity_name=health` |

### By Service
| User Question | API Call |
|--------------|----------|
| "Work permit service feedback" | `?service_name=work permit` |
| "Passport service reviews" | `?service_name=passport` |
| "Birth certificate feedback" | `?service_name=birth certificate` |

### By Channel
| User Question | API Call |
|--------------|----------|
| "QR code feedback" | `?channel=qr` |
| "Portal submissions" | `?channel=portal` |
| "Kiosk feedback" | `?channel=kiosk` |

### Grievance-Flagged
| User Question | API Call |
|--------------|----------|
| "Feedback flagged as grievances" | `?has_grievance=true` |
| "Serious complaints from feedback" | `?has_grievance=true&has_comment=true` |

### Combined Filters
| User Question | API Call |
|--------------|----------|
| "Negative feedback about Immigration" | `?entity_name=immigration&max_rating=2&has_comment=true` |
| "5-star reviews for work permit" | `?service_name=work permit&min_rating=5` |
| "QR feedback with low ratings" | `?channel=qr&max_rating=2` |

## Response Structure

```json
{
  "success": true,
  "data": {
    "feedback": [
      {
        "id": "FBK-2025-012345",
        "ratings": {
          "overall_satisfaction": 2,
          "ease_of_service": 2,
          "service_quality": 3,
          "timeliness": 1,
          "staff_professionalism": 3
        },
        "comment": "Waited 4 hours for a simple document. Staff were polite but the process is too slow.",
        "has_grievance": true,
        "channel": "portal",
        "service": {
          "id": "SVC-REG-001",
          "name": "Birth Certificate Copy/Extract"
        },
        "entity": {
          "id": "DEP-008",
          "name": "Civil Registry Department"
        },
        "created_at": "2025-12-17T15:45:00Z"
      }
    ]
  },
  "pagination": {
    "total": 89,
    "limit": 50,
    "offset": 0,
    "has_more": true
  },
  "meta": {
    "filters": {
      "has_comment": true,
      "max_rating": 2
    },
    "generated_at": "2025-12-18T10:30:00Z"
  }
}
```

## Rating Categories

Each feedback includes 5 rating dimensions (1-5 scale):

| Rating | What it Measures |
|--------|-----------------|
| `overall_satisfaction` | General satisfaction with the service |
| `ease_of_service` | How easy it was to complete the process |
| `service_quality` | Quality of the service received |
| `timeliness` | Speed and punctuality of service |
| `staff_professionalism` | Conduct and helpfulness of staff |

## Channel Types

| Channel | Description |
|---------|-------------|
| `portal` | Submitted via the online EA Portal |
| `qr` | Submitted by scanning QR code at service location |
| `kiosk` | Submitted at physical kiosk in government office |

## Tips for Bot Responses

1. **Summarize themes**: When showing multiple comments, identify common issues
2. **Quote selectively**: Include representative quotes from citizen comments
3. **Include all ratings**: Show the 5 rating dimensions when relevant
4. **Highlight grievances**: Note when feedback has been flagged as a grievance
5. **Compare channels**: QR/kiosk feedback is often more immediate post-service

## Common Analysis Patterns

### Sentiment Analysis
```
GET /api/external/feedback?has_comment=true&max_rating=2&limit=50
```
Review comments from dissatisfied citizens to identify issues.

### Service Quality Check
```
GET /api/external/feedback?service_name=work permit&has_comment=true
```
See what citizens think about a specific service.

### Entity Performance
```
GET /api/external/feedback?entity_name=immigration
```
Assess citizen satisfaction with a department.

### Identifying Problems
```
GET /api/external/feedback?has_grievance=true&has_comment=true
```
Find the most serious issues that citizens have raised.

### Channel Comparison
```
GET /api/external/feedback?channel=qr&max_rating=2
GET /api/external/feedback?channel=portal&max_rating=2
```
Compare feedback quality across submission channels.
