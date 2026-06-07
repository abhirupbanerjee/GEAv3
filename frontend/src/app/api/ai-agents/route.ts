// GET /api/ai-agents
// Returns the list of available AI agents (public metadata only — no tokens, no endpoint URLs).
// Used by the admin UI to populate the agent dropdown.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPublicAgents, getPublicAgentsForServiceName } from '@/lib/ai-agents';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceName = req.nextUrl.searchParams.get('serviceName');
  const agents = serviceName ? getPublicAgentsForServiceName(serviceName) : getPublicAgents();
  return NextResponse.json({ agents });
}
