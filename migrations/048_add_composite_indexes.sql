-- Migration 048: Adicionar Índices Compostos para Performance
-- Objetivo: Otimizar queries comuns com índices compostos
-- Impacto: Queries 10-100x mais rápidas
-- Duração estimada: 2-5 minutos
-- Nota: Usar CREATE INDEX CONCURRENTLY para não travar tabela

-- ============================================================================
-- PASSO 1: Índices para CVCRM_LEADS
-- ============================================================================

-- Query: buscar leads por workspace + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_workspace_situacao
  ON cvcrm_leads(workspace_id, situacao_id);

-- Query: buscar leads por workspace + corretor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_workspace_corretor
  ON cvcrm_leads(workspace_id, id_corretor)
  WHERE id_corretor IS NOT NULL;

-- Query: buscar leads recentes por workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_workspace_data
  ON cvcrm_leads(workspace_id, data_cad DESC);

-- Query: buscar leads por imobiliária
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_workspace_imobiliaria
  ON cvcrm_leads(workspace_id, imobiliaria_id)
  WHERE imobiliaria_id IS NOT NULL;

-- Query: buscar leads com score
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_workspace_score
  ON cvcrm_leads(workspace_id, score DESC NULLS LAST)
  WHERE score IS NOT NULL;

-- ============================================================================
-- PASSO 2: Índices para CVCRM_LEAD_INTERACOES
-- ============================================================================

-- Query: buscar interações de um lead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_lead_interacoes_lead_data
  ON cvcrm_lead_interacoes(id_lead, created_at DESC);

-- Query: buscar interações por workspace + tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_lead_interacoes_workspace_tipo
  ON cvcrm_lead_interacoes(workspace_id, tipo);

-- Query: buscar interações por corretor
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_lead_interacoes_corretor
  ON cvcrm_lead_interacoes(id_corretor, created_at DESC)
  WHERE id_corretor IS NOT NULL;

-- ============================================================================
-- PASSO 3: Índices para WHATSAPP_MESSAGES
-- ============================================================================

-- Query: buscar mensagens por workspace + telefone
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_workspace_phone
  ON whatsapp_messages(workspace_id, phone_number);

-- Query: buscar mensagens recentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_workspace_data
  ON whatsapp_messages(workspace_id, created_at DESC);

-- Query: buscar mensagens não lidas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_unread
  ON whatsapp_messages(workspace_id, phone_number)
  WHERE read_at IS NULL;

-- Query: buscar mensagens por tipo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_type
  ON whatsapp_messages(workspace_id, message_type, created_at DESC);

-- ============================================================================
-- PASSO 4: Índices para RECEPCAO
-- ============================================================================

-- Query: buscar presenças em um plantão
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recepcao_presencas_plantao_posicao
  ON recepcao_presencas(plantao_id, posicao_fila);

-- Query: buscar atribuições de uma presença
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recepcao_atribuicoes_presenca_data
  ON recepcao_atribuicoes(presenca_id, created_at DESC);

-- Query: buscar leads atribuídos por workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recepcao_atribuicoes_workspace_status
  ON recepcao_atribuicoes(workspace_id, status)
  WHERE status IN ('pendente', 'em_progresso');

-- ============================================================================
-- PASSO 5: Índices para COMISSAO
-- ============================================================================

-- Query: buscar vendas por workspace + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_vendas_workspace_status
  ON comissao_vendas(workspace_id, status);

-- Query: buscar vendas recentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_vendas_workspace_data
  ON comissao_vendas(workspace_id, data_venda DESC);

-- Query: buscar matriz por venda
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_matriz_venda_parcela
  ON comissao_matriz(venda_id, parcela_id);

-- Query: buscar parcelas por status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_parcelas_venda_status
  ON comissao_parcelas(venda_id, status);

-- ============================================================================
-- PASSO 6: Índices para AGENDAMENTOS
-- ============================================================================

-- Query: buscar agendamentos por workspace + data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_workspace_data
  ON agendamentos(workspace_id, data_agendamento DESC);

-- Query: buscar agendamentos pendentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_pendentes
  ON agendamentos(workspace_id, data_agendamento)
  WHERE status != 'confirmado';

-- ============================================================================
-- PASSO 7: Índices para EVENTOS
-- ============================================================================

-- Query: buscar eventos por workspace + data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_workspace_data
  ON eventos(workspace_id, data_evento DESC);

-- Query: buscar convidados por evento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evento_convidados_evento_status
  ON evento_convidados(evento_id, confirmacao);

-- ============================================================================
-- PASSO 8: Índices para SALVA_LEADS
-- ============================================================================

-- Query: buscar conversas ativas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salva_leads_conversations_lead_status
  ON salva_leads_conversations(lead_id, status);

-- Query: buscar mensagens da conversa
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salva_leads_messages_conversation_data
  ON salva_leads_messages(conversation_id, created_at DESC);

-- ============================================================================
-- PASSO 9: Índices para ACADEMY
-- ============================================================================

-- Query: buscar progresso do usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_progress_user_lesson
  ON academy_progress(user_id, lesson_id);

-- Query: buscar certificados do usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_certificates_user_date
  ON academy_certificates(user_id, emitted_at DESC);

-- ============================================================================
-- PASSO 10: Índices para RESERVAS
-- ============================================================================

-- Query: buscar reservas por workspace + data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_reservas_workspace_data
  ON cvcrm_reservas(workspace_id, data_situacao DESC);

-- Query: buscar reservas por empreendimento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_reservas_empreendimento
  ON cvcrm_reservas(id_empreendimento, data_situacao DESC);

-- ============================================================================
-- PASSO 11: Validar índices criados
-- ============================================================================

-- Listar todos os índices (verificar que foram criados)
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Contar índices compostos
SELECT COUNT(*) as total_composite_indexes
FROM (
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND indexdef LIKE '%(%, %)'
) sub;

-- ============================================================================
-- PASSO 12: Análise de performance (antes/depois)
-- ============================================================================

-- Executar ANALYZE para atualizar estatísticas
ANALYZE;

-- Ver tamanho dos índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Notas de Performance
-- ============================================================================
/*
PERFORMANCE EXPECTATIONS:

Antes de índices:
  SELECT * FROM cvcrm_leads
  WHERE workspace_id = 1 AND situacao_id = 5
  → Sequential Scan on cvcrm_leads (0.5-2s em 100k rows)

Depois de índices:
  SELECT * FROM cvcrm_leads
  WHERE workspace_id = 1 AND situacao_id = 5
  → Index Scan using idx_cvcrm_leads_workspace_situacao (1-10ms em 100k rows)

  Speedup: 50-200x faster!

ÍNDICES PARTIAL (WHERE clause):
  - idx_cvcrm_leads_workspace_corretor (onde id_corretor IS NOT NULL)
  - idx_whatsapp_messages_unread (onde read_at IS NULL)
  - idx_recepcao_atribuicoes_workspace_status (status IN (...))

  Vantagem: Índices menores (20-50% menor), mais rápidos

CRIAÇÃO CONCURRENTE:
  - CREATE INDEX CONCURRENTLY não trava a tabela
  - Leva ~2x mais tempo, mas permite queries durante criação
  - Recomendado para tabelas em produção

EXECUTAR ANALYZE:
  - Atualiza estatísticas de cardinality
  - Query planner usa estas stats para decidir melhor plano
  - Execute após criar muitos índices

MONITORAR:
  SELECT
    schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC;

  Se idx_scan = 0 → índice não está sendo usado (considerar remover)

TAMANHO DOS ÍNDICES:
  Expectativas:
  - Índice único: 1-5 MB por 1M rows
  - Índice composto: 5-15 MB por 1M rows
  - Índice partial: 20-50% menor que índice completo

MAINTENANCE:
  - REINDEX: remonta índices (raro, se corrupção)
  - VACUUM: libera espaço removido (automático)
  - ANALYZE: atualiza estatísticas (diário ideal)
*/

-- ============================================================================
-- Checklist Pós-Execução
-- ============================================================================
/*
✅ VALIDAR APÓS EXECUÇÃO:

1. Todos os índices foram criados:
   SELECT COUNT(*) FROM pg_indexes
   WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

2. Tamanho total de índices razoável:
   SELECT
     pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
   FROM pg_indexes
   WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

3. Queries mais rápidas:
   - Executar EXPLAIN ANALYZE em queries críticas
   - Verificar "Index Scan" em vez de "Sequential Scan"

4. Sem impacto em INSERTs/UPDATEs:
   - Índices podem ralentizar escritas (trade-off)
   - Monitorar INSERT performance

5. Testes passam:
   pnpm test
   pnpm test:e2e

PROBLEMAS COMUNS:

❌ "ERROR: index already exists"
   → Ignorado (IF NOT EXISTS cuida disso)

❌ "Index scan slower than sequential scan"
   → Run ANALYZE: ANALYZE;
   → Query planner pode estar usando dados antigos

❌ "Index size too large"
   → Considerar índice PARTIAL (WHERE clause)
   → Ou remover se idx_scan = 0

ROLLBACK:
  DROP INDEX CONCURRENTLY idx_cvcrm_leads_workspace_situacao;
  -- Repita para cada índice conforme necessário
*/
