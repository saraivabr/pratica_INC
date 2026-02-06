-- Migration 050: Add Critical Foreign Keys
-- Only for populated tables to avoid unnecessary constraints on empty tables
-- Uses NOT VALID to avoid long locks, then validates in separate transactions
--
-- Pre-migration fix: NULL out orphaned imobiliaria_id references
-- Pre-check: fk_users_workspace already exists, skipping it

BEGIN;

-- Fix orphaned data: user with imobiliaria_id=246 which doesn't exist in imobiliarias
UPDATE users SET imobiliaria_id = NULL
  WHERE imobiliaria_id IS NOT NULL
  AND imobiliaria_id NOT IN (SELECT id FROM imobiliarias);

-- users -> imobiliarias
ALTER TABLE users
  ADD CONSTRAINT fk_users_imobiliaria
  FOREIGN KEY (imobiliaria_id) REFERENCES imobiliarias(id) NOT VALID;

-- NOTE: fk_users_workspace already exists, skipping

-- sessions -> users
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- tracking_events -> users
ALTER TABLE tracking_events
  ADD CONSTRAINT fk_tracking_events_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- whatsapp_messages -> workspaces
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT fk_whatsapp_messages_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) NOT VALID;

-- assistente_conversas -> users
ALTER TABLE assistente_conversas
  ADD CONSTRAINT fk_assistente_conversas_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

-- assistente_mensagens -> assistente_conversas
ALTER TABLE assistente_mensagens
  ADD CONSTRAINT fk_assistente_mensagens_conversa
  FOREIGN KEY (conversa_id) REFERENCES assistente_conversas(id) ON DELETE CASCADE NOT VALID;

-- disparo_leads -> disparos
ALTER TABLE disparo_leads
  ADD CONSTRAINT fk_disparo_leads_disparo
  FOREIGN KEY (disparo_id) REFERENCES disparos(id) ON DELETE CASCADE NOT VALID;

-- workspace_members -> workspaces
ALTER TABLE workspace_members
  ADD CONSTRAINT fk_workspace_members_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE NOT VALID;

-- workspace_members -> users
ALTER TABLE workspace_members
  ADD CONSTRAINT fk_workspace_members_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;

COMMIT;

-- Validate constraints in separate transactions (non-blocking)
ALTER TABLE users VALIDATE CONSTRAINT fk_users_imobiliaria;
ALTER TABLE sessions VALIDATE CONSTRAINT fk_sessions_user;
ALTER TABLE tracking_events VALIDATE CONSTRAINT fk_tracking_events_user;
ALTER TABLE whatsapp_messages VALIDATE CONSTRAINT fk_whatsapp_messages_workspace;
ALTER TABLE assistente_conversas VALIDATE CONSTRAINT fk_assistente_conversas_user;
ALTER TABLE assistente_mensagens VALIDATE CONSTRAINT fk_assistente_mensagens_conversa;
ALTER TABLE disparo_leads VALIDATE CONSTRAINT fk_disparo_leads_disparo;
ALTER TABLE workspace_members VALIDATE CONSTRAINT fk_workspace_members_workspace;
ALTER TABLE workspace_members VALIDATE CONSTRAINT fk_workspace_members_user;
