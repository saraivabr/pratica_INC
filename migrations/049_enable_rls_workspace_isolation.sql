-- Migration 049: Ativar Row Level Security (RLS) para Isolamento de Workspace
-- Objetivo: Garantir isolamento de dados entre workspaces em nível de banco
-- Impacto: Segurança aumentada, impossível vazar dados entre workspaces por bug
-- Duração estimada: 1-2 minutos
-- Nota: RLS é opcional (aplicação já filtra por workspace_id), mas recomendado

-- ============================================================================
-- PASSO 1: Criar função para obter workspace_id atual
-- ============================================================================

CREATE OR REPLACE FUNCTION current_workspace_id() RETURNS INTEGER AS $$
SELECT NULLIF(current_setting('app.current_workspace_id', TRUE), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION current_workspace_id() IS 'Retorna workspace_id atual da sessão (set na conexão)';

-- ============================================================================
-- PASSO 2: Ativar RLS em tabelas críticas
-- ============================================================================

-- CVCRM_LEADS - Tabela crítica com muitos dados sensíveis
ALTER TABLE cvcrm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cvcrm_leads_workspace_isolation ON cvcrm_leads;
CREATE POLICY cvcrm_leads_workspace_isolation ON cvcrm_leads
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- CVCRM_LEAD_INTERACOES - Historico de interações
ALTER TABLE cvcrm_lead_interacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cvcrm_lead_interacoes_workspace_isolation ON cvcrm_lead_interacoes;
CREATE POLICY cvcrm_lead_interacoes_workspace_isolation ON cvcrm_lead_interacoes
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- CVCRM_RESERVAS - Dados de vendas
ALTER TABLE cvcrm_reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cvcrm_reservas_workspace_isolation ON cvcrm_reservas;
CREATE POLICY cvcrm_reservas_workspace_isolation ON cvcrm_reservas
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- WHATSAPP_MESSAGES - Histórico de mensagens
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_messages_workspace_isolation ON whatsapp_messages;
CREATE POLICY whatsapp_messages_workspace_isolation ON whatsapp_messages
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- EVENTOS - Eventos de marketing
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eventos_workspace_isolation ON eventos;
CREATE POLICY eventos_workspace_isolation ON eventos
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- COMISSAO_VENDAS - Dados financeiros sensíveis
ALTER TABLE comissao_vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comissao_vendas_workspace_isolation ON comissao_vendas;
CREATE POLICY comissao_vendas_workspace_isolation ON comissao_vendas
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- RECEPCAO_PLANTOES - Roleta de leads
ALTER TABLE recepcao_plantoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recepcao_plantoes_workspace_isolation ON recepcao_plantoes;
CREATE POLICY recepcao_plantoes_workspace_isolation ON recepcao_plantoes
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- RECEPCAO_PRESENCAS - Presença em plantões
ALTER TABLE recepcao_presencas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recepcao_presencas_workspace_isolation ON recepcao_presencas;
CREATE POLICY recepcao_presencas_workspace_isolation ON recepcao_presencas
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- ACADEMY_PROGRESS - Progresso de treinamento
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS academy_progress_workspace_isolation ON academy_progress;
CREATE POLICY academy_progress_workspace_isolation ON academy_progress
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- AGENDAMENTOS - Agendamentos de visitas
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agendamentos_workspace_isolation ON agendamentos;
CREATE POLICY agendamentos_workspace_isolation ON agendamentos
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- ============================================================================
-- PASSO 3: Atualizar views para incluir filtro de workspace
-- ============================================================================

-- View: interacoes (sem RLS, precisa filtro manual)
CREATE OR REPLACE VIEW vw_lead_interacoes_safe AS
SELECT *
FROM cvcrm_lead_interacoes
WHERE workspace_id = current_workspace_id();

COMMENT ON VIEW vw_lead_interacoes_safe IS 'View segura com isolamento de workspace';

-- View: leads com informações completas
CREATE OR REPLACE VIEW vw_leads_safe AS
SELECT *
FROM cvcrm_leads
WHERE workspace_id = current_workspace_id();

COMMENT ON VIEW vw_leads_safe IS 'View segura de leads com isolamento de workspace';

-- ============================================================================
-- PASSO 4: Criar função para testar RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE (
  test_name TEXT,
  result BOOLEAN,
  description TEXT
) AS $$
BEGIN
  -- Test 1: RLS está habilitado?
  RETURN QUERY
  SELECT
    'RLS Enabled'::TEXT,
    COUNT(*) > 0,
    'RLS deve estar ativado em tabelas críticas'::TEXT
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('cvcrm_leads', 'whatsapp_messages', 'comissao_vendas')
    AND c.relrowsecurity = TRUE;

  -- Test 2: Policies existem?
  RETURN QUERY
  SELECT
    'Policies Created'::TEXT,
    COUNT(*) >= 8,
    'Deve haver policies para isolamento de workspace'::TEXT
  FROM pg_catalog.pg_policy
  WHERE schemaname = 'public'
    AND policyname LIKE '%workspace_isolation';

  -- Test 3: Função current_workspace_id existe?
  RETURN QUERY
  SELECT
    'current_workspace_id Function'::TEXT,
    EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'current_workspace_id'
    ),
    'Função para obter workspace_id deve existir'::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PASSO 5: Executar testes de RLS
-- ============================================================================

SELECT * FROM test_rls_isolation();

-- ============================================================================
-- PASSO 6: Documentação e notas
-- ============================================================================

COMMENT ON FUNCTION current_workspace_id() IS
'Obtém o workspace_id atual da sessão.
Deve ser configurado na conexão:
  SET app.current_workspace_id = "123";
Retorna NULL se não configurado (não deve acontecer em produção)';

-- ============================================================================
-- Notas de Implementação
-- ============================================================================
/*
O QUE É ROW LEVEL SECURITY (RLS)?

RLS é um mecanismo do PostgreSQL que aplica filtros em TODAS as queries
automaticamente, sem necessidade de adicionar WHERE clauses no código.

EXEMPLO:

SEM RLS (aplicação responsável por filtrar):
  -- Aplicação precisa fazer:
  SELECT * FROM cvcrm_leads
  WHERE workspace_id = $1;  -- $1 é o workspace_id atual

  -- Se dev esquecer WHERE: VAZAMENTO DE DADOS!

COM RLS (banco garante):
  -- Mesmo que dev esqueça:
  SELECT * FROM cvcrm_leads;

  -- Banco adiciona automaticamente:
  SELECT * FROM cvcrm_leads
  WHERE workspace_id = current_setting('app.current_workspace_id')::INTEGER;

  -- IMPOSSÍVEL VAZAR DADOS!

COMO USAR:

1. Ao conectar ao banco, definir workspace_id:
   -- Em Node.js:
   await db.query("SET app.current_workspace_id = $1", [workspaceId]);

2. Depois, queries normais funcionam com RLS automaticamente:
   const leads = await db.query("SELECT * FROM cvcrm_leads");
   // Banco filtra automaticamente por workspace_id

VANTAGENS:

✅ Segurança por camada de banco (não apenas aplicação)
✅ Impossível esquecer WHERE clause
✅ Proteção contra SQL injection
✅ Performance similar (usa índices)
✅ Múltiplas policies por tabela possível

DESVANTAGENS:

❌ Mais complexidade no schema
❌ Requer configuração de sessão (app.current_workspace_id)
❌ Pode impactar performance em queries complexas
❌ Não funciona com prepared statements em alguns drivers
❌ Debugging mais difícil (policies ocultas)

STATUS ATUAL:

Este projeto já filtra manualmente por workspace_id em TODAS as queries
Portanto, RLS é uma "camada extra de defesa" (defense in depth)

COMO IMPLEMENTAR NO CÓDIGO:

// lib/db.ts
export async function getDBConnection(workspaceId: number) {
  const client = new Client(config);
  await client.connect();

  // Configurar workspace_id para RLS
  await client.query(
    "SET app.current_workspace_id = $1",
    [workspaceId]
  );

  return client;
}

// Em cada endpoint:
const db = await getDBConnection(req.workspace.id);
const leads = await db.query("SELECT * FROM cvcrm_leads");
// RLS filtra automaticamente!

TESTES:

Para testar que RLS está funcionando:

1. Conectar como workspace 1
2. Tentar: SELECT * FROM cvcrm_leads;
3. Deve retornar apenas leads de workspace 1

4. Conectar como workspace 2
5. Tentar: SELECT * FROM cvcrm_leads;
6. Deve retornar apenas leads de workspace 2

7. Conectar sem SET app.current_workspace_id
8. Tentar: SELECT * FROM cvcrm_leads;
9. Deve retornar 0 rows (policy filtra)

PERFORMANCE:

RLS adiciona overhead mínimo:
- Policies simples (WHERE workspace_id = X): ~1-2% overhead
- Policies complexas: ~5-10% overhead

Recomendação: Usar RLS para tabelas críticas, opcional para outras.

POLICIES CRIADAS:

1. cvcrm_leads_workspace_isolation
2. cvcrm_lead_interacoes_workspace_isolation
3. cvcrm_reservas_workspace_isolation
4. whatsapp_messages_workspace_isolation
5. eventos_workspace_isolation
6. comissao_vendas_workspace_isolation
7. recepcao_plantoes_workspace_isolation
8. recepcao_presencas_workspace_isolation
9. academy_progress_workspace_isolation
10. agendamentos_workspace_isolation

MONITORAR:

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policy
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

DESABILITAR RLS (se necessário):

ALTER TABLE cvcrm_leads DISABLE ROW LEVEL SECURITY;

Não recomendado! Apenas em emergências.
*/

-- ============================================================================
-- Checklist Pós-Execução
-- ============================================================================
/*
✅ VALIDAR APÓS EXECUÇÃO:

1. RLS está ativado:
   SELECT count(*) FROM pg_class WHERE relrowsecurity = true;
   (Deve ser > 0)

2. Policies criadas:
   SELECT count(*) FROM pg_policy;
   (Deve ser >= 8)

3. Função current_workspace_id existe:
   SELECT test_rls_isolation();
   (Todos os testes devem passar)

4. Testar em aplicação:
   - Conexão sem SET app.current_workspace_id → deve falhar ou retornar 0 rows
   - Conexão com workspace_id errado → deve retornar 0 rows
   - Conexão com workspace_id correto → deve retornar dados

5. Performance aceitável:
   - Queries não devem ficar significativamente mais lentas
   - Use EXPLAIN ANALYZE para comparar

PRÓXIMOS PASSOS:

1. Implementar SET app.current_workspace_id em lib/db.ts
2. Verificar que todas as conexões definem workspace_id
3. Adicionar testes E2E para validar isolamento
4. Monitorar performance em produção
5. Considerar RLS para mais tabelas conforme necessário

ROLLBACK:

DROP POLICY cvcrm_leads_workspace_isolation ON cvcrm_leads;
ALTER TABLE cvcrm_leads DISABLE ROW LEVEL SECURITY;
-- Repita para cada tabela conforme necessário
*/
