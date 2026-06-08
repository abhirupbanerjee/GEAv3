// Admin-only AI agent registry management.
//
// GET  /api/ai-agents/registry           -> list all agents (full metadata, NO tokens)
// POST /api/ai-agents/registry           -> register a new agent (writes JSON + token file)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllAgents,
  addAgent,
  tokenEnvNameFor,
  ALLOWED_FILE_TYPE_KEYS,
  type FileTypeKey,
  type FileUploadConfig,
} from '@/lib/ai-agents';

export const dynamic = 'force-dynamic';

function isAdmin(session: { user?: { roleType?: string } } | null): boolean {
  return !!session && session.user?.roleType === 'admin';
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Return everything except no tokens — tokens never leave the server.
  const agents = (await getAllAgents()).map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    endpoint: a.endpoint,
    tokenEnv: a.tokenEnv,
    acceptsFile: a.acceptsFile,
    fileUpload: a.fileUpload,
    outputTypes: a.outputTypes,
    defaultOutputType: a.defaultOutputType,
    async: a.async === true,
  }));
  return NextResponse.json({ agents });
}

interface RegisterBody {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  endpoint?: unknown;
  token?: unknown;
  acceptsFile?: unknown;
  fileUpload?: unknown;
  outputTypes?: unknown;
  defaultOutputType?: unknown;
  async?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: RegisterBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const acceptsFile = body.acceptsFile === true;
  const asyncFlag = body.async === true;
  const outputTypes = Array.isArray(body.outputTypes)
    ? body.outputTypes.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];
  const defaultOutputType =
    typeof body.defaultOutputType === 'string' ? body.defaultOutputType.trim() : '';

  // Validation
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
    return NextResponse.json(
      { error: 'id must contain only letters, digits, and hyphens (no spaces)' },
      { status: 400 },
    );
  }
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!endpoint) return NextResponse.json({ error: 'endpoint is required' }, { status: 400 });
  try {
    const u = new URL(endpoint);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return NextResponse.json({ error: 'endpoint must be an http(s) URL' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'endpoint is not a valid URL' }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });
  if (outputTypes.length === 0) {
    return NextResponse.json({ error: 'At least one output type is required' }, { status: 400 });
  }
  if (!defaultOutputType || !outputTypes.includes(defaultOutputType)) {
    return NextResponse.json(
      { error: 'defaultOutputType must be one of the supplied outputTypes' },
      { status: 400 },
    );
  }

  // Optional file upload config (only validated when acceptsFile is true).
  let fileUpload: FileUploadConfig | undefined;
  if (acceptsFile) {
    const raw = body.fileUpload as Record<string, unknown> | null | undefined;
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json(
        { error: 'fileUpload config is required when acceptsFile is true' },
        { status: 400 },
      );
    }
    const maxFiles = Number(raw.maxFiles);
    const maxSizeMB = Number(raw.maxSizeMB);
    const required = raw.required === true;
    const rawAllowed = Array.isArray(raw.allowedTypes) ? raw.allowedTypes : [];
    const allowedTypes = rawAllowed.filter(
      (t): t is FileTypeKey =>
        typeof t === 'string' && (ALLOWED_FILE_TYPE_KEYS as readonly string[]).includes(t),
    );

    if (!Number.isFinite(maxFiles) || maxFiles < 1 || maxFiles > 50) {
      return NextResponse.json(
        { error: 'fileUpload.maxFiles must be between 1 and 50' },
        { status: 400 },
      );
    }
    if (!Number.isFinite(maxSizeMB) || maxSizeMB < 1 || maxSizeMB > 500) {
      return NextResponse.json(
        { error: 'fileUpload.maxSizeMB must be between 1 and 500' },
        { status: 400 },
      );
    }
    if (allowedTypes.length === 0) {
      return NextResponse.json(
        { error: 'fileUpload.allowedTypes must include at least one type' },
        { status: 400 },
      );
    }
    fileUpload = {
      maxFiles: Math.floor(maxFiles),
      maxSizeMB: Math.floor(maxSizeMB),
      required,
      allowedTypes,
    };
  }

  try {
    const def = await addAgent({
      id,
      name,
      description,
      endpoint,
      acceptsFile,
      fileUpload,
      outputTypes,
      defaultOutputType,
      token,
      async: asyncFlag,
    });
    return NextResponse.json({
      success: true,
      agent: {
        id: def.id,
        name: def.name,
        description: def.description,
        endpoint: def.endpoint,
        tokenEnv: def.tokenEnv,
        acceptsFile: def.acceptsFile,
        fileUpload: def.fileUpload,
        outputTypes: def.outputTypes,
        defaultOutputType: def.defaultOutputType,
        async: def.async === true,
      },
      tokenEnvHint: tokenEnvNameFor(id),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to register agent';
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
