// GET  /api/ai-agents/mappings -> { mappings: { [serviceName]: string[] } }
// PUT  /api/ai-agents/mappings -> body { mappings: { [serviceName]: string[] } }
//
// Admin-only. PUT replaces the full mapping table (entries removed from body
// are deleted, so the service reverts to "no agents available").

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllMappings,
  setMapping,
  deleteMapping,
  getAllAgents,
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
  return NextResponse.json({ mappings: getAllMappings() });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { mappings?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.mappings || typeof body.mappings !== 'object' || Array.isArray(body.mappings)) {
    return NextResponse.json({ error: 'mappings must be an object' }, { status: 400 });
  }

  const incoming = body.mappings as Record<string, unknown>;
  const validAgentIds = new Set(getAllAgents().map((a) => a.id));
  const normalized: Record<string, string[]> = {};

  for (const [rawName, rawIds] of Object.entries(incoming)) {
    const serviceName = String(rawName).trim();
    if (!serviceName) continue;
    if (!Array.isArray(rawIds)) {
      return NextResponse.json(
        { error: `mappings["${serviceName}"] must be an array of agent ids` },
        { status: 400 },
      );
    }
    const ids = rawIds
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim());
    for (const id of ids) {
      if (!validAgentIds.has(id)) {
        return NextResponse.json(
          { error: `Unknown agent id "${id}" in mapping for "${serviceName}"` },
          { status: 400 },
        );
      }
    }
    normalized[serviceName] = Array.from(new Set(ids));
  }

  // Apply: delete entries no longer present, then upsert remaining.
  const existing = getAllMappings();
  for (const serviceName of Object.keys(existing)) {
    if (!(serviceName in normalized)) deleteMapping(serviceName);
  }
  for (const [serviceName, ids] of Object.entries(normalized)) {
    setMapping(serviceName, ids);
  }

  return NextResponse.json({ success: true, mappings: getAllMappings() });
}
