#!/bin/bash
# ============================================================================
# GEA Portal - AI Service Agent Tables Migration
# ============================================================================
# Creates database tables for the AI service agent registry, replacing the
# file-based storage (ai-agents.json, .env.agents, ai-agent-mappings.json)
# with PostgreSQL tables.
#
# Tables created:
#   ai_service_agents         - agent definitions
#   ai_service_agent_tokens   - encrypted bearer tokens (one per agent)
#   ai_service_agent_mappings - service-name -> agent mappings
#
# Run: ./database/scripts/42-create-ai-service-agents-tables.sh
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
echo "  AI Service Agent Tables Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- AI SERVICE AGENTS TABLE
-- ============================================================================
-- Stores AI service agent definitions (replaces ai-agents.json).

CREATE TABLE IF NOT EXISTS ai_service_agents (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    endpoint TEXT NOT NULL,
    accepts_file BOOLEAN NOT NULL DEFAULT FALSE,
    file_upload JSONB,
    output_types TEXT[] NOT NULL DEFAULT '{}',
    default_output_type VARCHAR(50) NOT NULL,
    async BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_service_agents_active ON ai_service_agents(is_active);

-- ============================================================================
-- AI SERVICE AGENT TOKENS TABLE
-- ============================================================================
-- Stores encrypted bearer tokens (replaces .env.agents file).
-- Tokens are encrypted with AES-256-GCM via the application layer.

CREATE TABLE IF NOT EXISTS ai_service_agent_tokens (
    agent_id VARCHAR(100) PRIMARY KEY REFERENCES ai_service_agents(id) ON DELETE CASCADE,
    encrypted_token TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AI SERVICE AGENT MAPPINGS TABLE
-- ============================================================================
-- Maps service names to allowed agent ids (replaces ai-agent-mappings.json).

CREATE TABLE IF NOT EXISTS ai_service_agent_mappings (
    service_name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(100) NOT NULL REFERENCES ai_service_agents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (service_name, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_service_agent_mappings_service ON ai_service_agent_mappings(service_name);
CREATE INDEX IF NOT EXISTS idx_ai_service_agent_mappings_agent ON ai_service_agent_mappings(agent_id);

-- Verify migration
SELECT
    'AI Service Agent Tables Migration Complete' AS status,
    (SELECT COUNT(*) FROM ai_service_agents) AS agent_count,
    (SELECT COUNT(*) FROM ai_service_agent_tokens) AS token_count,
    (SELECT COUNT(*) FROM ai_service_agent_mappings) AS mapping_count;

EOF

echo ""
echo "✅ AI Service Agent tables migration complete!"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d ai_service_agents'"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d ai_service_agent_tokens'"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d ai_service_agent_mappings'"
