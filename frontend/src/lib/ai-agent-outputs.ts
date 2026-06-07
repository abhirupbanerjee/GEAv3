/**
 * AI Agent Outputs — server-side helpers
 *
 * Persists downloadable files produced by AI agents (pdf, docx, xlsx, pptx,
 * image, audio, etc.) for the (logged-in user, service request) pair.
 *
 * Files are written to disk under a single directory; metadata lives in
 * Postgres (table `ai_agent_outputs`). Text-only outputs (md, json, text)
 * are intentionally NOT persisted — only downloadable artefacts.
 */

import path from 'path';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile, stat, readFile, unlink } from 'fs/promises';
import { executeQuery } from '@/lib/db';

export interface AgentOutputRow {
  id: number;
  user_id: string;
  user_email: string | null;
  sr_number: string;
  agent_id: string;
  agent_name: string | null;
  output_type: string;
  mime_type: string;
  filename: string;
  stored_path: string;
  file_size: number | null;
  query_text: string | null;
  created_at: string;
}

/**
 * Base directory for storing generated agent files.
 * Defaults to <cwd>/public/uploads/ai-agent-outputs which is bind-mounted
 * via docker-compose so files survive container rebuilds.
 */
export function getStorageDir(): string {
  return (
    process.env.AI_AGENT_OUTPUTS_DIR ||
    path.join(process.cwd(), 'public', 'uploads', 'ai-agent-outputs')
  );
}

function sanitizeFilename(name: string): string {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
}

export interface SaveOutputInput {
  userId: string;
  userEmail: string | null;
  srNumber: string;
  agentId: string;
  agentName: string | null;
  outputType: string;
  mimeType: string;
  filename: string;
  buffer: Buffer;
  queryText: string | null;
}

export async function saveAgentOutput(input: SaveOutputInput): Promise<AgentOutputRow> {
  const baseDir = getStorageDir();
  const userBucket = sanitizeFilename(input.userId);
  const srBucket = sanitizeFilename(input.srNumber);
  const dir = path.join(baseDir, userBucket, srBucket);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const uniqueId = crypto.randomBytes(6).toString('hex');
  const safeName = sanitizeFilename(input.filename);
  const storedName = `${Date.now()}-${uniqueId}-${safeName}`;
  const storedPath = path.join(dir, storedName);
  await writeFile(storedPath, input.buffer);
  const st = await stat(storedPath);

  const insert = await executeQuery<AgentOutputRow>(
    `INSERT INTO ai_agent_outputs
       (user_id, user_email, sr_number, agent_id, agent_name,
        output_type, mime_type, filename, stored_path, file_size, query_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      input.userId,
      input.userEmail,
      input.srNumber,
      input.agentId,
      input.agentName,
      input.outputType,
      input.mimeType,
      input.filename,
      storedPath,
      Number(st.size),
      input.queryText,
    ],
  );
  return insert.rows[0];
}

/**
 * List persisted outputs for the given user + SR, newest first.
 */
export async function listAgentOutputs(
  userId: string,
  srNumber: string,
): Promise<AgentOutputRow[]> {
  const res = await executeQuery<AgentOutputRow>(
    `SELECT * FROM ai_agent_outputs
      WHERE user_id = $1 AND sr_number = $2
      ORDER BY created_at DESC
      LIMIT 200`,
    [userId, srNumber],
  );
  return res.rows;
}

export async function getAgentOutputById(id: number): Promise<AgentOutputRow | null> {
  const res = await executeQuery<AgentOutputRow>(
    `SELECT * FROM ai_agent_outputs WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function readAgentOutputFile(row: AgentOutputRow): Promise<Buffer> {
  return readFile(row.stored_path);
}

/**
 * Delete a persisted output: remove the file from disk (best-effort) and
 * delete the metadata row. Missing files are tolerated so a half-cleaned
 * record can still be removed.
 */
export async function deleteAgentOutput(row: AgentOutputRow): Promise<void> {
  try {
    if (row.stored_path && existsSync(row.stored_path)) {
      await unlink(row.stored_path);
    }
  } catch (err) {
    console.warn('[ai-agent-outputs] failed to delete file on disk:', err);
  }
  await executeQuery(`DELETE FROM ai_agent_outputs WHERE id = $1`, [row.id]);
}
