// GET /api/ai-agents/jobs/[jobId]?agentId=<id>
//
// Client-callable proxy to fetch the status / result of an async agent job.
// Mirrors the response shape that /api/ai-agents/invoke returns so the
// existing UI parser can reuse the same code path when the job is done.
//
// Returns:
//   - 200 with upstream body (verbatim) when the job has completed/failed.
//   - 202 JSON { pending: true, jobId, status } while still running.
//   - 4xx/5xx JSON { error } on auth / lookup / network errors.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAgentById, getAgentToken, type AgentDefinition } from '@/lib/ai-agents';

export const dynamic = 'force-dynamic';

function agentBaseFromEndpoint(endpoint: string): string {
  if (endpoint.endsWith('/invoke')) return endpoint.slice(0, -'/invoke'.length);
  return endpoint.replace(/\/invoke(\/?$)/, '');
}

function jobsUrl(agent: AgentDefinition, jobId: string): string {
  return `${agentBaseFromEndpoint(agent.endpoint)}/jobs/${encodeURIComponent(jobId)}`;
}

interface UpstreamJob {
  jobId?: string;
  status?: string;
  outputs?: unknown;
  success?: boolean;
}

function statusOf(j: UpstreamJob | null): 'done' | 'failed' | 'pending' {
  if (!j || !j.status) return 'pending';
  const s = String(j.status).toLowerCase();
  if (s === 'completed' || s === 'succeeded' || s === 'success' || s === 'done') return 'done';
  if (s === 'failed' || s === 'error' || s === 'cancelled' || s === 'canceled') return 'failed';
  return 'pending';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });

  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId query param is required' }, { status: 400 });

  const agent = await getAgentById(agentId);
  if (!agent) return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });

  const token = await getAgentToken(agent);
  if (!token) {
    return NextResponse.json(
      {
        error:
          `Bearer token not configured for agent "${agent.name}". ` +
          `Set environment variable ${agent.tokenEnv} and restart the frontend.`,
      },
      { status: 500 },
    );
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(jobsUrl(agent, jobId), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json({ error: `Upstream job lookup failed: ${msg}` }, { status: 502 });
  }

  const ct = upstreamRes.headers.get('content-type') ?? 'application/json';
  const text = await upstreamRes.text();

  if (!upstreamRes.ok) {
    return NextResponse.json(
      {
        error: `Agent jobs endpoint returned HTTP ${upstreamRes.status}`,
        upstreamStatus: upstreamRes.status,
        upstreamBody: text.slice(0, 4000),
      },
      { status: 502 },
    );
  }

  let parsed: UpstreamJob | null = null;
  try {
    parsed = JSON.parse(text) as UpstreamJob;
  } catch {
    // Non-JSON body but 200 — treat as a completed payload and forward.
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'X-Agent-Id': agent.id,
        'X-Async-Job-Id': jobId,
        'X-Async-Status': 'done',
      },
    });
  }

  const s = statusOf(parsed);
  if (s === 'pending') {
    return NextResponse.json(
      {
        pending: true,
        jobId,
        agentId: agent.id,
        status: parsed.status ?? 'pending',
        message: 'Agent is still running.',
      },
      {
        status: 202,
        headers: {
          'X-Agent-Id': agent.id,
          'X-Async-Job-Id': jobId,
          'X-Async-Status': 'pending',
        },
      },
    );
  }

  // Done or failed — forward upstream body verbatim so the existing UI
  // envelope parser handles outputs[] uniformly.
  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'X-Agent-Id': agent.id,
      'X-Async-Job-Id': jobId,
      'X-Async-Status': s,
    },
  });
}
