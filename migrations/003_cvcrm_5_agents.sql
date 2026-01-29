-- Migration: CV CRM 5 Agents Sync (Real Data)
-- Data: 2026-01-17
-- Baseado em estruturas reais da API Comercial

-- ============================================================================
-- CONTROLE DE SYNC
-- ============================================================================

-- Tabela de logs de sincronização
CREATE TABLE IF NOT EXISTS cvcrm_sync_logs (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabela de cursores para sync incremental
CREATE TABLE IF NOT EXISTS cvcrm_sync_cursors (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(200) NOT NULL UNIQUE,
    last_sync_at TIMESTAMP,
    last_reference VARCHAR(100),
    last_reference_date TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- DOMÍNIO: LEADS (3 tabelas)
-- ============================================================================

-- 1. Leads Core (19.642 registros)
CREATE TABLE IF NOT EXISTS cvcrm_leads (
    id SERIAL PRIMARY KEY,

    -- IDs e referências
    idlead INTEGER NOT NULL UNIQUE,
    codigointerno INTEGER,

    -- Dados pessoais
    nome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(50),
    documento_tipo VARCHAR(20),
    documento VARCHAR(50),
    sexo VARCHAR(1),
    profissao VARCHAR(255),

    -- Endereço
    cep VARCHAR(20),
    endereco VARCHAR(255),
    numero VARCHAR(50),
    bairro VARCHAR(100),
    complemento VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(100),

    -- Dados comerciais
    score INTEGER,
    renda_familiar DECIMAL(15,2),
    valor_negocio DECIMAL(15,2),
    possibilidade_venda INTEGER,

    -- Origem e mídia
    origem VARCHAR(100),
    midia_principal VARCHAR(255),
    midias JSONB, -- array de strings

    -- Relacionamentos (armazenados como JSONB para manter estrutura da API)
    gestor JSONB, -- {id, nome, email}
    imobiliaria JSONB, -- {id, nome}
    corretor JSONB, -- {id, nome, email}
    situacao JSONB, -- {id, nome}
    empreendimento JSONB, -- array [{id, nome}]

    -- IDs para joins (extraídos do JSONB)
    gestor_id INTEGER,
    imobiliaria_id INTEGER,
    corretor_id INTEGER,
    situacao_id INTEGER,

    -- Datas
    data_cad TIMESTAMP,
    data_reativacao TIMESTAMP,
    data_vencimento TIMESTAMP,
    ultima_data_conversao TIMESTAMP,
    data_cancelamento TIMESTAMP,
    data_venda TIMESTAMP,

    -- Cancelamento
    motivo_cancelamento JSONB,
    submotivo_cancelamento JSONB,

    -- Quantidades
    qtde_simulacoes_associadas INTEGER DEFAULT 0,
    qtde_reservas_associadas INTEGER DEFAULT 0,

    -- Links CV CRM
    link_interacoes TEXT,
    link_simulacoes TEXT,
    link_reservas TEXT,
    link_interesses TEXT,

    -- Integração RD Station
    idrd_station VARCHAR(255),
    link_rdstation TEXT,

    -- Campos adicionais
    campos_adicionais JSONB,
    tags JSONB, -- array de strings

    -- Metadata
    autor_ultima_alteracao VARCHAR(255),
    empreendimentos_id TEXT,

    -- Controle interno
    synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes para leads
CREATE INDEX IF NOT EXISTS idx_leads_idlead ON cvcrm_leads(idlead);
CREATE INDEX IF NOT EXISTS idx_leads_email ON cvcrm_leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON cvcrm_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_corretor_id ON cvcrm_leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_leads_situacao_id ON cvcrm_leads(situacao_id);
CREATE INDEX IF NOT EXISTS idx_leads_data_cad ON cvcrm_leads(data_cad);
CREATE INDEX IF NOT EXISTS idx_leads_synced_at ON cvcrm_leads(synced_at);

-- 2. Leads Interações (35.305 registros)
CREATE TABLE IF NOT EXISTS cvcrm_leads_interacoes (
    id SERIAL PRIMARY KEY,

    -- IDs
    idinteracao INTEGER NOT NULL UNIQUE,
    idlead INTEGER NOT NULL,

    -- Referência (para sync incremental)
    referencia VARCHAR(100),
    referencia_data TIMESTAMP,

    -- Status
    ativo VARCHAR(1) DEFAULT 'S',

    -- Dados da interação
    tipo VARCHAR(10), -- W = WhatsApp, etc
    descricao TEXT,
    data_cad TIMESTAMP,

    -- Situação e flags
    situacao VARCHAR(100),
    enviar_corretor VARCHAR(1),
    enviar_imobiliaria VARCHAR(1),
    enviar_cliente VARCHAR(1),

    -- Relacionamentos
    idimobiliaria INTEGER,
    imobiliaria VARCHAR(255),
    idcorretor INTEGER,
    corretor VARCHAR(255),
    idgestor INTEGER,
    gestor_interacao VARCHAR(255),
    corretor_interacao VARCHAR(255),
    imobiliaria_interacao VARCHAR(255),

    -- Controle interno
    synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_interacao_lead FOREIGN KEY (idlead)
        REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE
);

-- Indexes para interações
CREATE INDEX IF NOT EXISTS idx_interacoes_idinteracao ON cvcrm_leads_interacoes(idinteracao);
CREATE INDEX IF NOT EXISTS idx_interacoes_idlead ON cvcrm_leads_interacoes(idlead);
CREATE INDEX IF NOT EXISTS idx_interacoes_referencia ON cvcrm_leads_interacoes(referencia);
CREATE INDEX IF NOT EXISTS idx_interacoes_data ON cvcrm_leads_interacoes(referencia_data);
CREATE INDEX IF NOT EXISTS idx_interacoes_tipo ON cvcrm_leads_interacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_interacoes_corretor ON cvcrm_leads_interacoes(idcorretor);

-- 3. Leads Tarefas (8.182 registros)
CREATE TABLE IF NOT EXISTS cvcrm_leads_tarefas (
    id SERIAL PRIMARY KEY,

    -- IDs
    idtarefa INTEGER NOT NULL UNIQUE,
    idlead INTEGER, -- pode ser NULL em algumas tarefas

    -- Responsável
    responsavel VARCHAR(255),
    tipo_responsavel VARCHAR(50), -- 'imobiliária', 'corretor', 'gestor'
    idusuario INTEGER,
    idcorretor INTEGER,
    idimobiliaria INTEGER,

    -- Dados da tarefa
    nome VARCHAR(255),
    descricao TEXT,
    tipo VARCHAR(100),

    -- Datas
    data_cad TIMESTAMP,
    data TIMESTAMP, -- data agendada
    data_vencimento TIMESTAMP,
    data_conclusao TIMESTAMP,
    data_cancelamento TIMESTAMP,

    -- Status
    situacao VARCHAR(100),
    nota_conclusao TEXT,
    observacao TEXT,

    -- Controle interno
    synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes para tarefas
CREATE INDEX IF NOT EXISTS idx_tarefas_idtarefa ON cvcrm_leads_tarefas(idtarefa);
CREATE INDEX IF NOT EXISTS idx_tarefas_idlead ON cvcrm_leads_tarefas(idlead);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON cvcrm_leads_tarefas(tipo_responsavel);
CREATE INDEX IF NOT EXISTS idx_tarefas_data ON cvcrm_leads_tarefas(data);
CREATE INDEX IF NOT EXISTS idx_tarefas_situacao ON cvcrm_leads_tarefas(situacao);

-- ============================================================================
-- DOMÍNIO: ATENDIMENTOS (1 tabela + 1 relacionada)
-- ============================================================================

-- 4. Atendimentos (1.558 registros)
CREATE TABLE IF NOT EXISTS cvcrm_atendimentos (
    id SERIAL PRIMARY KEY,

    -- IDs
    idatendimento INTEGER NOT NULL UNIQUE,

    -- Dados do cliente
    nome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(50),
    documento VARCHAR(50),

    -- Dados do atendimento
    titulo VARCHAR(255),
    descricao TEXT,
    tipo VARCHAR(100),
    classificacao VARCHAR(100),
    prioridade VARCHAR(1),
    humor_cliente VARCHAR(50),
    nota_atendimento TEXT,

    -- Situação
    idsituacao INTEGER,
    situacao VARCHAR(100),
    data_cad TIMESTAMP,
    data_ultima_modificacao_situacao TIMESTAMP,
    ultima_interacao TIMESTAMP,

    -- Assunto e sub-assunto
    idassunto INTEGER,
    assunto VARCHAR(255),
    idsubassunto INTEGER,
    subassunto VARCHAR(255),

    -- SLA
    sla_assunto INTEGER,
    data_vencimento_assunto TIMESTAMP,
    sla_subassunto INTEGER,
    data_vencimento_subassunto TIMESTAMP,
    sla_workflow INTEGER,
    data_vencimento_workflow TIMESTAMP,

    -- Tempo
    tempo_resposta INTEGER,
    tempo_finalizado INTEGER,

    -- Relacionamentos
    idassistencia INTEGER,
    imobiliaria VARCHAR(255),
    corretor VARCHAR(255),
    idresponsavel INTEGER,
    responsavel VARCHAR(255),

    -- Unidade e empreendimento
    ids_unidades INTEGER,
    unidades VARCHAR(100),
    idbloco INTEGER,
    bloco VARCHAR(100),
    empreendimento JSONB, -- {idempreendimento, nome}
    idempreendimento INTEGER, -- extraído do JSONB

    -- Campos adicionais
    campos_adicionais JSONB,

    -- Arrays nested (armazenados separadamente)
    -- arquivos -> cvcrm_atendimentos_arquivos
    -- respostas -> pode ser adicionado depois se necessário

    -- Controle interno
    synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes para atendimentos
CREATE INDEX IF NOT EXISTS idx_atendimentos_id ON cvcrm_atendimentos(idatendimento);
CREATE INDEX IF NOT EXISTS idx_atendimentos_email ON cvcrm_atendimentos(email);
CREATE INDEX IF NOT EXISTS idx_atendimentos_telefone ON cvcrm_atendimentos(telefone);
CREATE INDEX IF NOT EXISTS idx_atendimentos_situacao ON cvcrm_atendimentos(idsituacao);
CREATE INDEX IF NOT EXISTS idx_atendimentos_empreendimento ON cvcrm_atendimentos(idempreendimento);
CREATE INDEX IF NOT EXISTS idx_atendimentos_data_cad ON cvcrm_atendimentos(data_cad);

-- Tabela de arquivos dos atendimentos
CREATE TABLE IF NOT EXISTS cvcrm_atendimentos_arquivos (
    id SERIAL PRIMARY KEY,

    -- Relacionamento
    idatendimento INTEGER NOT NULL,

    -- Dados do arquivo
    idarquivo INTEGER NOT NULL,
    nome VARCHAR(255),
    servidor VARCHAR(255),
    tipo VARCHAR(100),
    tamanho INTEGER,
    data_cad TIMESTAMP,
    url TEXT,

    -- Controle interno
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_arquivo_atendimento FOREIGN KEY (idatendimento)
        REFERENCES cvcrm_atendimentos(idatendimento) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_arquivos_atendimento ON cvcrm_atendimentos_arquivos(idatendimento);
CREATE INDEX IF NOT EXISTS idx_arquivos_idarquivo ON cvcrm_atendimentos_arquivos(idarquivo);

-- ============================================================================
-- DOMÍNIO: ASSISTÊNCIAS (1 tabela)
-- ============================================================================

-- 5. Assistências (dados limitados por enquanto)
CREATE TABLE IF NOT EXISTS cvcrm_assistencias (
    id SERIAL PRIMARY KEY,

    -- IDs
    idassistencia INTEGER NOT NULL UNIQUE,

    -- Dados básicos
    situacao VARCHAR(100),
    idsituacao INTEGER,
    idatendimento INTEGER,
    protocolo_atendimento VARCHAR(100),

    -- Datas
    cadastro TIMESTAMP,

    -- SLA
    sla_assistencia_vencido BOOLEAN,

    -- Controle interno
    synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes para assistências
CREATE INDEX IF NOT EXISTS idx_assistencias_id ON cvcrm_assistencias(idassistencia);
CREATE INDEX IF NOT EXISTS idx_assistencias_situacao ON cvcrm_assistencias(idsituacao);
CREATE INDEX IF NOT EXISTS idx_assistencias_atendimento ON cvcrm_assistencias(idatendimento);

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas as tabelas principais
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON cvcrm_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interacoes_updated_at BEFORE UPDATE ON cvcrm_leads_interacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON cvcrm_leads_tarefas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_atendimentos_updated_at BEFORE UPDATE ON cvcrm_atendimentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assistencias_updated_at BEFORE UPDATE ON cvcrm_assistencias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cursors_updated_at BEFORE UPDATE ON cvcrm_sync_cursors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE cvcrm_leads IS 'Leads do CV CRM - 19.642 registros (API Comercial)';
COMMENT ON TABLE cvcrm_leads_interacoes IS 'Interações dos leads - 35.305 registros (API cv)';
COMMENT ON TABLE cvcrm_leads_tarefas IS 'Tarefas dos leads - 8.182 registros (API Comercial)';
COMMENT ON TABLE cvcrm_atendimentos IS 'Atendimentos - 1.558 registros (API Relacionamento)';
COMMENT ON TABLE cvcrm_assistencias IS 'Assistências técnicas - 1 registro (API Relacionamento)';

COMMENT ON COLUMN cvcrm_leads.gestor IS 'Objeto JSON: {id, nome, email}';
COMMENT ON COLUMN cvcrm_leads.imobiliaria IS 'Objeto JSON: {id, nome}';
COMMENT ON COLUMN cvcrm_leads.corretor IS 'Objeto JSON: {id, nome, email}';
COMMENT ON COLUMN cvcrm_leads.situacao IS 'Objeto JSON: {id, nome}';
COMMENT ON COLUMN cvcrm_leads.empreendimento IS 'Array JSON: [{id, nome}]';
