-- Migration 072: Add Webropay tracking columns to comissao_vendas
-- Adds columns for Webropay integration status and structured address fields

BEGIN;

-- Webropay tracking columns
ALTER TABLE comissao_vendas ADD COLUMN webropay_id VARCHAR(100);
ALTER TABLE comissao_vendas ADD COLUMN webropay_status VARCHAR(30)
  CHECK (webropay_status IN ('pendente','enviada','liberada','distratada','bloqueada'));
ALTER TABLE comissao_vendas ADD COLUMN webropay_enviada_at TIMESTAMP;
ALTER TABLE comissao_vendas ADD COLUMN webropay_response JSONB;

-- Structured address fields for pagador (required by Webropay API)
-- cliente_endereco (TEXT) already exists but is unstructured
ALTER TABLE comissao_vendas ADD COLUMN cliente_logradouro VARCHAR(255);
ALTER TABLE comissao_vendas ADD COLUMN cliente_numero VARCHAR(20);
ALTER TABLE comissao_vendas ADD COLUMN cliente_complemento VARCHAR(100);
ALTER TABLE comissao_vendas ADD COLUMN cliente_bairro VARCHAR(100);
ALTER TABLE comissao_vendas ADD COLUMN cliente_cidade VARCHAR(100);
ALTER TABLE comissao_vendas ADD COLUMN cliente_uf VARCHAR(2);
ALTER TABLE comissao_vendas ADD COLUMN cliente_cep VARCHAR(10);

-- Index for Webropay status queries
CREATE INDEX idx_comissao_vendas_webropay ON comissao_vendas(webropay_status)
  WHERE webropay_status IS NOT NULL;

COMMIT;
