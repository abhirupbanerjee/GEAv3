// POST /api/ai-agents/invoke
// Server-side proxy that invokes an external AI agent. Keeps the bearer
// token server-side; the browser never sees it.
//
// Two request modes:
//   1. JSON body (default, for text-only agents):
//        Content-Type: application/json
//        Body: { agentId: string, query: string, outputType?: string }
//
//   2. multipart/form-data (for agents that accept files alongside the query):
//        fields: agentId, query, outputType, files (multiple allowed)
//
// Async-capable agents (agent.async === true):
//   The upstream is invoked with { async: true }. The route then polls
//   <baseUrl>/jobs/<jobId> for up to ~12s. If the job finishes in that window,
//   the final upstream response is forwarded verbatim. Otherwise the route
//   returns HTTP 202 with JSON { pending: true, jobId, agentId } so the
//   client can show a “Show response” button and poll later.
//
// Response: the upstream response body is forwarded verbatim with its
// content-type preserved. On error, returns JSON `{ error: string }`.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAgentById, getAgentToken } from '@/lib/ai-agents';

export const dynamic = 'force-dynamic';
// Allow longer execution for upstream LLM latency.
export const maxDuration = 60;

interface UpstreamJob {
  jobId?: string;
  status?: string;
  outputs?: unknown;
  success?: boolean;
  error?: unknown;
  message?: unknown;
}

/** A job is "done" when status is one of these (case-insensitive). */
function isJobDone(j: UpstreamJob | null): boolean {
  if (!j || !j.status) return false;
  const s = String(j.status).toLowerCase();
  return s === 'completed' || s === 'succeeded' || s === 'success' || s === 'done';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  const isMultipart = contentType.includes('multipart/form-data');

  let agentId: string | null = null;
  let query: string | null = null;
  let outputType: string | null = null;
  const files: File[] = [];

  try {
    if (isMultipart) {
      const form = await req.formData();
      agentId = form.get('agentId')?.toString() ?? null;
      query = form.get('query')?.toString() ?? null;
      outputType = form.get('outputType')?.toString() ?? null;
      const fileEntries = form.getAll('files');
      for (const f of fileEntries) {
        if (f instanceof File && f.size > 0) {
          files.push(f);
        }
      }
    } else {
      const body = await req.json();
      agentId = body.agentId ?? null;
      query = body.query ?? null;
      outputType = body.outputType ?? null;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }
  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const agent = await getAgentById(agentId);
  if (!agent) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  if (files.length > 0 && !agent.acceptsFile) {
    return NextResponse.json(
      { error: `Agent "${agent.name}" does not accept file inputs` },
      { status: 400 },
    );
  }

  const chosenOutput = outputType && agent.outputTypes.includes(outputType)
    ? outputType
    : agent.defaultOutputType;

  // Map UI/internal output type names to the values the upstream agent
  // actually accepts (e.g. "word" → "docx").
  const OUTPUT_TYPE_UPSTREAM_MAP: Record<string, string> = {
    word: 'docx',
    excel: 'xlsx',
    powerpoint: 'pptx',
  };
  const upstreamOutput = OUTPUT_TYPE_UPSTREAM_MAP[chosenOutput] ?? chosenOutput;

  // Output types whose content the upstream returns inline in the sync
  // /invoke response. For these we always run synchronously so the client
  // gets the answer in a single request. For binary/file outputs (pdf,
  // image, docx, xlsx, pptx, ...) we fall back to the async job flow.
  const INLINE_OUTPUT_TYPES = new Set(['text', 'json', 'md']);
  const useAsync = agent.async === true && !INLINE_OUTPUT_TYPES.has(chosenOutput);

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

  // Build upstream request.
  //
  // PolicyBot-style hosted agents use a two-step contract when a file is
  // involved:
  //   1) POST <endpoint-with-/invoke-replaced-by-/upload>   multipart, field `file`
  //      → { fileId: "file_...", filename, mimeType, fileSize }
  //   2) POST <endpoint>   application/json
  //      Body: { input: { query }, version: 1, outputType, async: false,
  //              files: ["file_..."] }
  //
  // For text-only requests we keep the simple JSON contract that matches the
  // example curl: { input: { query }, outputType }.
  let upstreamRes: Response;
  try {
    if (files.length > 0) {
      // --- Step 1: upload each file to derive a fileId ---
      const uploadUrl = agent.endpoint.endsWith('/invoke')
        ? agent.endpoint.slice(0, -'/invoke'.length) + '/upload'
        : agent.endpoint.replace(/\/invoke(\/?$)/, '/upload$1');

      const fileIds: string[] = [];
      for (const file of files) {
        const uploadFd = new FormData();
        uploadFd.append('file', file, file.name);

        let uploadRes: Response;
        try {
          uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: uploadFd,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Network error';
          return NextResponse.json(
            { error: `Upstream upload request failed for "${file.name}": ${msg}` },
            { status: 502 },
          );
        }

        const uploadText = await uploadRes.text();
        if (!uploadRes.ok) {
          return NextResponse.json(
            {
              error: `Agent upload returned HTTP ${uploadRes.status} for "${file.name}"`,
              upstreamStatus: uploadRes.status,
              upstreamBody: uploadText.slice(0, 4000),
            },
            { status: 502 },
          );
        }

        let fileId: string | null = null;
        try {
          const parsed = JSON.parse(uploadText) as Record<string, unknown>;
          const candidate =
            (typeof parsed.fileId === 'string' && parsed.fileId) ||
            (typeof parsed.id === 'string' && parsed.id) ||
            (parsed.file && typeof (parsed.file as Record<string, unknown>).id === 'string'
              ? ((parsed.file as Record<string, unknown>).id as string)
              : null);
          if (candidate) fileId = candidate;
        } catch {
          /* fall through */
        }
        if (!fileId) {
          return NextResponse.json(
            {
              error: `Agent upload response missing fileId for "${file.name}"`,
              upstreamBody: uploadText.slice(0, 4000),
            },
            { status: 502 },
          );
        }
        fileIds.push(fileId);
      }

      // --- Step 2: invoke with file references ---
      upstreamRes = await fetch(agent.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { query },
          version: 1,
          outputType: upstreamOutput,
          async: useAsync,
          files: fileIds,
        }),
      });
    } else {
      upstreamRes = await fetch(agent.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { query },
          outputType: upstreamOutput,
          async: useAsync,
        }),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json({ error: `Upstream request failed: ${msg}` }, { status: 502 });
  }

  const upstreamCt = upstreamRes.headers.get('content-type') ?? 'text/plain';
  const body = await upstreamRes.text();

  if (!upstreamRes.ok) {
    return NextResponse.json(
      {
        error: `Agent returned HTTP ${upstreamRes.status}`,
        upstreamStatus: upstreamRes.status,
        upstreamBody: body.slice(0, 4000),
      },
      { status: 502 },
    );
  }

  // --- Async handling ---
  // Only enter the async/job-id branch when we actually asked upstream to
  // run asynchronously (binary/file output types). For inline output types
  // (text/json/md) we always treat the response as the final answer.
  if (useAsync) {
    let initial: UpstreamJob | null = null;
    try {
      initial = JSON.parse(body) as UpstreamJob;
    } catch {
      /* non-JSON — fall through and return verbatim */
    }
    const hasOutputs =
      initial && Array.isArray((initial as { outputs?: unknown }).outputs) &&
      ((initial as { outputs: unknown[] }).outputs.length > 0);
    if (
      initial &&
      typeof initial.jobId === 'string' &&
      !isJobDone(initial) &&
      !hasOutputs
    ) {
      return NextResponse.json(
        {
          pending: true,
          jobId: initial.jobId,
          agentId: agent.id,
          outputType: chosenOutput,
          status: initial.status ?? 'pending',
          message: 'Agent job submitted. Poll /api/ai-agents/jobs/<jobId> for the result.',
        },
        {
          status: 202,
          headers: {
            'X-Agent-Id': agent.id,
            'X-Output-Type': chosenOutput,
            'X-Async-Job-Id': initial.jobId,
            'X-Async-Status': 'pending',
          },
        },
      );
    }
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': upstreamCt,
      'X-Agent-Id': agent.id,
      'X-Output-Type': chosenOutput,
    },
  });
}
