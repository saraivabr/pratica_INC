-- Migration 064: Drop redundant JSONB columns from cvcrm_leads
-- Phase 2 of database standardization: normalize JSONB columns
--
-- Columns dropped:
--   situacao      - normalized to situacao_id (INTEGER) + situacao_nome (VARCHAR)
--   midias        - ALL NULL (0 rows with data)
--   motivo_cancelamento    - ALL NULL (0 rows with data)
--   submotivo_cancelamento - ALL NULL (0 rows with data)
--
-- Columns KEPT:
--   corretor, imobiliaria, empreendimento - NULL but still referenced in SELECT queries
--   empreendimentos - empty arrays but referenced in disparador ILIKE queries
--   tags - NULL but referenced in SELECT queries
--   gestor - NULL but part of SELECT * queries
--   campos_adicionais - 379 rows with PLANTA slug data (used by sync)
--   cvcrm_data - 19,667 rows, raw API response backup
--
-- Rollback:
--   ALTER TABLE cvcrm_leads ADD COLUMN situacao JSONB;
--   ALTER TABLE cvcrm_leads ADD COLUMN midias JSONB;
--   ALTER TABLE cvcrm_leads ADD COLUMN motivo_cancelamento JSONB;
--   ALTER TABLE cvcrm_leads ADD COLUMN submotivo_cancelamento JSONB;
--   -- Then re-sync to repopulate data

BEGIN;

-- 1. Verify situacao_nome has data before dropping situacao JSONB
DO $$
DECLARE
  total_leads INTEGER;
  leads_with_situacao_nome INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_leads FROM cvcrm_leads;
  SELECT COUNT(*) INTO leads_with_situacao_nome FROM cvcrm_leads WHERE situacao_nome IS NOT NULL;

  RAISE NOTICE 'Total leads: %, Leads with situacao_nome: %', total_leads, leads_with_situacao_nome;

  -- Safety check: if less than 90% of leads with situacao have situacao_nome, abort
  IF total_leads > 0 AND leads_with_situacao_nome < (total_leads * 0.5) THEN
    RAISE EXCEPTION 'Safety check failed: only % of % leads have situacao_nome populated',
      leads_with_situacao_nome, total_leads;
  END IF;
END $$;

-- 2. Drop the columns
ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS situacao;
ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS midias;
ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS motivo_cancelamento;
ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS submotivo_cancelamento;

COMMIT;

-- Verify
SELECT
  column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cvcrm_leads'
  AND column_name IN ('situacao', 'midias', 'motivo_cancelamento', 'submotivo_cancelamento', 'situacao_nome', 'situacao_id')
ORDER BY column_name;
