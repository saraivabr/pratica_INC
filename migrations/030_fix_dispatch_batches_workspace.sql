-- Migration 030: Fix dispatch_batches workspace_id
-- A tabela dispatch_batches usa tenant_id, mas a nova arquitetura usa workspace_id
-- Esta migração adiciona workspace_id e cria índices para compatibilidade

-- ============================================
-- 1. ADICIONAR COLUNA workspace_id
-- ============================================

ALTER TABLE dispatch_batches
ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================
-- 2. CRIAR ÍNDICE PARA workspace_id
-- ============================================

CREATE INDEX IF NOT EXISTS idx_dispatch_batches_workspace
ON dispatch_batches (workspace_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_batches_workspace_evento
ON dispatch_batches (workspace_id, evento_id);

-- ============================================
-- 3. ADICIONAR workspace_id EM evento_convidados (se não existir)
-- ============================================

ALTER TABLE evento_convidados
ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_evento_convidados_workspace
ON evento_convidados (workspace_id);

-- ============================================
-- 4. ADICIONAR workspace_id EM eventos (se não existir)
-- ============================================

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_eventos_workspace
ON eventos (workspace_id);

-- ============================================
-- 5. ADICIONAR workspace_id EM whatsapp_messages (se não existir)
-- ============================================

ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace
ON whatsapp_messages (workspace_id);

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON COLUMN dispatch_batches.workspace_id IS 'ID do workspace (nova arquitetura). Preferir sobre tenant_id.';
COMMENT ON COLUMN eventos.workspace_id IS 'ID do workspace (nova arquitetura). Preferir sobre tenant_id.';
COMMENT ON COLUMN evento_convidados.workspace_id IS 'ID do workspace (nova arquitetura). Preferir sobre tenant_id.';
