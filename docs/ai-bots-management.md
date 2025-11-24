# AI Bots Management Guide

Complete guide for managing AI bots in the EA Portal's AI Inventory system.

## Overview

The AI Inventory system (accessible at `/admin/ai-inventory` in your deployment) provides a centralized view of all AI assistant integrations used across government services. The system currently manages 7 bots with different categories, statuses, and target audiences.

## System Architecture

The AI inventory uses a **file-based configuration** approach:

- **Configuration File:** `frontend/public/config/bots-config.json`
- **Admin Interface:** Read-only viewing and filtering
- **No Database:** Bots are not stored in PostgreSQL
- **Deployment:** Changes require manual file editing and rebuild

## Bot Data Structure

Each bot in the system has the following properties:

```json
{
  "id": "unique-bot-id",
  "name": "Bot Display Name",
  "url": "https://bot-url.example.com/",
  "description": "Description of what the bot does",
  "status": "active",
  "deployment": "Vercel",
  "audience": "Public",
  "modality": "text",
  "category": "Category Name"
}
```

### Field Definitions

| Field | Type | Required | Values | Description |
|-------|------|----------|--------|-------------|
| `id` | string | Yes | Unique identifier | Lowercase, hyphenated (e.g., "gea-bot") |
| `name` | string | Yes | Any | Display name shown in UI |
| `url` | string | Yes | Valid URL | Link to the bot application |
| `description` | string | Yes | Any | Brief description of bot's purpose |
| `status` | string | Yes | `"active"` or `"planned"` | Current deployment status |
| `deployment` | string | Yes | Any (e.g., "Vercel", "TBD") | Hosting platform |
| `audience` | string | Yes | Any (e.g., "Public", "Government Staff") | Target users |
| `modality` | string | Yes | Any (e.g., "text", "text-audio") | Interaction type |
| `category` | string | Yes | Any | Bot category/purpose |

### Common Categories

- General Support
- Process Management
- Feedback Collection
- Compliance
- Policy Guidance
- Assessment

### Common Audiences

- Public
- Government Staff

### Common Deployment Platforms

- Vercel
- TBD (for planned bots)

## How to Add a New AI Bot

Since there is no UI for creating bots, you must manually edit the configuration file.

### Step-by-Step Process

1. **Open the configuration file:**
   ```bash
   nano frontend/public/config/bots-config.json
   # or use your preferred editor
   ```

2. **Add your new bot to the array:**
   ```json
   {
     "id": "my-new-bot",
     "name": "My New Bot",
     "url": "https://my-bot.vercel.app/",
     "description": "Helps citizens with specific government services",
     "status": "active",
     "deployment": "Vercel",
     "audience": "Public",
     "modality": "text",
     "category": "General Support"
   }
   ```

3. **Validate the JSON syntax:**
   ```bash
   # Use a JSON validator
   cat frontend/public/config/bots-config.json | jq .
   ```

4. **Commit your changes:**
   ```bash
   git add frontend/public/config/bots-config.json
   git commit -m "Add new AI bot: My New Bot"
   ```

5. **Deploy the changes:**

   **If using Docker:**
   ```bash
   docker-compose up -d --build frontend
   ```

   **If using npm/yarn:**
   ```bash
   cd frontend
   npm run build
   npm start
   ```

6. **Verify the bot appears:**
   - Navigate to `/admin/ai-inventory` in your deployment
   - Check that your bot is listed
   - Click "View" to test the iframe preview
   - Click "Open" to test the direct link

### Example: Adding a Budget Planning Bot

```json
{
  "id": "budget-planning-bot",
  "name": "Budget Planning Assistant",
  "url": "https://budget-bot.vercel.app/",
  "description": "Assists government departments with annual budget planning and allocation",
  "status": "active",
  "deployment": "Vercel",
  "audience": "Government Staff",
  "modality": "text-audio",
  "category": "Financial Planning"
}
```

## How to Edit an Existing Bot

### Changing Bot Status

To change a bot from "planned" to "active":

1. **Open the configuration file:**
   ```bash
   nano frontend/public/config/bots-config.json
   ```

2. **Find the bot by ID and update the status:**
   ```json
   {
     "id": "policy-bot",
     "name": "Policy Bot",
     "status": "active",  // Changed from "planned"
     "deployment": "Vercel",  // Changed from "TBD"
     "url": "https://policy-bot.vercel.app/"  // Add the actual URL
   }
   ```

3. **Save and deploy** (follow steps 3-6 from "Adding a New Bot")

### Updating Bot URL or Link

To change the URL of an existing bot:

1. **Open the configuration file**

2. **Find the bot and update the URL:**
   ```json
   {
     "id": "gea-bot",
     "name": "GEA AI Assistant",
     "url": "https://new-url.vercel.app/",  // Updated URL
     "description": "General EA portal assistant for government services and citizen inquiries",
     "status": "active",
     "deployment": "Vercel",
     "audience": "Public",
     "modality": "text",
     "category": "General Support"
   }
   ```

3. **Save and deploy**

### Other Common Edits

**Update bot description:**
```json
{
  "id": "citizen-survey-bot",
  "description": "NEW DESCRIPTION: Conducts citizen satisfaction surveys and collects feedback data"
}
```

**Change target audience:**
```json
{
  "id": "change-management-bot",
  "audience": "All Staff"  // Changed from "Government Staff"
}
```

**Add new modality:**
```json
{
  "id": "gea-bot",
  "modality": "text-audio-video"  // Expanded capabilities
}
```

## How to Remove a Bot

1. **Open the configuration file**

2. **Remove the entire bot object** (including commas)

3. **Ensure valid JSON syntax:**
   - No trailing commas
   - Array structure intact

4. **Save and deploy**

## Current Bots in System

### Active Bots (3)

| Bot Name | ID | Category | Audience | URL |
|----------|-----|----------|----------|-----|
| GEA AI Assistant | `gea-bot` | General Support | Public | [Link](https://gea-ai-assistant.vercel.app/) |
| Change Management Bot | `change-management-bot` | Process Management | Government Staff | [Link](https://cmb-jade.vercel.app/) |
| Citizen Survey Bot | `citizen-survey-bot` | Feedback Collection | Public | [Link](https://gog-citizen-survey-bot.vercel.app/) |

### Planned Bots (4)

| Bot Name | ID | Category | Audience |
|----------|-----|----------|----------|
| EA Compliance Bot | `ea-compliance-bot` | Compliance | Government Staff |
| Service Feedback Bot | `service-feedback-bot` | Feedback Collection | Public |
| Policy Bot | `policy-bot` | Policy Guidance | Government Staff |
| EA Maturity Assessment Bot | `ea-maturity-bot` | Assessment | Government Staff |

## Admin Interface Features

The AI Inventory page at `/admin/ai-inventory` provides:

### Filtering
- **All (7):** Shows all bots regardless of status
- **Active (3):** Shows only deployed, active bots
- **Planned (4):** Shows bots in planning/development

### Bot Information Display
Each bot shows:
- Name and description
- Category badge
- Status indicator (green for active, yellow for planned)
- Target audience
- Deployment platform
- Action buttons

### Actions
- **View:** Opens bot in iframe modal (active bots only)
- **Open:** Opens bot in new browser tab

### Statistics
- Active Bots count
- Planned Bots count
- Total Bots count

## File Locations

| File | Path |
|------|------|
| Configuration | `frontend/public/config/bots-config.json` |
| Admin Page | `frontend/src/app/admin/ai-inventory/page.tsx` |
| Documentation | `docs/ai-bots-management.md` |

## Troubleshooting

### Bot Not Appearing After Update

**Problem:** Added a bot but it doesn't show up in the admin interface.

**Solutions:**
1. Check JSON syntax: `cat frontend/public/config/bots-config.json | jq .`
2. Clear browser cache (Ctrl+Shift+R)
3. Rebuild frontend container: `docker-compose up -d --build frontend`
4. Check browser console for fetch errors

### Invalid JSON Error

**Problem:** Website shows error after editing config file.

**Solutions:**
1. Validate JSON: Use [jsonlint.com](https://jsonlint.com)
2. Common issues:
   - Missing commas between objects
   - Trailing commas in arrays
   - Unescaped quotes in strings
   - Missing closing brackets
3. Restore from git: `git checkout frontend/public/config/bots-config.json`

### "View" Button Not Working

**Problem:** Clicking "View" doesn't open the iframe modal.

**Solutions:**
1. Check bot status is "active" (only active bots can be viewed)
2. Verify the URL is valid and accessible
3. Check browser console for CORS or iframe errors
4. Some sites prevent iframe embedding - use "Open" instead

### Bot URL Changes Not Reflecting

**Problem:** Updated URL but old link still appears.

**Solutions:**
1. Hard refresh: Ctrl+Shift+R
2. Check you edited the correct file
3. Verify changes were saved
4. Ensure frontend rebuild completed successfully
5. Check deployment logs

## Best Practices

### Bot ID Naming
- Use lowercase letters
- Separate words with hyphens
- Keep it short and descriptive
- Examples: `policy-bot`, `citizen-survey-bot`, `ea-compliance-bot`

### URL Format
- Always use HTTPS
- Include trailing slash for consistency
- Test the URL before adding
- Ensure the bot allows iframe embedding

### Status Management
- Start new bots as "planned" until fully tested
- Change to "active" only when production-ready
- Update deployment from "TBD" to actual platform when deployed

### Descriptions
- Keep under 100 characters
- Focus on bot's primary purpose
- Mention target users if not obvious
- Use clear, simple language

### Version Control
- Always commit configuration changes
- Use descriptive commit messages
- Tag major inventory updates
- Keep backups of working configurations

## Future Enhancements

The current system could be enhanced with:

1. **Backend API** for CRUD operations
2. **Database storage** for bots
3. **Edit UI** with forms and validation
4. **Bot analytics** integration
5. **Version history** tracking
6. **Bulk import/export** functionality
7. **Permission management** for bot access

For feature requests or issues, contact the development team.

---

**Last Updated:** November 24, 2025
**Maintainer:** EA Portal Development Team

---

## See Also

### Related Documentation

- **[Complete Documentation Index](index.md)** - Overview of all documentation
- **[API Reference](API_REFERENCE.md)** - Admin API endpoints
- **[Database Reference](DATABASE_REFERENCE.md)** - Database schema

---
