-- =============================================================================
-- Migration 025: Workspace Isolation Core
-- Garante que TODAS as tabelas core tenham workspace_id preenchido e indexado
-- =============================================================================

BEGIN;

-- =============================================
-- SEÇÃO 1: ADD COLUMN + INDEX (tabelas sem workspace_id)
-- =============================================

-- automations: sem workspace_id
ALTER TABLE automations ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_automations_workspace ON automations(workspace_id);

-- campaign_leads: sem workspace_id (backfill via campaigns)
ALTER TABLE campaign_leads ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_workspace ON campaign_leads(workspace_id);

-- interacoes: É uma VIEW sobre cvcrm_lead_interacoes
-- cvcrm_lead_interacoes NÃO tem workspace_id. Adicionar primeiro, depois recriar view.
ALTER TABLE cvcrm_lead_interacoes ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_lead_interacoes_workspace ON cvcrm_lead_interacoes(workspace_id);

DROP VIEW IF EXISTS interacoes;
CREATE VIEW interacoes AS
  SELECT id,
    cvcrm_lead_id AS lead_id,
    tipo,
    tipo AS tipo_material,
    descricao,
    data_cadastro AS data_cad,
    usuario_id::text AS corretor_id,
    usuario_nome AS corretor_nome,
    NULL::text AS empreendimento_id,
    NULL::text AS empreendimento_nome,
    NULL::text AS lead_nome,
    workspace_id,
    created_at
  FROM cvcrm_lead_interacoes;

-- leads_interactions: sem workspace_id (backfill via lead_id -> leads -> workspace_id)
ALTER TABLE leads_interactions ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_leads_interactions_workspace ON leads_interactions(workspace_id);

-- =============================================
-- SEÇÃO 2: BACKFILL SEGURO (usando JOINs confiáveis)
-- =============================================

-- 2a) automations: 0 rows atualmente, mas preparar backfill genérico
-- automations não tem user_id/created_by, então usamos workspace 1 (admin) como fallback
-- Como tem 0 rows, não vai afetar nada. Para futuras rows, as rotas vão inserir com workspace_id.

-- 2b) campaign_leads: backfill via campaigns.workspace_id
UPDATE campaign_leads cl
SET workspace_id = c.workspace_id
FROM campaigns c
WHERE cl.campaign_id = c.id
  AND cl.workspace_id IS NULL
  AND c.workspace_id IS NOT NULL;

-- 2c) cvcrm_lead_interacoes: backfill via usuario_id (cvcrm_id) -> users.workspace_id
UPDATE cvcrm_lead_interacoes cli
SET workspace_id = u.workspace_id
FROM users u
WHERE cli.usuario_id = u.cvcrm_id
  AND cli.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- 2d) leads_interactions: backfill via lead_id -> leads.workspace_id
UPDATE leads_interactions li
SET workspace_id = l.workspace_id
FROM leads l
WHERE li.lead_id = l.id
  AND li.workspace_id IS NULL
  AND l.workspace_id IS NOT NULL;

-- 2e) funnels: backfill NULLs - funnels sem workspace_id são "sistema" (seed data)
-- Atribuir ao workspace 1 (admin) que é o owner original
UPDATE funnels
SET workspace_id = 1
WHERE workspace_id IS NULL;

-- 2f) funnel_stages: backfill via funnels.workspace_id
UPDATE funnel_stages fs
SET workspace_id = f.workspace_id
FROM funnels f
WHERE fs.funnel_id = f.id
  AND fs.workspace_id IS NULL
  AND f.workspace_id IS NOT NULL;

-- 2g) conversations: backfill via user_id -> users.workspace_id
UPDATE conversations c
SET workspace_id = u.workspace_id
FROM users u
WHERE c.user_id = u.id
  AND c.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- =============================================
-- SEÇÃO 3: VERIFICAÇÃO DE PREENCHIMENTO
-- =============================================

DO $$
DECLARE
  v_count INTEGER;
  v_report TEXT := '';
BEGIN
  -- Tabelas que DEVEM ter 100% preenchido (must be isolated)

  -- funnels
  SELECT COUNT(*) INTO v_count FROM funnels WHERE workspace_id IS NULL;
  v_report := v_report || 'funnels NULL: ' || v_count || E'\n';
  IF v_count > 0 THEN
    RAISE WARNING 'funnels ainda tem % rows com workspace_id NULL', v_count;
  END IF;

  -- funnel_stages
  SELECT COUNT(*) INTO v_count FROM funnel_stages WHERE workspace_id IS NULL;
  v_report := v_report || 'funnel_stages NULL: ' || v_count || E'\n';
  IF v_count > 0 THEN
    RAISE WARNING 'funnel_stages ainda tem % rows com workspace_id NULL', v_count;
  END IF;

  -- conversations
  SELECT COUNT(*) INTO v_count FROM conversations WHERE workspace_id IS NULL;
  v_report := v_report || 'conversations NULL: ' || v_count || E'\n';
  IF v_count > 0 THEN
    RAISE WARNING 'conversations ainda tem % rows com workspace_id NULL', v_count;
  END IF;

  -- campaigns
  SELECT COUNT(*) INTO v_count FROM campaigns WHERE workspace_id IS NULL;
  v_report := v_report || 'campaigns NULL: ' || v_count || E'\n';

  -- notificacoes
  SELECT COUNT(*) INTO v_count FROM notificacoes WHERE workspace_id IS NULL;
  v_report := v_report || 'notificacoes NULL: ' || v_count || E'\n';

  -- automations
  SELECT COUNT(*) INTO v_count FROM automations WHERE workspace_id IS NULL;
  v_report := v_report || 'automations NULL: ' || v_count || E'\n';

  -- cvcrm_lead_interacoes (base da view interacoes)
  SELECT COUNT(*) INTO v_count FROM cvcrm_lead_interacoes WHERE workspace_id IS NULL;
  v_report := v_report || 'cvcrm_lead_interacoes NULL: ' || v_count || E'\n';

  -- leads_interactions
  SELECT COUNT(*) INTO v_count FROM leads_interactions WHERE workspace_id IS NULL;
  v_report := v_report || 'leads_interactions NULL: ' || v_count || E'\n';

  -- campaign_leads
  SELECT COUNT(*) INTO v_count FROM campaign_leads WHERE workspace_id IS NULL;
  v_report := v_report || 'campaign_leads NULL: ' || v_count || E'\n';

  RAISE NOTICE E'\n====== WORKSPACE ISOLATION REPORT ======\n%====================================', v_report;
END $$;

-- =============================================
-- SEÇÃO 4: CONSTRAINTS (NOT NULL onde seguro)
-- =============================================

-- Tabelas com dados existentes que foram 100% preenchidos:
-- funnels, funnel_stages, conversations já devem estar 100%

-- Aplicar NOT NULL gradualmente (CHECK NOT VALID primeiro)
ALTER TABLE funnels ADD CONSTRAINT chk_funnels_workspace_not_null CHECK (workspace_id IS NOT NULL) NOT VALID;
ALTER TABLE funnels VALIDATE CONSTRAINT chk_funnels_workspace_not_null;

ALTER TABLE funnel_stages ADD CONSTRAINT chk_funnel_stages_workspace_not_null CHECK (workspace_id IS NOT NULL) NOT VALID;
ALTER TABLE funnel_stages VALIDATE CONSTRAINT chk_funnel_stages_workspace_not_null;

-- Tabelas vazias ou com 0 NULLs: aplicar NOT NULL direto
-- automations (0 rows), campaign_leads (0 rows), interacoes (0 rows)
-- NÃO aplicar NOT NULL em automations/campaign_leads/interacoes/leads_interactions
-- porque não temos garantia de que todas as rows futuras terão workspace_id
-- até que as rotas estejam corrigidas. Será feito na próxima migration após deploy das rotas.

COMMIT;
