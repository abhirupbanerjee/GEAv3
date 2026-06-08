/**
 * Server-only AI agent registry — database-backed.
 *
 * Reads/writes agent definitions, encrypted bearer tokens, and service-name
 * mappings from PostgreSQL tables so the registry survives container rebuilds
 * and works across multiple frontend instances.
 *
 * Token resolution order:
 *   1. process.env[agent.tokenEnv]  (env override, backward compatible)
 *   2. ai_service_agent_tokens.encrypted_token (decrypted at runtime)
 *
 * This module must NEVER be imported from a client component.
 */

import { executeQuery, withTransaction } from '@/lib/db';
import { encryptValue, decryptValue } from '@/lib/settings-encryption';

export const ALLOWED_FILE_TYPE_KEYS = [
  'pdf',
  'word',
  'excel',
  'powerpoint',
  'image',
  'text',
  'csv',
  'json',
  'markdown',
] as const;
export type FileTypeKey = (typeof ALLOWED_FILE_TYPE_KEYS)[number];

export interface FileUploadConfig {
  maxFiles: number;
  maxSizeMB: number;
  required: boolean;
  allowedTypes: FileTypeKey[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  tokenEnv: string;
  acceptsFile: boolean;
  fileUpload?: FileUploadConfig;
  outputTypes: string[];
  defaultOutputType: string;
  /** Upstream supports async job submission (features.async in /spec). */
  async?: boolean;
}

export interface PublicAgent {
  id: string;
  name: string;
  description: string;
  acceptsFile: boolean;
  fileUpload?: FileUploadConfig;
  outputTypes: string[];
  defaultOutputType: string;
  async?: boolean;
}

/** Convert a user-supplied agent id to a safe tokenEnv variable name. */
export function tokenEnvNameFor(agentId: string): string {
  const safe = agentId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `AI_AGENT_TOKEN_${safe || 'CUSTOM'}`;
}

// ---------- DB row mappers ----------

interface AgentRow {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  accepts_file: boolean;
  file_upload: FileUploadConfig | null;
  output_types: string[];
  default_output_type: string;
  async: boolean | null;
}

function rowToDefinition(row: AgentRow): AgentDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    endpoint: row.endpoint,
    tokenEnv: tokenEnvNameFor(row.id),
    acceptsFile: row.accepts_file,
    fileUpload: row.file_upload ?? undefined,
    outputTypes: row.output_types,
    defaultOutputType: row.default_output_type,
    async: row.async === true,
  };
}

function defToRow(def: AgentDefinition): AgentRow {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    endpoint: def.endpoint,
    accepts_file: def.acceptsFile,
    file_upload: def.fileUpload ?? null,
    output_types: def.outputTypes,
    default_output_type: def.defaultOutputType,
    async: def.async === true ? true : null,
  };
}

// ---------- Public API ----------

export async function getAllAgents(): Promise<AgentDefinition[]> {
  const res = await executeQuery<AgentRow>(
    `SELECT id, name, description, endpoint, accepts_file, file_upload,
            output_types, default_output_type, async
     FROM ai_service_agents
     WHERE is_active = TRUE
     ORDER BY name`,
    [],
  );
  return res.rows.map(rowToDefinition);
}

export async function getAgentById(
  id: string,
): Promise<AgentDefinition | undefined> {
  const res = await executeQuery<AgentRow>(
    `SELECT id, name, description, endpoint, accepts_file, file_upload,
            output_types, default_output_type, async
     FROM ai_service_agents
     WHERE id = $1 AND is_active = TRUE`,
    [id],
  );
  return res.rows[0] ? rowToDefinition(res.rows[0]) : undefined;
}

export async function getPublicAgents(): Promise<PublicAgent[]> {
  const agents = await getAllAgents();
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    acceptsFile: a.acceptsFile,
    fileUpload: a.fileUpload,
    outputTypes: a.outputTypes,
    defaultOutputType: a.defaultOutputType,
    async: a.async === true,
  }));
}

export async function getAgentToken(
  agent: AgentDefinition,
): Promise<string | undefined> {
  // 1. Environment override (backward compatibility)
  const fromEnv = process.env[agent.tokenEnv];
  if (fromEnv) return fromEnv;

  // 2. Database
  const res = await executeQuery<{ encrypted_token: string }>(
    `SELECT encrypted_token FROM ai_service_agent_tokens WHERE agent_id = $1`,
    [agent.id],
  );
  if (!res.rows[0]?.encrypted_token) return undefined;
  return decryptValue(res.rows[0].encrypted_token);
}

export interface AddAgentInput {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  acceptsFile: boolean;
  fileUpload?: FileUploadConfig;
  outputTypes: string[];
  defaultOutputType: string;
  token: string;
  async?: boolean;
}

export async function addAgent(input: AddAgentInput): Promise<AgentDefinition> {
  const existing = await executeQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM ai_service_agents WHERE id = $1`,
    [input.id],
  );
  if (parseInt(existing.rows[0].count, 10) > 0) {
    throw new Error(`Agent with id "${input.id}" already exists`);
  }

  const def: AgentDefinition = {
    id: input.id,
    name: input.name,
    description: input.description ?? '',
    endpoint: input.endpoint,
    tokenEnv: tokenEnvNameFor(input.id),
    acceptsFile: input.acceptsFile,
    outputTypes: input.outputTypes,
    defaultOutputType: input.defaultOutputType,
  };
  if (input.acceptsFile && input.fileUpload) {
    def.fileUpload = input.fileUpload;
  }
  if (input.async === true) {
    def.async = true;
  }

  const row = defToRow(def);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ai_service_agents
         (id, name, description, endpoint, accepts_file, file_upload,
          output_types, default_output_type, async)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        row.id,
        row.name,
        row.description,
        row.endpoint,
        row.accepts_file,
        row.file_upload,
        row.output_types,
        row.default_output_type,
        row.async,
      ],
    );

    await client.query(
      `INSERT INTO ai_service_agent_tokens (agent_id, encrypted_token)
       VALUES ($1, $2)`,
      [def.id, encryptValue(input.token)],
    );
  });

  return def;
}

export async function removeAgent(id: string): Promise<boolean> {
  const res = await executeQuery(
    `DELETE FROM ai_service_agents WHERE id = $1`,
    [id],
  );
  return (res.rowCount ?? 0) > 0;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  endpoint?: string;
  acceptsFile?: boolean;
  fileUpload?: FileUploadConfig | null;
  outputTypes?: string[];
  defaultOutputType?: string;
  /** Optional — when provided, replace the bearer token in the DB. */
  token?: string;
  async?: boolean;
}

export async function updateAgent(
  id: string,
  patch: UpdateAgentInput,
): Promise<AgentDefinition> {
  const existing = await getAgentById(id);
  if (!existing) throw new Error(`Agent with id "${id}" not found`);

  const next: AgentDefinition = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.endpoint !== undefined ? { endpoint: patch.endpoint } : {}),
    ...(patch.acceptsFile !== undefined ? { acceptsFile: patch.acceptsFile } : {}),
    ...(patch.outputTypes !== undefined ? { outputTypes: patch.outputTypes } : {}),
    ...(patch.defaultOutputType !== undefined
      ? { defaultOutputType: patch.defaultOutputType }
      : {}),
    ...(patch.async !== undefined ? { async: patch.async === true } : {}),
  };

  // fileUpload handling: explicit null removes; undefined leaves unchanged; object replaces.
  if (patch.fileUpload === null) {
    delete next.fileUpload;
  } else if (patch.fileUpload !== undefined) {
    next.fileUpload = patch.fileUpload;
  }
  // If acceptsFile is being turned off, also strip fileUpload.
  if (next.acceptsFile === false) {
    delete next.fileUpload;
  }

  const row = defToRow(next);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE ai_service_agents SET
         name = $1,
         description = $2,
         endpoint = $3,
         accepts_file = $4,
         file_upload = $5,
         output_types = $6,
         default_output_type = $7,
         async = $8,
         updated_at = NOW()
       WHERE id = $9`,
      [
        row.name,
        row.description,
        row.endpoint,
        row.accepts_file,
        row.file_upload,
        row.output_types,
        row.default_output_type,
        row.async,
        id,
      ],
    );

    if (patch.token !== undefined && patch.token !== '') {
      await client.query(
        `INSERT INTO ai_service_agent_tokens (agent_id, encrypted_token)
         VALUES ($1, $2)
         ON CONFLICT (agent_id) DO UPDATE SET
           encrypted_token = EXCLUDED.encrypted_token,
           updated_at = NOW()`,
        [id, encryptValue(patch.token)],
      );
    }
  });

  return next;
}

// ---------- Service-Name <-> Agent mappings ----------

/** Returns the full mapping table (admin-only callers). */
export async function getAllMappings(): Promise<Record<string, string[]>> {
  const res = await executeQuery<{ service_name: string; agent_id: string }>(
    `SELECT service_name, agent_id FROM ai_service_agent_mappings ORDER BY service_name`,
    [],
  );

  const out: Record<string, string[]> = {};
  for (const row of res.rows) {
    if (!out[row.service_name]) out[row.service_name] = [];
    out[row.service_name].push(row.agent_id);
  }
  return out;
}

/**
 * Returns the allowed agent ids for a service name (case-insensitive,
 * whitespace-trimmed). Missing keys yield an empty array, enforcing the
 * strict "must be explicitly mapped" policy.
 */
export async function getAllowedAgentIdsForServiceName(
  serviceName: string,
): Promise<string[]> {
  const res = await executeQuery<{ agent_id: string }>(
    `SELECT agent_id
     FROM ai_service_agent_mappings
     WHERE LOWER(TRIM(service_name)) = LOWER(TRIM($1))`,
    [serviceName],
  );
  return res.rows.map((r) => r.agent_id);
}

/**
 * Returns the public agent list filtered for a given service name. Strict
 * policy: only agents explicitly mapped to that service name are returned.
 */
export async function getPublicAgentsForServiceName(
  serviceName: string | null | undefined,
): Promise<PublicAgent[]> {
  if (!serviceName) return [];
  const [agents, allowed] = await Promise.all([
    getPublicAgents(),
    getAllowedAgentIdsForServiceName(serviceName),
  ]);
  if (allowed.length === 0) return [];
  const set = new Set(allowed);
  return agents.filter((a) => set.has(a.id));
}

/**
 * Replace the mapping for a single service name.
 * Pass an empty array to record "no agents allowed for this service".
 * Use `deleteMapping` to remove the entry entirely.
 */
export async function setMapping(
  serviceName: string,
  agentIds: string[],
): Promise<void> {
  const existingIds = new Set((await getAllAgents()).map((a) => a.id));
  const cleaned = Array.from(new Set(agentIds.filter((id) => existingIds.has(id))));

  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM ai_service_agent_mappings WHERE service_name = $1`,
      [serviceName],
    );
    for (const agentId of cleaned) {
      await client.query(
        `INSERT INTO ai_service_agent_mappings (service_name, agent_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [serviceName, agentId],
      );
    }
  });
}

export async function deleteMapping(serviceName: string): Promise<boolean> {
  const res = await executeQuery(
    `DELETE FROM ai_service_agent_mappings WHERE service_name = $1`,
    [serviceName],
  );
  return (res.rowCount ?? 0) > 0;
}

// ---------- One-time migration from legacy files ----------

interface LegacyRegistryFile {
  agents: Array<{
    id: string;
    name: string;
    description?: string;
    endpoint: string;
    tokenEnv: string;
    acceptsFile: boolean;
    fileUpload?: FileUploadConfig;
    outputTypes: string[];
    defaultOutputType: string;
    async?: boolean;
  }>;
}

interface LegacyMappingsFile {
  byServiceName?: Record<string, string[]>;
}

/**
 * Migrate agents, tokens, and mappings from legacy JSON files into the DB.
 * Idempotent — skips if ai_service_agents already has rows.
 */
export async function migrateAgentsFromFilesToDb(): Promise<{
  agents: number;
  mappings: number;
}> {
  const countRes = await executeQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM ai_service_agents`,
    [],
  );
  if (parseInt(countRes.rows[0].count, 10) > 0) {
    return { agents: 0, mappings: 0 };
  }

  // Only attempt import if fs module can find legacy files
  let fs: typeof import('fs') | undefined;
  let path: typeof import('path') | undefined;
  try {
    fs = await import('fs');
    path = await import('path');
  } catch {
    return { agents: 0, mappings: 0 };
  }

  const runtimeDir = path.join(process.cwd(), 'runtime');
  const registryPath = process.env.AI_AGENT_REGISTRY_PATH || path.join(runtimeDir, 'ai-agents.json');
  const tokensPath = process.env.AI_AGENT_TOKENS_PATH || path.join(runtimeDir, '.env.agents');
  const mappingsPath = process.env.AI_AGENT_MAPPINGS_PATH || path.join(runtimeDir, 'ai-agent-mappings.json');

  let registry: LegacyRegistryFile = { agents: [] };
  try {
    if (fs.existsSync(registryPath)) {
      const raw = fs.readFileSync(registryPath, 'utf8');
      const parsed = JSON.parse(raw) as LegacyRegistryFile;
      if (parsed && Array.isArray(parsed.agents)) registry = parsed;
    }
  } catch {
    /* ignore unreadable registry */
  }

  let tokenMap: Record<string, string> = {};
  try {
    if (fs.existsSync(tokensPath)) {
      const raw = fs.readFileSync(tokensPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        tokenMap[key] = value;
      }
    }
  } catch {
    /* ignore unreadable tokens */
  }

  let mappings: LegacyMappingsFile = {};
  try {
    if (fs.existsSync(mappingsPath)) {
      const raw = fs.readFileSync(mappingsPath, 'utf8');
      const parsed = JSON.parse(raw) as LegacyMappingsFile;
      if (parsed && typeof parsed.byServiceName === 'object') mappings = parsed;
    }
  } catch {
    /* ignore unreadable mappings */
  }

  let agentCount = 0;
  for (const a of registry.agents) {
    try {
      const token = tokenMap[a.tokenEnv] || '';
      await addAgent({
        id: a.id,
        name: a.name,
        description: a.description,
        endpoint: a.endpoint,
        acceptsFile: a.acceptsFile,
        fileUpload: a.fileUpload,
        outputTypes: a.outputTypes,
        defaultOutputType: a.defaultOutputType,
        token,
        async: a.async,
      });
      agentCount++;
    } catch (err) {
      console.error(`[migrateAgentsFromFilesToDb] Failed to migrate agent "${a.id}":`, err);
    }
  }

  let mappingCount = 0;
  if (mappings.byServiceName) {
    for (const [serviceName, agentIds] of Object.entries(mappings.byServiceName)) {
      if (!Array.isArray(agentIds) || agentIds.length === 0) continue;
      try {
        await setMapping(serviceName, agentIds);
        mappingCount++;
      } catch (err) {
        console.error(
          `[migrateAgentsFromFilesToDb] Failed to migrate mapping for "${serviceName}":`,
          err,
        );
      }
    }
  }

  return { agents: agentCount, mappings: mappingCount };
}
