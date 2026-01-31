-- ============================================================================
-- MIGRAÇÃO 022: User Workspace Architecture
-- Transforma sistema de multi-tenant (imobiliária) para user workspace
-- Cada usuário tem seu próprio workspace isolado
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CRIAR TABELA WORKSPACES
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    
    -- Proprietário
    owner_id UUID NOT NULL,
    
    -- Informações
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal | shared
    
    -- Configurações do workspace
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- CV CRM (cada workspace pode ter seu próprio)
    cvcrm_config JSONB DEFAULT '{}'::jsonb,
    
    -- Evolution API (cada workspace tem sua instância WhatsApp)
    evolution_instance_name VARCHAR(255),
    evolution_connected BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    plan VARCHAR(50) DEFAULT 'free',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces(type);

COMMENT ON TABLE workspaces IS 
  '1 usuário = 1 workspace (por padrão). Isolamento completo de dados.';

-- ============================================================================
-- 2. CRIAR TABELA WORKSPACE_MEMBERS (Compartilhamento opcional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',  -- owner, admin, member, viewer
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

COMMENT ON TABLE workspace_members IS 
  'Compartilhamento opcional de workspace entre usuários.';

-- ============================================================================
-- 3. CRIAR WORKSPACE PARA CADA USUÁRIO EXISTENTE
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  new_workspace_id INTEGER;
BEGIN
  FOR user_record IN 
    SELECT id, nome, evolution_instance_name, evolution_connected
    FROM users
    WHERE NOT EXISTS (
      SELECT 1 FROM workspaces w WHERE w.owner_id = users.id
    )
  LOOP
    -- Criar workspace para o usuário
    INSERT INTO workspaces (
      owner_id, 
      name, 
      slug, 
      type,
      evolution_instance_name,
      evolution_connected
    )
    VALUES (
      user_record.id,
      user_record.nome || ' - Workspace',
      'user-' || user_record.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
      'personal',
      user_record.evolution_instance_name,
      COALESCE(user_record.evolution_connected, false)
    )
    RETURNING id INTO new_workspace_id;
    
    RAISE NOTICE 'Workspace % criado para usuário % (%)', 
      new_workspace_id, user_record.id, user_record.nome;
  END LOOP;
END $$;

-- ============================================================================
-- 4. ADICIONAR workspace_id EM USERS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- Atribuir workspace_id a cada usuário (seu próprio workspace)
UPDATE users u
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = u.id
  AND u.workspace_id IS NULL;

-- Criar FK users → workspaces
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_workspace'
  ) THEN
    ALTER TABLE users 
      ADD CONSTRAINT fk_users_workspace
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);

COMMENT ON COLUMN users.workspace_id IS 
  'Workspace principal do usuário (geralmente seu workspace pessoal).';

-- ============================================================================
-- 5. ADICIONAR workspace_id EM TODAS AS TABELAS
-- ============================================================================

-- CV CRM Leads
ALTER TABLE cvcrm_leads ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Leads Interações
ALTER TABLE cvcrm_leads_interacoes ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Leads Tarefas
ALTER TABLE cvcrm_leads_tarefas ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Atendimentos
ALTER TABLE cvcrm_atendimentos ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Atendimentos Arquivos
ALTER TABLE cvcrm_atendimentos_arquivos ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Assistências
ALTER TABLE cvcrm_assistencias ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Sync Logs
ALTER TABLE cvcrm_sync_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- CV CRM Sync Cursors
ALTER TABLE cvcrm_sync_cursors ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- WhatsApp Messages
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- WhatsApp Contacts
ALTER TABLE whatsapp_contacts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- WhatsApp Campaigns
ALTER TABLE whatsapp_campaigns ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- Eventos
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- Evento Convidados
ALTER TABLE evento_convidados ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- Salva-Leads (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'salva_leads_conversations'
  ) THEN
    ALTER TABLE salva_leads_conversations ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
  END IF;
END $$;

-- ============================================================================
-- 6. MIGRAR DADOS: tenant_id → workspace_id
-- ============================================================================

-- Estratégia: Pegar primeiro usuário de cada tenant e atribuir workspace
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Para cada tenant, pegar primeiro usuário e usar seu workspace
  FOR rec IN 
    SELECT DISTINCT tenant_id, 
      (SELECT id FROM users WHERE tenant_id = t.tenant_id LIMIT 1) as sample_user_id
    FROM (
      SELECT DISTINCT tenant_id FROM cvcrm_leads WHERE tenant_id IS NOT NULL
      UNION
      SELECT DISTINCT tenant_id FROM whatsapp_messages WHERE tenant_id IS NOT NULL
      UNION
      SELECT DISTINCT tenant_id FROM eventos WHERE tenant_id IS NOT NULL
    ) t
  LOOP
    -- Obter workspace_id do usuário de amostra
    DECLARE
      target_workspace_id INTEGER;
    BEGIN
      SELECT workspace_id INTO target_workspace_id 
      FROM users 
      WHERE id = rec.sample_user_id;
      
      IF target_workspace_id IS NOT NULL THEN
        -- Migrar dados
        UPDATE cvcrm_leads 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_leads_interacoes 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_leads_tarefas 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_atendimentos 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_atendimentos_arquivos 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_assistencias 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_sync_logs 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE cvcrm_sync_cursors 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE whatsapp_messages 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE whatsapp_contacts 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE whatsapp_campaigns 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        UPDATE eventos 
        SET workspace_id = target_workspace_id 
        WHERE tenant_id = rec.tenant_id AND workspace_id IS NULL;
        
        RAISE NOTICE 'Migrado tenant_id % para workspace_id %', 
          rec.tenant_id, target_workspace_id;
      END IF;
    END;
  END LOOP;
END $$;

-- Migrar evento_convidados (usa evento_id, não tenant_id direto)
UPDATE evento_convidados ec
SET workspace_id = e.workspace_id
FROM eventos e
WHERE ec.evento_id = e.id
  AND ec.workspace_id IS NULL;

-- ============================================================================
-- 7. CRIAR ÍNDICES EM workspace_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_workspace 
  ON cvcrm_leads(workspace_id);

CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_interacoes_workspace 
  ON cvcrm_leads_interacoes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_tarefas_workspace 
  ON cvcrm_leads_tarefas(workspace_id);

CREATE INDEX IF NOT EXISTS idx_cvcrm_atendimentos_workspace 
  ON cvcrm_atendimentos(workspace_id);

CREATE INDEX IF NOT EXISTS idx_cvcrm_atendimentos_arquivos_workspace 
  ON cvcrm_atendimentos_arquivos(workspace_id);

CREATE INDEX IF NOT EXISTS idx_cvcrm_assistencias_workspace 
  ON cvcrm_assistencias(workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace 
  ON whatsapp_messages(workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_workspace 
  ON whatsapp_contacts(workspace_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_workspace 
  ON whatsapp_campaigns(workspace_id);

CREATE INDEX IF NOT EXISTS idx_eventos_workspace 
  ON eventos(workspace_id);

CREATE INDEX IF NOT EXISTS idx_evento_convidados_workspace 
  ON evento_convidados(workspace_id);

-- ============================================================================
-- 8. ATUALIZAR RLS POLICIES (tenant → workspace)
-- ============================================================================

-- CV CRM Leads
DROP POLICY IF EXISTS tenant_isolation_leads ON cvcrm_leads;
CREATE POLICY workspace_isolation_leads ON cvcrm_leads
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- CV CRM Leads Interações
DROP POLICY IF EXISTS tenant_isolation_interacoes ON cvcrm_leads_interacoes;
CREATE POLICY workspace_isolation_interacoes ON cvcrm_leads_interacoes
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- CV CRM Leads Tarefas
DROP POLICY IF EXISTS tenant_isolation_tarefas ON cvcrm_leads_tarefas;
CREATE POLICY workspace_isolation_tarefas ON cvcrm_leads_tarefas
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- CV CRM Atendimentos
DROP POLICY IF EXISTS tenant_isolation_atendimentos ON cvcrm_atendimentos;
CREATE POLICY workspace_isolation_atendimentos ON cvcrm_atendimentos
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- CV CRM Atendimentos Arquivos
DROP POLICY IF EXISTS tenant_isolation_arquivos ON cvcrm_atendimentos_arquivos;
CREATE POLICY workspace_isolation_arquivos ON cvcrm_atendimentos_arquivos
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- CV CRM Assistências
DROP POLICY IF EXISTS tenant_isolation_assistencias ON cvcrm_assistencias;
CREATE POLICY workspace_isolation_assistencias ON cvcrm_assistencias
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- WhatsApp Messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_isolation_messages ON whatsapp_messages;
CREATE POLICY workspace_isolation_messages ON whatsapp_messages
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- WhatsApp Contacts
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_isolation_contacts ON whatsapp_contacts;
CREATE POLICY workspace_isolation_contacts ON whatsapp_contacts
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- Eventos
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workspace_isolation_eventos ON eventos;
CREATE POLICY workspace_isolation_eventos ON eventos
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- ============================================================================
-- 9. TRIGGER PARA AUTO-CRIAR WORKSPACE AO CRIAR USUÁRIO
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_workspace()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id INTEGER;
BEGIN
  -- Se workspace_id já foi definido, não fazer nada
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Criar workspace pessoal
  INSERT INTO workspaces (owner_id, name, slug, type)
  VALUES (
    NEW.id,
    NEW.nome || ' - Workspace',
    'user-' || NEW.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
    'personal'
  )
  RETURNING id INTO new_workspace_id;
  
  -- Atribuir ao usuário
  NEW.workspace_id := new_workspace_id;
  
  RAISE NOTICE 'Workspace % criado automaticamente para usuário % (%)', 
    new_workspace_id, NEW.id, NEW.nome;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_workspace ON users;
CREATE TRIGGER trigger_auto_create_workspace
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workspace();

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_current_workspace(wid INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_workspace_id', wid::TEXT, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_workspace_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN current_setting('app.current_workspace_id', true)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO
-- ============================================================================

DO $$
DECLARE
  users_count INTEGER;
  workspaces_count INTEGER;
  users_with_workspace INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO workspaces_count FROM workspaces;
  SELECT COUNT(*) INTO users_with_workspace FROM users WHERE workspace_id IS NOT NULL;
  
  RAISE NOTICE '=== VALIDAÇÃO DA MIGRAÇÃO ===';
  RAISE NOTICE 'Total de usuários: %', users_count;
  RAISE NOTICE 'Total de workspaces criados: %', workspaces_count;
  RAISE NOTICE 'Usuários com workspace_id: %', users_with_workspace;
  
  IF users_count = users_with_workspace THEN
    RAISE NOTICE '✅ Migração OK: Todos os usuários têm workspace!';
  ELSE
    RAISE WARNING '⚠️  Alguns usuários sem workspace_id! Verifique.';
  END IF;
END $$;
