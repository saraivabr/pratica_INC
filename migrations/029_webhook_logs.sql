-- Migration: Webhook Logs e Retry System
-- Created: 2025-01-29
-- Purpose: Sistema de retry automático para webhooks

-- Tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  webhook_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_workspace ON webhook_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_failed ON webhook_logs(status, retry_count) WHERE status = 'failed';

-- RLS policies
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver logs do próprio workspace
CREATE POLICY "Users can view own workspace webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users
      WHERE user_id = auth.uid()
    )
  );

-- Sistema pode inserir/atualizar logs
CREATE POLICY "Service role can manage webhook logs"
  ON webhook_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function para limpar logs antigos (> 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('success', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_webhook_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_logs_updated_at
  BEFORE UPDATE ON webhook_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_webhook_log_timestamp();

-- View para estatísticas de webhooks
CREATE OR REPLACE VIEW webhook_stats AS
SELECT
  webhook_type,
  workspace_id,
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'retrying') as retrying_count,
  AVG(retry_count) as avg_retries,
  MAX(retry_count) as max_retries
FROM webhook_logs
GROUP BY webhook_type, workspace_id, DATE(created_at);

COMMENT ON TABLE webhook_logs IS 'Logs de execução e retry de webhooks';
COMMENT ON COLUMN webhook_logs.retry_count IS 'Número de tentativas de reenvio';
COMMENT ON COLUMN webhook_logs.last_error IS 'Última mensagem de erro registrada';
