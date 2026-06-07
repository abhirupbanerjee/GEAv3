# AI Agent Registration & Invocation

> **Audience:** Platform admins, integrators and developers who need to register,
> configure and operate AI agents inside the GEA Portal.
> **Scope:** Replaces the legacy *AI Bot Inventory* (`/admin/ai-inventory`,
> `ai_bots` table). The current implementation lives under
> **Settings → AI Agents** and the per-Service Request invocation panel on the
> admin Service Request detail page.

---

## 1. What an "AI Agent" Is

An **AI Agent** in the portal is an external HTTP endpoint that:

1. Accepts a JSON (or `multipart/form-data`) request signed with a bearer
   token.
2. Returns either an inline answer (text / markdown / json) or an asynchronous
   `jobId` + downloadable artifacts (`pdf`, `docx`, `xlsx`, `pptx`, `image`,
   `audio`, etc.).
3. Optionally accepts file uploads using a two-step contract:
   `POST /upload` → `fileId` → `POST /invoke` with `{ files: [fileId] }`.

Agents are surfaced to staff on the **admin Service Request review page**
([frontend/src/app/admin/service-requests/[id]/page.tsx](frontend/src/app/admin/service-requests/[id]/page.tsx)),
restricted by an explicit **service-name allow-list** (see §4).

The tokens never reach the browser — every call goes through the server-side
proxy at [frontend/src/app/api/ai-agents/invoke/route.ts](frontend/src/app/api/ai-agents/invoke/route.ts).

---

## 2. Component Map

| Layer | File / Path | Purpose |
|------|-------------|---------|
| Bundled defaults | [frontend/src/config/ai-agents.json](frontend/src/config/ai-agents.json) | Source-of-truth registry baked into the image (the runtime file is bind-mounted to this so UI edits survive restarts). |
| Bundled mappings | [frontend/src/config/ai-agent-mappings.json](frontend/src/config/ai-agent-mappings.json) | Service-name → allowed `agentIds[]` list. |
| Server library | [frontend/src/lib/ai-agents.ts](frontend/src/lib/ai-agents.ts) | Registry/token/mapping read-write helpers. **Server-only.** |
| Outputs persistence | [frontend/src/lib/ai-agent-outputs.ts](frontend/src/lib/ai-agent-outputs.ts) | Saves downloadable artifacts to disk + `ai_agent_outputs` table. |
| Admin UI | [frontend/src/app/admin/settings/AiAgentsPanel.tsx](frontend/src/app/admin/settings/AiAgentsPanel.tsx) | Register / edit / delete agents and configure service mappings. |
| Settings host | [frontend/src/app/admin/settings/page.tsx](frontend/src/app/admin/settings/page.tsx) | Mounts the panel under category `AI_AGENTS`. |
| Public list API | [frontend/src/app/api/ai-agents/route.ts](frontend/src/app/api/ai-agents/route.ts) | `GET /api/ai-agents?serviceName=…` — returns only `id, name, description, acceptsFile, fileUpload, outputTypes, defaultOutputType, async` (no tokens, no endpoint URL). |
| Admin registry API | [frontend/src/app/api/ai-agents/registry/route.ts](frontend/src/app/api/ai-agents/registry/route.ts) | `GET` / `POST` agents. |
| Admin registry item API | [frontend/src/app/api/ai-agents/registry/[id]/route.ts](frontend/src/app/api/ai-agents/registry/[id]/route.ts) | `PATCH` / `DELETE` agent. |
| Spec fetch proxy | [frontend/src/app/api/ai-agents/fetch-spec/route.ts](frontend/src/app/api/ai-agents/fetch-spec/route.ts) | Server-side `GET <baseUrl>/spec` with the supplied token (avoids browser CORS). |
| Mappings API | [frontend/src/app/api/ai-agents/mappings/route.ts](frontend/src/app/api/ai-agents/mappings/route.ts) | `GET` / `PUT` service-name → agent-id allow-list. |
| Invocation proxy | [frontend/src/app/api/ai-agents/invoke/route.ts](frontend/src/app/api/ai-agents/invoke/route.ts) | Forwards user query (+ optional file) to upstream `/upload` + `/invoke`. |
| Job polling | [frontend/src/app/api/ai-agents/jobs/[jobId]/route.ts](frontend/src/app/api/ai-agents/jobs/[jobId]/route.ts) | Polls `<baseUrl>/jobs/<id>` for async results. |
| Output download proxy | [frontend/src/app/api/ai-agents/download/route.ts](frontend/src/app/api/ai-agents/download/route.ts) | Streams upstream `downloadUrl` with the bearer token attached. |
| Output persistence API | [frontend/src/app/api/ai-agents/outputs/route.ts](frontend/src/app/api/ai-agents/outputs/route.ts) | `POST` to save, `GET` to list per (user, SR). |
| Output item API | [frontend/src/app/api/ai-agents/outputs/[id]/route.ts](frontend/src/app/api/ai-agents/outputs/[id]/route.ts) | `GET` (download) / `DELETE`. |
| DB migration | [database/scripts/40-create-ai-agent-outputs-table.sh](database/scripts/40-create-ai-agent-outputs-table.sh) | Creates `ai_agent_outputs` table + indexes. |

### Files on disk (runtime, inside the `frontend` container)

| Path | Purpose | Bind-mounted to |
|------|---------|-----------------|
| `/app/runtime/ai-agents.json` | Live registry | `./frontend/src/config/ai-agents.json` |
| `/app/runtime/.env.agents` | Bearer tokens (`AI_AGENT_TOKEN_*=…`) | `./.env.agents` |
| `/app/runtime/ai-agent-mappings.json` | Service-name allow-list | `./frontend/src/config/ai-agent-mappings.json` |
| `/app/public/uploads/ai-agent-outputs` | Persisted binary outputs | named volume `ai_agent_outputs_data` |

Overridable via env vars: `AI_AGENT_REGISTRY_PATH`,
`AI_AGENT_TOKENS_PATH`, `AI_AGENT_MAPPINGS_PATH`,
`AI_AGENT_OUTPUTS_DIR`. Defaults are wired in
[docker-compose.yml](docker-compose.yml#L140-L220).

---

## 3. Agent Registration (Admin → Settings → AI Agents)

Route: `/admin/settings` → sidebar category **AI Agents**
(icon `FiCpu`).

### 3a. Manual registration form

Fields collected by the panel
([AiAgentsPanel.tsx](frontend/src/app/admin/settings/AiAgentsPanel.tsx)):

| Field | Notes |
|-------|-------|
| **Agent ID** | `^[a-z0-9][a-z0-9-]*$`, unique. Used as the registry key and to derive the env-var name `AI_AGENT_TOKEN_<UPPER_SNAKE>`. Immutable after creation. |
| **Display name** | Shown to staff on the SR page. |
| **Description** | Optional, surfaced as a tooltip / subtitle. |
| **Endpoint URL** | Full invocation URL (must end in `/invoke` or be the canonical path). `http(s)` only. |
| **Bearer token** | Stored in `.env.agents` and in an in-memory cache. Never returned by any GET endpoint. |
| **Output types** | Multi-select from `text, json, md, pdf, word, excel, powerpoint, image, podcast, chart, diagram`. |
| **Default output type** | Must be one of the selected output types. |
| **Async-capable** | Sets `async: true`. Long-running invocations return HTTP 202 + `jobId` so the UI can offer a *Show response* button. |
| **Enable File Uploads** → `acceptsFile` | When enabled, configure: max files (1–50), max size MB (1–500), required flag, allowed types. |

**API contract:**
- `POST /api/ai-agents/registry` — admin only (RBAC: `session.user.roleType === 'admin'`).
- `PATCH /api/ai-agents/registry/[id]` — partial updates; omit `token` to keep the existing one.
- `DELETE /api/ai-agents/registry/[id]` — also removes the token entry and prunes the agent from every mapping.

Persistence path on `addAgent()`:
1. Append the agent to `ai-agents.json` and `writeRegistry()`.
2. Update `.env.agents` with `AI_AGENT_TOKEN_<ID>=<token>` and refresh the
   in-memory `tokenCache` so the agent is callable **without** a container
   restart.

### 3b. Import from JSON (`/spec`)

Bottom-left **Import from JSON** button on the panel opens a modal that:

1. Accepts the agent **bearer token** + the agent's `/spec` URL.
2. Server-side `POST /api/ai-agents/fetch-spec` performs the upstream
   `GET <url>` with `Authorization: Bearer <token>`, with a 15 s timeout, to
   sidestep browser CORS.
3. The returned spec is rendered in a textarea. The admin can edit it.
4. `specToRegistryPayload()` normalises:
   - `slug` → `id`
   - `name`, `description`, `baseUrl`
   - `endpoints[].path` ending in `/invoke` (falls back to `baseUrl + /invoke`)
   - `outputConfig.enabledTypes` → portal output keys (aliases handled:
     `docx→word`, `xlsx→excel`, `pptx→powerpoint`, `markdown→md`,
     `image/*→image`, `audio/*→podcast`, …)
   - `outputConfig.defaultType` → must be in the enabled set, else first.
   - `uploadConfig.{enabled, maxFiles, maxSizePerFileMB, required, allowedTypes}`
     with MIME-to-short-key mapping (e.g.
     `application/vnd.openxmlformats-officedocument.wordprocessingml.document → word`).
   - `features.async === true` → `async: true`.
5. The result is POSTed to `/api/ai-agents/registry` exactly like a manual
   registration.

### 3c. What happens server-side

```
addAgent(input)
 ├─ reads ai-agents.json
 ├─ validates id uniqueness
 ├─ writes ai-agents.json   (truncate + write, keeps bind-mount inode)
 ├─ writes .env.agents      (header + KEY=VALUE per line)
 └─ tokenCache[tokenEnv] = token   ← lets the new agent run immediately
```

`getAgentToken()` resolves the token in this order:

1. `process.env[agent.tokenEnv]` (loaded from `.env.agents` at boot)
2. `tokenCache[agent.tokenEnv]` (set after a UI registration)
3. Re-parse `.env.agents` from disk

---

## 4. Service Mapping (Service Page Change)

The **same panel** has a *Service Mappings* table that drives which agents
appear on which Service Request. This is the integration point with the
service catalogue page:

- Each row binds a **`service_master.service_name`** value to a list of
  registered agent IDs.
- The service-name dropdown is populated from `GET /api/managedata/services`,
  so any service created on `/admin/services` becomes mappable immediately.
- Saving issues `PUT /api/ai-agents/mappings` with the full
  `{ [serviceName]: agentIds[] }` payload.

### Strict policy

`getPublicAgentsForServiceName(serviceName)`
([lib/ai-agents.ts](frontend/src/lib/ai-agents.ts)):

- Returns **`[]`** when the service name is not present in the mapping file.
- Returns **`[]`** when present but mapped to an empty list.
- Otherwise returns the public-safe projection of every registered agent
  whose `id` is in the allow-list.

This is intentionally strict: services without an explicit mapping show **no
agents** on their Service Request review page.

### Side effects

- Deleting an agent (`DELETE /registry/[id]`) also strips its id from every
  mapping, removing empty entries.
- Renaming a service in `service_master` requires re-mapping (mappings are
  keyed by `service_name`, not `service_id`).

---

## 5. End-to-End Flow on a Service Request

Sequence for a staff/admin user opening
`/admin/service-requests/<id>`:

```
┌────────────┐    GET /api/admin/service-requests/[id]      ┌──────────────┐
│  Browser   │ ────────────────────────────────────────────▶│  Next.js API │
│ (SR page)  │   (fetches request, including service_name)  └──────────────┘
└─────┬──────┘
      │   GET /api/ai-agents?serviceName=<service_name>
      ▼
┌──────────────┐      getPublicAgentsForServiceName()       ┌──────────────┐
│  /api/       │ ◀──────────────────────────────────────────│ lib/ai-agents│
│  ai-agents   │      (reads mappings + registry)           └──────────────┘
└─────┬────────┘
      │  returns [{id,name,desc,acceptsFile,fileUpload,outputTypes,async}]
      ▼
   Agent picker rendered. User selects an agent, enters a query,
   optionally picks one of:
     • a fresh upload, or
     • an existing SR attachment (proxied via
       /api/admin/service-requests/[id]/attachments/[aid])
   and clicks Run.
      │
      │  POST /api/ai-agents/invoke   (json OR multipart)
      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  invoke route:                                                          │
│   1. authn (session required)                                           │
│   2. resolve agent by id, resolve token via getAgentToken()             │
│   3. if file: POST <endpoint replace /invoke→/upload>  → fileId         │
│   4. POST <endpoint> { input:{query}, outputType, async, files:[id]? }  │
│   5. inline outputs (text/json/md) → returned verbatim                  │
│      binary outputs on async agents → returned as 202 + jobId           │
└──────────────────────────────────────────────────────────────────────────┘
      │
      ├─ 200 + body  → parseAgentResponse() in the page → render
      │                (md/json/text/image/audio/file)
      │
      └─ 202 + jobId → "Show response" button →
                       GET /api/ai-agents/jobs/<jobId>?agentId=<id>
                       (polls upstream <baseUrl>/jobs/<id>)
```

### Output persistence

When the parsed response contains a downloadable artifact
(`outputs[0].downloadUrl` present), the SR page fires
`POST /api/ai-agents/outputs` to persist it:

1. The route re-fetches the upstream artifact with the bearer token via
   `/api/ai-agents/download`, then writes the bytes to
   `${AI_AGENT_OUTPUTS_DIR}/<uuid>.<ext>`.
2. A metadata row is inserted into `ai_agent_outputs`
   (see §6).
3. The SR page reloads the *Previous Outputs* list
   (`GET /api/ai-agents/outputs?srNumber=<SR>`) so the file is one click away
   on the next visit.

Deletion (`DELETE /api/ai-agents/outputs/[id]`) removes both the row and the
file on disk.

### Async (`features.async === true`)

- Used only for non-inline output types
  (`INLINE_OUTPUT_TYPES = { text, json, md }`).
- The invoke route sets `async: true` in the upstream payload.
- If upstream returns a `jobId` and the job isn't already `completed /
  succeeded / success / done`, the proxy responds with
  `202 { pending: true, jobId, agentId, outputType, status, message }`.
- The browser shows a *Show response* button, which polls
  `/api/ai-agents/jobs/<jobId>`; the same `parseAgentResponse()` parser is
  used so success/file outputs flow through the identical render + persist
  pipeline.

---

## 6. Database

Table: `ai_agent_outputs`
(migration: [database/scripts/40-create-ai-agent-outputs-table.sh](database/scripts/40-create-ai-agent-outputs-table.sh))

| Column | Type | Notes |
|--------|------|-------|
| `id` | `BIGSERIAL PK` |  |
| `user_id` | `VARCHAR(255) NOT NULL` | from `session.user.id` |
| `user_email` | `VARCHAR(255)` |  |
| `sr_number` | `VARCHAR(50) NOT NULL` | service-request number |
| `agent_id` | `VARCHAR(100) NOT NULL` | matches registry id |
| `agent_name` | `VARCHAR(255)` |  |
| `output_type` | `VARCHAR(50) NOT NULL` | `pdf`, `word`, `image`, … |
| `mime_type` | `VARCHAR(255) NOT NULL` |  |
| `filename` | `VARCHAR(255) NOT NULL` |  |
| `stored_path` | `TEXT NOT NULL` | absolute path inside the container |
| `file_size` | `BIGINT` |  |
| `query_text` | `TEXT` |  |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |  |

Indexes:
- `idx_ai_agent_outputs_user_sr (user_id, sr_number, created_at DESC)`
- `idx_ai_agent_outputs_sr (sr_number, created_at DESC)`

> **Note:** the legacy `ai_bots` table and `/admin/ai-inventory` page are
> superseded by this flow. They are still present in older docs but are no
> longer the runtime source of truth for agent invocation.

---

## 7. Security Model

| Concern | Mitigation |
|---------|------------|
| Token exposure | Tokens live only in `.env.agents` / in-memory cache. `getPublicAgents*()` strips `tokenEnv` and `endpoint`. The browser only sees public metadata. |
| Admin gating | All `/api/ai-agents/registry`, `/mappings`, `/fetch-spec` routes require `session.user.roleType === 'admin'`; `/invoke`, `/jobs`, `/outputs` require an authenticated session. |
| CORS / SSRF on spec import | `/fetch-spec` validates `http(s)` URL, uses `AbortController` with a 15 s timeout, forwards a 502/504 on failure. |
| Upload size / type | Enforced both client-side (panel form & SR page) and again server-side via the `fileUpload` config. Default cap 500 MB. |
| File-on-disk leak | Output files are served by `/api/ai-agents/outputs/[id]` after an authenticated lookup against `ai_agent_outputs`. No directory listing exposed. |
| Service-name leakage | Strict allow-list — services without a mapping return `[]`, so the agent picker is hidden entirely. |

---

## 8. Operations & Deployment

### docker-compose

[docker-compose.yml](docker-compose.yml#L140-L220) wires:

```yaml
env_file:
  - .env.agents   # AI_AGENT_TOKEN_*=... — adding a token + restart enables a new agent
environment:
  - AI_AGENT_REGISTRY_PATH=/app/runtime/ai-agents.json
  - AI_AGENT_TOKENS_PATH=/app/runtime/.env.agents
  - AI_AGENT_MAPPINGS_PATH=/app/runtime/ai-agent-mappings.json
volumes:
  - ai_agent_outputs_data:/app/public/uploads/ai-agent-outputs
  - ./frontend/src/config/ai-agents.json:/app/runtime/ai-agents.json
  - ./.env.agents:/app/runtime/.env.agents
  - ./frontend/src/config/ai-agent-mappings.json:/app/runtime/ai-agent-mappings.json
```

The bind-mount of single files preserves the host inode so UI edits write
straight back to the committed JSON files (treat them as
operations-controlled config — review changes before committing).

### Fresh install / migration

1. Run [database/scripts/40-create-ai-agent-outputs-table.sh](database/scripts/40-create-ai-agent-outputs-table.sh)
   (or the consolidated `99-consolidated-setup.sh`).
2. Create an empty `.env.agents` at the repo root if it doesn't exist:
   ```
   # AI Agent bearer tokens (server-side only).
   ```
3. `docker compose up -d --build frontend`.
4. Sign in as an admin → **Settings → AI Agents** → register or *Import from
   JSON*.
5. Add at least one **Service Mapping** for the service whose SRs should
   show agents.

### Adding an agent without the UI

Append to `frontend/src/config/ai-agents.json`:

```json
{
  "id": "my-agent",
  "name": "My Agent",
  "description": "...",
  "endpoint": "https://example.com/api/agent-bots/my-agent/invoke",
  "tokenEnv": "AI_AGENT_TOKEN_MY_AGENT",
  "acceptsFile": false,
  "outputTypes": ["md", "text", "json"],
  "defaultOutputType": "md",
  "async": true
}
```

Append the matching `AI_AGENT_TOKEN_MY_AGENT=...` line to `.env.agents`, then
`docker compose up -d --force-recreate frontend`. Finally add the agent to a
service mapping via the UI (or by editing `ai-agent-mappings.json`).

---

## 9. Reference: Public Agent Payload

`GET /api/ai-agents?serviceName=EA%20Portal%20Support%20Request`

```json
{
  "agents": [
    {
      "id": "policybot-testing",
      "name": "Policy Bot - Testing",
      "description": "General purpose testing agent.",
      "acceptsFile": false,
      "outputTypes": ["md", "json", "text"],
      "defaultOutputType": "md",
      "async": true
    }
  ]
}
```

`POST /api/ai-agents/invoke`

```jsonc
// text / md / json (synchronous)
{ "agentId": "policybot-testing", "query": "Summarise this SR", "outputType": "md" }

// file-bearing (multipart fields)
// agentId, query, outputType, file
```

Responses:
- `200` — upstream body forwarded verbatim. Headers:
  `X-Agent-Id`, `X-Output-Type`.
- `202` — `{ pending: true, jobId, agentId, outputType, status, message }`.
- `4xx/5xx` — `{ error, upstreamStatus?, upstreamBody? }`.

---

## 10. Documentation Updates Required

The following existing docs still reference the **legacy** *AI Bot Inventory*
(`/admin/ai-inventory`, `ai_bots` table, `AI_BOT_INTEGRATION.md`) and need
follow-up edits to match the current implementation described above:

| File | Required change |
|------|-----------------|
| [docs/index.md](docs/index.md) | Drop the row pointing to a non-existent `solution/AI_BOT_INTEGRATION.md`; replace with a link to this file (`solution/ai-agent.md`). Update the project-structure tree (`bots-config.json`, `content/` "Page context API (for AI bot)" notes) to reference `ai-agents.json` / `ai-agent-mappings.json` / `.env.agents`. Replace the feature bullet *"AI bot inventory management"* with *"AI agent registry, per-service allow-list, and invocation proxy"*. |
| [docs/solution/AUTHENTICATION.md](docs/solution/AUTHENTICATION.md) | Replace the protected-route row `/admin/ai-inventory — AI bot management` with `/admin/settings (AI Agents tab) — AI agent registry & service mappings` and add the `/api/ai-agents/*` routes (admin-only for `registry`, `mappings`, `fetch-spec`; session-required for `invoke`, `jobs`, `outputs`, `download`). |
| [docs/solution/API_REFERENCE.md](docs/solution/API_REFERENCE.md) | Add a new section *"AI Agents"* listing the endpoints from §2 with methods, auth, and payloads from §9. |
| [docs/solution/DATABASE_REFERENCE.md](docs/solution/DATABASE_REFERENCE.md) | Add a section for `ai_agent_outputs` (schema from §6). Keep `ai_bots` documented but mark it as **legacy / read-only** (still present for backwards compatibility but not used by the agent invocation flow). Bump the reference-data table count accordingly. |
| [docs/solution/SOLUTION_ARCHITECTURE.md](docs/solution/SOLUTION_ARCHITECTURE.md) | Replace the architecture-diagram callout `/admin/ai-inventory (AI bots)` with `/admin/settings → AI Agents (registry + mappings)` and add a small component box for the **AI Agent Invocation Proxy** sitting between the Admin SR page and the upstream agent host. |
| [docs/user-manuals/GEA_Portal_Admin_User_Manual.md](docs/user-manuals/GEA_Portal_Admin_User_Manual.md) | Replace section *"8. AI Bot Inventory"* with *"8. AI Agents"* covering: registering an agent (manual + import from JSON), service mappings, running an agent from an SR review page, async ("Show response") flow, and managing previous outputs. Update the quick-link / sidebar / route tables (`/admin/ai-inventory` → `/admin/settings` ▸ AI Agents). |
| [docs/developer-guides/UI_MODIFICATION_GUIDE.md](docs/developer-guides/UI_MODIFICATION_GUIDE.md) | Replace *"How-To: Add a New AI Bot to Inventory"* with *"How-To: Add a New AI Agent"* pointing at this doc and the `AiAgentsPanel.tsx` import-from-JSON workflow. Update the page-inventory row (`AI Bot Inventory` → `AI Agents (Settings tab)`). |
| [docs/setup/FRESH_INSTALLATION_MANUAL.md](docs/setup/FRESH_INSTALLATION_MANUAL.md) | In the table list, add `ai_agent_outputs`. Replace the post-install bullet *"Configure AI bot integration (if using)"* with the AI-Agents setup steps from §8 (create `.env.agents`, run migration `40-…`, register via Settings → AI Agents). |
| [database/DB_README.md](database/DB_README.md) and [database/docs/DATABASE_SETUP_GUIDE.md](database/docs/DATABASE_SETUP_GUIDE.md) | Add `ai_agent_outputs` to the table inventory and reference script `40-create-ai-agent-outputs-table.sh`. |
| [database/docs/Prod_data.md](database/docs/Prod_data.md) | Add the `ai_agent_outputs` schema dump alongside the existing `ai_bots` rows. |
| Removed/legacy reference | If `docs/solution/AI_BOT_INTEGRATION.md` is ever created, it must be marked superseded by this file. The current index already links to it, but the file does not exist — fix as part of the `index.md` change above. |

> **Suggested follow-up commit message:**
> `docs: replace legacy AI Bot Inventory references with AI Agents (Settings) flow`
