// DELETE /api/ai-agents/registry/[id]  -> remove an agent + its token entry
// PATCH  /api/ai-agents/registry/[id]  -> update editable fields of an agent
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  removeAgent,
  updateAgent,
  ALLOWED_FILE_TYPE_KEYS,
  type FileTypeKey,
  type FileUploadConfig,
  type UpdateAgentInput,
} from '@/lib/ai-agents';

export const dynamic = 'force-dynamic';

function isAdmin(session: { user?: { roleType?: string } } | null): boolean {
  return !!session && session.user?.roleType === 'admin';
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Agent id is required' }, { status: 400 });

  const ok = await removeAgent(id);
  if (!ok) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

interface PatchBody {
  name?: unknown;
  description?: unknown;
  endpoint?: unknown;
  acceptsFile?: unknown;
  fileUpload?: unknown;
  outputTypes?: unknown;
  defaultOutputType?: unknown;
  token?: unknown;
  async?: unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Agent id is required' }, { status: 400 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: UpdateAgentInput = {};

  if (typeof body.name === 'string') {
    const v = body.name.trim();
    if (!v) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    patch.name = v;
  }
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (typeof body.endpoint === 'string') {
    const v = body.endpoint.trim();
    try {
      const u = new URL(v);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return NextResponse.json({ error: 'endpoint must be an http(s) URL' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'endpoint is not a valid URL' }, { status: 400 });
    }
    patch.endpoint = v;
  }
  if (typeof body.acceptsFile === 'boolean') patch.acceptsFile = body.acceptsFile;

  let outputTypes: string[] | undefined;
  if (Array.isArray(body.outputTypes)) {
    outputTypes = body.outputTypes.filter(
      (t): t is string => typeof t === 'string' && t.trim().length > 0,
    );
    if (outputTypes.length === 0) {
      return NextResponse.json({ error: 'At least one output type is required' }, { status: 400 });
    }
    patch.outputTypes = outputTypes;
  }
  if (typeof body.defaultOutputType === 'string') {
    const v = body.defaultOutputType.trim();
    if (outputTypes && !outputTypes.includes(v)) {
      return NextResponse.json(
        { error: 'defaultOutputType must be one of the supplied outputTypes' },
        { status: 400 },
      );
    }
    patch.defaultOutputType = v;
  }

  // fileUpload: null clears; object replaces; missing = leave alone.
  if (body.fileUpload === null) {
    patch.fileUpload = null;
  } else if (body.fileUpload && typeof body.fileUpload === 'object') {
    const raw = body.fileUpload as Record<string, unknown>;
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
    const cfg: FileUploadConfig = {
      maxFiles: Math.floor(maxFiles),
      maxSizeMB: Math.floor(maxSizeMB),
      required,
      allowedTypes,
    };
    patch.fileUpload = cfg;
  }

  if (typeof body.token === 'string' && body.token.length > 0) {
    patch.token = body.token;
  }

  if (typeof body.async === 'boolean') {
    patch.async = body.async;
  }

  try {
    const updated = await updateAgent(id, patch);
    return NextResponse.json({
      success: true,
      agent: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        endpoint: updated.endpoint,
        tokenEnv: updated.tokenEnv,
        acceptsFile: updated.acceptsFile,
        fileUpload: updated.fileUpload,
        outputTypes: updated.outputTypes,
        defaultOutputType: updated.defaultOutputType,
        async: updated.async === true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update agent';
    const status = /not found/i.test(msg) ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
