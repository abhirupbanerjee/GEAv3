// Admin-only: server-side proxy that fetches an agent's /spec endpoint
// with a Bearer token. Used by the "Import from JSON" modal so that the
// browser doesn't run into CORS when hitting third-party agent hosts.
//
// POST /api/ai-agents/fetch-spec
//   body: { url: string, token: string }
//   returns: { spec: <whatever the agent returned> }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isAdmin(session: { user?: { roleType?: string } } | null): boolean {
  return !!session && session.user?.roleType === 'admin';
}

interface FetchBody {
  url?: unknown;
  token?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: FetchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'url is not a valid URL' }, { status: 400 });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'url must be http(s)' }, { status: 400 });
  }

  // Modest timeout so a hung upstream doesn't pin a Next.js worker.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const upstream = await fetch(parsed.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: `Upstream returned HTTP ${upstream.status}`,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    let spec: unknown;
    try {
      spec = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Upstream did not return valid JSON', detail: text.slice(0, 500) },
        { status: 502 },
      );
    }

    return NextResponse.json({ spec });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch spec';
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: isAbort ? 'Request to spec URL timed out after 15s' : msg },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
