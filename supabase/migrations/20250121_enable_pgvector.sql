-- ============================================================================
-- Migration: Enable pgvector and create Sofia RAG tables
-- Description: Sets up vector storage for Sofia AI assistant RAG system
-- ============================================================================

-- ============================================================================
-- 1. Enable pgvector extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================================
-- 2. Create sofia_embeddings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sofia_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Original content
    content TEXT NOT NULL,

    -- OpenAI text-embedding-3-small produces 1536 dimensions
    embedding vector(1536) NOT NULL,

    -- Metadata for filtering and context
    metadata JSONB DEFAULT '{}',

    -- Source classification
    source_type TEXT NOT NULL CHECK (source_type IN (
        'faq',           -- Perguntas frequentes
        'knowledge',     -- Base de conhecimento geral
        'empreendimento',-- Informações de empreendimentos
        'policy',        -- Políticas e regras
        'conversation'   -- Conversas relevantes
    )),

    -- Reference to original document
    source_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment to table
COMMENT ON TABLE sofia_embeddings IS 'Vector embeddings for Sofia AI RAG system';
COMMENT ON COLUMN sofia_embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN sofia_embeddings.source_type IS 'Type of source document: faq, knowledge, empreendimento, policy, conversation';

-- ============================================================================
-- 3. Create HNSW index for efficient similarity search
-- ============================================================================
-- HNSW (Hierarchical Navigable Small World) provides fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) which works well with OpenAI embeddings
CREATE INDEX IF NOT EXISTS sofia_embeddings_embedding_idx
ON sofia_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Additional indexes for filtering
CREATE INDEX IF NOT EXISTS sofia_embeddings_source_type_idx
ON sofia_embeddings (source_type);

CREATE INDEX IF NOT EXISTS sofia_embeddings_source_id_idx
ON sofia_embeddings (source_id);

CREATE INDEX IF NOT EXISTS sofia_embeddings_metadata_idx
ON sofia_embeddings
USING gin (metadata);

CREATE INDEX IF NOT EXISTS sofia_embeddings_created_at_idx
ON sofia_embeddings (created_at DESC);

-- ============================================================================
-- 4. Create similarity search function
-- ============================================================================
CREATE OR REPLACE FUNCTION match_sofia_documents(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_source_type TEXT DEFAULT NULL,
    filter_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    source_type TEXT,
    source_id TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.id,
        se.content,
        se.metadata,
        se.source_type,
        se.source_id,
        1 - (se.embedding <=> query_embedding) AS similarity,
        se.created_at
    FROM sofia_embeddings se
    WHERE
        -- Similarity threshold (cosine distance converted to similarity)
        1 - (se.embedding <=> query_embedding) >= match_threshold
        -- Optional source type filter
        AND (filter_source_type IS NULL OR se.source_type = filter_source_type)
        -- Optional metadata filter (contains check)
        AND (filter_metadata IS NULL OR se.metadata @> filter_metadata)
    ORDER BY se.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION match_sofia_documents IS 'Search for similar documents using cosine similarity with optional filters';

-- ============================================================================
-- 5. Create sofia_rag_config table for RAG configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS sofia_rag_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Configuration key (unique identifier)
    config_key TEXT UNIQUE NOT NULL,

    -- Configuration value (flexible JSON structure)
    config_value JSONB NOT NULL DEFAULT '{}',

    -- Human-readable description
    description TEXT,

    -- Is this configuration active?
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comment to table
COMMENT ON TABLE sofia_rag_config IS 'Configuration settings for Sofia RAG system';

-- Insert default configurations
INSERT INTO sofia_rag_config (config_key, config_value, description, is_active)
VALUES
    (
        'embedding_model',
        '{"model": "text-embedding-3-small", "dimensions": 1536, "provider": "openai"}',
        'Model configuration for generating embeddings',
        TRUE
    ),
    (
        'search_defaults',
        '{"match_threshold": 0.7, "match_count": 5, "include_metadata": true}',
        'Default parameters for similarity search',
        TRUE
    ),
    (
        'chunking_config',
        '{"chunk_size": 1000, "chunk_overlap": 200, "separator": "\n\n"}',
        'Text chunking configuration for document processing',
        TRUE
    ),
    (
        'source_priorities',
        '{"faq": 1.0, "knowledge": 0.9, "empreendimento": 0.95, "policy": 0.85, "conversation": 0.7}',
        'Priority weights for different source types in search results',
        TRUE
    )
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 6. Create trigger for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sofia_embeddings
DROP TRIGGER IF EXISTS update_sofia_embeddings_updated_at ON sofia_embeddings;
CREATE TRIGGER update_sofia_embeddings_updated_at
    BEFORE UPDATE ON sofia_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sofia_rag_config
DROP TRIGGER IF EXISTS update_sofia_rag_config_updated_at ON sofia_rag_config;
CREATE TRIGGER update_sofia_rag_config_updated_at
    BEFORE UPDATE ON sofia_rag_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Row Level Security (RLS) policies
-- ============================================================================
-- Enable RLS on tables
ALTER TABLE sofia_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sofia_rag_config ENABLE ROW LEVEL SECURITY;

-- Policy for sofia_embeddings: Allow authenticated users to read
CREATE POLICY "Allow authenticated read access on sofia_embeddings"
ON sofia_embeddings
FOR SELECT
TO authenticated
USING (true);

-- Policy for sofia_embeddings: Allow service role full access
CREATE POLICY "Allow service role full access on sofia_embeddings"
ON sofia_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for sofia_rag_config: Allow authenticated users to read active configs
CREATE POLICY "Allow authenticated read access on sofia_rag_config"
ON sofia_rag_config
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy for sofia_rag_config: Allow service role full access
CREATE POLICY "Allow service role full access on sofia_rag_config"
ON sofia_rag_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 8. Grant permissions
-- ============================================================================
-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- Grant permissions on tables
GRANT SELECT ON sofia_embeddings TO authenticated;
GRANT ALL ON sofia_embeddings TO service_role;

GRANT SELECT ON sofia_rag_config TO authenticated;
GRANT ALL ON sofia_rag_config TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION match_sofia_documents TO authenticated;
GRANT EXECUTE ON FUNCTION match_sofia_documents TO service_role;
