-- ============================================================================
-- FIX: Workspace Orphans - Corrigir Dados sem workspace_id
-- ============================================================================
-- Data: 29 Jan 2025
-- Problema: 19,667 leads e 243 mensagens sem workspace_id após migration 022
-- Impacto: CRÍTICO - Vazamento de isolamento entre usuários
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VALIDAÇÃO PRÉ-CORREÇÃO
-- ============================================================================

DO $$
DECLARE
  orphan_leads INTEGER;
  orphan_messages INTEGER;
  orphan_eventos INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_leads FROM cvcrm_leads WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_messages FROM whatsapp_messages WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_eventos FROM eventos WHERE workspace_id IS NULL;
  
  RAISE NOTICE '=== VALIDAÇÃO PRÉ-CORREÇÃO ===';
  RAISE NOTICE 'Leads órfãos: %', orphan_leads;
  RAISE NOTICE 'Mensagens órfãs: %', orphan_messages;
  RAISE NOTICE 'Eventos órfãos: %', orphan_eventos;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 2. CORRIGIR LEADS ÓRFÃOS
-- ============================================================================

-- Atribuir workspace_id através do corretor_id
UPDATE cvcrm_leads l
SET workspace_id = u.workspace_id
FROM users u
WHERE l.corretor_id = u.id 
  AND l.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- ============================================================================
-- 3. CORRIGIR MENSAGENS ÓRFÃS
-- ============================================================================

-- Atribuir workspace_id através do user_id
UPDATE whatsapp_messages wm
SET workspace_id = u.workspace_id
FROM users u
WHERE wm.user_id = u.id 
  AND wm.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- ============================================================================
-- 4. CORRIGIR EVENTOS ÓRFÃOS
-- ============================================================================

UPDATE eventos e
SET workspace_id = u.workspace_id
FROM users u
WHERE e.criado_por = u.id 
  AND e.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- ============================================================================
-- 5. CORRIGIR LEADS_INTERACOES ÓRFÃS
-- ============================================================================

-- Via lead_id
UPDATE cvcrm_leads_interacoes li
SET workspace_id = l.workspace_id
FROM cvcrm_leads l
WHERE li.lead_id = l.id 
  AND li.workspace_id IS NULL
  AND l.workspace_id IS NOT NULL;

-- ============================================================================
-- 6. CORRIGIR LEADS_TAREFAS ÓRFÃS
-- ============================================================================

UPDATE cvcrm_leads_tarefas lt
SET workspace_id = l.workspace_id
FROM cvcrm_leads l
WHERE lt.lead_id = l.id 
  AND lt.workspace_id IS NULL
  AND l.workspace_id IS NOT NULL;

-- ============================================================================
-- 7. CORRIGIR ATENDIMENTOS ÓRFÃOS
-- ============================================================================

UPDATE cvcrm_atendimentos a
SET workspace_id = u.workspace_id
FROM users u
WHERE a.usuario_id = u.id 
  AND a.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- ============================================================================
-- 8. CORRIGIR WHATSAPP_CONTACTS ÓRFÃOS
-- ============================================================================

UPDATE whatsapp_contacts wc
SET workspace_id = u.workspace_id
FROM users u
WHERE wc.user_id = u.id 
  AND wc.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- ============================================================================
-- 9. CORRIGIR WHATSAPP_CAMPAIGNS ÓRFÃOS
-- ============================================================================

UPDATE whatsapp_campaigns wcamp
SET workspace_id = u.workspace_id
FROM users u
WHERE wcamp.created_by = u.id 
  AND wcamp.workspace_id IS NULL
  AND u.workspace_id IS NOT NULL;

-- ============================================================================
-- 10. VALIDAÇÃO PÓS-CORREÇÃO
-- ============================================================================

DO $$
DECLARE
  orphan_leads INTEGER;
  orphan_messages INTEGER;
  orphan_eventos INTEGER;
  orphan_interacoes INTEGER;
  orphan_tarefas INTEGER;
  orphan_atendimentos INTEGER;
  orphan_contacts INTEGER;
  orphan_campaigns INTEGER;
  total_orphans INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_leads FROM cvcrm_leads WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_messages FROM whatsapp_messages WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_eventos FROM eventos WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_interacoes FROM cvcrm_leads_interacoes WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_tarefas FROM cvcrm_leads_tarefas WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_atendimentos FROM cvcrm_atendimentos WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_contacts FROM whatsapp_contacts WHERE workspace_id IS NULL;
  SELECT COUNT(*) INTO orphan_campaigns FROM whatsapp_campaigns WHERE workspace_id IS NULL;
  
  total_orphans := orphan_leads + orphan_messages + orphan_eventos + orphan_interacoes 
                   + orphan_tarefas + orphan_atendimentos + orphan_contacts + orphan_campaigns;
  
  RAISE NOTICE '=== VALIDAÇÃO PÓS-CORREÇÃO ===';
  RAISE NOTICE 'Leads órfãos: %', orphan_leads;
  RAISE NOTICE 'Mensagens órfãs: %', orphan_messages;
  RAISE NOTICE 'Eventos órfãos: %', orphan_eventos;
  RAISE NOTICE 'Interações órfãs: %', orphan_interacoes;
  RAISE NOTICE 'Tarefas órfãs: %', orphan_tarefas;
  RAISE NOTICE 'Atendimentos órfãos: %', orphan_atendimentos;
  RAISE NOTICE 'Contatos órfãos: %', orphan_contacts;
  RAISE NOTICE 'Campanhas órfãs: %', orphan_campaigns;
  RAISE NOTICE '---';
  RAISE NOTICE 'TOTAL DE ÓRFÃOS RESTANTES: %', total_orphans;
  RAISE NOTICE '';
  
  IF total_orphans = 0 THEN
    RAISE NOTICE '✅ CORREÇÃO COMPLETA! Todos os dados têm workspace_id.';
  ELSIF total_orphans < 100 THEN
    RAISE WARNING '⚠️  Ainda existem % órfãos. Investigar casos edge.', total_orphans;
  ELSE
    RAISE WARNING '❌ CORREÇÃO PARCIAL! Ainda existem % órfãos. Revisar lógica.', total_orphans;
  END IF;
END $$;

-- ============================================================================
-- 11. COMMIT (descomente após validar resultado)
-- ============================================================================

-- COMMIT;
ROLLBACK; -- REMOVER após validar resultado com ROLLBACK primeiro!

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================

/*

1. PRIMEIRA EXECUÇÃO (teste):
   psql -h localhost -U pratica -d pratica -f FIX_WORKSPACE_ORPHANS.sql

   → Script vai rodar mas fazer ROLLBACK no final
   → Valide os números em "VALIDAÇÃO PÓS-CORREÇÃO"

2. EXECUTAR DE VERDADE:
   - Editar linha final: trocar ROLLBACK por COMMIT
   - Rodar novamente:
     psql -h localhost -U pratica -d pratica -f FIX_WORKSPACE_ORPHANS.sql

3. VALIDAR RESULTADO:
   SELECT 
     (SELECT COUNT(*) FROM cvcrm_leads WHERE workspace_id IS NULL) as leads,
     (SELECT COUNT(*) FROM whatsapp_messages WHERE workspace_id IS NULL) as msgs,
     (SELECT COUNT(*) FROM eventos WHERE workspace_id IS NULL) as eventos;
   
   → Deve retornar 0 em todas as colunas

*/
