-- Migration 018: Adicionar opção com_sofia nos eventos
-- Data: 2026-01-27
-- Permite escolher se a Sofia responde automaticamente ou não

-- ============================================================================
-- ADICIONAR COLUNA com_sofia
-- ============================================================================

-- Adicionar opção de Sofia ativa por evento
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS com_sofia BOOLEAN DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN eventos.com_sofia IS 'Se true, Sofia responde automaticamente às mensagens dos convidados. Se false, apenas dispara convites sem resposta automática.';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Verificar que a coluna foi criada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'eventos' AND column_name = 'com_sofia') THEN
        RAISE NOTICE 'Coluna com_sofia criada com sucesso na tabela eventos';
    ELSE
        RAISE EXCEPTION 'Falha ao criar coluna com_sofia';
    END IF;
END $$;
