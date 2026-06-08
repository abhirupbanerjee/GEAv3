#!/bin/bash
# ============================================================================
# GEA Portal - AI Agent Outputs Table Migration
# ============================================================================
# Creates ai_agent_outputs table for persisting downloadable AI agent files.
# Run: ./database/scripts/40-create-ai-agent-outputs-table.sh
# ============================================================================

set -e

# Load environment
source "$(dirname "$0")/../lib/common.sh" 2>/dev/null || {
    # Fallback if common.sh not available
    DB_USER="${DB_USER:-feedback_user}"
    DB_NAME="${DB_NAME:-feedback}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
}

echo "=============================================="
echo "  AI Agent Outputs Table Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- AI AGENT OUTPUTS TABLE
-- ============================================================================
-- Persists downloadable files produced by AI agents (pdf, docx, xlsx, pptx,
-- image, audio, etc.) for the (logged-in user, service request) pair.
-- Files are written to disk; metadata lives in this table.

CREATE TABLE IF NOT EXISTS ai_agent_outputs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    sr_number VARCHAR(50) NOT NULL,
    agent_id VARCHAR(100) NOT NULL,
    agent_name VARCHAR(255),
    output_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    stored_path TEXT NOT NULL,
    file_size BIGINT,
    query_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_agent_outputs_user_sr ON ai_agent_outputs(user_id, sr_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_outputs_sr ON ai_agent_outputs(sr_number, created_at DESC);

-- Verify migration
SELECT
    'AI Agent Outputs Table Migration Complete' AS status,
    COUNT(*) AS total_rows
FROM ai_agent_outputs;

EOF

echo ""
echo "✅ AI Agent Outputs table migration complete!"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d ai_agent_outputs'"
