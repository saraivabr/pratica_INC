-- Migration 011: Add unique index for whatsapp_messages
-- Data: 2026-01-27
-- Melhora performance da sincronização de mensagens históricas

-- Índice único para evitar duplicatas e melhorar performance de lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_message_id
    ON whatsapp_messages(tenant_id, message_id);

COMMENT ON INDEX idx_whatsapp_messages_tenant_message_id IS 'Índice único para evitar duplicação de mensagens durante sync';
