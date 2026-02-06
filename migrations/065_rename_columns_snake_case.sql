-- Migration 065: Rename camelCase columns to snake_case
-- Phase 3 of Database Standardization
-- 23 columns across 5 tables
--
-- PostgreSQL automatically updates index definitions when columns are renamed,
-- but index NAMES remain the same. We rename indexes for clarity.

BEGIN;

-- ============================================================
-- 1. cvcrm_leads (3 columns)
-- ============================================================
ALTER TABLE cvcrm_leads RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_leads RENAME COLUMN codigointerno TO codigo_interno;
ALTER TABLE cvcrm_leads RENAME COLUMN idrd_station TO id_rd_station;

-- Rename index that references old column name
ALTER INDEX cvcrm_leads_workspace_idlead_idx RENAME TO cvcrm_leads_workspace_id_lead_idx;

-- ============================================================
-- 2. cvcrm_leads_interacoes (5 columns)
-- ============================================================
ALTER TABLE cvcrm_leads_interacoes RENAME COLUMN idinteracao TO id_interacao;
ALTER TABLE cvcrm_leads_interacoes RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_leads_interacoes RENAME COLUMN idcorretor TO id_corretor;
ALTER TABLE cvcrm_leads_interacoes RENAME COLUMN idgestor TO id_gestor;
ALTER TABLE cvcrm_leads_interacoes RENAME COLUMN idimobiliaria TO id_imobiliaria;

-- Rename index
ALTER INDEX cvcrm_leads_interacoes_ws_idint_idx RENAME TO cvcrm_leads_interacoes_ws_id_interacao_idx;

-- ============================================================
-- 3. cvcrm_leads_tarefas (5 columns)
-- ============================================================
ALTER TABLE cvcrm_leads_tarefas RENAME COLUMN idtarefa TO id_tarefa;
ALTER TABLE cvcrm_leads_tarefas RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_leads_tarefas RENAME COLUMN idcorretor TO id_corretor;
ALTER TABLE cvcrm_leads_tarefas RENAME COLUMN idimobiliaria TO id_imobiliaria;
ALTER TABLE cvcrm_leads_tarefas RENAME COLUMN idusuario TO id_usuario;

-- Rename indexes that reference old column names
ALTER INDEX cvcrm_leads_tarefas_ws_idtarefa_idx RENAME TO cvcrm_leads_tarefas_ws_id_tarefa_idx;
ALTER INDEX idx_cvcrm_leads_tarefas_workspace_idtarefa RENAME TO idx_cvcrm_leads_tarefas_workspace_id_tarefa;
ALTER INDEX idx_cvcrm_leads_tarefas_workspace_lead RENAME TO idx_cvcrm_leads_tarefas_workspace_id_lead;
ALTER INDEX idx_tarefas_idlead RENAME TO idx_tarefas_id_lead;
ALTER INDEX idx_tarefas_idtarefa RENAME TO idx_tarefas_id_tarefa;

-- ============================================================
-- 4. cvcrm_atendimentos (8 columns)
-- ============================================================
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idatendimento TO id_atendimento;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idassistencia TO id_assistencia;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idassunto TO id_assunto;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idsubassunto TO id_subassunto;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idsituacao TO id_situacao;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idbloco TO id_bloco;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idempreendimento TO id_empreendimento;
ALTER TABLE cvcrm_atendimentos RENAME COLUMN idresponsavel TO id_responsavel;

-- Rename index
ALTER INDEX cvcrm_atendimentos_ws_idatend_idx RENAME TO cvcrm_atendimentos_ws_id_atendimento_idx;

-- ============================================================
-- 5. cvcrm_atendimentos_arquivos (2 columns)
-- ============================================================
ALTER TABLE cvcrm_atendimentos_arquivos RENAME COLUMN idatendimento TO id_atendimento;
ALTER TABLE cvcrm_atendimentos_arquivos RENAME COLUMN idarquivo TO id_arquivo;

-- Rename index
ALTER INDEX cvcrm_atendimentos_arq_ws_idx RENAME TO cvcrm_atendimentos_arquivos_ws_id_arquivo_idx;

COMMIT;
