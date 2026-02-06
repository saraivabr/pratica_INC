-- Migration 052: Remove duplicate indexes
-- idx_agent_configs_tenant_instance duplicates UNIQUE constraint agent_configs_tenant_id_instance_name_key
-- idx_recepcao_locais_qr_token duplicates UNIQUE constraint recepcao_locais_qr_code_token_key

BEGIN;

DROP INDEX IF EXISTS idx_agent_configs_tenant_instance;
DROP INDEX IF EXISTS idx_recepcao_locais_qr_token;

COMMIT;
