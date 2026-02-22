#!/bin/bash
# ============================================================================
# GEA Portal - Documents Module Tables Migration
# ============================================================================
# Creates doc_folders and documents tables for document management
# Run: ./database/scripts/32-create-documents-tables.sh
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
echo "  Documents Module Tables Migration"
echo "=============================================="
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'
-- ============================================================================
-- DOCUMENTS MODULE TABLES
-- ============================================================================
-- Table 1: doc_folders - Hierarchical folder structure (max 3 levels)
-- Table 2: documents - Document metadata and file references

-- ============================================================================
-- TABLE 1: DOC_FOLDERS
-- ============================================================================
-- Supports 3-level hierarchy via self-referencing parent_id

CREATE TABLE IF NOT EXISTS doc_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES doc_folders(id) ON DELETE CASCADE,
    folder_path VARCHAR(1000) NOT NULL,   -- full path e.g. "GOG Policy/Digital Strategy/2025"
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(folder_path)
);

-- Indexes for doc_folders
CREATE INDEX IF NOT EXISTS idx_doc_folders_parent ON doc_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_folders_path ON doc_folders(folder_path);
CREATE INDEX IF NOT EXISTS idx_doc_folders_level ON doc_folders(level);
CREATE INDEX IF NOT EXISTS idx_doc_folders_active ON doc_folders(is_active);

-- ============================================================================
-- TABLE 2: DOCUMENTS
-- ============================================================================
-- Stores document metadata; actual files stored on filesystem

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_name VARCHAR(500) NOT NULL,         -- original filename
    stored_file_name VARCHAR(500) NOT NULL,  -- timestamp-hash-filename on disk
    file_path VARCHAR(1000) NOT NULL,        -- full path on disk relative to upload root
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,         -- MIME type
    file_extension VARCHAR(20) NOT NULL,     -- pdf, docx, etc.
    folder_id INTEGER REFERENCES doc_folders(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    visibility VARCHAR(20) DEFAULT 'all_staff' CHECK (visibility IN ('all_staff', 'admin_only')),
    is_active BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_is_active ON documents(is_active);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_extension ON documents(file_extension);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doc_folders_updated ON doc_folders;
CREATE TRIGGER trg_doc_folders_updated
    BEFORE UPDATE ON doc_folders FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

DROP TRIGGER IF EXISTS trg_documents_updated ON documents;
CREATE TRIGGER trg_documents_updated
    BEFORE UPDATE ON documents FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    'Documents Module Migration Complete' AS status,
    (SELECT COUNT(*) FROM doc_folders) AS folder_count,
    (SELECT COUNT(*) FROM documents) AS document_count;

EOF

echo ""
echo "Documents module tables migration complete!"
echo ""
echo "Verify with:"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d doc_folders'"
echo "  docker exec -it feedback_db psql -U feedback_user -d feedback -c '\\d documents'"
echo ""
