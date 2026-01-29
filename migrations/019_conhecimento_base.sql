-- Migration 019: Base de Conhecimento (RAG)
-- Data: 2026-01-27
-- Tabela para armazenar conhecimento da empresa para o agente de IA

-- Habilitar extensao pgvector para busca semantica
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CONHECIMENTO BASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conhecimento_base (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Conteudo
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    categoria VARCHAR(100), -- 'empresa', 'empreendimento', 'politicas', 'faq', 'procedimentos'

    -- Metadados
    tags TEXT[], -- Array de tags para busca
    empreendimento_id INTEGER, -- Se for especifico de um empreendimento

    -- Embedding para busca semantica (pgvector)
    embedding VECTOR(1536), -- OpenAI ada-002 dimension

    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER -- user id que criou
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conhecimento_tenant ON conhecimento_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conhecimento_categoria ON conhecimento_base(categoria);
CREATE INDEX IF NOT EXISTS idx_conhecimento_ativo ON conhecimento_base(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_conhecimento_tags ON conhecimento_base USING GIN(tags);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_conhecimento_fts ON conhecimento_base
    USING GIN(to_tsvector('portuguese', titulo || ' ' || conteudo));

-- Vector similarity search index (cosine distance)
CREATE INDEX IF NOT EXISTS idx_conhecimento_embedding ON conhecimento_base
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigger para updated_at
CREATE TRIGGER update_conhecimento_base_updated_at
    BEFORE UPDATE ON conhecimento_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DADOS INICIAIS (opcional - exemplos)
-- ============================================================================

-- Inserir conhecimento padrao para todos os tenants existentes
INSERT INTO conhecimento_base (tenant_id, titulo, conteudo, categoria)
SELECT
    id as tenant_id,
    'Sobre a Empresa' as titulo,
    'Somos uma empresa do setor imobiliario comprometida em ajudar nossos clientes a encontrar o imovel ideal. Para mais informacoes, entre em contato com nosso time.' as conteudo,
    'empresa' as categoria
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM conhecimento_base kb
    WHERE kb.tenant_id = tenants.id AND kb.categoria = 'empresa'
);

INSERT INTO conhecimento_base (tenant_id, titulo, conteudo, categoria)
SELECT
    id as tenant_id,
    'Formas de Pagamento' as titulo,
    'Trabalhamos com diversas formas de pagamento: financiamento bancario (Caixa, Bradesco, Itau, Santander), consorcio, FGTS, e pagamento a vista com condicoes especiais. Consulte nosso corretor para mais detalhes.' as conteudo,
    'politicas' as categoria
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM conhecimento_base kb
    WHERE kb.tenant_id = tenants.id AND kb.titulo = 'Formas de Pagamento'
);

INSERT INTO conhecimento_base (tenant_id, titulo, conteudo, categoria)
SELECT
    id as tenant_id,
    'Documentos Necessarios' as titulo,
    'Para dar entrada no financiamento, geralmente sao necessarios: RG, CPF, comprovante de renda (3 ultimos holerites ou declaracao de IR), comprovante de residencia, certidao de casamento (se aplicavel). O corretor pode orientar sobre documentos especificos.' as conteudo,
    'procedimentos' as categoria
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM conhecimento_base kb
    WHERE kb.tenant_id = tenants.id AND kb.titulo = 'Documentos Necessarios'
);

INSERT INTO conhecimento_base (tenant_id, titulo, conteudo, categoria)
SELECT
    id as tenant_id,
    'Agendamento de Visitas' as titulo,
    'Visitas podem ser agendadas de segunda a sabado, das 9h as 18h. Domingos e feriados, mediante agendamento previo. O corretor entrara em contato para confirmar o melhor horario.' as conteudo,
    'procedimentos' as categoria
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM conhecimento_base kb
    WHERE kb.tenant_id = tenants.id AND kb.titulo = 'Agendamento de Visitas'
);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE conhecimento_base IS 'Base de conhecimento da empresa para RAG do agente de IA';
COMMENT ON COLUMN conhecimento_base.categoria IS 'Categorias: empresa, empreendimento, politicas, faq, procedimentos';
COMMENT ON COLUMN conhecimento_base.embedding IS 'Vetor de embedding para busca semantica (OpenAI ada-002)';
COMMENT ON COLUMN conhecimento_base.tags IS 'Array de tags para filtro e busca';
