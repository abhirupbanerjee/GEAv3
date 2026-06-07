/**
 * GET /api/ai-agents/outputs/[id]
 *
 * Streams a previously persisted AI-agent output file. Only the user who
 * generated it (or an admin) may access it. Add `?inline=true` to display
 * inline (e.g. images, audio); otherwise the file is sent as an attachment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAgentOutputById, readAgentOutputFile, deleteAgentOutput } from '@/lib/ai-agent-outputs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const row = await getAgentOutputById(id);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = row.user_id === session.user.id;
  const isAdmin = session.user.roleType === 'admin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = await readAgentOutputFile(row);
  } catch {
    return NextResponse.json({ error: 'File missing on disk' }, { status: 410 });
  }

  const inline = req.nextUrl.searchParams.get('inline') === 'true';
  const safeName = row.filename.replace(/"/g, '');
  const disposition = `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`;

  // Wrap the Node Buffer in a ReadableStream so the typings line up with
  // Next.js / Web BodyInit (Uint8Array is not always accepted directly).
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
      );
      controller.close();
    },
  });
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': row.mime_type || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * DELETE /api/ai-agents/outputs/[id]
 *
 * Removes a persisted output file (disk + DB row). Owner or admin only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const row = await getAgentOutputById(id);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = row.user_id === session.user.id;
  const isAdmin = session.user.roleType === 'admin';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await deleteAgentOutput(row);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete output';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
