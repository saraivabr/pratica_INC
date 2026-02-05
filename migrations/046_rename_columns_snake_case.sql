-- Migration 046: Renomear Colunas para snake_case
-- Objetivo: Padronizar nomenclatura para snake_case em TODO o sistema
-- Impacto: ~200+ colunas renomeadas, BREAKING CHANGE em código TypeScript
-- Duração estimada: 2-3 minutos
-- Risco: Alto - requer atualização de código correspondente

-- ============================================================================
-- ⚠️ AVISO CRÍTICO
-- ============================================================================
/*
ESTA MIGRATION É UM BREAKING CHANGE

Após executar, TODAS as queries devem usar novos nomes de colunas:

ANTES:
  SELECT idlead, codigointerno, dataAtualizacao
  FROM cvcrm_leads WHERE idcorretor = $1;

DEPOIS:
  SELECT id_lead, codigo_interno, data_atualizacao
  FROM cvcrm_leads WHERE id_corretor = $1;

EXECUÇÃO RECOMENDADA:
  1. Executar migration em staging PRIMEIRO
  2. Atualizar código TypeScript COMPLETAMENTE
  3. Validar testes E2E por 24+ horas
  4. DEPOIS executar em produção

ROLLBACK DISPONÍVEL?
  Sim, ao renomear colunas: cada ALTER TABLE pode ser desfeito
  Mas código quebrado vai precisar ser revertido também
*/

-- ============================================================================
-- PASSO 1: Renomear colunas em CVCRM_LEADS
-- ============================================================================

-- ID fields (idlead, idcorretor, etc)
ALTER TABLE cvcrm_leads RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_leads RENAME COLUMN idcorretor TO id_corretor;

-- Campos com camelCase sem underscore
ALTER TABLE cvcrm_leads RENAME COLUMN codigointerno TO codigo_interno;
ALTER TABLE cvcrm_leads RENAME COLUMN dataatualizacao TO data_atualizacao;
ALTER TABLE cvcrm_leads RENAME COLUMN dataproxcontato TO data_prox_contato;

-- Adicionar mais conforme identificado no banco

-- ============================================================================
-- PASSO 2: Renomear colunas em CVCRM_LEAD_INTERACOES
-- ============================================================================

ALTER TABLE cvcrm_lead_interacoes RENAME COLUMN idinteracao TO id_interacao;
ALTER TABLE cvcrm_lead_interacoes RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_lead_interacoes RENAME COLUMN idcorretor TO id_corretor;
ALTER TABLE cvcrm_lead_interacoes RENAME COLUMN datainteracao TO data_interacao;

-- ============================================================================
-- PASSO 3: Renomear colunas em CVCRM_RESERVAS
-- ============================================================================

ALTER TABLE cvcrm_reservas RENAME COLUMN idreserva TO id_reserva;
ALTER TABLE cvcrm_reservas RENAME COLUMN idempreendimento TO id_empreendimento;
ALTER TABLE cvcrm_reservas RENAME COLUMN idunidade TO id_unidade;
ALTER TABLE cvcrm_reservas RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_reservas RENAME COLUMN datamovel TO data_movel;
ALTER TABLE cvcrm_reservas RENAME COLUMN datasituacao TO data_situacao;

-- ============================================================================
-- PASSO 4: Renomear colunas em CVCRM_ATENDIMENTOS
-- ============================================================================

ALTER TABLE cvcrm_atendimentos RENAME COLUMN idatendimento TO id_atendimento;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idempreendimento TO id_empreendimento;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idresponsavel TO id_responsavel;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN dataatendimento TO data_atendimento;

-- ============================================================================
-- PASSO 5: Renomear colunas em CVCRM_PESSOAS
-- ============================================================================

ALTER TABLE cvcrm_pessoas RENAME COLUMN idpessoa TO id_pessoa;
ALTER TABLE cvcrm_pessoas RENAME COLUMN dataalteracao TO data_alteracao;
ALTER TABLE cvcrm_pessoas RENAME COLUMN datacadastro TO data_cadastro;

-- ============================================================================
-- PASSO 6: Renomear colunas em RECEPCAO
-- ============================================================================

ALTER TABLE recepcao_plantoes RENAME COLUMN dataplantao TO data_plantao;
ALTER TABLE recepcao_presencas RENAME COLUMN posicaofila TO posicao_fila;
ALTER TABLE recepcao_presencas RENAME COLUMN horacheckin TO hora_checkin;
ALTER TABLE recepcao_presencas RENAME COLUMN horacheckout TO hora_checkout;

-- ============================================================================
-- PASSO 7: Renomear colunas em AGENDAMENTOS
-- ============================================================================

ALTER TABLE agendamentos RENAME COLUMN dataagendamento TO data_agendamento;
ALTER TABLE agendamentos RENAME COLUMN horaagendamento TO hora_agendamento;

-- ============================================================================
-- PASSO 8: Atualizar constraints e triggers após rename
-- ============================================================================

-- Se há constraints com nomes de colunas antigas, renomear também
-- (Exemplo: UNIQUE constraints, CHECK constraints)

-- Se há triggers, verificar que estão usando novos nomes
-- (A maioria dos triggers deve funcionar automaticamente)

-- ============================================================================
-- PASSO 9: Validar renaming
-- ============================================================================

-- Verificar que colunas foram renomeadas
SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'cvcrm_%'
  AND column_name LIKE '%id%'
  AND column_name NOT LIKE 'id_%'
  AND column_name NOT LIKE '%_id'
ORDER BY table_name, column_name;

-- Esperado: Muito menos resultados (todos em snake_case)

-- ============================================================================
-- PASSO 10: Documentar mudanças de schema
-- ============================================================================

-- Criar tabela de mapping para referência (opcional, para testes)
CREATE TABLE IF NOT EXISTS schema_migrations_rename (
  old_name VARCHAR(100) NOT NULL,
  new_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  migration_date TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (table_name, old_name)
);

INSERT INTO schema_migrations_rename (old_name, new_name, table_name)
VALUES
  ('idlead', 'id_lead', 'cvcrm_leads'),
  ('idcorretor', 'id_corretor', 'cvcrm_leads'),
  ('codigointerno', 'codigo_interno', 'cvcrm_leads'),
  ('dataatualizacao', 'data_atualizacao', 'cvcrm_leads'),
  ('dataproxcontato', 'data_prox_contato', 'cvcrm_leads'),
  -- Adicionar todas as renomeações aqui
  ('id_interacao', 'id_interacao', 'cvcrm_lead_interacoes'),
  ('id_lead', 'id_lead', 'cvcrm_lead_interacoes'),
  ('id_corretor', 'id_corretor', 'cvcrm_lead_interacoes')
  -- ... mais
;

-- ============================================================================
-- Notas de Execução
-- ============================================================================
/*
EXECUTAR ESTA MIGRATION SOMENTE APÓS:

1. ✅ Phases 1-2 completadas (FK + normalização)
2. ✅ Staging totalmente validado por 24+ horas
3. ✅ Código TypeScript COMPLETAMENTE refatorado
4. ✅ Todos os testes E2E passando
5. ✅ Plano de rollback documentado

PASSOS PRÉ-EXECUÇÃO:

1. Fazer backup completo:
   pg_dump -U pratica pratica > backup_before_046.sql

2. Verificar que código não usa nomes antigos:
   grep -r "idlead" app/ lib/
   grep -r "idcorretor" app/ lib/
   grep -r "codigointerno" app/ lib/
   (Deve retornar 0 results)

3. Preparar lista de rollback:
   # Para cada rename:
   ALTER TABLE cvcrm_leads RENAME COLUMN id_lead TO idlead;

EXECUÇÃO:
   psql -U pratica -d pratica < migrations/046_rename_columns_snake_case.sql

VALIDAÇÃO PÓS-EXECUÇÃO:

1. Verificar que renaming foi bem-sucedido:
   \d cvcrm_leads (em psql)

2. Rodar testes:
   pnpm test

3. Se falhas: fazer rollback (ver ROLLBACK NOTES abaixo)

ROLLBACK COMPLETO:
   Se algo deu errado:
   1. Restaurar backup:
      psql -U pratica -d pratica < backup_before_046.sql
   2. Revert código changes:
      git checkout HEAD~1
   3. Restart aplicação

IMPACTO NO CÓDIGO:
   - ~100+ arquivos TypeScript afetados
   - Padrão de mudança: snake_case em TODAS as queries
   - Recomendação: Usar Find & Replace com cuidado

TIMELINE SUGERIDA:
   - Semana 1: Executar migration em staging
   - Semana 2: Refatorar código completamente
   - Semana 3: Rodar testes por 7 dias em staging
   - Semana 4: Deploy em produção (janela de manutenção)
*/
