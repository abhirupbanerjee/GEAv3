'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FiCpu,
  FiTrash2,
  FiPlus,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiX,
  FiSave,
  FiLink,
  FiRefreshCw,
  FiUploadCloud,
} from 'react-icons/fi'

interface FileUploadConfig {
  maxFiles: number
  maxSizeMB: number
  required: boolean
  allowedTypes: string[]
}

interface RegisteredAgent {
  id: string
  name: string
  description: string
  endpoint: string
  tokenEnv: string
  acceptsFile: boolean
  fileUpload?: FileUploadConfig | null
  outputTypes: string[]
  defaultOutputType: string
  async?: boolean
}

const ALL_OUTPUT_TYPES = [
  'text',
  'json',
  'md',
  'pdf',
  'word',
  'excel',
  'powerpoint',
  'image',
  'podcast',
  'chart',
  'diagram',
] as const

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  json: 'JSON',
  md: 'Markdown',
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  image: 'Image',
  podcast: 'Podcast',
  chart: 'Chart',
  diagram: 'Diagram',
}

const FILE_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'pdf', label: 'PDF' },
  { key: 'word', label: 'Word' },
  { key: 'excel', label: 'Excel' },
  { key: 'powerpoint', label: 'PowerPoint' },
  { key: 'image', label: 'Image' },
  { key: 'text', label: 'Text' },
  { key: 'csv', label: 'CSV' },
  { key: 'json', label: 'JSON' },
  { key: 'markdown', label: 'Markdown' },
]

interface FormState {
  id: string
  name: string
  description: string
  endpoint: string
  token: string
  acceptsFile: boolean
  outputTypes: string[]
  defaultOutputType: string
  fileMaxFiles: number
  fileMaxSizeMB: number
  fileRequired: boolean
  fileAllowedTypes: string[]
  async: boolean
}

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  description: '',
  endpoint: '',
  token: '',
  acceptsFile: false,
  outputTypes: ['text', 'json', 'md'],
  defaultOutputType: 'md',
  fileMaxFiles: 1,
  fileMaxSizeMB: 10,
  fileRequired: false,
  fileAllowedTypes: ['pdf'],
  async: false,
}

interface MappingRow {
  serviceName: string
  agentIds: string[]
}

// ---------- Spec-JSON import helpers ----------

// Map an output key from the upstream spec (e.g. "docx", "md") to the key
// understood by our registry. Returns null for unknown types so they're dropped.
function mapOutputType(t: string): string | null {
  const key = t.toLowerCase().trim()
  const aliases: Record<string, string> = {
    md: 'md',
    markdown: 'md',
    text: 'text',
    txt: 'text',
    json: 'json',
    pdf: 'pdf',
    image: 'image',
    img: 'image',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    word: 'word',
    docx: 'word',
    doc: 'word',
    excel: 'excel',
    xlsx: 'excel',
    xls: 'excel',
    powerpoint: 'powerpoint',
    pptx: 'powerpoint',
    ppt: 'powerpoint',
    podcast: 'podcast',
    audio: 'podcast',
    chart: 'chart',
    diagram: 'diagram',
  }
  if (aliases[key]) return aliases[key]
  if (key.startsWith('image/')) return 'image'
  if (key.startsWith('audio/')) return 'podcast'
  return null
}

// Map a MIME type or short key from uploadConfig.allowedTypes to our FileTypeKey.
function mapFileType(t: string): string | null {
  const key = t.toLowerCase().trim()
  if (!key) return null
  // Short keys passthrough
  const shortAliases: Record<string, string> = {
    pdf: 'pdf',
    word: 'word',
    docx: 'word',
    doc: 'word',
    excel: 'excel',
    xlsx: 'excel',
    xls: 'excel',
    powerpoint: 'powerpoint',
    pptx: 'powerpoint',
    ppt: 'powerpoint',
    image: 'image',
    text: 'text',
    txt: 'text',
    csv: 'csv',
    json: 'json',
    markdown: 'markdown',
    md: 'markdown',
  }
  if (shortAliases[key]) return shortAliases[key]
  // MIME mappings
  if (key === 'application/pdf') return 'pdf'
  if (
    key === 'application/msword' ||
    key === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'word'
  if (
    key === 'application/vnd.ms-excel' ||
    key === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'excel'
  if (
    key === 'application/vnd.ms-powerpoint' ||
    key === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return 'powerpoint'
  if (key.startsWith('image/')) return 'image'
  if (key === 'text/plain') return 'text'
  if (key === 'text/csv') return 'csv'
  if (key === 'application/json') return 'json'
  if (key === 'text/markdown') return 'markdown'
  return null
}

interface AgentSpec {
  name?: unknown
  slug?: unknown
  description?: unknown
  baseUrl?: unknown
  inputSchema?: unknown
  features?: {
    async?: unknown
    sync?: unknown
    webhooks?: unknown
    includeSources?: unknown
  }
  uploadConfig?: {
    enabled?: unknown
    maxFiles?: unknown
    maxSizePerFileMB?: unknown
    allowedTypes?: unknown
    required?: unknown
  }
  outputConfig?: {
    enabledTypes?: unknown
    defaultType?: unknown
  }
  endpoints?: unknown
}

interface ImportPayload {
  id: string
  name: string
  description: string
  endpoint: string
  token: string
  acceptsFile: boolean
  fileUpload: {
    maxFiles: number
    maxSizeMB: number
    required: boolean
    allowedTypes: string[]
  } | null
  outputTypes: string[]
  defaultOutputType: string
  async: boolean
}

// Convert a parsed agent spec + token to the POST /api/ai-agents/registry body.
// Throws Error with a human-readable message on validation failure.
function specToRegistryPayload(spec: AgentSpec, token: string): ImportPayload {
  const slug = typeof spec.slug === 'string' ? spec.slug.trim() : ''
  const name = typeof spec.name === 'string' ? spec.name.trim() : ''
  const description = typeof spec.description === 'string' ? spec.description.trim() : ''
  const baseUrl = typeof spec.baseUrl === 'string' ? spec.baseUrl.trim() : ''

  if (!slug) throw new Error('JSON is missing required field "slug"')
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    throw new Error('"slug" must contain only letters, digits, and hyphens (no spaces)')
  }
  if (!name) throw new Error('JSON is missing required field "name"')
  if (!token.trim()) throw new Error('API key / bearer token is required')

  // Find the invoke endpoint: prefer endpoints[].path ending in /invoke.
  let endpoint = ''
  if (Array.isArray(spec.endpoints)) {
    const invokeEntry = (spec.endpoints as Array<{ path?: unknown; method?: unknown }>).find(
      (e) => typeof e.path === 'string' && /\/invoke\/?$/.test(e.path),
    )
    if (invokeEntry && typeof invokeEntry.path === 'string') endpoint = invokeEntry.path.trim()
  }
  if (!endpoint && baseUrl) endpoint = baseUrl.replace(/\/+$/, '') + '/invoke'
  if (!endpoint) {
    throw new Error('Could not determine invoke endpoint (need endpoints[].path or baseUrl)')
  }
  try {
    const u = new URL(endpoint)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad protocol')
  } catch {
    throw new Error(`Invoke endpoint is not a valid URL: ${endpoint}`)
  }

  // Output types
  const enabledRaw = Array.isArray(spec.outputConfig?.enabledTypes)
    ? (spec.outputConfig!.enabledTypes as unknown[])
    : []
  const mappedOut = enabledRaw
    .map((x) => (typeof x === 'string' ? mapOutputType(x) : null))
    .filter((x): x is string => !!x)
  const outputTypes = Array.from(new Set(mappedOut))
  if (outputTypes.length === 0) {
    throw new Error('outputConfig.enabledTypes is empty or contains no recognised types')
  }
  let defaultOutputType = ''
  const defRaw = spec.outputConfig?.defaultType
  if (typeof defRaw === 'string') {
    const mapped = mapOutputType(defRaw)
    if (mapped && outputTypes.includes(mapped)) defaultOutputType = mapped
  }
  if (!defaultOutputType) defaultOutputType = outputTypes[0]

  // Upload config
  const upload = spec.uploadConfig
  const acceptsFile = !!(upload && upload.enabled === true)
  let fileUpload: ImportPayload['fileUpload'] = null
  if (acceptsFile) {
    const maxFiles = Math.max(1, Math.floor(Number(upload!.maxFiles) || 1))
    const maxSizeMB = Math.max(1, Math.floor(Number(upload!.maxSizePerFileMB) || 10))
    const required = upload!.required === true
    const allowedRaw = Array.isArray(upload!.allowedTypes) ? (upload!.allowedTypes as unknown[]) : []
    const allowedTypes = Array.from(
      new Set(
        allowedRaw
          .map((x) => (typeof x === 'string' ? mapFileType(x) : null))
          .filter((x): x is string => !!x),
      ),
    )
    if (allowedTypes.length === 0) {
      throw new Error(
        'uploadConfig.enabled is true but allowedTypes is empty or contains no recognised MIME types',
      )
    }
    fileUpload = {
      maxFiles: Math.min(maxFiles, 50),
      maxSizeMB: Math.min(maxSizeMB, 500),
      required,
      allowedTypes,
    }
  }

  return {
    id: slug,
    name,
    description,
    endpoint,
    token: token.trim(),
    acceptsFile,
    fileUpload,
    outputTypes,
    defaultOutputType,
    async: spec.features?.async === true,
  }
}

export default function AiAgentsPanel() {
  // Registry state
  const [agents, setAgents] = useState<RegisteredAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showToken, setShowToken] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Import-from-JSON state
  const [showImport, setShowImport] = useState(false)
  const [importUrl, setImportUrl] = useState('https://policybot.abhirup.app/api/agent-bots/spec')
  const [importJson, setImportJson] = useState('')
  const [importToken, setImportToken] = useState('')
  const [importShowToken, setImportShowToken] = useState(false)
  const [importFetching, setImportFetching] = useState(false)
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  // Mappings state
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([])
  const [mappingsLoading, setMappingsLoading] = useState(true)
  const [mappingsLoadError, setMappingsLoadError] = useState<string | null>(null)
  const [mappingsSaving, setMappingsSaving] = useState(false)
  const [mappingsSaveError, setMappingsSaveError] = useState<string | null>(null)
  const [mappingsSaveSuccess, setMappingsSaveSuccess] = useState<string | null>(null)

  // Known service names (for the mapping dropdown)
  const [serviceNames, setServiceNames] = useState<string[]>([])

  const loadAgents = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/ai-agents/registry', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setAgents(data.agents || [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMappings = useCallback(async () => {
    setMappingsLoading(true)
    setMappingsLoadError(null)
    try {
      const res = await fetch('/api/ai-agents/mappings', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const byName: Record<string, string[]> = data.mappings || {}
      const rows: MappingRow[] = Object.entries(byName).map(([serviceName, agentIds]) => ({
        serviceName,
        agentIds: Array.isArray(agentIds) ? agentIds : [],
      }))
      setMappingRows(rows)
    } catch (err) {
      setMappingsLoadError(err instanceof Error ? err.message : 'Failed to load mappings')
    } finally {
      setMappingsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgents()
    loadMappings()
    // Load service names for the mapping dropdown. Admins receive every
    // service across all entities from /api/managedata/services.
    ;(async () => {
      try {
        const res = await fetch('/api/managedata/services', { cache: 'no-store' })
        if (!res.ok) return
        const rows = await res.json()
        if (Array.isArray(rows)) {
          const names = Array.from(
            new Set(
              rows
                .map((r: { service_name?: unknown }) =>
                  typeof r.service_name === 'string' ? r.service_name.trim() : '',
                )
                .filter((s: string) => s.length > 0),
            ),
          ).sort((a, b) => a.localeCompare(b))
          setServiceNames(names)
        }
      } catch {
        // non-fatal — admin can still type names manually via fallback
      }
    })()
  }, [loadAgents, loadMappings])

  const startEdit = (agent: RegisteredAgent) => {
    setEditingId(agent.id)
    setShowForm(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    setShowToken(false)
    setForm({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      endpoint: agent.endpoint,
      token: '',
      acceptsFile: agent.acceptsFile,
      outputTypes: [...agent.outputTypes],
      defaultOutputType: agent.defaultOutputType,
      fileMaxFiles: agent.fileUpload?.maxFiles ?? 1,
      fileMaxSizeMB: agent.fileUpload?.maxSizeMB ?? 10,
      fileRequired: agent.fileUpload?.required ?? false,
      fileAllowedTypes:
        agent.fileUpload?.allowedTypes && agent.fileUpload.allowedTypes.length > 0
          ? [...agent.fileUpload.allowedTypes]
          : ['pdf'],
      async: agent.async === true,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowToken(false)
    setSubmitError(null)
    setSubmitSuccess(null)
  }

  const beginRegister = () => {
    cancelEdit()
    setShowForm(true)
  }

  const toggleOutputType = (type: string) => {
    setForm((prev) => {
      const has = prev.outputTypes.includes(type)
      const next = has ? prev.outputTypes.filter((t) => t !== type) : [...prev.outputTypes, type]
      let defaultOutputType = prev.defaultOutputType
      if (!next.includes(defaultOutputType)) {
        defaultOutputType = next[0] || ''
      }
      return { ...prev, outputTypes: next, defaultOutputType }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (form.outputTypes.length === 0) {
      setSubmitError('Select at least one output type')
      return
    }
    if (!form.outputTypes.includes(form.defaultOutputType)) {
      setSubmitError('Default output type must be one of the selected output types')
      return
    }
    if (form.acceptsFile) {
      if (form.fileAllowedTypes.length === 0) {
        setSubmitError('Select at least one allowed file type')
        return
      }
      if (form.fileMaxFiles < 1 || form.fileMaxFiles > 50) {
        setSubmitError('Max files must be between 1 and 50')
        return
      }
      if (form.fileMaxSizeMB < 1 || form.fileMaxSizeMB > 500) {
        setSubmitError('Max size (MB) must be between 1 and 500')
        return
      }
    }

    const fileUploadPayload = form.acceptsFile
      ? {
          maxFiles: form.fileMaxFiles,
          maxSizeMB: form.fileMaxSizeMB,
          required: form.fileRequired,
          allowedTypes: form.fileAllowedTypes,
        }
      : null

    setSubmitting(true)
    try {
      let res: Response
      if (editingId) {
        const body: Record<string, unknown> = {
          name: form.name.trim(),
          description: form.description.trim(),
          endpoint: form.endpoint.trim(),
          acceptsFile: form.acceptsFile,
          fileUpload: fileUploadPayload,
          outputTypes: form.outputTypes,
          defaultOutputType: form.defaultOutputType,
          async: form.async,
        }
        if (form.token.trim()) body.token = form.token
        res = await fetch(`/api/ai-agents/registry/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/ai-agents/registry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: form.id.trim(),
            name: form.name.trim(),
            description: form.description.trim(),
            endpoint: form.endpoint.trim(),
            token: form.token,
            acceptsFile: form.acceptsFile,
            fileUpload: fileUploadPayload,
            outputTypes: form.outputTypes,
            defaultOutputType: form.defaultOutputType,
            async: form.async,
          }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSubmitSuccess(
        editingId
          ? `Agent "${data.agent?.name || form.name}" updated successfully.`
          : `Agent "${data.agent?.name || form.name}" registered successfully.`,
      )
      cancelEdit()
      setShowForm(false)
      loadAgents()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save agent')
    } finally {
      setSubmitting(false)
    }
  }

  const openImport = () => {
    cancelEdit()
    setShowForm(false)
    setImportJson('')
    setImportToken('')
    setImportError(null)
    setImportSuccess(null)
    setImportShowToken(false)
    setShowImport(true)
  }

  const closeImport = () => {
    setShowImport(false)
    setImportError(null)
    setImportSuccess(null)
  }

  const handleFetchSpec = async () => {
    setImportError(null)
    setImportSuccess(null)
    const url = importUrl.trim()
    const token = importToken.trim()
    if (!url) {
      setImportError('Spec URL is required')
      return
    }
    if (!token) {
      setImportError('Bearer token is required to fetch the spec')
      return
    }
    setImportFetching(true)
    try {
      const res = await fetch('/api/ai-agents/fetch-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.detail ? ` — ${data.detail}` : ''
        throw new Error((data.error || `HTTP ${res.status}`) + detail)
      }
      setImportJson(JSON.stringify(data.spec, null, 2))
      setImportSuccess('Spec fetched. Review below and click "Import agent".')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to fetch spec')
    } finally {
      setImportFetching(false)
    }
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setImportError(null)
    setImportSuccess(null)

    let spec: AgentSpec
    try {
      spec = JSON.parse(importJson) as AgentSpec
    } catch (err) {
      setImportError(
        'Invalid JSON: ' + (err instanceof Error ? err.message : 'could not parse'),
      )
      return
    }

    let payload: ImportPayload
    try {
      payload = specToRegistryPayload(spec, importToken)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid spec')
      return
    }

    setImportSubmitting(true)
    try {
      const res = await fetch('/api/ai-agents/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setImportSuccess(
        `Agent "${data.agent?.name || payload.name}" imported successfully.`,
      )
      setImportJson('')
      setImportToken('')
      loadAgents()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import agent')
    } finally {
      setImportSubmitting(false)
    }
  }

  const handleDelete = async (agent: RegisteredAgent) => {
    if (
      !confirm(
        `Delete agent "${agent.name}"? This removes its entry from the registry and its token from .env.agents.`,
      )
    ) {
      return
    }
    setDeleteError(null)
    setDeletingId(agent.id)
    try {
      const res = await fetch(`/api/ai-agents/registry/${encodeURIComponent(agent.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      loadAgents()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete agent')
    } finally {
      setDeletingId(null)
    }
  }

  const labelFor = (key: string) => FILE_TYPE_OPTIONS.find((o) => o.key === key)?.label || key

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
            <FiCpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Agents</h2>
            <p className="text-sm text-gray-600">
              Register agents, edit their configuration, and control which agents are available on
              each service request.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {agents.length} agent{agents.length === 1 ? '' : 's'}
          </span>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
            {mappingRows.length} mapping{mappingRows.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Registered Agents (table, scrollable) */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Registered Agents</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              All AI agents available across the portal. Use Edit to change configuration or rotate
              tokens.
            </p>
          </div>
          {!showForm && !editingId && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openImport}
                className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
                title="Paste an agent spec JSON and bearer token to auto-register"
              >
                <FiUploadCloud className="h-4 w-4" />
                Import from JSON
              </button>
              <button
                type="button"
                onClick={beginRegister}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <FiPlus className="h-4 w-4" />
                Register agent
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
            <FiLoader className="h-4 w-4 animate-spin" /> Loading agents…
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-2 p-4 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No agents registered yet.{' '}
            <button
              type="button"
              onClick={beginRegister}
              className="font-medium text-blue-600 hover:underline"
            >
              Register your first agent
            </button>
            .
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Agent</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Endpoint</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Output</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">File upload</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {agents.map((agent) => (
                  <tr key={agent.id} className="align-top hover:bg-gray-50">
                    <td className="max-w-[18rem] px-3 py-2">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <code className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
                        {agent.id}
                      </code>
                      {agent.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {agent.description}
                        </p>
                      )}
                    </td>
                    <td className="max-w-[20rem] px-3 py-2 text-xs">
                      <div className="truncate font-mono text-gray-700" title={agent.endpoint}>
                        {agent.endpoint}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        token env:{' '}
                        <code className="rounded bg-gray-100 px-1">{agent.tokenEnv}</code>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {agent.outputTypes.map((t) => (
                          <span
                            key={t}
                            className={`rounded px-1.5 py-0.5 ${
                              t === agent.defaultOutputType
                                ? 'bg-blue-100 font-medium text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                            title={t}
                          >
                            {OUTPUT_TYPE_LABELS[t] || t}
                            {t === agent.defaultOutputType && ' ★'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {agent.acceptsFile && agent.fileUpload ? (
                        <div className="space-y-0.5 text-gray-700">
                          <div>
                            max {agent.fileUpload.maxFiles} · {agent.fileUpload.maxSizeMB} MB
                            {agent.fileUpload.required && (
                              <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">
                                required
                              </span>
                            )}
                          </div>
                          <div
                            className="line-clamp-1 text-[11px] text-gray-500"
                            title={agent.fileUpload.allowedTypes.map(labelFor).join(', ')}
                          >
                            {agent.fileUpload.allowedTypes.map(labelFor).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(agent)}
                          title="Edit"
                          className="rounded-md border border-blue-300 bg-white p-1.5 text-blue-700 hover:bg-blue-50"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(agent)}
                          disabled={deletingId === agent.id}
                          title="Delete"
                          className="rounded-md border border-red-300 bg-white p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === agent.id ? (
                            <FiLoader className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FiTrash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteError && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {deleteError}
          </div>
        )}
      </section>

      {/* Add/Edit Agent form (collapsible) */}
      {(showForm || editingId) && (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {editingId ? `Edit Agent: ${editingId}` : 'Register New Agent'}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {editingId
                  ? 'Update fields below. Leave the token blank to keep the existing one.'
                  : 'All fields except description are required.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                cancelEdit()
                setShowForm(false)
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <FiX className="h-3.5 w-3.5" />
              Close
            </button>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Agent ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g. policybot-testing"
                  pattern="[a-zA-Z0-9][a-zA-Z0-9-]*"
                  required
                  disabled={editingId !== null}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {editingId
                    ? 'Agent ID cannot be changed after registration.'
                    : 'Letters, digits, and hyphens only. Used as the unique key.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Display name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="PolicyBot (testing)"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="What does this agent do?"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Endpoint URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://example.com/api/agent-bots/<id>/invoke"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bearer token{' '}
                {editingId ? (
                  <span className="text-xs font-normal text-gray-500">
                    (optional — leave blank to keep existing)
                  </span>
                ) : (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  placeholder={editingId ? 'Leave blank to keep existing token' : 'ab_pk_…'}
                  required={!editingId}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Stored server-side in <code className="rounded bg-gray-100 px-1">.env.agents</code>.
                Never sent back to clients.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Supported output types
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  {ALL_OUTPUT_TYPES.map((t) => (
                    <label key={t} className="inline-flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={form.outputTypes.includes(t)}
                        onChange={() => toggleOutputType(t)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {OUTPUT_TYPE_LABELS[t] || t}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Tick every output type your agent endpoint can return. The default below is what
                  the portal will request first.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Default output type
                </label>
                <select
                  value={form.defaultOutputType}
                  onChange={(e) => setForm({ ...form, defaultOutputType: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {form.outputTypes.length === 0 ? (
                    <option value="">— select an output type above —</option>
                  ) : (
                    form.outputTypes.map((t) => (
                      <option key={t} value={t}>
                        {OUTPUT_TYPE_LABELS[t] || t}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.acceptsFile}
                  onChange={(e) => setForm({ ...form, acceptsFile: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Enable File Uploads
              </label>

              {/* Async-capable checkbox — controls whether long-running upstream
                  jobs return a jobId after 15s so the UI can offer a "Show response" button. */}
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.async}
                    onChange={(e) => setForm({ ...form, async: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Async-capable (upstream supports background jobs)
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  When enabled, long-running invocations return a job id after 15&nbsp;s and the user
                  can poll for the result via a &ldquo;Show response&rdquo; button.
                </p>
              </div>

              {form.acceptsFile && (
                <div className="mt-3 space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Max Files
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={form.fileMaxFiles}
                        onChange={(e) =>
                          setForm({ ...form, fileMaxFiles: Number(e.target.value) || 1 })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Max Size (MB)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={form.fileMaxSizeMB}
                        onChange={(e) =>
                          setForm({ ...form, fileMaxSizeMB: Number(e.target.value) || 1 })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={form.fileRequired}
                          onChange={(e) =>
                            setForm({ ...form, fileRequired: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Required
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Allowed File Types
                    </label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {FILE_TYPE_OPTIONS.map((opt) => {
                        const checked = form.fileAllowedTypes.includes(opt.key)
                        return (
                          <label key={opt.key} className="inline-flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  fileAllowedTypes: checked
                                    ? prev.fileAllowedTypes.filter((k) => k !== opt.key)
                                    : [...prev.fileAllowedTypes, opt.key],
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {opt.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                <FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  cancelEdit()
                  setShowForm(false)
                }}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <FiX className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? (
                  <FiLoader className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  <FiSave className="h-4 w-4" />
                ) : (
                  <FiPlus className="h-4 w-4" />
                )}
                {editingId ? 'Update Agent' : 'Register Agent'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Service Request -> Agent mappings (table, scrollable) */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <header className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <div className="flex items-start gap-2">
            <FiLink className="mt-0.5 h-4 w-4 text-purple-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Service Mappings</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Restrict which agents appear on service request pages. Choose a service (e.g.{' '}
                <code className="rounded bg-gray-100 px-1">EA Portal Support Request</code>) and
                tick the agents that should be available for every request under that service.
                Services without a mapping show no agents.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadMappings}
              disabled={mappingsLoading}
              title="Reload from server"
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {mappingsLoading ? (
                <FiLoader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FiRefreshCw className="h-3.5 w-3.5" />
              )}
              Reload
            </button>
            <button
              type="button"
              onClick={() => setMappingRows((prev) => [{ serviceName: '', agentIds: [] }, ...prev])}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FiPlus className="h-4 w-4" />
              Add mapping
            </button>
          </div>
        </header>

        {mappingsLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
            <FiLoader className="h-4 w-4 animate-spin" /> Loading mappings…
          </div>
        ) : mappingsLoadError ? (
          <div className="flex items-start gap-2 p-4 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{mappingsLoadError}</span>
          </div>
        ) : mappingRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No mappings configured yet. Click <span className="font-medium">Add mapping</span> to
            allow agents for a service.
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th className="w-72 px-3 py-2 text-left font-semibold text-gray-700">
                    Service Name
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Allowed Agents
                  </th>
                  <th className="w-24 px-3 py-2 text-right font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mappingRows.map((row, idx) => (
                  <tr key={idx} className="align-top hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {serviceNames.length > 0 ? (
                        <select
                          value={
                            row.serviceName && serviceNames.includes(row.serviceName)
                              ? row.serviceName
                              : row.serviceName
                                ? '__custom__'
                                : ''
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            setMappingRows((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      serviceName: v === '__custom__' ? r.serviceName : v,
                                    }
                                  : r,
                              ),
                            )
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">— Select a service —</option>
                          {serviceNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                          {row.serviceName && !serviceNames.includes(row.serviceName) && (
                            <option value="__custom__">{row.serviceName} (custom)</option>
                          )}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={row.serviceName}
                          onChange={(e) => {
                            const v = e.target.value
                            setMappingRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, serviceName: v } : r)),
                            )
                          }}
                          placeholder="e.g. EA Portal Support Request"
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                      <div className="mt-0.5 text-[11px] text-gray-500">
                        {row.agentIds.length} agent{row.agentIds.length === 1 ? '' : 's'} selected
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {agents.length === 0 ? (
                        <span className="text-xs text-gray-500">No agents registered yet.</span>
                      ) : (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {agents.map((a) => {
                            const checked = row.agentIds.includes(a.id)
                            return (
                              <label
                                key={a.id}
                                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
                                  checked
                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setMappingRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx
                                          ? {
                                              ...r,
                                              agentIds: checked
                                                ? r.agentIds.filter((id) => id !== a.id)
                                                : [...r.agentIds, a.id],
                                            }
                                          : r,
                                      ),
                                    )
                                  }
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-medium">{a.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setMappingRows((prev) => prev.filter((_, i) => i !== idx))}
                        title="Remove row"
                        className="rounded-md border border-red-300 bg-white p-1.5 text-red-700 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs text-gray-500">
            Changes are not saved until you click <span className="font-medium">Save mappings</span>.
          </div>
          <button
            type="button"
            disabled={mappingsSaving}
            onClick={async () => {
              setMappingsSaveError(null)
              setMappingsSaveSuccess(null)

              const cleaned: MappingRow[] = []
              const seen = new Set<string>()
              for (const r of mappingRows) {
                const name = r.serviceName.trim()
                if (!name) continue
                const dedupKey = name.toLowerCase()
                if (seen.has(dedupKey)) {
                  setMappingsSaveError(`Duplicate service name "${name}"`)
                  return
                }
                seen.add(dedupKey)
                cleaned.push({ serviceName: name, agentIds: Array.from(new Set(r.agentIds)) })
              }

              const payload: Record<string, string[]> = {}
              for (const r of cleaned) payload[r.serviceName] = r.agentIds

              setMappingsSaving(true)
              try {
                const res = await fetch('/api/ai-agents/mappings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ mappings: payload }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
                setMappingsSaveSuccess('Mappings saved.')
                loadMappings()
              } catch (err) {
                setMappingsSaveError(
                  err instanceof Error ? err.message : 'Failed to save mappings',
                )
              } finally {
                setMappingsSaving(false)
              }
            }}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {mappingsSaving ? (
              <FiLoader className="h-4 w-4 animate-spin" />
            ) : (
              <FiSave className="h-4 w-4" />
            )}
            Save mappings
          </button>
        </footer>

        {mappingsSaveError && (
          <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{mappingsSaveError}</span>
          </div>
        )}
        {mappingsSaveSuccess && (
          <div className="flex items-start gap-2 border-t border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            <FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{mappingsSaveSuccess}</span>
          </div>
        )}
      </section>

      {/* Import-from-JSON modal */}
      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !importSubmitting) closeImport()
          }}
        >
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <form onSubmit={handleImportSubmit}>
              <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                <div className="flex items-center gap-2">
                  <FiUploadCloud className="h-5 w-5 text-purple-600" />
                  <h3 className="text-base font-semibold text-gray-900">
                    Import agent from JSON
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeImport}
                  disabled={importSubmitting}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-60"
                  aria-label="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </header>

              <div className="space-y-4 px-5 py-4">
                <p className="text-xs text-gray-600">
                  Two options: <strong>(1)</strong> Enter the agent&apos;s{' '}
                  <code className="rounded bg-gray-100 px-1">/spec</code> URL plus a bearer token
                  and click <em>Fetch spec</em> — we&apos;ll call it server-side and fill the JSON
                  for you. <strong>(2)</strong> Or paste a spec JSON directly. Either way, click{' '}
                  <em>Import agent</em> when ready.
                </p>

                <div>
                  <label
                    htmlFor="import-token"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Bearer token / API key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="import-token"
                      type={importShowToken ? 'text' : 'password'}
                      value={importToken}
                      onChange={(e) => setImportToken(e.target.value)}
                      placeholder="sk-... or any bearer string"
                      autoComplete="off"
                      disabled={importSubmitting || importFetching}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setImportShowToken((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100"
                      aria-label={importShowToken ? 'Hide token' : 'Show token'}
                    >
                      {importShowToken ? (
                        <FiEyeOff className="h-4 w-4" />
                      ) : (
                        <FiEye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Used both to fetch the spec and to call the agent. Stored server-side in{' '}
                    <code>.env.agents</code>; never returned to the browser.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="import-url"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Spec URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="import-url"
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://example.com/api/agent-bots/spec"
                      disabled={importSubmitting || importFetching}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleFetchSpec}
                      disabled={
                        importFetching ||
                        importSubmitting ||
                        !importUrl.trim() ||
                        !importToken.trim()
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {importFetching ? (
                        <FiLoader className="h-4 w-4 animate-spin" />
                      ) : (
                        <FiRefreshCw className="h-4 w-4" />
                      )}
                      Fetch spec
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="import-json"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Agent spec JSON <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="import-json"
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    rows={14}
                    spellCheck={false}
                    placeholder='{\n  "name": "My agent",\n  "slug": "my-agent",\n  "baseUrl": "https://...",\n  "outputConfig": { "enabledTypes": ["md","pdf"], "defaultType": "md" },\n  "uploadConfig": { "enabled": false }\n}'
                    disabled={importSubmitting || importFetching}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {importError && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
                {importSuccess && (
                  <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    <FiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}
              </div>

              <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
                <button
                  type="button"
                  onClick={closeImport}
                  disabled={importSubmitting}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <FiX className="h-4 w-4" />
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting || !importJson.trim() || !importToken.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
                >
                  {importSubmitting ? (
                    <FiLoader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FiUploadCloud className="h-4 w-4" />
                  )}
                  Import agent
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
