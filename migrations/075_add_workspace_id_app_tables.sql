-- Migration 074: Add workspace_id to app tables missing it
-- Date: 2026-02-06
--
-- 19 tables that lack workspace_id. Grouped by derivation strategy:
--
-- A. Tables with user_id (uuid) FK to users → derive from users.workspace_id
--    - tracking_events (990 rows)
--    - assistente_conversas (54 rows)
--    - user_memory (0 rows)
--    - user_features (0 rows, junction table)
--
-- B. Tables with FK to a parent that already has workspace_id → derive from parent
--    - assistente_mensagens (160 rows) → via assistente_conversas (after A populates it)
--    - disparo_leads (87 rows) → via disparos.workspace_id
--    - comissao_corretores (0 rows) → via comissao_vendas.workspace_id
--    - comissao_grupos (0 rows) → via comissao_vendas.workspace_id
--    - comissao_parcelas (0 rows) → via comissao_vendas.workspace_id
--    - comissao_matriz (0 rows) → via comissao_vendas.workspace_id
--    - proposta_documentos (0 rows) → via propostas.workspace_id
--    - proposta_parcelas (0 rows) → via propostas.workspace_id
--    - salva_leads_tool_calls (0 rows) → via salva_leads_conversations.workspace_id
--    - recepcao_plantoes_criados_auto (0 rows) → via recepcao_plantoes.workspace_id
--
-- C. Tables with no FK chain to derive → default to 1 (only workspace with data)
--    - inbound_messages (31 rows, raw inbound, no user FK)
--    - onboarding_leads (2 rows, pre-registration, no workspace context yet)
--    - sync_cursors (3 rows, system sync state)
--    - sync_logs (80 rows, system sync logs)
--
-- D. Tables with integer user_id (not uuid) → no FK to users, default to 1
--    - property_comparisons (0 rows, user_id is integer, not uuid FK)

BEGIN;

-- ============================================================
-- A. Tables with user_id (uuid) → derive from users
-- ============================================================

-- A1. tracking_events (990 rows, all have user_id)
ALTER TABLE tracking_events
  ADD COLUMN workspace_id INTEGER;

UPDATE tracking_events te
SET workspace_id = u.workspace_id
FROM users u
WHERE te.user_id = u.id;

ALTER TABLE tracking_events
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT tracking_events_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_tracking_events_workspace_id
  ON tracking_events(workspace_id);

-- A2. assistente_conversas (54 rows, all have user_id NOT NULL)
ALTER TABLE assistente_conversas
  ADD COLUMN workspace_id INTEGER;

UPDATE assistente_conversas ac
SET workspace_id = u.workspace_id
FROM users u
WHERE ac.user_id = u.id;

ALTER TABLE assistente_conversas
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT assistente_conversas_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_assistente_conversas_workspace_id
  ON assistente_conversas(workspace_id);

-- A3. user_memory (0 rows)
ALTER TABLE user_memory
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE user_memory
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT user_memory_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_user_memory_workspace_id
  ON user_memory(workspace_id);

-- A4. user_features (0 rows, composite PK: user_id + feature_id)
ALTER TABLE user_features
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE user_features
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT user_features_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_user_features_workspace_id
  ON user_features(workspace_id);

-- ============================================================
-- B. Tables with FK to parent that has workspace_id
-- ============================================================

-- B1. assistente_mensagens (160 rows) → via assistente_conversas
ALTER TABLE assistente_mensagens
  ADD COLUMN workspace_id INTEGER;

UPDATE assistente_mensagens am
SET workspace_id = ac.workspace_id
FROM assistente_conversas ac
WHERE am.conversa_id = ac.id;

ALTER TABLE assistente_mensagens
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT assistente_mensagens_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_assistente_mensagens_workspace_id
  ON assistente_mensagens(workspace_id);

-- B2. disparo_leads (87 rows) → via disparos
ALTER TABLE disparo_leads
  ADD COLUMN workspace_id INTEGER;

UPDATE disparo_leads dl
SET workspace_id = d.workspace_id
FROM disparos d
WHERE dl.disparo_id = d.id;

ALTER TABLE disparo_leads
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT disparo_leads_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_disparo_leads_workspace_id
  ON disparo_leads(workspace_id);

-- B3. comissao_corretores (0 rows) → via comissao_vendas
ALTER TABLE comissao_corretores
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE comissao_corretores
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT comissao_corretores_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_comissao_corretores_workspace_id
  ON comissao_corretores(workspace_id);

-- B4. comissao_grupos (0 rows) → via comissao_vendas
ALTER TABLE comissao_grupos
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE comissao_grupos
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT comissao_grupos_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_comissao_grupos_workspace_id
  ON comissao_grupos(workspace_id);

-- B5. comissao_parcelas (0 rows) → via comissao_vendas
ALTER TABLE comissao_parcelas
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE comissao_parcelas
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT comissao_parcelas_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_comissao_parcelas_workspace_id
  ON comissao_parcelas(workspace_id);

-- B6. comissao_matriz (0 rows) → via comissao_vendas
ALTER TABLE comissao_matriz
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE comissao_matriz
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT comissao_matriz_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_comissao_matriz_workspace_id
  ON comissao_matriz(workspace_id);

-- B7. proposta_documentos (0 rows) → via propostas
ALTER TABLE proposta_documentos
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE proposta_documentos
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT proposta_documentos_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_proposta_documentos_workspace_id
  ON proposta_documentos(workspace_id);

-- B8. proposta_parcelas (0 rows) → via propostas
ALTER TABLE proposta_parcelas
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE proposta_parcelas
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT proposta_parcelas_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_proposta_parcelas_workspace_id
  ON proposta_parcelas(workspace_id);

-- B9. salva_leads_tool_calls (0 rows) → via salva_leads_conversations
ALTER TABLE salva_leads_tool_calls
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE salva_leads_tool_calls
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT salva_leads_tool_calls_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_salva_leads_tool_calls_workspace_id
  ON salva_leads_tool_calls(workspace_id);

-- B10. recepcao_plantoes_criados_auto (0 rows) → via recepcao_plantoes
ALTER TABLE recepcao_plantoes_criados_auto
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE recepcao_plantoes_criados_auto
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT recepcao_plantoes_criados_auto_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_recepcao_plantoes_criados_auto_workspace_id
  ON recepcao_plantoes_criados_auto(workspace_id);

-- ============================================================
-- C. Tables with no FK chain → default to workspace 1
-- ============================================================

-- C1. inbound_messages (31 rows, raw inbound messages, no user FK)
ALTER TABLE inbound_messages
  ADD COLUMN workspace_id INTEGER;

UPDATE inbound_messages SET workspace_id = 1;

ALTER TABLE inbound_messages
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT inbound_messages_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_inbound_messages_workspace_id
  ON inbound_messages(workspace_id);

-- C2. onboarding_leads (2 rows, pre-registration data)
ALTER TABLE onboarding_leads
  ADD COLUMN workspace_id INTEGER;

UPDATE onboarding_leads SET workspace_id = 1;

ALTER TABLE onboarding_leads
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT onboarding_leads_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_onboarding_leads_workspace_id
  ON onboarding_leads(workspace_id);

-- C3. sync_cursors (3 rows, system sync state)
ALTER TABLE sync_cursors
  ADD COLUMN workspace_id INTEGER;

UPDATE sync_cursors SET workspace_id = 1;

ALTER TABLE sync_cursors
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT sync_cursors_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_sync_cursors_workspace_id
  ON sync_cursors(workspace_id);

-- C4. sync_logs (80 rows, system sync logs)
ALTER TABLE sync_logs
  ADD COLUMN workspace_id INTEGER;

UPDATE sync_logs SET workspace_id = 1;

ALTER TABLE sync_logs
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT sync_logs_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_sync_logs_workspace_id
  ON sync_logs(workspace_id);

-- ============================================================
-- D. Tables with non-uuid user_id → default to 1
-- ============================================================

-- D1. property_comparisons (0 rows, user_id is integer not uuid)
ALTER TABLE property_comparisons
  ADD COLUMN workspace_id INTEGER;

-- No data to update

ALTER TABLE property_comparisons
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT property_comparisons_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

CREATE INDEX idx_property_comparisons_workspace_id
  ON property_comparisons(workspace_id);

COMMIT;
