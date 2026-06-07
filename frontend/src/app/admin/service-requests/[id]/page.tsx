/**
 * @pageContext
 * @title Service Request Details
 * @purpose View and manage detailed information about a specific EA service request, including status updates and internal notes
 * @audience staff
 * @routePattern /admin/service-requests/:id
 * @routeParams
 *   - id: Service request ID number (e.g., 1, 82, 145)
 * @features
 *   - Complete request details including requester information and description
 *   - Status badge with color coding (Submitted, In Progress, Under Review, Completed, Rejected)
 *   - Service and entity information
 *   - Activity timeline showing all comments and status changes
 *   - Add internal notes/comments (visible to staff only)
 *   - Change request status with required comment (admin only)
 *   - Email notifications sent to requester on status changes
 *   - Request metadata (ID, created by, assigned to, timestamps)
 * @steps
 *   - Review request details in the main panel
 *   - Check activity timeline for previous updates and notes
 *   - Add internal comments using the "+ Add Comment" button
 *   - Admin users can change status via "Update Status" in sidebar
 *   - Provide a comment when changing status (required for email notification)
 * @tips
 *   - Internal notes are never visible to the requester - use for coordination
 *   - Status changes trigger automatic email notifications to requester
 *   - Activity timeline shows full audit trail of all actions
 *   - Use "Back to Service Requests" link to return to list view
 *   - Request numbers follow format: SR-YYYYMM-XXXX
 * @relatedPages
 *   - /admin/service-requests: Return to service requests list
 *   - /admin/service-requests/analytics: View analytics for all requests
 *   - /admin/analytics: Overall system analytics dashboard
 * @permissions
 *   - staff: Can view requests for their entity and add comments
 *   - admin: Can view all requests, change status, and add comments
 * @troubleshooting
 *   - Issue: Can't change status | Solution: Only admin users can change request status - staff can add comments only
 *   - Issue: Can't view request | Solution: Staff users can only view requests for their assigned entity
 *   - Issue: Status change failed | Solution: Ensure you provided a comment explaining the status change
 *   - Issue: Request not found | Solution: Verify the request ID is correct or you have permission to access it
 */

'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ServiceRequest {
  request_id: number;
  request_number: string;
  service_id: string;
  service_name: string;
  entity_id: string;
  entity_name: string;
  status: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  requester_ministry: string | null;
  request_description: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Comment {
  comment_id: number;
  comment_text: string;
  comment_type: string;
  is_status_change: boolean;
  old_status: string | null;
  new_status: string | null;
  created_by: string;
  created_at: string;
  is_visible_to_staff: boolean;
}

interface Attachment {
  attachment_id: number;
  request_id: number;
  filename: string;
  mimetype: string;
  file_size: number;
  is_mandatory: boolean;
  uploaded_by: string;
  created_at: string;
}

interface FileUploadConfig {
  maxFiles: number;
  maxSizeMB: number;
  required: boolean;
  allowedTypes: string[];
}

interface AiAgent {
  id: string;
  name: string;
  description: string;
  acceptsFile: boolean;
  fileUpload?: FileUploadConfig;
  outputTypes: string[];
  defaultOutputType: string;
  async?: boolean;
}

const FILE_TYPE_ACCEPT: Record<string, string> = {
  pdf: '.pdf,application/pdf',
  word: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  powerpoint: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  image: 'image/*',
  text: '.txt,text/plain',
  csv: '.csv,text/csv',
  json: '.json,application/json',
  markdown: '.md,text/markdown',
};

const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  image: 'Images',
  text: 'Text',
  csv: 'CSV',
  json: 'JSON',
  markdown: 'Markdown',
};

// Returns true if an SR attachment (filename + mimetype) matches one of the
// agent's allowed file types. Allowed types are the same keys used by
// FILE_TYPE_ACCEPT (e.g. 'pdf', 'word', 'image'). When the agent declares no
// allowed-types restriction, every attachment is considered compatible.
function attachmentMatchesAgentTypes(
  attachment: { filename: string; mimetype: string },
  allowedTypes: string[] | undefined,
): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  const mime = (attachment.mimetype || '').toLowerCase();
  const name = (attachment.filename || '').toLowerCase();
  const ext = name.includes('.') ? '.' + (name.split('.').pop() || '') : '';
  for (const t of allowedTypes) {
    const spec = FILE_TYPE_ACCEPT[t];
    if (!spec) continue;
    const tokens = spec.split(',').map((s) => s.trim().toLowerCase());
    for (const tok of tokens) {
      if (!tok) continue;
      if (tok.startsWith('.')) {
        if (ext && ext === tok) return true;
      } else if (tok.endsWith('/*')) {
        if (mime.startsWith(tok.slice(0, -1))) return true;
      } else if (mime === tok) {
        return true;
      }
    }
  }
  return false;
}

export default function ServiceRequestDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // --- AI Agents state ---
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [agentFile, setAgentFile] = useState<File | null>(null);
  // When an agent accepts a file, the user can either upload from their PC
  // or pick one of this request's existing attachments.
  const [agentFileSource, setAgentFileSource] = useState<'upload' | 'attachment'>('upload');
  const [agentAttachmentId, setAgentAttachmentId] = useState<number | ''>('');
  const [agentFetchingAttachment, setAgentFetchingAttachment] = useState(false);
  const [agentOutputType, setAgentOutputType] = useState('');
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [agentRunError, setAgentRunError] = useState<string | null>(null);
  const [agentResponseRenderType, setAgentResponseRenderType] = useState<
    'md' | 'json' | 'text' | 'image' | 'file' | 'audio' | 'unknown'
  >('unknown');
  const [agentResponseFile, setAgentResponseFile] = useState<{
    downloadUrl: string;
    filename: string;
    mimeType: string;
    type: string;
  } | null>(null);

  // --- Async agent state ---
  // When an async-capable agent doesn't return a final result within ~15s,
  // the server returns { pending: true, jobId } and we stash it here so the
  // user can click “Show response” to poll for completion.
  const [agentPendingJob, setAgentPendingJob] = useState<{
    jobId: string;
    agentId: string;
    outputType: string;
  } | null>(null);
  const [agentJobChecking, setAgentJobChecking] = useState(false);
  const [agentJobStatus, setAgentJobStatus] = useState<string | null>(null);

  // Previously generated downloadable outputs for this (user, SR).
  interface PreviousOutput {
    id: number;
    srNumber: string;
    agentId: string;
    agentName: string | null;
    outputType: string;
    mimeType: string;
    filename: string;
    fileSize: number | null;
    createdAt: string;
    downloadUrl: string;
  }
  const [previousOutputs, setPreviousOutputs] = useState<PreviousOutput[]>([]);
  const [previousOutputsLoading, setPreviousOutputsLoading] = useState(false);
  const [previousOutputsError, setPreviousOutputsError] = useState<string | null>(null);
  const [showPreviousOutputs, setShowPreviousOutputs] = useState(true);
  const [deletingOutputId, setDeletingOutputId] = useState<number | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const isAdmin = session?.user?.roleType === 'admin';
  const requestId = params.id as string;

  const fetchRequestDetails = useCallback(async () => {
    if (!requestId) return;

    try {
      setError(null);
      const response = await fetch(`/api/admin/service-requests/${requestId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Service request not found');
        } else if (response.status === 401) {
          throw new Error('Unauthorized - Please log in');
        } else if (response.status === 403) {
          throw new Error('Access denied - You do not have permission to view this request');
        } else {
          throw new Error('Failed to fetch request details');
        }
      }
      const data = await response.json();
      setRequest(data.data.request);
      setAttachments(data.data.attachments || []);
      setNewStatus(data.data.request.status);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const fetchComments = useCallback(async () => {
    if (!requestId) return;

    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data.data.comments);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) {
      fetchRequestDetails();
      fetchComments();
    }
  }, [requestId]);

  // Load available AI agents (server-side registry, no tokens exposed).
  // Filtered by the current service request's `service_name` (e.g. "EA Portal
  // Support Request") so admins can restrict which agents appear on every SR
  // under that service via the AI Agents settings panel. Waits until `request`
  // has loaded so we have service_name available.
  useEffect(() => {
    const srKey = request?.service_name;
    if (!srKey) return;
    let cancelled = false;
    setAgentsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/ai-agents?serviceName=${encodeURIComponent(srKey)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setAgents(data.agents || []);
          setAgentsError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setAgentsError(err instanceof Error ? err.message : 'Failed to load agents');
        }
      } finally {
        if (!cancelled) setAgentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request?.service_name]);

  // Load previously generated downloadable AI-agent outputs for this user + SR.
  const loadPreviousOutputs = useCallback(async () => {
    const srKey = request?.request_number;
    if (!srKey) return;
    setPreviousOutputsLoading(true);
    setPreviousOutputsError(null);
    try {
      const res = await fetch(
        `/api/ai-agents/outputs?srNumber=${encodeURIComponent(srKey)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPreviousOutputs(data.outputs || []);
    } catch (err) {
      setPreviousOutputsError(
        err instanceof Error ? err.message : 'Failed to load previous outputs',
      );
    } finally {
      setPreviousOutputsLoading(false);
    }
  }, [request?.request_number]);

  useEffect(() => {
    if (request?.request_number) {
      void loadPreviousOutputs();
    }
  }, [request?.request_number, loadPreviousOutputs]);

  const handleDeletePreviousOutput = useCallback(
    async (output: PreviousOutput) => {
      if (
        !confirm(
          `Delete "${output.filename}"? This permanently removes the file from disk.`,
        )
      ) {
        return;
      }
      setDeletingOutputId(output.id);
      setPreviousOutputsError(null);
      try {
        const res = await fetch(`/api/ai-agents/outputs/${output.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setPreviousOutputs((prev) => prev.filter((o) => o.id !== output.id));
      } catch (err) {
        setPreviousOutputsError(
          err instanceof Error ? err.message : 'Failed to delete file',
        );
      } finally {
        setDeletingOutputId(null);
      }
    },
    [],
  );

  // Reset agent inputs when the selected agent changes.
  useEffect(() => {
    setAgentQuery('');
    setAgentFile(null);
    setAgentFileSource('upload');
    setAgentAttachmentId('');
    setAgentResponse(null);
    setAgentResponseRenderType('unknown');
    setAgentResponseFile(null);
    setAgentRunError(null);
    setAgentPendingJob(null);
    setAgentJobStatus(null);
    if (selectedAgent) {
      setAgentOutputType(selectedAgent.defaultOutputType);
    } else {
      setAgentOutputType('');
    }
  }, [selectedAgentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse an upstream-agent response body (envelope { jobId, outputs:[...] })
  // into the values the UI renderer needs. Extracted so it can be reused for
  // async-job polling (handleCheckJob) as well as the sync invoke path.
  type ParsedAgentResponse = {
    content: string;
    renderType: 'md' | 'json' | 'text' | 'image' | 'file' | 'audio' | 'unknown';
    fileInfo: {
      downloadUrl: string;
      filename: string;
      mimeType: string;
      type: string;
    } | null;
    upstreamDownloadPath: string | null;
    upstreamOutputType: string | null;
  };
  const parseAgentResponse = (
    text: string,
    fallbackOutputType: string,
    agentId: string,
  ): ParsedAgentResponse => {
    let renderType: ParsedAgentResponse['renderType'] = 'unknown';
    let content: string = text;
    let fileInfo: ParsedAgentResponse['fileInfo'] = null;
    let upstreamDownloadPath: string | null = null;
    let upstreamOutputType: string | null = null;
    try {
      const parsed = JSON.parse(text);
      const first = Array.isArray(parsed?.outputs) ? parsed.outputs[0] : null;
      if (first) {
        const t = (first.type || '').toString().toLowerCase();
        const mime = (first.mimeType || '').toString().toLowerCase();
        const hasDownload =
          typeof first.downloadUrl === 'string' && first.downloadUrl.length > 0;

        if (hasDownload) {
          const filename =
            first.filename ||
            `agent-output-${parsed.jobId || Date.now()}.${
              t === 'word'
                ? 'docx'
                : t === 'excel'
                ? 'xlsx'
                : t === 'powerpoint'
                ? 'pptx'
                : t || 'bin'
            }`;
          const proxyBase = `/api/ai-agents/download?agentId=${encodeURIComponent(
            agentId,
          )}&path=${encodeURIComponent(first.downloadUrl)}&filename=${encodeURIComponent(
            filename,
          )}`;
          fileInfo = {
            downloadUrl: proxyBase,
            filename,
            mimeType: mime || 'application/octet-stream',
            type: t,
          };
          upstreamDownloadPath = first.downloadUrl;
          upstreamOutputType = t || fallbackOutputType || 'file';
          if (t === 'image' || mime.startsWith('image/')) renderType = 'image';
          else if (t === 'podcast' || mime.startsWith('audio/')) renderType = 'audio';
          else renderType = 'file';
          content = '';
        } else if (typeof first.content !== 'undefined') {
          if (t === 'md' || t === 'markdown') renderType = 'md';
          else if (t === 'json') renderType = 'json';
          else if (t === 'text' || t === 'txt' || t === 'plain') renderType = 'text';
          else renderType = 'text';

          content =
            typeof first.content === 'string'
              ? first.content
              : JSON.stringify(first.content, null, 2);
        } else {
          renderType =
            fallbackOutputType === 'md'
              ? 'md'
              : fallbackOutputType === 'json'
              ? 'json'
              : 'text';
        }
      } else {
        renderType =
          fallbackOutputType === 'md'
            ? 'md'
            : fallbackOutputType === 'json'
            ? 'json'
            : 'text';
      }
    } catch {
      renderType =
        fallbackOutputType === 'md'
          ? 'md'
          : fallbackOutputType === 'json'
          ? 'json'
          : 'text';
    }

    // If the upstream returned a JSON object that just wraps a single
    // human-readable string (e.g. {"response":"..."}, {"answer":"..."},
    // or any object with one string field), unwrap it and render the
    // string directly instead of showing the raw JSON braces.
    if (renderType === 'json' && typeof content === 'string') {
      try {
        const obj = JSON.parse(content);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          const preferred = [
            'response', 'answer', 'text', 'content', 'result',
            'message', 'output', 'reply',
          ];
          let extracted: string | null = null;
          for (const k of preferred) {
            if (typeof (obj as Record<string, unknown>)[k] === 'string') {
              extracted = (obj as Record<string, string>)[k];
              break;
            }
          }
          if (extracted === null) {
            const keys = Object.keys(obj);
            if (keys.length === 1 && typeof (obj as Record<string, unknown>)[keys[0]] === 'string') {
              extracted = (obj as Record<string, string>)[keys[0]];
            }
          }
          if (extracted !== null) {
            content = extracted;
            // Detect common markdown markers so headings/lists/bold render
            // properly; otherwise fall back to plain text.
            const isMd = /\*\*|`[^`]+`|^#{1,6}\s|\n[-*]\s|\n\d+\.\s/m.test(extracted);
            renderType = isMd ? 'md' : 'text';
          }
        }
      } catch {
        /* leave as json */
      }
    }

    return { content, renderType, fileInfo, upstreamDownloadPath, upstreamOutputType };
  };

  const handleRunAgent = async () => {
    if (!selectedAgent) return;
    if (!agentQuery.trim()) {
      setAgentRunError('Please enter a query.');
      return;
    }
    if (selectedAgent.acceptsFile && selectedAgent.fileUpload?.required) {
      if (agentFileSource === 'upload' && !agentFile) {
        setAgentRunError('This agent requires a file upload.');
        return;
      }
      if (agentFileSource === 'attachment' && !agentAttachmentId) {
        setAgentRunError('Please pick an attachment to send to the agent.');
        return;
      }
    }
    setAgentRunning(true);
    setAgentRunError(null);
    setAgentResponse(null);
    setAgentResponseRenderType('unknown');
    setAgentResponseFile(null);
    setAgentPendingJob(null);
    setAgentJobStatus(null);

    try {
      // Resolve the file to send: either the user's local upload, or — when
      // the user picked an SR attachment — fetch it from the attachments API
      // and wrap the blob in a File so the rest of the flow is unchanged.
      let fileToSend: File | null = null;
      if (selectedAgent.acceptsFile) {
        if (agentFileSource === 'upload') {
          fileToSend = agentFile;
        } else if (agentFileSource === 'attachment' && agentAttachmentId) {
          setAgentFetchingAttachment(true);
          try {
            const resp = await fetch(
              `/api/admin/service-requests/${requestId}/attachments/${agentAttachmentId}`,
            );
            if (!resp.ok) {
              throw new Error(`Failed to load attachment (HTTP ${resp.status})`);
            }
            const blob = await resp.blob();
            const meta = attachments.find((a) => a.attachment_id === agentAttachmentId);
            fileToSend = new File([blob], meta?.filename || 'attachment', {
              type: meta?.mimetype || blob.type || 'application/octet-stream',
            });
            // Size check against the agent's per-file limit.
            const cfg = selectedAgent.fileUpload;
            if (cfg && fileToSend.size > cfg.maxSizeMB * 1024 * 1024) {
              setAgentRunError(
                `Attachment "${fileToSend.name}" exceeds the ${cfg.maxSizeMB} MB limit for this agent.`,
              );
              return;
            }
          } finally {
            setAgentFetchingAttachment(false);
          }
        }
      }

      let res: Response;
      if (fileToSend && selectedAgent.acceptsFile) {
        const fd = new FormData();
        fd.append('agentId', selectedAgent.id);
        fd.append('query', agentQuery);
        fd.append('outputType', agentOutputType);
        fd.append('file', fileToSend, fileToSend.name);
        res = await fetch('/api/ai-agents/invoke', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/ai-agents/invoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: selectedAgent.id,
            query: agentQuery,
            outputType: agentOutputType,
          }),
        });
      }

      const text = await res.text();

      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const j = JSON.parse(text);
          msg = j.error || msg;
          // Surface upstream error detail (e.g. expired API key) when present.
          if (j.upstreamBody) {
            let detail = j.upstreamBody;
            try {
              const u = JSON.parse(j.upstreamBody);
              detail = u.error || u.message || j.upstreamBody;
            } catch {
              /* keep raw */
            }
            msg = `${msg}: ${detail}`;
          }
        } catch {
          /* not json */
        }
        setAgentRunError(msg);
        return;
      }

      // 202 == async job submitted. The server has handed us a jobId; we do
      // NOT block the UI waiting for it. Just show the "Show response"
      // button so the user can poll on demand.
      if (res.status === 202) {
        let pending: {
          jobId?: string;
          agentId?: string;
          outputType?: string;
          message?: string;
        };
        try {
          pending = JSON.parse(text);
        } catch {
          setAgentRunError('Agent is still running but the server response could not be parsed.');
          return;
        }
        if (!pending || typeof pending.jobId !== 'string') {
          setAgentRunError('Agent is still running but no jobId was returned.');
          return;
        }
        setAgentPendingJob({
          jobId: pending.jobId,
          agentId: pending.agentId || selectedAgent.id,
          outputType: pending.outputType || agentOutputType,
        });
        setAgentJobStatus(pending.message || 'Agent is still running.');
        return;
      }

      const parsedRes = parseAgentResponse(text, agentOutputType, selectedAgent.id);
      setAgentResponse(parsedRes.content);
      setAgentResponseRenderType(parsedRes.renderType);
      setAgentResponseFile(parsedRes.fileInfo);

      // Persist downloadable outputs so the user can revisit them later.
      if (parsedRes.fileInfo && parsedRes.upstreamDownloadPath && request?.request_number) {
        try {
          const persistRes = await fetch('/api/ai-agents/outputs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              srNumber: request.request_number,
              agentId: selectedAgent.id,
              agentDownloadPath: parsedRes.upstreamDownloadPath,
              filename: parsedRes.fileInfo.filename,
              mimeType: parsedRes.fileInfo.mimeType,
              outputType: parsedRes.upstreamOutputType || parsedRes.fileInfo.type,
              query: agentQuery,
            }),
          });
          if (persistRes.ok) {
            void loadPreviousOutputs();
          }
        } catch {
          /* non-fatal: history just won't include this run */
        }
      }
    } catch (err) {
      setAgentRunError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setAgentRunning(false);
    }
  };

  // Poll the server for the result of an async job started by handleRunAgent.
  // If still running, just update the status message. If complete, populate
  // the response renderer using the same parser as the sync path.
  const handleCheckJob = async () => {
    if (!agentPendingJob || !selectedAgent) return;
    setAgentJobChecking(true);
    setAgentRunError(null);
    try {
      const res = await fetch(
        `/api/ai-agents/jobs/${encodeURIComponent(agentPendingJob.jobId)}?agentId=${encodeURIComponent(
          agentPendingJob.agentId,
        )}`,
      );
      const text = await res.text();
      if (res.status === 202) {
        try {
          const j = JSON.parse(text);
          setAgentJobStatus(
            j.message || `Agent still running (status: ${j.status || 'pending'}).`,
          );
        } catch {
          setAgentJobStatus('Agent still running.');
        }
        return;
      }
      if (!res.ok) {
        let msg = `Job check failed (${res.status})`;
        try {
          const j = JSON.parse(text);
          msg = j.error || msg;
        } catch {
          /* keep raw */
        }
        setAgentRunError(msg);
        return;
      }
      // Done — parse like a normal invoke response.
      const parsedRes = parseAgentResponse(text, agentPendingJob.outputType, agentPendingJob.agentId);
      setAgentResponse(parsedRes.content);
      setAgentResponseRenderType(parsedRes.renderType);
      setAgentResponseFile(parsedRes.fileInfo);
      setAgentPendingJob(null);
      setAgentJobStatus(null);

      if (parsedRes.fileInfo && parsedRes.upstreamDownloadPath && request?.request_number) {
        try {
          const persistRes = await fetch('/api/ai-agents/outputs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              srNumber: request.request_number,
              agentId: agentPendingJob.agentId,
              agentDownloadPath: parsedRes.upstreamDownloadPath,
              filename: parsedRes.fileInfo.filename,
              mimeType: parsedRes.fileInfo.mimeType,
              outputType: parsedRes.upstreamOutputType || parsedRes.fileInfo.type,
              query: agentQuery,
            }),
          });
          if (persistRes.ok) void loadPreviousOutputs();
        } catch {
          /* non-fatal */
        }
      }
    } catch (err) {
      setAgentRunError(err instanceof Error ? err.message : 'Job check failed');
    } finally {
      setAgentJobChecking(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === request?.status) {
      alert('Please select a different status');
      return;
    }

    if (!statusComment.trim()) {
      alert('Please provide a comment for the status change');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: newStatus,
          comment: statusComment,
        }),
      });

      if (!response.ok) throw new Error('Failed to change status');

      alert('Status changed successfully! Email notification sent to requester.');
      setShowStatusChange(false);
      setStatusComment('');
      fetchRequestDetails();
      fetchComments();
    } catch (error) {
      alert('Failed to change status');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/service-requests/${requestId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: newComment,
          comment_type: 'internal_note',
          is_visible_to_staff: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      setNewComment('');
      setShowAddComment(false);
      fetchComments();
    } catch (error) {
      alert('Failed to add comment');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      under_review: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (mimetype === 'application/zip' || mimetype === 'application/x-zip-compressed') {
      return (
        <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm4 0v2h2V4H8zm0 4v2h2V8H8zm0 4v2h2v-2H8z" clipRule="evenodd" />
        </svg>
      );
    }
    if (mimetype.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.attachment_id);
    try {
      const response = await fetch(
        `/api/admin/service-requests/${requestId}/attachments/${attachment.attachment_id}`
      );
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">Error Loading Request</h2>
            <p className="mb-4">{error}</p>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchRequestDetails();
                  fetchComments();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
              <a
                href="/admin/service-requests"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Back to Service Requests
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <p className="mb-4">No request data available.</p>
            <a
              href="/admin/service-requests"
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 inline-block"
            >
              Back to Service Requests
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/admin/service-requests"
          className="text-blue-600 hover:text-blue-800 flex items-center mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Service Requests
        </a>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{request.request_number}</h1>
            <p className="text-gray-600 mt-1">{request.service_name}</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold border ${getStatusColor(request.status)}`}>
            {request.status.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Requester Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.requester_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Requester Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.requester_email}</dd>
              </div>
              {request.requester_phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.requester_phone}</dd>
                </div>
              )}
              {request.requester_ministry && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ministry/Department</dt>
                  <dd className="mt-1 text-sm text-gray-900">{request.requester_ministry}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Entity</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.entity_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Service</dt>
                <dd className="mt-1 text-sm text-gray-900">{request.service_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(request.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(request.updated_at)}</dd>
              </div>
            </dl>
            {request.request_description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500 mb-2">Description</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{request.request_description}</dd>
              </div>
            )}
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Attachments ({attachments.length})
              </h2>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.attachment_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(attachment.mimetype)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {attachment.filename}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                          <span>Uploaded by {attachment.uploaded_by}</span>
                          <span>•</span>
                          <span>{formatDate(attachment.created_at)}</span>
                          {attachment.is_mandatory && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-medium">Required</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(attachment)}
                      disabled={downloadingId === attachment.attachment_id}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    >
                      {downloadingId === attachment.attachment_id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments/Activity Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Activity & Comments</h2>
              <button
                onClick={() => setShowAddComment(!showAddComment)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Comment
              </button>
            </div>

            {/* Add Comment Form */}
            {showAddComment && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add an internal note..."
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => {
                      setShowAddComment(false);
                      setNewComment('');
                    }}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.comment_id}
                    className={`p-4 rounded-lg border ${
                      comment.is_status_change
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {comment.is_status_change && (
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-blue-900">
                          Status changed from "{comment.old_status}" to "{comment.new_status}"
                        </span>
                      </div>
                    )}
                    <p className="text-sm text-gray-700">{comment.comment_text}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{comment.created_by}</span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Status Change (Admin Only) */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
              <button
                onClick={() => setShowStatusChange(!showStatusChange)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Status
              </button>

              {showStatusChange && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="in_progress">In Progress</option>
                      <option value="under_review">Under Review</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment (required)
                    </label>
                    <textarea
                      value={statusComment}
                      onChange={(e) => setStatusComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Explain the status change..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowStatusChange(false);
                        setStatusComment('');
                        setNewStatus(request.status);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusChange}
                      disabled={submitting}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    📧 An email notification will be sent to the requester
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Request ID</span>
                <span className="font-medium">#{request.request_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created by</span>
                <span className="font-medium">{request.created_by}</span>
              </div>
              {request.assigned_to && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned to</span>
                  <span className="font-medium">{request.assigned_to}</span>
                </div>
              )}
            </div>
          </div>

          {/* Available AI Agents */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available AI Agents</h3>

            {agentsLoading && (
              <p className="text-sm text-gray-500">Loading agents…</p>
            )}
            {agentsError && (
              <p className="text-sm text-red-600">Failed to load agents: {agentsError}</p>
            )}

            {!agentsLoading && !agentsError && (
              <>
                <label htmlFor="ai-agent-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select an agent
                </label>
                <select
                  id="ai-agent-select"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Choose an AI agent --</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                {selectedAgent && (
                  <div className="mt-4 space-y-3">
                    {selectedAgent.description && (
                      <p className="text-xs text-gray-500">{selectedAgent.description}</p>
                    )}

                    <div>
                      <label htmlFor="ai-query" className="block text-sm font-medium text-gray-700 mb-1">
                        Query <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="ai-query"
                        rows={3}
                        value={agentQuery}
                        onChange={(e) => setAgentQuery(e.target.value)}
                        placeholder="Type your prompt for the agent…"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {selectedAgent.acceptsFile && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File {selectedAgent.fileUpload?.required ? <span className="text-red-500">*</span> : '(optional)'}
                        </label>

                        {/* Source picker: upload-from-PC vs SR attachment */}
                        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="ai-file-source"
                              value="upload"
                              checked={agentFileSource === 'upload'}
                              onChange={() => {
                                setAgentFileSource('upload');
                                setAgentRunError(null);
                              }}
                              className="h-3.5 w-3.5 text-blue-600"
                            />
                            <span className="text-gray-700">Upload from your PC</span>
                          </label>
                          <label
                            className={`inline-flex items-center gap-1.5 ${
                              attachments.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                            }`}
                          >
                            <input
                              type="radio"
                              name="ai-file-source"
                              value="attachment"
                              checked={agentFileSource === 'attachment'}
                              disabled={attachments.length === 0}
                              onChange={() => {
                                setAgentFileSource('attachment');
                                setAgentRunError(null);
                              }}
                              className="h-3.5 w-3.5 text-blue-600"
                            />
                            <span className="text-gray-700">
                              Use a request attachment{' '}
                              {attachments.length > 0 && (
                                <span className="text-gray-400">({attachments.length})</span>
                              )}
                            </span>
                          </label>
                        </div>

                        {agentFileSource === 'upload' ? (
                          <>
                            <input
                              id="ai-file"
                              type="file"
                              accept={
                                selectedAgent.fileUpload?.allowedTypes
                                  .map((t) => FILE_TYPE_ACCEPT[t])
                                  .filter(Boolean)
                                  .join(',') || undefined
                              }
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                const cfg = selectedAgent.fileUpload;
                                if (f && cfg && f.size > cfg.maxSizeMB * 1024 * 1024) {
                                  setAgentRunError(`File exceeds the ${cfg.maxSizeMB} MB limit for this agent.`);
                                  e.target.value = '';
                                  setAgentFile(null);
                                  return;
                                }
                                setAgentRunError(null);
                                setAgentFile(f);
                              }}
                              className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {selectedAgent.fileUpload && (
                              <p className="mt-1 text-xs text-gray-500">
                                Allowed:{' '}
                                {selectedAgent.fileUpload.allowedTypes
                                  .map((t) => FILE_TYPE_LABEL[t] || t)
                                  .join(', ')}
                                . Max {selectedAgent.fileUpload.maxSizeMB} MB.
                              </p>
                            )}
                            {agentFile && (
                              <p className="mt-1 text-xs text-gray-500">
                                Selected: {agentFile.name} ({(agentFile.size / 1024).toFixed(1)} KB)
                              </p>
                            )}
                          </>
                        ) : (
                          (() => {
                            if (attachments.length === 0) {
                              return (
                                <p className="text-xs text-gray-500">
                                  No attachments on this request.
                                </p>
                              );
                            }
                            const matching = attachments.filter((a) =>
                              attachmentMatchesAgentTypes(
                                a,
                                selectedAgent.fileUpload?.allowedTypes,
                              ),
                            );
                            if (matching.length === 0) {
                              return (
                                <p className="text-xs text-amber-700">
                                  None of the {attachments.length} attachment
                                  {attachments.length === 1 ? '' : 's'} match this
                                  agent&apos;s allowed types
                                  {selectedAgent.fileUpload && (
                                    <>
                                      {' ('}
                                      {selectedAgent.fileUpload.allowedTypes
                                        .map((t) => FILE_TYPE_LABEL[t] || t)
                                        .join(', ')}
                                      {')'}
                                    </>
                                  )}
                                  .
                                </p>
                              );
                            }
                            return (
                              <>
                                <select
                                  value={agentAttachmentId}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setAgentAttachmentId(v ? Number(v) : '');
                                    setAgentRunError(null);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">-- Choose an attachment --</option>
                                  {matching.map((a) => (
                                    <option key={a.attachment_id} value={a.attachment_id}>
                                      {a.filename} ({(a.file_size / 1024).toFixed(1)} KB)
                                    </option>
                                  ))}
                                </select>
                                {selectedAgent.fileUpload && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Showing attachments that match:{' '}
                                    {selectedAgent.fileUpload.allowedTypes
                                      .map((t) => FILE_TYPE_LABEL[t] || t)
                                      .join(', ')}
                                    . Max {selectedAgent.fileUpload.maxSizeMB} MB.
                                  </p>
                                )}
                                {agentFetchingAttachment && (
                                  <p className="mt-1 text-xs text-blue-700">
                                    Loading attachment…
                                  </p>
                                )}
                              </>
                            );
                          })()
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="ai-output-type" className="block text-sm font-medium text-gray-700 mb-1">
                        Output type
                      </label>
                      <select
                        id="ai-output-type"
                        value={agentOutputType}
                        onChange={(e) => setAgentOutputType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {selectedAgent.outputTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleRunAgent}
                      disabled={agentRunning || agentFetchingAttachment || !agentQuery.trim()}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {agentRunning
                        ? 'Running…'
                        : agentFetchingAttachment
                          ? 'Loading attachment…'
                          : 'Run agent'}
                    </button>

                    {agentRunError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {agentRunError}
                      </div>
                    )}

                    {agentRunning && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Waiting for agent response…
                      </div>
                    )}

                    {/* Async pending: server returned a jobId because the result
                        wasn't ready inside the 15s wait window. User can poll
                        for it on demand. */}
                    {agentPendingJob && !agentRunning && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800 space-y-2">
                        <div className="flex items-start gap-2">
                          <svg className="h-4 w-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">
                              {agentJobChecking
                                ? 'Agent is still running'
                                : agentJobStatus && agentJobStatus !== 'pending'
                                ? 'Agent is still running'
                                : 'Agent job submitted'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCheckJob}
                          disabled={agentJobChecking}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                        >
                          {agentJobChecking ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              Checking…
                            </>
                          ) : (
                            'Show response'
                          )}
                        </button>
                      </div>
                    )}

                    {(agentResponse !== null || agentResponseFile) && !agentRunning && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Response</label>
                        <div className="max-h-[32rem] overflow-auto bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                          {agentResponseRenderType === 'md' && (
                            <div className="text-sm text-gray-800 space-y-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_a]:text-blue-600 [&_a:hover]:underline [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_strong]:font-semibold [&_hr]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:p-1 [&_td]:border [&_td]:p-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {agentResponse || ''}
                              </ReactMarkdown>
                            </div>
                          )}
                          {agentResponseRenderType === 'json' && (
                            <pre className="whitespace-pre-wrap break-words text-xs font-mono">
{(() => { try { return JSON.stringify(JSON.parse(agentResponse || ''), null, 2); } catch { return agentResponse; } })()}
                            </pre>
                          )}
                          {agentResponseRenderType === 'text' && (
                            <pre className="whitespace-pre-wrap break-words text-xs font-mono">
{agentResponse}
                            </pre>
                          )}
                          {agentResponseRenderType === 'image' && agentResponseFile && (
                            <div className="space-y-3">
                              <img
                                src={`${agentResponseFile.downloadUrl}&inline=true`}
                                alt={agentResponseFile.filename}
                                className="max-w-full h-auto rounded border border-gray-200 bg-white"
                              />
                              <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
                                <span className="truncate" title={agentResponseFile.filename}>
                                  {agentResponseFile.filename}
                                </span>
                                <a
                                  href={agentResponseFile.downloadUrl}
                                  download={agentResponseFile.filename}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  Download
                                </a>
                              </div>
                            </div>
                          )}
                          {agentResponseRenderType === 'audio' && agentResponseFile && (
                            <div className="space-y-3">
                              <audio
                                controls
                                src={`${agentResponseFile.downloadUrl}&inline=true`}
                                className="w-full"
                              >
                                Your browser does not support the audio element.
                              </audio>
                              <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
                                <span className="truncate" title={agentResponseFile.filename}>
                                  {agentResponseFile.filename}
                                </span>
                                <a
                                  href={agentResponseFile.downloadUrl}
                                  download={agentResponseFile.filename}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          )}
                          {agentResponseRenderType === 'file' && agentResponseFile && (
                            <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                                {/* File icon */}
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900" title={agentResponseFile.filename}>
                                  {agentResponseFile.filename}
                                </div>
                                <div className="mt-0.5 text-xs text-gray-500">
                                  {agentResponseFile.type.toUpperCase()} · {agentResponseFile.mimeType}
                                </div>
                              </div>
                              <a
                                href={agentResponseFile.downloadUrl}
                                download={agentResponseFile.filename}
                                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download
                              </a>
                            </div>
                          )}
                          {agentResponseRenderType === 'unknown' && !agentResponseFile && (
                            <pre className="whitespace-pre-wrap break-words text-xs font-mono">
{agentResponse}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Previously generated downloadable files for this user + SR */}
                    <div className="rounded-lg border border-gray-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setShowPreviousOutputs((v) => !v)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="14 2 14 8 20 8" />
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          </svg>
                          Previously generated files
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">
                            {previousOutputs.length}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void loadPreviousOutputs();
                            }}
                            disabled={previousOutputsLoading}
                            title="Refresh"
                            className="rounded-md border border-gray-300 bg-white p-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                          >
                            <svg className={`h-3.5 w-3.5 ${previousOutputsLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="23 4 23 10 17 10" />
                              <polyline points="1 20 1 14 7 14" />
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                          </button>
                          <svg
                            className={`h-4 w-4 text-gray-500 transition-transform ${showPreviousOutputs ? 'rotate-180' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </button>
                      {showPreviousOutputs && (
                        <div className="border-t border-gray-200 px-3 py-2">
                          {previousOutputsError && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                              {previousOutputsError}
                            </div>
                          )}
                          {!previousOutputsError && previousOutputs.length === 0 && (
                            <p className="py-2 text-xs text-gray-500">
                              No downloadable files generated yet for this service request.
                              Files (PDF, Word, Excel, PowerPoint, image, audio, etc.) you generate
                              with an agent will appear here.
                            </p>
                          )}
                          {previousOutputs.length > 0 && (
                            <ul className="max-h-72 divide-y divide-gray-100 overflow-auto">
                              {previousOutputs.map((o) => (
                                <li key={o.id} className="flex items-center gap-3 py-2">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-gray-900" title={o.filename}>
                                      {o.filename}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium uppercase">
                                        {o.outputType}
                                      </span>
                                      {o.agentName && <span>{o.agentName}</span>}
                                      <span>{new Date(o.createdAt).toLocaleString()}</span>
                                      {typeof o.fileSize === 'number' && (
                                        <span>{(o.fileSize / 1024).toFixed(1)} KB</span>
                                      )}
                                    </div>
                                  </div>
                                  <a
                                    href={o.downloadUrl}
                                    download={o.filename}
                                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePreviousOutput(o)}
                                    disabled={deletingOutputId === o.id}
                                    title="Delete file"
                                    className="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-red-300 bg-white p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60"
                                  >
                                    {deletingOutputId === o.id ? (
                                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                        <path d="M22 12a10 10 0 0 1-10 10" />
                                      </svg>
                                    ) : (
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                        <path d="M10 11v6" />
                                        <path d="M14 11v6" />
                                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                      </svg>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
