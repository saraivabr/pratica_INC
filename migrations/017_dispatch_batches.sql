-- Migration 017: Sistema de Batches para Disparo de Eventos
-- Permite processar grandes quantidades de convidados sem timeout

-- ============================================
-- TABELA DE BATCHES DE DISPARO
-- ============================================

CREATE TABLE IF NOT EXISTS dispatch_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    instance_name VARCHAR(255) NOT NULL,

    -- Contadores
    total_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,

    -- Status: pending, processing, completed, failed, cancelled
    status VARCHAR(20) DEFAULT 'pending',

    -- Log de erros detalhado
    error_log JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dispatch_batches_tenant_evento
ON dispatch_batches (tenant_id, evento_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_batches_status
ON dispatch_batches (status)
WHERE status IN ('pending', 'processing');

-- ============================================
-- CAMPO EM EVENTO_CONVIDADOS PARA TRACKING
-- ============================================

-- Vincular convidado ao batch que processou seu envio
ALTER TABLE evento_convidados
ADD COLUMN IF NOT EXISTS dispatch_batch_id UUID REFERENCES dispatch_batches(id);

-- Índice para buscar convidados de um batch
CREATE INDEX IF NOT EXISTS idx_evento_convidados_batch
ON evento_convidados (dispatch_batch_id)
WHERE dispatch_batch_id IS NOT NULL;

-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_dispatch_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dispatch_batches_updated_at ON dispatch_batches;

CREATE TRIGGER trigger_dispatch_batches_updated_at
    BEFORE UPDATE ON dispatch_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_dispatch_batches_updated_at();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE dispatch_batches IS 'Batches de disparo de convites de eventos. Permite processar grandes volumes em background.';
COMMENT ON COLUMN dispatch_batches.status IS 'Status: pending (aguardando), processing (em execução), completed (finalizado), failed (falhou), cancelled (cancelado)';
COMMENT ON COLUMN dispatch_batches.error_log IS 'Array JSON com detalhes de erros: [{convidado_id, error, timestamp}]';
