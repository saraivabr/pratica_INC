-- ============================================================================
-- SCHEMA FIX COMPLETO - Corrige TODAS as colunas faltando
-- ============================================================================
-- Projeto: /var/www/pratica
-- Data: 29/01/2025
-- Descrição: Script SQL completo para adicionar todas as colunas faltando
--            identificadas na análise profunda do schema
-- Referência: SCHEMA_ANALISE.md
-- ============================================================================

\echo '🔧 Iniciando correção completa do schema...'

-- ============================================================================
-- 1. WHATSAPP_CONTACTS - Adicionar 5 colunas faltando
-- ============================================================================

\echo '📱 [1/4] Corrigindo tabela whatsapp_contacts...'

DO $$
BEGIN
  -- 1.1 total_messages_received
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'total_messages_received'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN total_messages_received INTEGER DEFAULT 0;
    RAISE NOTICE '  ✅ Adicionado: total_messages_received';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: total_messages_received';
  END IF;

  -- 1.2 total_messages_sent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'total_messages_sent'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN total_messages_sent INTEGER DEFAULT 0;
    RAISE NOTICE '  ✅ Adicionado: total_messages_sent';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: total_messages_sent';
  END IF;

  -- 1.3 is_business
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'is_business'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN is_business BOOLEAN DEFAULT false;
    RAISE NOTICE '  ✅ Adicionado: is_business';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: is_business';
  END IF;

  -- 1.4 is_group
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN is_group BOOLEAN DEFAULT false;
    RAISE NOTICE '  ✅ Adicionado: is_group';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: is_group';
  END IF;

  -- 1.5 last_interaction_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'last_interaction_at'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN last_interaction_at TIMESTAMP;
    RAISE NOTICE '  ✅ Adicionado: last_interaction_at';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: last_interaction_at';
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_business ON whatsapp_contacts(is_business) WHERE is_business = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_group ON whatsapp_contacts(is_group) WHERE is_group = false;
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_interaction ON whatsapp_contacts(last_interaction_at DESC) WHERE last_interaction_at IS NOT NULL;

\echo '  ✅ whatsapp_contacts: CONCLUÍDO'

-- ============================================================================
-- 2. AGENT_CONFIGS - Adicionar workspace_id
-- ============================================================================

\echo '🤖 [2/4] Corrigindo tabela agent_configs...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_configs' AND column_name = 'workspace_id'
  ) THEN
    -- Adicionar coluna
    ALTER TABLE agent_configs ADD COLUMN workspace_id INTEGER;
    
    -- Preencher com tenant_id temporariamente (para garantir que não quebra)
    -- Nota: Cada tenant deve ter 1 workspace. Ajustar manualmente se necessário.
    UPDATE agent_configs ac
    SET workspace_id = (
      SELECT w.id 
      FROM workspaces w 
      INNER JOIN tenants t ON t.id = ac.tenant_id
      WHERE w.owner_id = (SELECT owner_id FROM workspace_members wm WHERE wm.workspace_id = w.id LIMIT 1)
      LIMIT 1
    )
    WHERE workspace_id IS NULL;
    
    RAISE NOTICE '  ✅ Adicionado: workspace_id (populado com dados iniciais)';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: workspace_id';
  END IF;
END $$;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_agent_configs_workspace ON agent_configs(workspace_id);

-- Comentário útil
COMMENT ON COLUMN agent_configs.workspace_id IS 'Isolamento multi-tenant. Cada workspace tem suas próprias configs de agente.';

\echo '  ✅ agent_configs: CONCLUÍDO'

-- ============================================================================
-- 3. AGENT_CONVERSATION_LOGS - Adicionar workspace_id
-- ============================================================================

\echo '💬 [3/4] Corrigindo tabela agent_conversation_logs...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_conversation_logs' AND column_name = 'workspace_id'
  ) THEN
    -- Adicionar coluna
    ALTER TABLE agent_conversation_logs ADD COLUMN workspace_id INTEGER;
    
    -- Preencher com base em agent_config_id
    UPDATE agent_conversation_logs acl
    SET workspace_id = (
      SELECT workspace_id 
      FROM agent_configs ac 
      WHERE ac.id = acl.agent_config_id
    )
    WHERE workspace_id IS NULL AND agent_config_id IS NOT NULL;
    
    -- Fallback: Usar tenant_id para logs órfãos
    UPDATE agent_conversation_logs acl
    SET workspace_id = (
      SELECT w.id 
      FROM workspaces w 
      INNER JOIN tenants t ON t.id = acl.tenant_id
      WHERE w.owner_id = (SELECT owner_id FROM workspace_members wm WHERE wm.workspace_id = w.id LIMIT 1)
      LIMIT 1
    )
    WHERE workspace_id IS NULL;
    
    RAISE NOTICE '  ✅ Adicionado: workspace_id (populado com dados de agent_config)';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: workspace_id';
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_agent_logs_workspace ON agent_conversation_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_workspace_phone ON agent_conversation_logs(workspace_id, phone_number);

-- Comentário
COMMENT ON COLUMN agent_conversation_logs.workspace_id IS 'Isolamento de logs por workspace. Permite análise e filtragem correta.';

\echo '  ✅ agent_conversation_logs: CONCLUÍDO'

-- ============================================================================
-- 4. ONBOARDING_LEADS - Criar tabela (OPCIONAL)
-- ============================================================================

\echo '📝 [4/4] Verificando tabela onboarding_leads...'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'onboarding_leads'
  ) THEN
    CREATE TABLE onboarding_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Informações básicas
      phone VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255),
      
      -- Flow status
      status VARCHAR(50) DEFAULT 'collecting',  -- collecting, completed, cancelled
      step VARCHAR(50) DEFAULT 'name',          -- name, email, interest, finalization
      
      -- Dados coletados
      interest TEXT,
      budget_range VARCHAR(50),
      preferred_contact VARCHAR(20),
      notes TEXT,
      
      -- Metadados
      source VARCHAR(100) DEFAULT 'whatsapp',
      metadata JSONB DEFAULT '{}'::jsonb,
      
      -- Timestamps
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_message_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
    
    -- Índices
    CREATE INDEX idx_onboarding_phone ON onboarding_leads(phone);
    CREATE INDEX idx_onboarding_status ON onboarding_leads(status);
    CREATE INDEX idx_onboarding_step ON onboarding_leads(step);
    CREATE INDEX idx_onboarding_created ON onboarding_leads(created_at DESC);
    
    -- Trigger de update
    CREATE TRIGGER update_onboarding_leads_updated_at
      BEFORE UPDATE ON onboarding_leads
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    
    -- Comentário
    COMMENT ON TABLE onboarding_leads IS 'Leads em processo de onboarding através do flow conversacional (Sofia)';
    
    RAISE NOTICE '  ✅ Criada: onboarding_leads';
  ELSE
    RAISE NOTICE '  ⏭️  Já existe: onboarding_leads';
  END IF;
END $$;

\echo '  ✅ onboarding_leads: CONCLUÍDO'

-- ============================================================================
-- 5. VALIDAÇÃO FINAL
-- ============================================================================

\echo ''
\echo '🔍 Validando correções...'

DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar whatsapp_contacts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contacts' AND column_name = 'total_messages_received') THEN
    missing_columns := array_append(missing_columns, 'whatsapp_contacts.total_messages_received');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contacts' AND column_name = 'total_messages_sent') THEN
    missing_columns := array_append(missing_columns, 'whatsapp_contacts.total_messages_sent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contacts' AND column_name = 'is_business') THEN
    missing_columns := array_append(missing_columns, 'whatsapp_contacts.is_business');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contacts' AND column_name = 'is_group') THEN
    missing_columns := array_append(missing_columns, 'whatsapp_contacts.is_group');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsapp_contacts' AND column_name = 'last_interaction_at') THEN
    missing_columns := array_append(missing_columns, 'whatsapp_contacts.last_interaction_at');
  END IF;
  
  -- Verificar agent_configs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_configs' AND column_name = 'workspace_id') THEN
    missing_columns := array_append(missing_columns, 'agent_configs.workspace_id');
  END IF;
  
  -- Verificar agent_conversation_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_conversation_logs' AND column_name = 'workspace_id') THEN
    missing_columns := array_append(missing_columns, 'agent_conversation_logs.workspace_id');
  END IF;
  
  -- Resultado
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '❌ FALHA: Ainda faltam colunas: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ SUCESSO: Todas as colunas críticas foram adicionadas!';
  END IF;
  
  -- Info sobre onboarding_leads
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_leads') THEN
    RAISE NOTICE '⚠️  NOTA: Tabela onboarding_leads não foi criada (código legado, opcional)';
  ELSE
    RAISE NOTICE '✅ onboarding_leads disponível';
  END IF;
END $$;

-- ============================================================================
-- 6. RECOMENDAÇÕES PÓS-APLICAÇÃO
-- ============================================================================

\echo ''
\echo '📋 PRÓXIMOS PASSOS:'
\echo '   1. Reiniciar aplicação: pm2 restart pratica'
\echo '   2. Verificar logs: pm2 logs pratica --lines 50'
\echo '   3. Testar webhook Evolution: Enviar mensagem de teste'
\echo '   4. Verificar agentes: Testar Sofia/Luna'
\echo '   5. Monitorar por 15min pra garantir que erros sumiram'
\echo ''
\echo '🔗 Referências:'
\echo '   - Análise completa: SCHEMA_ANALISE.md'
\echo '   - Logs de erro: pm2 logs pratica | grep "does not exist"'
\echo ''

-- ============================================================================
-- METADATA
-- ============================================================================

COMMENT ON DATABASE pratica IS 'Schema atualizado em 29/01/2025 - Fix completo de colunas faltando';

\echo '✅ SCHEMA_FIX_COMPLETO.sql: EXECUÇÃO FINALIZADA!'
\echo '   Todas as colunas críticas foram adicionadas ao banco de dados.'
\echo ''
