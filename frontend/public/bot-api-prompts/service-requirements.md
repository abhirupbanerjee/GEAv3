# Service Requirements API - Detailed Guide

## Endpoint
```
GET /api/external/services/requirements
```

## When to Use
Use this API when users ask about:
- Documents needed for a service
- Requirements for applications
- Mandatory vs optional documents
- Paperwork checklists
- What to prepare before visiting an office

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service_id` | string | **Yes** | Service ID in format `SVC-XXX-NNN` |

## Finding Service IDs

Users won't know service IDs. First, get the service list:
```
GET /api/external/dashboard?include=services
```

Then match the user's query to find the correct `service_id`.

### Common Service IDs

| Service | ID | Entity |
|---------|-----|--------|
| Work Permit Application | `SVC-LBR-001` | Department of Labour |
| Birth Certificate Copy/Extract | `SVC-REG-001` | Civil Registry |
| EA Portal Support Request | `SVC-DIG-001` | Digital Transformation Agency |
| Passport Renewal | `SVC-IMM-001` | Immigration Department |
| Business Registration | `SVC-COM-001` | Companies Registry |
| Tax Clearance Certificate | `SVC-TAX-001` | Inland Revenue |

## Example Questions → API Calls

| User Question | API Call |
|--------------|----------|
| "What documents for work permit?" | `?service_id=SVC-LBR-001` |
| "Birth certificate requirements" | `?service_id=SVC-REG-001` |
| "What do I need for passport renewal?" | `?service_id=SVC-IMM-001` |
| "Business registration documents" | `?service_id=SVC-COM-001` |
| "Tax clearance requirements" | `?service_id=SVC-TAX-001` |
| "EA Portal support request requirements" | `?service_id=SVC-DIG-001` |

## Response Structure

```json
{
  "success": true,
  "data": {
    "service": {
      "id": "SVC-LBR-001",
      "name": "Work Permit Application",
      "category": "business_and_commerce",
      "description": "Apply for a work permit for foreign nationals to work in Grenada.",
      "is_active": true,
      "entity": {
        "id": "DEP-012",
        "name": "Department of Labour"
      }
    },
    "requirements": [
      {
        "id": 212,
        "filename": "Work Permit Application Form",
        "file_extension": "pdf",
        "is_mandatory": true,
        "description": "Official application form for work permit (Form WP-1)"
      },
      {
        "id": 213,
        "filename": "Employment Contract or Offer Letter",
        "file_extension": "pdf",
        "is_mandatory": true,
        "description": "Signed contract or offer from the Grenadian employer"
      },
      {
        "id": 214,
        "filename": "Valid Passport Copy",
        "file_extension": "pdf",
        "is_mandatory": true,
        "description": "Color copy of passport bio-data page, valid for at least 6 months"
      },
      {
        "id": 215,
        "filename": "Passport-sized Photographs",
        "file_extension": "jpg",
        "is_mandatory": true,
        "description": "Two recent passport-sized photos (2x2 inches)"
      },
      {
        "id": 216,
        "filename": "Professional Qualifications",
        "file_extension": "pdf",
        "is_mandatory": false,
        "description": "Certificates, degrees, or professional credentials (if applicable)"
      }
    ],
    "summary": {
      "total": 5,
      "mandatory": 4,
      "optional": 1
    }
  },
  "meta": {
    "generated_at": "2025-12-18T10:30:00Z"
  }
}
```

## Tips for Bot Responses

1. **List clearly**: Present requirements as a numbered or bulleted list
2. **Separate mandatory/optional**: Clearly distinguish required vs optional documents
3. **Include formats**: Mention accepted file formats (PDF, JPG, etc.)
4. **Add descriptions**: Include the description for clarity on what's needed
5. **Summarize**: Start with "You need X documents (Y mandatory, Z optional)"

### Example Bot Response Format

> **Work Permit Application Requirements**
>
> You need **5 documents** (4 mandatory, 1 optional):
>
> **Mandatory:**
> 1. ✅ Work Permit Application Form (PDF) - Official form WP-1
> 2. ✅ Employment Contract or Offer Letter (PDF) - From your Grenadian employer
> 3. ✅ Valid Passport Copy (PDF) - Bio-data page, valid 6+ months
> 4. ✅ Passport-sized Photographs (JPG) - Two 2x2 inch photos
>
> **Optional:**
> 5. 📎 Professional Qualifications (PDF) - Certificates or degrees if applicable
>
> This service is provided by the **Department of Labour**.

## Handling Unknown Services

If the user asks about a service and you don't know the ID:

1. First call: `GET /api/external/dashboard?include=services`
2. Search the response for matching service names
3. Then call: `GET /api/external/services/requirements?service_id=<found_id>`

### Fuzzy Matching Examples

| User says... | Search for... | Likely match |
|-------------|---------------|--------------|
| "work permit" | "work permit", "labour" | SVC-LBR-001 |
| "birth certificate" | "birth", "certificate", "registry" | SVC-REG-001 |
| "passport" | "passport", "immigration" | SVC-IMM-001 |
| "business license" | "business", "registration", "company" | SVC-COM-001 |

## Error Handling

### 400 - Missing Parameter
```json
{
  "success": false,
  "error": "service_id query parameter is required"
}
```
**Bot response**: "I need to know which service you're asking about. Could you specify (e.g., work permit, birth certificate, passport renewal)?"

### 404 - Service Not Found
```json
{
  "success": false,
  "error": "Service not found: INVALID-ID"
}
```
**Bot response**: "I couldn't find that service. Let me show you the available services..." (then call dashboard?include=services)
