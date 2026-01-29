-- Migration 004: Multi-Tenant Support (Row-Based)
-- Data: 2026-01-17
-- Adds tenant_id to all CV CRM tables for multi-tenancy

-- ============================================================================
-- TENANTS TABLE (Core)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,

    -- Identificação
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly: "empresa-abc"
    name VARCHAR(255) NOT NULL, -- Nome da empresa

    -- Configurações CV CRM
    cvcrm_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- {base_url, email, tokens}

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    plan VARCHAR(50) DEFAULT 'free', -- free, basic, pro, enterprise

    -- Limites
    max_leads INTEGER DEFAULT 1000,
    max_users INTEGER DEFAULT 5,
    max_whatsapp_instances INTEGER DEFAULT 1,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,

    -- Evolution API (para depois)
    evolution_instances JSONB DEFAULT '[]'::jsonb, -- [{instance_name, qr_code, status}]

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    suspended_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- Indexes para tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- Trigger para updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE tenants IS 'Empresas/clientes do sistema (multi-tenant)';
COMMENT ON COLUMN tenants.slug IS 'Identificador único URL-friendly (ex: empresa-abc)';
COMMENT ON COLUMN tenants.cvcrm_config IS 'Configurações da API CV CRM: {base_url, email, tokens}';

-- ============================================================================
-- ADD TENANT_ID TO ALL CV CRM TABLES
-- ============================================================================

-- Leads Core
ALTER TABLE cvcrm_leads ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_leads ADD CONSTRAINT fk_leads_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON cvcrm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_idlead ON cvcrm_leads(tenant_id, idlead);

-- Leads Interações
ALTER TABLE cvcrm_leads_interacoes ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_leads_interacoes ADD CONSTRAINT fk_interacoes_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_interacoes_tenant ON cvcrm_leads_interacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_tenant_lead ON cvcrm_leads_interacoes(tenant_id, idlead);

-- Leads Tarefas
ALTER TABLE cvcrm_leads_tarefas ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_leads_tarefas ADD CONSTRAINT fk_tarefas_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tarefas_tenant ON cvcrm_leads_tarefas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_tenant_lead ON cvcrm_leads_tarefas(tenant_id, idlead);

-- Atendimentos
ALTER TABLE cvcrm_atendimentos ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_atendimentos ADD CONSTRAINT fk_atendimentos_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_atendimentos_tenant ON cvcrm_atendimentos(tenant_id);

-- Atendimentos Arquivos
ALTER TABLE cvcrm_atendimentos_arquivos ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_atendimentos_arquivos ADD CONSTRAINT fk_arquivos_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_arquivos_tenant ON cvcrm_atendimentos_arquivos(tenant_id);

-- Assistências
ALTER TABLE cvcrm_assistencias ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_assistencias ADD CONSTRAINT fk_assistencias_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_assistencias_tenant ON cvcrm_assistencias(tenant_id);

-- Sync Logs (também precisa de tenant_id para rastrear syncs por cliente)
ALTER TABLE cvcrm_sync_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_sync_logs ADD CONSTRAINT fk_sync_logs_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON cvcrm_sync_logs(tenant_id);

-- Sync Cursors (também precisa de tenant_id)
ALTER TABLE cvcrm_sync_cursors ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
ALTER TABLE cvcrm_sync_cursors ADD CONSTRAINT fk_sync_cursors_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sync_cursors_tenant ON cvcrm_sync_cursors(tenant_id);

-- ============================================================================
-- UPDATE UNIQUE CONSTRAINTS (tenant-scoped)
-- ============================================================================

-- Leads: idlead deve ser único POR TENANT
ALTER TABLE cvcrm_leads DROP CONSTRAINT IF EXISTS cvcrm_leads_idlead_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_tenant_idlead_unique
    ON cvcrm_leads(tenant_id, idlead);

-- Interações: idinteracao deve ser único POR TENANT
ALTER TABLE cvcrm_leads_interacoes DROP CONSTRAINT IF EXISTS cvcrm_leads_interacoes_idinteracao_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_interacoes_tenant_id_unique
    ON cvcrm_leads_interacoes(tenant_id, idinteracao);

-- Tarefas: idtarefa deve ser único POR TENANT
ALTER TABLE cvcrm_leads_tarefas DROP CONSTRAINT IF EXISTS cvcrm_leads_tarefas_idtarefa_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarefas_tenant_id_unique
    ON cvcrm_leads_tarefas(tenant_id, idtarefa);

-- Atendimentos: idatendimento deve ser único POR TENANT
ALTER TABLE cvcrm_atendimentos DROP CONSTRAINT IF EXISTS cvcrm_atendimentos_idatendimento_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_atendimentos_tenant_id_unique
    ON cvcrm_atendimentos(tenant_id, idatendimento);

-- Assistências: idassistencia deve ser único POR TENANT
ALTER TABLE cvcrm_assistencias DROP CONSTRAINT IF EXISTS cvcrm_assistencias_idassistencia_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_assistencias_tenant_id_unique
    ON cvcrm_assistencias(tenant_id, idassistencia);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Opcional mas recomendado
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE cvcrm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_leads_interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_leads_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_atendimentos_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_assistencias ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: usuários só veem dados do próprio tenant
-- Nota: Você precisa configurar SET LOCAL app.current_tenant_id = X antes de queries

CREATE POLICY tenant_isolation_leads ON cvcrm_leads
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

CREATE POLICY tenant_isolation_interacoes ON cvcrm_leads_interacoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

CREATE POLICY tenant_isolation_tarefas ON cvcrm_leads_tarefas
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

CREATE POLICY tenant_isolation_atendimentos ON cvcrm_atendimentos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

CREATE POLICY tenant_isolation_arquivos ON cvcrm_atendimentos_arquivos
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

CREATE POLICY tenant_isolation_assistencias ON cvcrm_assistencias
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function para obter tenant atual
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function para configurar tenant
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA - Criar tenant de exemplo
-- ============================================================================

INSERT INTO tenants (slug, name, cvcrm_config, status, plan)
VALUES (
    'pratica-demo',
    'Prática Construtora (Demo)',
    '{
        "base_url": "https://pratica.cvcrm.com.br",
        "email": "seu-email@exemplo.com",
        "tokens": {
            "lead": "seu-token-aqui"
        }
    }'::jsonb,
    'active',
    'enterprise'
)
ON CONFLICT (slug) DO NOTHING;

-- Comentários
COMMENT ON COLUMN cvcrm_leads.tenant_id IS 'ID do tenant/empresa dona deste lead';
COMMENT ON COLUMN cvcrm_leads_interacoes.tenant_id IS 'ID do tenant/empresa dona desta interação';
COMMENT ON COLUMN cvcrm_leads_tarefas.tenant_id IS 'ID do tenant/empresa dona desta tarefa';
COMMENT ON COLUMN cvcrm_atendimentos.tenant_id IS 'ID do tenant/empresa dona deste atendimento';
COMMENT ON COLUMN cvcrm_assistencias.tenant_id IS 'ID do tenant/empresa dona desta assistência';
