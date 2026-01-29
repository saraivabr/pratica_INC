-- Migration 016: Deduplicação de Mensagens WhatsApp
-- Adiciona constraint UNIQUE para evitar mensagens duplicadas
-- e adiciona coluna retry_count para Salva-Leads

-- ============================================
-- DEDUPLICAÇÃO DE MENSAGENS WHATSAPP
-- ============================================

-- Criar constraint única (usando o índice existente se possível)
-- tenant_id + message_id devem ser únicos
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_tenant_message_id'
    ) THEN
        -- Remover duplicatas existentes mantendo apenas a mais recente
        DELETE FROM whatsapp_messages a
        USING whatsapp_messages b
        WHERE a.id < b.id
          AND a.tenant_id = b.tenant_id
          AND a.message_id = b.message_id
          AND a.message_id IS NOT NULL;

        -- Criar a constraint
        ALTER TABLE whatsapp_messages
        ADD CONSTRAINT unique_tenant_message_id
        UNIQUE (tenant_id, message_id);

        RAISE NOTICE 'Constraint unique_tenant_message_id criada com sucesso';
    ELSE
        RAISE NOTICE 'Constraint unique_tenant_message_id já existe';
    END IF;
END $$;

-- ============================================
-- RETRY COUNT PARA SALVA-LEADS
-- ============================================

-- Adicionar coluna retry_count para tracking de falhas no processamento
ALTER TABLE salva_leads_conversations
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN salva_leads_conversations.retry_count IS 'Contador de tentativas de processamento falhas. Reset a 0 após sucesso.';

-- Índice para encontrar conversas com muitos retries (para monitoramento)
CREATE INDEX IF NOT EXISTS idx_salva_leads_retry_count
ON salva_leads_conversations (tenant_id, retry_count)
WHERE retry_count > 0;
