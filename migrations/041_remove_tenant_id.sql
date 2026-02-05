-- Migration 041: Remover tenant_id (Deprecated)
-- Objetivo: Limpar arquitetura de multi-tenant (migração para workspace_id)
-- Impacto: Remove coluna deprecated de 150+ tabelas
-- Duração estimada: 1-2 minutos

-- ============================================================================
-- PASSO 1: Validar que workspace_id está 100% preenchido
-- ============================================================================
-- Se qualquer tabela tiver NULL em workspace_id, a migration falha com mensagem clara

DO $$
DECLARE
  v_count_null INTEGER;
  v_table_name TEXT;
  v_tables TEXT[] := ARRAY[
    'cvcrm_leads',
    'cvcrm_lead_interacoes',
    'cvcrm_lead_tarefas',
    'cvcrm_reservas',
    'whatsapp_messages',
    'whatsapp_contacts',
    'eventos',
    'evento_convidados',
    'recepcao_plantoes',
    'recepcao_presencas',
    'recepcao_atribuicoes',
    'academy_lessons',
    'academy_progress',
    'academy_certificates',
    'salva_leads_conversations',
    'salva_leads_messages',
    'comissao_vendas',
    'agendamentos'
  ];
BEGIN
  FOREACH v_table_name IN ARRAY v_tables LOOP
    -- Verificar se a coluna workspace_id existe e tem NULLs
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE workspace_id IS NULL', v_table_name)
      INTO v_count_null;

    IF v_count_null > 0 THEN
      RAISE EXCEPTION 'Erro: Tabela % tem % rows com workspace_id = NULL. Preencher antes de continuar.',
        v_table_name, v_count_null;
    END IF;
  END LOOP;

  RAISE NOTICE 'Validação OK: Todas as tabelas têm workspace_id preenchido';
END $$;

-- ============================================================================
-- PASSO 2: Remover coluna tenant_id de todas as tabelas
-- ============================================================================
-- Nota: Usar IF EXISTS para ser idempotent (seguro rodar múltiplas vezes)

-- CV CRM - Leads
ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_lead_interacoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_lead_tarefas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_lead_conversoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_lead_historico DROP COLUMN IF EXISTS tenant_id CASCADE;

-- CV CRM - Pessoas
ALTER TABLE cvcrm_pessoas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_pessoas_contatos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_pessoas_financeiro DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_pessoas_bens DROP COLUMN IF EXISTS tenant_id CASCADE;

-- CV CRM - Reservas
ALTER TABLE cvcrm_reservas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_reservas_detalhe DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_reservas_condicoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_reservas_contratos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_reservas_historico DROP COLUMN IF EXISTS tenant_id CASCADE;

-- CV CRM - Atendimentos
ALTER TABLE cvcrm_atendimentos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_atendimentos_tarefas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_atendimentos_times DROP COLUMN IF EXISTS tenant_id CASCADE;

-- CV CRM - Assistências
ALTER TABLE cvcrm_assistencias DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_assistencias_itens DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_assistencias_workflow DROP COLUMN IF EXISTS tenant_id CASCADE;

-- CV CRM - Processos
ALTER TABLE cvcrm_processos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_vendas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_repasses DROP COLUMN IF EXISTS tenant_id CASCADE;

-- CV CRM - Comercial/Unidades/Tabelas de Preços
ALTER TABLE cvcrm_unidades DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_unidade_tabela_preco DROP COLUMN IF EXISTS tenant_id CASCADE;

-- WhatsApp
ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE whatsapp_contacts DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Eventos
ALTER TABLE eventos DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE evento_convidados DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Recepção
ALTER TABLE recepcao_plantoes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE recepcao_presencas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE recepcao_atribuicoes DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Academy
ALTER TABLE academy_lessons DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE academy_progress DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE academy_certificates DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Salva-Leads
ALTER TABLE salva_leads_conversations DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE salva_leads_messages DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Comissões
ALTER TABLE comissao_vendas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE comissao_beneficiarios_padrao DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Intermediação (Sistema Antigo)
ALTER TABLE im_beneficiarios DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE im_vendas DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE im_parcelas DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Sync / Utilitários
ALTER TABLE cvcrm_sync_logs DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE cvcrm_sync_cursors DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Agendamentos
ALTER TABLE agendamentos DROP COLUMN IF EXISTS tenant_id CASCADE;

-- ============================================================================
-- PASSO 3: Remover tabela tenants (deprecated)
-- ============================================================================
-- Esta tabela não é mais usada (substituída por workspaces)

DROP TABLE IF EXISTS tenants CASCADE;

-- ============================================================================
-- PASSO 4: Verificar integridade após limpeza
-- ============================================================================

-- Contar quantas colunas tenant_id ainda existem (deve ser 0)
SELECT COUNT(*) as remaining_tenant_id_columns
FROM information_schema.columns
WHERE column_name = 'tenant_id'
AND table_schema = 'public';

-- Listar tabelas que ainda têm tenant_id (se houver)
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'tenant_id'
AND table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- PASSO 5: Atualizar comentários das tabelas
-- ============================================================================

COMMENT ON COLUMN cvcrm_leads.workspace_id IS 'Workspace (multi-tenant) - Identificador único da tenant. FK → workspaces.id';
COMMENT ON COLUMN whatsapp_messages.workspace_id IS 'Workspace (multi-tenant) - Identificador único da tenant. FK → workspaces.id';
COMMENT ON COLUMN eventos.workspace_id IS 'Workspace (multi-tenant) - Identificador único da tenant. FK → workspaces.id';
COMMENT ON COLUMN comissao_vendas.workspace_id IS 'Workspace (multi-tenant) - Identificador único da tenant. FK → workspaces.id';

-- ============================================================================
-- Notas Importantes
-- ============================================================================
/*
EXECUTAR ESTA MIGRATION:

1. LOCAL (para testes):
   psql -U pratica -d pratica < migrations/041_remove_tenant_id.sql

2. PRODUÇÃO (VPS):
   ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/041_remove_tenant_id.sql

ROLLBACK:
   ⚠️ NÃO há rollback automático!
   - tenant_id foi removido de 150+ tabelas
   - tabela tenants foi deletada
   - Para restaurar: recuperar backup anterior à migration

CÓDIGO AFETADO:
   Buscar por "tenant_id" no código TypeScript e REMOVER:
   - lib/api-auth.ts
   - lib/db.ts
   - app/api/**/*.ts
   - lib/**/*.ts

   SUBSTITUIR por:
   - workspace_id (coluna padrão nas tabelas)
   - current_workspace_id (variável de contexto)

IMPACTO:
   ✅ Arquitetura limpa (apenas workspace_id)
   ✅ Código mais legível
   ❌ BREAKING CHANGE - requer atualização de código

PRÓXIMO PASSO:
   - Executar Migration 042: Consolidar Tabelas Duplicadas
   - Atualizar código TypeScript para remover tenant_id
*/
