/**
 * /api/ai-agents/outputs
 *
 * GET  ?srNumber=SR-YYYYMM-NNNN
 *   Returns the list of downloadable AI-agent outputs the current user has
 *   previously generated for the given service request.
 *
 * POST { srNumber, agentId, agentDownloadPath, filename?, mimeType?, outputType?, query? }
 *   Fetches the file from the upstream agent (using the server-stored bearer
 *   token), writes it to disk, and inserts a metadata row in `ai_agent_outputs`.
 *   Returns { id, filename, mimeType, outputType, createdAt, downloadUrl }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAgentById, getAgentToken } from '@/lib/ai-agents';
import { listAgentOutputs, saveAgentOutput, AgentOutputRow } from '@/lib/ai-agent-outputs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function toPublic(row: AgentOutputRow) {
  return {
    id: row.id,
    srNumber: row.sr_number,
    agentId: row.agent_id,
    agentName: row.agent_name,
    outputType: row.output_type,
    mimeType: row.mime_type,
    filename: row.filename,
    fileSize: row.file_size,
    queryText: row.query_text,
    createdAt: row.created_at,
    downloadUrl: `/api/ai-agents/outputs/${row.id}`,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const srNumber = req.nextUrl.searchParams.get('srNumber');
  if (!srNumber) {
    return NextResponse.json({ error: 'srNumber is required' }, { status: 400 });
  }
  const rows = await listAgentOutputs(session.user.id, srNumber);
  return NextResponse.json({ outputs: rows.map(toPublic) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const srNumber = typeof body.srNumber === 'string' ? body.srNumber.trim() : '';
  const agentId = typeof body.agentId === 'string' ? body.agentId : '';
  const agentDownloadPath =
    typeof body.agentDownloadPath === 'string' ? body.agentDownloadPath : '';
  const filenameHint = typeof body.filename === 'string' ? body.filename : '';
  const mimeHint = typeof body.mimeType === 'string' ? body.mimeType : '';
  const outputType = typeof body.outputType === 'string' ? body.outputType : 'file';
  const queryText = typeof body.query === 'string' ? body.query : null;

  if (!srNumber || !agentId || !agentDownloadPath) {
    return NextResponse.json(
      { error: 'srNumber, agentId, and agentDownloadPath are required' },
      { status: 400 },
    );
  }

  const agent = getAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }
  const token = getAgentToken(agent);
  if (!token) {
    return NextResponse.json(
      { error: `Bearer token not configured for agent "${agent.name}"` },
      { status: 500 },
    );
  }

  // Resolve the upstream URL. Same logic as /api/ai-agents/download — relative
  // paths are resolved against the agent's endpoint; absolute URLs must share
  // origin with the agent endpoint to prevent SSRF.
  const base = new URL(agent.endpoint);
  let upstreamUrl: URL;
  try {
    if (/^https?:\/\//i.test(agentDownloadPath)) {
      upstreamUrl = new URL(agentDownloadPath);
      if (upstreamUrl.origin !== base.origin) {
        return NextResponse.json(
          { error: 'Download URL origin mismatch' },
          { status: 400 },
        );
      }
    } else {
      upstreamUrl = new URL(agentDownloadPath, base);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid agentDownloadPath' }, { status: 400 });
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json(
      { error: `Upstream fetch failed: ${msg}` },
      { status: 502 },
    );
  }
  if (!upstreamRes.ok) {
    const text = await upstreamRes.text();
    return NextResponse.json(
      {
        error: `Upstream returned HTTP ${upstreamRes.status}`,
        upstreamBody: text.slice(0, 2000),
      },
      { status: 502 },
    );
  }

  const ab = await upstreamRes.arrayBuffer();
  const buffer = Buffer.from(ab);

  // Resolve filename
  let filename = filenameHint;
  if (!filename) {
    const cd = upstreamRes.headers.get('content-disposition') || '';
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (m) filename = decodeURIComponent(m[1]);
  }
  if (!filename) {
    const ext =
      outputType === 'word' ? 'docx' :
      outputType === 'excel' ? 'xlsx' :
      outputType === 'powerpoint' ? 'pptx' :
      outputType || 'bin';
    filename = `agent-output-${Date.now()}.${ext}`;
  }

  const mimeType =
    mimeHint || upstreamRes.headers.get('content-type') || 'application/octet-stream';

  try {
    const row = await saveAgentOutput({
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      srNumber,
      agentId: agent.id,
      agentName: agent.name,
      outputType,
      mimeType,
      filename,
      buffer,
      queryText,
    });
    return NextResponse.json({ output: toPublic(row) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save output';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
