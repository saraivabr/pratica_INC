-- =====================================================
-- Migration 002: Complete CV CRM Sync Infrastructure
-- Execute este SQL no Supabase ou PostgreSQL local
-- Cria todas as 68+ tabelas para sincronização completa
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 1: SYNC CONTROL TABLES
-- =====================================================

-- Sync Logs Table (já existe mas garantindo estrutura completa)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'error', 'partial')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_items INTEGER DEFAULT 0,
  created INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  cursor VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_agent ON sync_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_sync_logs_table ON sync_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);

-- Sync Cursors Table (já criada pelo cursor-manager mas garantindo)
CREATE TABLE IF NOT EXISTS sync_cursors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_id INTEGER,
  last_offset INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_name, table_name)
);

CREATE INDEX IF NOT EXISTS idx_sync_cursors_agent ON sync_cursors(agent_name);

-- =====================================================
-- PART 2: DOMAIN LEADS (12 tables)
-- =====================================================

-- 01: cvcrm_leads - Core lead data
CREATE TABLE IF NOT EXISTS cvcrm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(50),
  celular VARCHAR(50),
  cpf VARCHAR(20),
  data_cadastro_cvcrm TIMESTAMP WITH TIME ZONE,
  data_atualizacao_cvcrm TIMESTAMP WITH TIME ZONE,
  origem VARCHAR(100),
  midia_principal VARCHAR(100),
  sub_midia VARCHAR(100),
  campanha VARCHAR(255),
  score INTEGER,
  tipo_lead VARCHAR(50),
  classificacao VARCHAR(50),
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  imobiliaria_id INTEGER,
  imobiliaria_nome VARCHAR(255),
  situacao_id INTEGER,
  situacao_nome VARCHAR(100),
  situacao_cor VARCHAR(20),
  empreendimentos JSONB DEFAULT '[]',
  campos_adicionais JSONB DEFAULT '{}',
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_cvcrm_id ON cvcrm_leads(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_nome ON cvcrm_leads(nome);
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_email ON cvcrm_leads(email);
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_telefone ON cvcrm_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_corretor ON cvcrm_leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_situacao ON cvcrm_leads(situacao_id);

-- 02: cvcrm_lead_conversoes
CREATE TABLE IF NOT EXISTS cvcrm_lead_conversoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_lead_id INTEGER NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('ganho', 'perdido')),
  motivo_perda_id INTEGER,
  motivo_perda_nome VARCHAR(255),
  data_conversao TIMESTAMP WITH TIME ZONE,
  valor_reserva DECIMAL(15, 2),
  unidade_id INTEGER,
  unidade_nome VARCHAR(255),
  empreendimento_id INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversoes_lead ON cvcrm_lead_conversoes(cvcrm_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_conversoes_tipo ON cvcrm_lead_conversoes(tipo);

-- 03: cvcrm_lead_interacoes
CREATE TABLE IF NOT EXISTS cvcrm_lead_interacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  tipo VARCHAR(100),
  descricao TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  anexos JSONB DEFAULT '[]',
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_interacoes_lead ON cvcrm_lead_interacoes(cvcrm_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interacoes_data ON cvcrm_lead_interacoes(data_cadastro DESC);

-- 04: cvcrm_lead_infos
CREATE TABLE IF NOT EXISTS cvcrm_lead_infos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  campo VARCHAR(100),
  valor TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_infos_lead ON cvcrm_lead_infos(cvcrm_lead_id);

-- 05: cvcrm_lead_momentos
CREATE TABLE IF NOT EXISTS cvcrm_lead_momentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  momento VARCHAR(255),
  data_momento TIMESTAMP WITH TIME ZONE,
  observacao TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_momentos_lead ON cvcrm_lead_momentos(cvcrm_lead_id);

-- 06: cvcrm_lead_tarefas
CREATE TABLE IF NOT EXISTS cvcrm_lead_tarefas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  titulo VARCHAR(255),
  descricao TEXT,
  tipo VARCHAR(50),
  status VARCHAR(50),
  prioridade VARCHAR(20),
  data_agendamento TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_tarefas_lead ON cvcrm_lead_tarefas(cvcrm_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tarefas_status ON cvcrm_lead_tarefas(status);
CREATE INDEX IF NOT EXISTS idx_lead_tarefas_data ON cvcrm_lead_tarefas(data_agendamento);

-- 07: cvcrm_lead_visitas
CREATE TABLE IF NOT EXISTS cvcrm_lead_visitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  data_agendamento TIMESTAMP WITH TIME ZONE,
  data_realizacao TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  observacoes TEXT,
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_visitas_lead ON cvcrm_lead_visitas(cvcrm_lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_visitas_status ON cvcrm_lead_visitas(status);

-- 08: cvcrm_lead_workflow
CREATE TABLE IF NOT EXISTS cvcrm_lead_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  etapa VARCHAR(100),
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_saida TIMESTAMP WITH TIME ZONE,
  tempo_permanencia_dias INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_workflow_lead ON cvcrm_lead_workflow(cvcrm_lead_id);

-- 09: cvcrm_lead_historico_situacoes
CREATE TABLE IF NOT EXISTS cvcrm_lead_historico_situacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  situacao_anterior_id INTEGER,
  situacao_anterior_nome VARCHAR(100),
  situacao_nova_id INTEGER,
  situacao_nova_nome VARCHAR(100),
  data_alteracao TIMESTAMP WITH TIME ZONE,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_hist_sit_lead ON cvcrm_lead_historico_situacoes(cvcrm_lead_id);

-- 10: cvcrm_lead_historico_corretores
CREATE TABLE IF NOT EXISTS cvcrm_lead_historico_corretores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_lead_id INTEGER NOT NULL,
  corretor_anterior_id INTEGER,
  corretor_anterior_nome VARCHAR(255),
  corretor_novo_id INTEGER,
  corretor_novo_nome VARCHAR(255),
  data_alteracao TIMESTAMP WITH TIME ZONE,
  motivo TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_hist_corr_lead ON cvcrm_lead_historico_corretores(cvcrm_lead_id);

-- 11: cvcrm_lead_origens
CREATE TABLE IF NOT EXISTS cvcrm_lead_origens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_origens_nome ON cvcrm_lead_origens(nome);

-- =====================================================
-- PART 3: DOMAIN PESSOAS (7 tables)
-- =====================================================

-- 12: cvcrm_pessoas - Core person data
CREATE TABLE IF NOT EXISTS cvcrm_pessoas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(20),
  rg VARCHAR(30),
  data_nascimento DATE,
  email VARCHAR(255),
  telefone VARCHAR(50),
  celular VARCHAR(50),
  tipo VARCHAR(50),
  nacionalidade VARCHAR(100),
  estado_civil VARCHAR(50),
  profissao VARCHAR(100),
  endereco_completo TEXT,
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  pais VARCHAR(100),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_pessoas_cvcrm_id ON cvcrm_pessoas(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_pessoas_cpf ON cvcrm_pessoas(cpf);
CREATE INDEX IF NOT EXISTS idx_cvcrm_pessoas_nome ON cvcrm_pessoas(nome);

-- 13: cvcrm_pessoa_contatos
CREATE TABLE IF NOT EXISTS cvcrm_pessoa_contatos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_pessoa_id INTEGER NOT NULL,
  tipo VARCHAR(50),
  valor VARCHAR(255),
  principal BOOLEAN DEFAULT false,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_contatos_pessoa ON cvcrm_pessoa_contatos(cvcrm_pessoa_id);

-- 14: cvcrm_pessoa_dados_profissionais
CREATE TABLE IF NOT EXISTS cvcrm_pessoa_dados_profissionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_pessoa_id INTEGER NOT NULL,
  empresa VARCHAR(255),
  cargo VARCHAR(100),
  renda_mensal DECIMAL(15, 2),
  tempo_empresa_anos INTEGER,
  tipo_contrato VARCHAR(50),
  data_admissao DATE,
  telefone_comercial VARCHAR(50),
  email_comercial VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_prof_pessoa ON cvcrm_pessoa_dados_profissionais(cvcrm_pessoa_id);

-- 15: cvcrm_pessoa_bancarios
CREATE TABLE IF NOT EXISTS cvcrm_pessoa_bancarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_pessoa_id INTEGER NOT NULL,
  banco VARCHAR(100),
  agencia VARCHAR(20),
  conta VARCHAR(30),
  tipo_conta VARCHAR(20),
  digito_verificador VARCHAR(5),
  pix VARCHAR(100),
  principal BOOLEAN DEFAULT false,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_banc_pessoa ON cvcrm_pessoa_bancarios(cvcrm_pessoa_id);

-- 16: cvcrm_pessoa_financeiros
CREATE TABLE IF NOT EXISTS cvcrm_pessoa_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_pessoa_id INTEGER NOT NULL,
  tipo VARCHAR(100),
  descricao VARCHAR(255),
  valor DECIMAL(15, 2),
  data_vencimento DATE,
  observacoes TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_fin_pessoa ON cvcrm_pessoa_financeiros(cvcrm_pessoa_id);

-- 17: cvcrm_pessoa_patrimonio
CREATE TABLE IF NOT EXISTS cvcrm_pessoa_patrimonio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_pessoa_id INTEGER NOT NULL,
  tipo VARCHAR(100),
  descricao VARCHAR(255),
  valor_estimado DECIMAL(15, 2),
  observacoes TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_patr_pessoa ON cvcrm_pessoa_patrimonio(cvcrm_pessoa_id);

-- 18: cvcrm_pessoa_bens_empresariais
CREATE TABLE IF NOT EXISTS cvcrm_pessoa_bens_empresariais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_pessoa_id INTEGER NOT NULL,
  tipo VARCHAR(100),
  descricao VARCHAR(255),
  cnpj VARCHAR(20),
  participacao_percentual DECIMAL(5, 2),
  valor_estimado DECIMAL(15, 2),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoa_bens_pessoa ON cvcrm_pessoa_bens_empresariais(cvcrm_pessoa_id);

-- =====================================================
-- PART 4: DOMAIN RESERVAS (13 tables)
-- =====================================================

-- 19: cvcrm_reservas - Core reservation data
CREATE TABLE IF NOT EXISTS cvcrm_reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  numero_reserva VARCHAR(50),
  data_reserva TIMESTAMP WITH TIME ZONE,
  data_venda TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  valor_reserva DECIMAL(15, 2),
  valor_venda DECIMAL(15, 2),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  unidade_id INTEGER,
  unidade_nome VARCHAR(255),
  cliente_principal_id INTEGER,
  cliente_principal_nome VARCHAR(255),
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  imobiliaria_id INTEGER,
  imobiliaria_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_reservas_cvcrm_id ON cvcrm_reservas(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_reservas_numero ON cvcrm_reservas(numero_reserva);
CREATE INDEX IF NOT EXISTS idx_cvcrm_reservas_status ON cvcrm_reservas(status);
CREATE INDEX IF NOT EXISTS idx_cvcrm_reservas_empreend ON cvcrm_reservas(empreendimento_id);

-- 20: cvcrm_reserva_associados
CREATE TABLE IF NOT EXISTS cvcrm_reserva_associados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  pessoa_id INTEGER,
  pessoa_nome VARCHAR(255),
  tipo VARCHAR(50),
  percentual_participacao DECIMAL(5, 2),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_assoc_reserva ON cvcrm_reserva_associados(cvcrm_reserva_id);

-- 21: cvcrm_reserva_comissoes
CREATE TABLE IF NOT EXISTS cvcrm_reserva_comissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  tipo_comissao VARCHAR(50),
  percentual DECIMAL(5, 2),
  valor DECIMAL(15, 2),
  status VARCHAR(50),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_com_reserva ON cvcrm_reserva_comissoes(cvcrm_reserva_id);

-- 22: cvcrm_reserva_coordenadores
CREATE TABLE IF NOT EXISTS cvcrm_reserva_coordenadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  coordenador_id INTEGER,
  coordenador_nome VARCHAR(255),
  tipo VARCHAR(50),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_coord_reserva ON cvcrm_reserva_coordenadores(cvcrm_reserva_id);

-- 23: cvcrm_reserva_campos_adicionais
CREATE TABLE IF NOT EXISTS cvcrm_reserva_campos_adicionais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  campo VARCHAR(100),
  valor TEXT,
  tipo_campo VARCHAR(50),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_campos_reserva ON cvcrm_reserva_campos_adicionais(cvcrm_reserva_id);

-- 24: cvcrm_reserva_condicoes
CREATE TABLE IF NOT EXISTS cvcrm_reserva_condicoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  tipo_condicao VARCHAR(100),
  descricao TEXT,
  valor DECIMAL(15, 2),
  data_vencimento DATE,
  status VARCHAR(50),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_cond_reserva ON cvcrm_reserva_condicoes(cvcrm_reserva_id);

-- 25: cvcrm_reserva_contratos
CREATE TABLE IF NOT EXISTS cvcrm_reserva_contratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  numero_contrato VARCHAR(100),
  tipo VARCHAR(50),
  data_assinatura DATE,
  data_vencimento DATE,
  status VARCHAR(50),
  arquivo_url TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_contr_reserva ON cvcrm_reserva_contratos(cvcrm_reserva_id);

-- 26: cvcrm_reserva_historico
CREATE TABLE IF NOT EXISTS cvcrm_reserva_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  tipo_alteracao VARCHAR(100),
  campo_alterado VARCHAR(100),
  valor_anterior TEXT,
  valor_novo TEXT,
  data_alteracao TIMESTAMP WITH TIME ZONE,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_hist_reserva ON cvcrm_reserva_historico(cvcrm_reserva_id);

-- 27: cvcrm_reserva_workflow
CREATE TABLE IF NOT EXISTS cvcrm_reserva_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  etapa VARCHAR(100),
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_saida TIMESTAMP WITH TIME ZONE,
  tempo_permanencia_dias INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_work_reserva ON cvcrm_reserva_workflow(cvcrm_reserva_id);

-- 28: cvcrm_reserva_flags
CREATE TABLE IF NOT EXISTS cvcrm_reserva_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  flag VARCHAR(100),
  valor BOOLEAN,
  data_alteracao TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_flags_reserva ON cvcrm_reserva_flags(cvcrm_reserva_id);

-- 29: cvcrm_reserva_sienge
CREATE TABLE IF NOT EXISTS cvcrm_reserva_sienge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_reserva_id INTEGER NOT NULL,
  codigo_sienge VARCHAR(100),
  status_integracao VARCHAR(50),
  data_integracao TIMESTAMP WITH TIME ZONE,
  dados_sienge JSONB,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_sienge_reserva ON cvcrm_reserva_sienge(cvcrm_reserva_id);

-- 30: cvcrm_reserva_situacoes
CREATE TABLE IF NOT EXISTS cvcrm_reserva_situacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(100),
  descricao TEXT,
  cor VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reserva_sit_nome ON cvcrm_reserva_situacoes(nome);

-- =====================================================
-- PART 5: DOMAIN ATENDIMENTOS (7 tables)
-- =====================================================

-- 31: cvcrm_atendimentos
CREATE TABLE IF NOT EXISTS cvcrm_atendimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  protocolo VARCHAR(100),
  tipo VARCHAR(100),
  assunto VARCHAR(255),
  descricao TEXT,
  status VARCHAR(50),
  prioridade VARCHAR(20),
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  unidade_id INTEGER,
  unidade_nome VARCHAR(255),
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  time_id INTEGER,
  time_nome VARCHAR(100),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_cvcrm_id ON cvcrm_atendimentos(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_protocolo ON cvcrm_atendimentos(protocolo);
CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON cvcrm_atendimentos(status);

-- 32: cvcrm_atendimento_interacoes
CREATE TABLE IF NOT EXISTS cvcrm_atendimento_interacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_atendimento_id INTEGER NOT NULL,
  tipo VARCHAR(50),
  descricao TEXT,
  data_interacao TIMESTAMP WITH TIME ZONE,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  anexos JSONB DEFAULT '[]',
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_inter_atend ON cvcrm_atendimento_interacoes(cvcrm_atendimento_id);

-- 33: cvcrm_atendimento_respostas
CREATE TABLE IF NOT EXISTS cvcrm_atendimento_respostas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_atendimento_id INTEGER NOT NULL,
  resposta TEXT,
  data_resposta TIMESTAMP WITH TIME ZONE,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  publica BOOLEAN DEFAULT false,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_resp_atend ON cvcrm_atendimento_respostas(cvcrm_atendimento_id);

-- 34: cvcrm_atendimento_tarefas
CREATE TABLE IF NOT EXISTS cvcrm_atendimento_tarefas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_atendimento_id INTEGER NOT NULL,
  titulo VARCHAR(255),
  descricao TEXT,
  status VARCHAR(50),
  data_agendamento TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_tar_atend ON cvcrm_atendimento_tarefas(cvcrm_atendimento_id);

-- 35: cvcrm_atendimento_workflow
CREATE TABLE IF NOT EXISTS cvcrm_atendimento_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_atendimento_id INTEGER NOT NULL,
  etapa VARCHAR(100),
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_saida TIMESTAMP WITH TIME ZONE,
  tempo_permanencia_horas INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_work_atend ON cvcrm_atendimento_workflow(cvcrm_atendimento_id);

-- 36: cvcrm_atendimento_times
CREATE TABLE IF NOT EXISTS cvcrm_atendimento_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(100),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_times_nome ON cvcrm_atendimento_times(nome);

-- 37: cvcrm_atendimento_time_integrantes
CREATE TABLE IF NOT EXISTS cvcrm_atendimento_time_integrantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_time_id INTEGER NOT NULL,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  papel VARCHAR(50),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atend_time_int_time ON cvcrm_atendimento_time_integrantes(cvcrm_time_id);

-- =====================================================
-- PART 6: DOMAIN ASSISTÊNCIAS (5 tables)
-- =====================================================

-- 38: cvcrm_assistencias
CREATE TABLE IF NOT EXISTS cvcrm_assistencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  protocolo VARCHAR(100),
  tipo VARCHAR(100),
  descricao TEXT,
  status VARCHAR(50),
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  unidade_id INTEGER,
  unidade_nome VARCHAR(255),
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistencias_cvcrm_id ON cvcrm_assistencias(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_assistencias_protocolo ON cvcrm_assistencias(protocolo);
CREATE INDEX IF NOT EXISTS idx_assistencias_status ON cvcrm_assistencias(status);

-- 39: cvcrm_assistencia_itens
CREATE TABLE IF NOT EXISTS cvcrm_assistencia_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_assistencia_id INTEGER NOT NULL,
  item VARCHAR(255),
  descricao TEXT,
  quantidade INTEGER,
  status VARCHAR(50),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assist_itens_assist ON cvcrm_assistencia_itens(cvcrm_assistencia_id);

-- 40: cvcrm_assistencia_visitas
CREATE TABLE IF NOT EXISTS cvcrm_assistencia_visitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_assistencia_id INTEGER NOT NULL,
  data_agendamento TIMESTAMP WITH TIME ZONE,
  data_realizacao TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50),
  observacoes TEXT,
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assist_visit_assist ON cvcrm_assistencia_visitas(cvcrm_assistencia_id);

-- 41: cvcrm_assistencia_workflow
CREATE TABLE IF NOT EXISTS cvcrm_assistencia_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_assistencia_id INTEGER NOT NULL,
  etapa VARCHAR(100),
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_saida TIMESTAMP WITH TIME ZONE,
  tempo_permanencia_horas INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assist_work_assist ON cvcrm_assistencia_workflow(cvcrm_assistencia_id);

-- 42: cvcrm_assistencia_tempo
CREATE TABLE IF NOT EXISTS cvcrm_assistencia_tempo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_assistencia_id INTEGER NOT NULL,
  tipo VARCHAR(50),
  tempo_minutos INTEGER,
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  usuario_id INTEGER,
  usuario_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assist_tempo_assist ON cvcrm_assistencia_tempo(cvcrm_assistencia_id);

-- =====================================================
-- PART 7: DOMAIN COMERCIAIS (15 tables)
-- =====================================================

-- 43: cvcrm_comissoes
CREATE TABLE IF NOT EXISTS cvcrm_comissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  tipo VARCHAR(50),
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  reserva_id INTEGER,
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  percentual DECIMAL(5, 2),
  valor DECIMAL(15, 2),
  status VARCHAR(50),
  data_previsao DATE,
  data_pagamento DATE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_cvcrm_id ON cvcrm_comissoes(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_corretor ON cvcrm_comissoes(corretor_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON cvcrm_comissoes(status);

-- 44: cvcrm_comissao_pagamentos
CREATE TABLE IF NOT EXISTS cvcrm_comissao_pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_comissao_id INTEGER NOT NULL,
  valor DECIMAL(15, 2),
  data_pagamento DATE,
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comiss_pag_comissao ON cvcrm_comissao_pagamentos(cvcrm_comissao_id);

-- 45: cvcrm_corretores (expande a tabela users)
CREATE TABLE IF NOT EXISTS cvcrm_corretores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(50),
  celular VARCHAR(50),
  creci VARCHAR(50),
  creci_uf VARCHAR(2),
  categoria VARCHAR(50),
  nivel VARCHAR(50),
  time VARCHAR(100),
  imobiliaria_id INTEGER,
  imobiliaria_nome VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corretores_cvcrm_id ON cvcrm_corretores(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_corretores_cpf ON cvcrm_corretores(cpf);
CREATE INDEX IF NOT EXISTS idx_corretores_imob ON cvcrm_corretores(imobiliaria_id);

-- 46: cvcrm_imobiliarias
CREATE TABLE IF NOT EXISTS cvcrm_imobiliarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(20),
  creci VARCHAR(50),
  creci_uf VARCHAR(2),
  email VARCHAR(255),
  telefone VARCHAR(50),
  endereco_completo TEXT,
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imobiliarias_cvcrm_id ON cvcrm_imobiliarias(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_imobiliarias_cnpj ON cvcrm_imobiliarias(cnpj);

-- 47: cvcrm_precadastros
CREATE TABLE IF NOT EXISTS cvcrm_precadastros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  protocolo VARCHAR(100),
  nome_cliente VARCHAR(255),
  cpf VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(50),
  status VARCHAR(50),
  data_cadastro TIMESTAMP WITH TIME ZONE,
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precadastros_cvcrm_id ON cvcrm_precadastros(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_precadastros_status ON cvcrm_precadastros(status);

-- 48: cvcrm_precadastro_workflow
CREATE TABLE IF NOT EXISTS cvcrm_precadastro_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_precadastro_id INTEGER NOT NULL,
  etapa VARCHAR(100),
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_saida TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_precad_work_precad ON cvcrm_precadastro_workflow(cvcrm_precadastro_id);

-- 49: cvcrm_repasses
CREATE TABLE IF NOT EXISTS cvcrm_repasses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  protocolo VARCHAR(100),
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  unidade_atual_id INTEGER,
  unidade_atual_nome VARCHAR(255),
  unidade_destino_id INTEGER,
  unidade_destino_nome VARCHAR(255),
  status VARCHAR(50),
  data_solicitacao TIMESTAMP WITH TIME ZONE,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repasses_cvcrm_id ON cvcrm_repasses(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_repasses_status ON cvcrm_repasses(status);

-- 50: cvcrm_repasse_workflow
CREATE TABLE IF NOT EXISTS cvcrm_repasse_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_repasse_id INTEGER NOT NULL,
  etapa VARCHAR(100),
  data_entrada TIMESTAMP WITH TIME ZONE,
  data_saida TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repasse_work_repasse ON cvcrm_repasse_workflow(cvcrm_repasse_id);

-- 51: cvcrm_pesquisas
CREATE TABLE IF NOT EXISTS cvcrm_pesquisas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  titulo VARCHAR(255),
  descricao TEXT,
  tipo VARCHAR(50),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(50),
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  nota DECIMAL(3, 2),
  comentarios TEXT,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pesquisas_cvcrm_id ON cvcrm_pesquisas(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_status ON cvcrm_pesquisas(status);

-- 52: cvcrm_unidades
CREATE TABLE IF NOT EXISTS cvcrm_unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  codigo VARCHAR(100),
  nome VARCHAR(255),
  tipo VARCHAR(50),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  bloco VARCHAR(50),
  andar VARCHAR(50),
  area_privativa DECIMAL(10, 2),
  area_total DECIMAL(10, 2),
  dormitorios INTEGER,
  vagas INTEGER,
  situacao VARCHAR(50),
  valor_venda DECIMAL(15, 2),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unidades_cvcrm_id ON cvcrm_unidades(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_unidades_codigo ON cvcrm_unidades(codigo);
CREATE INDEX IF NOT EXISTS idx_unidades_empreend ON cvcrm_unidades(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_unidades_situacao ON cvcrm_unidades(situacao);

-- 53: cvcrm_unidade_situacoes
CREATE TABLE IF NOT EXISTS cvcrm_unidade_situacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(100),
  descricao TEXT,
  cor VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unidade_sit_nome ON cvcrm_unidade_situacoes(nome);

-- 54: cvcrm_unidade_precos
CREATE TABLE IF NOT EXISTS cvcrm_unidade_precos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_unidade_id INTEGER NOT NULL,
  tipo_preco VARCHAR(50),
  valor DECIMAL(15, 2),
  data_vigencia DATE,
  serie_id INTEGER,
  serie_nome VARCHAR(100),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unidade_precos_unidade ON cvcrm_unidade_precos(cvcrm_unidade_id);

-- 55: cvcrm_series
CREATE TABLE IF NOT EXISTS cvcrm_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(100),
  descricao TEXT,
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_cvcrm_id ON cvcrm_series(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_series_empreend ON cvcrm_series(empreendimento_id);

-- =====================================================
-- PART 8: DOMAIN PROCESSOS, VENDAS, ADMIN (9 tables)
-- =====================================================

-- 56: cvcrm_processos
CREATE TABLE IF NOT EXISTS cvcrm_processos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  numero_processo VARCHAR(100),
  tipo VARCHAR(100),
  assunto VARCHAR(255),
  descricao TEXT,
  status VARCHAR(50),
  data_abertura TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processos_cvcrm_id ON cvcrm_processos(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_processos_numero ON cvcrm_processos(numero_processo);
CREATE INDEX IF NOT EXISTS idx_processos_status ON cvcrm_processos(status);

-- 57: cvcrm_processo_demandas
CREATE TABLE IF NOT EXISTS cvcrm_processo_demandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_processo_id INTEGER NOT NULL,
  tipo VARCHAR(100),
  descricao TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE,
  data_vencimento DATE,
  status VARCHAR(50),
  responsavel_id INTEGER,
  responsavel_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processo_dem_processo ON cvcrm_processo_demandas(cvcrm_processo_id);

-- 58: cvcrm_distratos
CREATE TABLE IF NOT EXISTS cvcrm_distratos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  protocolo VARCHAR(100),
  reserva_id INTEGER,
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  unidade_id INTEGER,
  unidade_nome VARCHAR(255),
  motivo TEXT,
  status VARCHAR(50),
  data_solicitacao TIMESTAMP WITH TIME ZONE,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  valor_multa DECIMAL(15, 2),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distratos_cvcrm_id ON cvcrm_distratos(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_distratos_protocolo ON cvcrm_distratos(protocolo);
CREATE INDEX IF NOT EXISTS idx_distratos_status ON cvcrm_distratos(status);

-- 59: cvcrm_vendas
CREATE TABLE IF NOT EXISTS cvcrm_vendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  numero_venda VARCHAR(100),
  tipo VARCHAR(50),
  data_venda TIMESTAMP WITH TIME ZONE,
  valor_venda DECIMAL(15, 2),
  status VARCHAR(50),
  cliente_id INTEGER,
  cliente_nome VARCHAR(255),
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),
  unidade_id INTEGER,
  unidade_nome VARCHAR(255),
  corretor_id INTEGER,
  corretor_nome VARCHAR(255),
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_cvcrm_id ON cvcrm_vendas(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_vendas_numero ON cvcrm_vendas(numero_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON cvcrm_vendas(status);

-- 60: cvcrm_venda_simulacoes
CREATE TABLE IF NOT EXISTS cvcrm_venda_simulacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  cvcrm_venda_id INTEGER NOT NULL,
  tipo_financiamento VARCHAR(50),
  valor_simulado DECIMAL(15, 2),
  entrada DECIMAL(15, 2),
  parcelas INTEGER,
  valor_parcela DECIMAL(15, 2),
  taxa_juros DECIMAL(5, 4),
  data_simulacao TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venda_sim_venda ON cvcrm_venda_simulacoes(cvcrm_venda_id);

-- 61: cvcrm_campanhas
CREATE TABLE IF NOT EXISTS cvcrm_campanhas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255),
  descricao TEXT,
  tipo VARCHAR(50),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(50),
  orcamento DECIMAL(15, 2),
  investimento DECIMAL(15, 2),
  leads_gerados INTEGER,
  conversoes INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_cvcrm_id ON cvcrm_campanhas(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON cvcrm_campanhas(status);

-- 62: cvcrm_usuarios
CREATE TABLE IF NOT EXISTS cvcrm_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255),
  email VARCHAR(255),
  login VARCHAR(100),
  perfil VARCHAR(50),
  departamento VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_cvcrm_id ON cvcrm_usuarios(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON cvcrm_usuarios(email);

-- 63: cvcrm_campos_personalizados
CREATE TABLE IF NOT EXISTS cvcrm_campos_personalizados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(100),
  tipo_campo VARCHAR(50),
  entidade VARCHAR(50),
  opcoes JSONB,
  obrigatorio BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campos_cvcrm_id ON cvcrm_campos_personalizados(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_campos_entidade ON cvcrm_campos_personalizados(entidade);

-- 64: cvcrm_agendamentos
CREATE TABLE IF NOT EXISTS cvcrm_agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  titulo VARCHAR(255),
  descricao TEXT,
  tipo VARCHAR(50),
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  local VARCHAR(255),
  participantes JSONB DEFAULT '[]',
  status VARCHAR(50),
  lead_id INTEGER,
  cliente_id INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_cvcrm_id ON cvcrm_agendamentos(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON cvcrm_agendamentos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON cvcrm_agendamentos(status);

-- =====================================================
-- PART 9: EMPREENDIMENTOS (existente, garantindo)
-- =====================================================

CREATE TABLE IF NOT EXISTS cvcrm_empreendimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cvcrm_id INTEGER UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50),
  status VARCHAR(50),
  endereco_completo TEXT,
  cep VARCHAR(10),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  data_lancamento DATE,
  data_entrega_prevista DATE,
  total_unidades INTEGER,
  cvcrm_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empreend_cvcrm_id ON cvcrm_empreendimentos(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_empreend_nome ON cvcrm_empreendimentos(nome);
CREATE INDEX IF NOT EXISTS idx_empreend_status ON cvcrm_empreendimentos(status);

-- =====================================================
-- PART 10: UPDATE TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para tabelas com updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
          AND table_name LIKE 'cvcrm_%'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_timestamp ON %I;
            CREATE TRIGGER update_%I_timestamp
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_timestamp_column();
        ', t, t, t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PRONTO! 64+ tabelas criadas para sincronização completa
-- Total de endpoints: 68
-- Total de agentes: 28
-- =====================================================
