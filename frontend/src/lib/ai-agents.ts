/**
 * Server-only AI agent registry.
 *
 * - Reads agent definitions from a JSON file on disk at runtime so that
 *   newly registered agents (added via the admin UI) take effect without a
 *   rebuild. Path is configurable via AI_AGENT_REGISTRY_PATH (defaults to
 *   /app/runtime/ai-agents.json inside the container).
 *
 * - Resolves each agent's bearer token from:
 *     1. process.env[agent.tokenEnv]              (loaded from .env.agents at boot)
 *     2. parsed contents of AI_AGENT_TOKENS_PATH  (re-read each request)
 *     3. in-memory cache populated when agents are registered via the UI
 *        (so a brand-new agent works immediately, no container restart needed)
 *
 * - Provides addAgent/removeAgent which write back to disk so the registry
 *   and token file remain the source of truth. Writes are in-place
 *   (truncate + write) so bind-mounted single files keep their inode.
 *
 * This module must NEVER be imported from a client component.
 */

import fs from 'fs';
import path from 'path';
import bundledDefaults from '@/config/ai-agents.json';

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

interface RegistryFile {
  $comment?: string;
  agents: AgentDefinition[];
}

const REGISTRY_PATH =
  process.env.AI_AGENT_REGISTRY_PATH ||
  path.join(process.cwd(), 'runtime', 'ai-agents.json');

const TOKENS_PATH =
  process.env.AI_AGENT_TOKENS_PATH ||
  path.join(process.cwd(), 'runtime', '.env.agents');

// In-memory token cache populated when an agent is registered via the UI.
const tokenCache: Record<string, string> = {};

function readRegistry(): RegistryFile {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.agents)) return parsed as RegistryFile;
    }
  } catch (err) {
    console.error('[ai-agents] Failed to read registry, using bundled defaults:', err);
  }
  return bundledDefaults as unknown as RegistryFile;
}

function writeRegistry(reg: RegistryFile): void {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2) + '\n', 'utf8');
}

function parseTokenFile(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    if (!fs.existsSync(TOKENS_PATH)) return out;
    const raw = fs.readFileSync(TOKENS_PATH, 'utf8');
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
      out[key] = value;
    }
  } catch (err) {
    console.error('[ai-agents] Failed to parse tokens file:', err);
  }
  return out;
}

function writeTokenFile(map: Record<string, string>): void {
  const dir = path.dirname(TOKENS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const header =
    '# AI Agent bearer tokens (server-side only).\n' +
    '# Managed by the admin UI (Settings -> AI Agents). Manual edits also supported.\n' +
    '# After editing manually, recreate the frontend container.\n\n';

  const body = Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  fs.writeFileSync(TOKENS_PATH, header + body + '\n', 'utf8');
}

// ---------- Public API ----------

export function getAllAgents(): AgentDefinition[] {
  return readRegistry().agents;
}

export function getAgentById(id: string): AgentDefinition | undefined {
  return readRegistry().agents.find((a) => a.id === id);
}

export function getPublicAgents(): PublicAgent[] {
  return readRegistry().agents.map((a) => ({
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

export function getAgentToken(agent: AgentDefinition): string | undefined {
  const fromEnv = process.env[agent.tokenEnv];
  if (fromEnv) return fromEnv;
  if (tokenCache[agent.tokenEnv]) return tokenCache[agent.tokenEnv];
  const fromFile = parseTokenFile()[agent.tokenEnv];
  return fromFile;
}

/** Convert a user-supplied agent id to a safe tokenEnv variable name. */
export function tokenEnvNameFor(agentId: string): string {
  const safe = agentId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `AI_AGENT_TOKEN_${safe || 'CUSTOM'}`;
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

export function addAgent(input: AddAgentInput): AgentDefinition {
  const reg = readRegistry();

  if (reg.agents.some((a) => a.id === input.id)) {
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

  reg.agents.push(def);
  writeRegistry(reg);

  const tokens = parseTokenFile();
  tokens[def.tokenEnv] = input.token;
  writeTokenFile(tokens);
  tokenCache[def.tokenEnv] = input.token;

  return def;
}

export function removeAgent(id: string): boolean {
  const reg = readRegistry();
  const idx = reg.agents.findIndex((a) => a.id === id);
  if (idx === -1) return false;

  const removed = reg.agents.splice(idx, 1)[0];
  writeRegistry(reg);

  const tokens = parseTokenFile();
  if (tokens[removed.tokenEnv] !== undefined) {
    delete tokens[removed.tokenEnv];
    writeTokenFile(tokens);
  }
  delete tokenCache[removed.tokenEnv];

  // Also strip this agent from every mapping that references it.
  const m = readMappings();
  let changed = false;
  for (const [key, ids] of Object.entries(m.byServiceName)) {
    const filtered = ids.filter((x) => x !== id);
    if (filtered.length !== ids.length) {
      changed = true;
      if (filtered.length === 0) delete m.byServiceName[key];
      else m.byServiceName[key] = filtered;
    }
  }
  if (changed) writeMappings(m);

  return true;
}

// ---------- Edit ----------

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  endpoint?: string;
  acceptsFile?: boolean;
  fileUpload?: FileUploadConfig | null;
  outputTypes?: string[];
  defaultOutputType?: string;
  /** Optional — when provided, replace the bearer token in .env.agents. */
  token?: string;
  async?: boolean;
}

export function updateAgent(id: string, patch: UpdateAgentInput): AgentDefinition {
  const reg = readRegistry();
  const idx = reg.agents.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error(`Agent with id "${id}" not found`);

  const existing = reg.agents[idx];
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
  if (next.async === false) {
    delete next.async;
  }

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

  reg.agents[idx] = next;
  writeRegistry(reg);

  if (patch.token !== undefined && patch.token !== '') {
    const tokens = parseTokenFile();
    tokens[next.tokenEnv] = patch.token;
    writeTokenFile(tokens);
    tokenCache[next.tokenEnv] = patch.token;
  }

  return next;
}

// ---------- Service-Name <-> Agent mappings ----------

interface MappingsFile {
  $comment?: string;
  // Service name -> list of agent ids allowed for any service request whose
  // `service_name` matches. If a service name is NOT a key here, no agents
  // are available for service requests under it. An empty array also means
  // no agents are allowed.
  byServiceName: Record<string, string[]>;
}

const MAPPINGS_PATH =
  process.env.AI_AGENT_MAPPINGS_PATH ||
  path.join(process.cwd(), 'runtime', 'ai-agent-mappings.json');

const EMPTY_MAPPINGS: MappingsFile = {
  $comment:
    'Maps service names (service_master.service_name) to the list of agent ids allowed for them. Service requests whose service is not listed see no agents.',
  byServiceName: {},
};

function readMappings(): MappingsFile {
  try {
    if (fs.existsSync(MAPPINGS_PATH)) {
      const raw = fs.readFileSync(MAPPINGS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // New shape
        if (parsed.byServiceName && typeof parsed.byServiceName === 'object') {
          return parsed as MappingsFile;
        }
        // Legacy shape (bySR) — silently ignored; admin must remap by service
        // name. Returning an empty map keeps the strict policy intact.
        if (parsed.bySR && typeof parsed.bySR === 'object') {
          return { ...EMPTY_MAPPINGS, byServiceName: {} };
        }
      }
    }
  } catch (err) {
    console.error('[ai-agents] Failed to read mappings, defaulting to empty:', err);
  }
  return { ...EMPTY_MAPPINGS, byServiceName: {} };
}

function writeMappings(m: MappingsFile): void {
  const dir = path.dirname(MAPPINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MAPPINGS_PATH, JSON.stringify(m, null, 2) + '\n', 'utf8');
}

/** Returns the full mapping table (admin-only callers). */
export function getAllMappings(): Record<string, string[]> {
  return { ...readMappings().byServiceName };
}

/**
 * Returns the allowed agent ids for a service name (case-insensitive,
 * whitespace-trimmed). `null` is never returned now — missing keys yield an
 * empty array, enforcing the strict "must be explicitly mapped" policy.
 */
export function getAllowedAgentIdsForServiceName(serviceName: string): string[] {
  const m = readMappings();
  const want = serviceName.trim().toLowerCase();
  for (const [key, ids] of Object.entries(m.byServiceName)) {
    if (key.trim().toLowerCase() === want) return ids;
  }
  return [];
}

/**
 * Returns the public agent list filtered for a given service name. Strict
 * policy: only agents explicitly mapped to that service name are returned.
 */
export function getPublicAgentsForServiceName(
  serviceName: string | null | undefined,
): PublicAgent[] {
  if (!serviceName) return [];
  const allowed = getAllowedAgentIdsForServiceName(serviceName);
  if (allowed.length === 0) return [];
  const set = new Set(allowed);
  return getPublicAgents().filter((a) => set.has(a.id));
}

/**
 * Replace the mapping for a single service name.
 * Pass an empty array to record "no agents allowed for this service".
 * Use `deleteMapping` to remove the entry entirely.
 */
export function setMapping(serviceName: string, agentIds: string[]): void {
  const m = readMappings();
  const existingIds = new Set(readRegistry().agents.map((a) => a.id));
  const cleaned = Array.from(new Set(agentIds.filter((id) => existingIds.has(id))));
  m.byServiceName[serviceName] = cleaned;
  writeMappings(m);
}

export function deleteMapping(serviceName: string): boolean {
  const m = readMappings();
  if (!Object.prototype.hasOwnProperty.call(m.byServiceName, serviceName)) return false;
  delete m.byServiceName[serviceName];
  writeMappings(m);
  return true;
}
