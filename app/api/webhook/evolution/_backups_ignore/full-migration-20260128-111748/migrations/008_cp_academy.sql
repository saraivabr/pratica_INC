-- Migration 008: CP Academy
-- Data: 2026-01-19
-- Tabelas para o módulo CP Academy (Centro de Treinamento para Corretores)

-- ============================================================================
-- CATEGORIAS
-- ============================================================================

-- Categorias de conteúdo (Plataforma, Empreendimentos, Técnicas de Vendas)
CREATE TABLE IF NOT EXISTS academy_categories (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    slug VARCHAR(100) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50), -- Nome do ícone Lucide (ex: 'monitor', 'building2', 'target')
    cor VARCHAR(7), -- Cor hex (ex: '#3B82F6')
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_categories_tenant ON academy_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_categories_ativo ON academy_categories(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_academy_categories_ordem ON academy_categories(ordem);

-- Trigger
CREATE TRIGGER update_academy_categories_updated_at BEFORE UPDATE ON academy_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MÓDULOS
-- ============================================================================

-- Módulos dentro de cada categoria
CREATE TABLE IF NOT EXISTS academy_modules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    categoria_id INT NOT NULL REFERENCES academy_categories(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    imagem_url TEXT,
    duracao_minutos INT DEFAULT 0,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(categoria_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_modules_tenant ON academy_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_modules_categoria ON academy_modules(categoria_id);
CREATE INDEX IF NOT EXISTS idx_academy_modules_ativo ON academy_modules(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_academy_modules_ordem ON academy_modules(categoria_id, ordem);

-- Trigger
CREATE TRIGGER update_academy_modules_updated_at BEFORE UPDATE ON academy_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LIÇÕES
-- ============================================================================

-- Lições dentro de cada módulo
CREATE TABLE IF NOT EXISTS academy_lessons (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    modulo_id INT NOT NULL REFERENCES academy_modules(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL, -- Conteúdo em Markdown
    resumo TEXT,
    duracao_minutos INT DEFAULT 5,
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(modulo_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_lessons_tenant ON academy_lessons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_modulo ON academy_lessons(modulo_id);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_ativo ON academy_lessons(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_academy_lessons_ordem ON academy_lessons(modulo_id, ordem);

-- Trigger
CREATE TRIGGER update_academy_lessons_updated_at BEFORE UPDATE ON academy_lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROGRESSO DO USUÁRIO
-- ============================================================================

-- Registro de lições completadas por usuário
CREATE TABLE IF NOT EXISTS academy_progress (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, lesson_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_progress_tenant ON academy_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_user ON academy_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_lesson ON academy_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_user_lesson ON academy_progress(user_id, lesson_id);

-- ============================================================================
-- CERTIFICADOS
-- ============================================================================

-- Certificados emitidos ao completar módulos
CREATE TABLE IF NOT EXISTS academy_certificates (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    modulo_id INT NOT NULL REFERENCES academy_modules(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    emitido_em TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, modulo_id),
    UNIQUE(codigo)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_academy_certificates_tenant ON academy_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_user ON academy_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_modulo ON academy_certificates(modulo_id);
CREATE INDEX IF NOT EXISTS idx_academy_certificates_codigo ON academy_certificates(codigo);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE academy_categories IS 'Categorias de conteudo do CP Academy (Plataforma, Empreendimentos, Tecnicas de Vendas)';
COMMENT ON TABLE academy_modules IS 'Modulos de aprendizado dentro de cada categoria';
COMMENT ON TABLE academy_lessons IS 'Licoes individuais dentro de cada modulo, conteudo em Markdown';
COMMENT ON TABLE academy_progress IS 'Registro de licoes completadas por cada usuario';
COMMENT ON TABLE academy_certificates IS 'Certificados emitidos ao completar modulos';

COMMENT ON COLUMN academy_categories.icone IS 'Nome do icone Lucide React (monitor, building2, target, etc)';
COMMENT ON COLUMN academy_categories.cor IS 'Cor hex para o card da categoria (#3B82F6)';
COMMENT ON COLUMN academy_lessons.conteudo IS 'Conteudo da licao em formato Markdown';
COMMENT ON COLUMN academy_certificates.codigo IS 'Codigo unico do certificado para verificacao';
