# Convenções do Banco de Dados - Prática

## 📋 Resumo Executivo

Este documento define convenções obrigatórias para novo código no banco de dados PostgreSQL do Prática.

**Status**: Ativo desde Fevereiro 2026
**Versão**: 1.0 (Pós-Padronização Phase 1)

---

## 🏗️ Nomenclatura

### Tabelas
- **Padrão**: `snake_case`, **plural**, sem prefixos desnecessários
- **Prefixos domínio**: `cvcrm_*`, `whatsapp_*`, `salva_leads_*`, `recepcao_*`

**✅ Correto**:
```sql
CREATE TABLE cvcrm_leads (...)
CREATE TABLE whatsapp_messages (...)
CREATE TABLE recepcao_plantoes (...)
```

**❌ Incorreto**:
```sql
CREATE TABLE Lead (...)           -- PascalCase ❌
CREATE TABLE cvcrm_lead (...)     -- singular ❌
CREATE TABLE lead_table (...)     -- _table suffix ❌
```

### Colunas
- **Padrão**: `snake_case`
- **IDs primários**: `id` (tipo UUID)
- **Foreign Keys**: `{table}_id` (ex: `workspace_id`, `lead_id`)
- **Booleans**: `is_*` ou `has_*` (ex: `is_active`, `has_children`)
- **Datas**: `*_at` ou `*_date` (ex: `created_at`, `birth_date`)
- **Contadores**: `*_count` (ex: `attempt_count`)

**✅ Correto**:
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  workspace_id INTEGER NOT NULL,        -- FK
  lead_name VARCHAR(255),               -- Descrição
  phone_number VARCHAR(20),             -- snake_case
  created_at TIMESTAMP WITH TIME ZONE,  -- Timestamp
  is_active BOOLEAN DEFAULT TRUE,       -- Boolean
  attempt_count INTEGER DEFAULT 0       -- Counter
);
```

**❌ Incorreto**:
```sql
CREATE TABLE leads (
  id UUID,
  workspaceId INTEGER,                  -- camelCase ❌
  leadName VARCHAR(255),                -- camelCase ❌
  phone VARCHAR(20),                    -- ambíguo ❌
  createdAt TIMESTAMP,                  -- camelCase ❌
  active CHAR(1),                       -- boolean como char ❌
  attempts INT                          -- ambíguo ❌
);
```

### Índices
- **Padrão**: `idx_<tabela>_<colunas>`
- **Unique**: `uk_<tabela>_<colunas>`
- **Primary Key**: `pk_<tabela>`

**✅ Correto**:
```sql
CREATE INDEX idx_cvcrm_leads_workspace_status
  ON cvcrm_leads(workspace_id, status);

CREATE UNIQUE INDEX uk_users_email
  ON users(email);
```

### Foreign Keys
- **Padrão**: `fk_<tabela>_<ref_tabela>`

**✅ Correto**:
```sql
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_cvcrm_leads_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
```

### Views
- **Padrão**: `vw_<descrição>` ou `v_<descrição>`

**✅ Correto**:
```sql
CREATE VIEW vw_leads_active AS ...
CREATE VIEW v_lead_summary AS ...
```

### Functions/Procedures
- **Padrão**: `fn_<descrição>` ou `sp_<descrição>`
- **Retorno de função**: incluído no nome

**✅ Correto**:
```sql
CREATE FUNCTION fn_calculate_commission(p_venda_id INTEGER)
  RETURNS DECIMAL ...

CREATE FUNCTION fn_get_active_leads()
  RETURNS TABLE (...) ...
```

---

## 📊 Tipos de Dados

### IDs e Chaves Primárias
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Nunca usar**:
- ❌ `SERIAL` (inteiros sequenciais)
- ❌ `BIGSERIAL` (sem UUID)
- ❌ `VARCHAR(36)` (strings em vez de UUID nativo)

### Foreign Keys
```sql
workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL
```

### Números
```sql
-- Dinheiro: sempre NUMERIC, nunca FLOAT
valor_venda NUMERIC(15,2) NOT NULL  -- R$ 9.999.999,99

-- Percentuais: 0.0000 a 1.0000 (nunca 0-100)
percentual NUMERIC(5,4) NOT NULL    -- 0.0500 = 5%

-- Inteiros: INTEGER (4 bytes) ou BIGINT (8 bytes)
quantidade INTEGER NOT NULL
grande_numero BIGINT
```

### Datas e Horas
```sql
-- SEMPRE com TIME ZONE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
birth_date DATE  -- Apenas data, sem hora

-- Nunca usar
-- ❌ TIMESTAMP (sem timezone)
-- ❌ VARCHAR/TEXT para datas
```

### Booleanos
```sql
-- ✅ Correto
is_active BOOLEAN DEFAULT TRUE
has_children BOOLEAN NOT NULL

-- ❌ Nunca
-- CHAR(1) Y/N
-- INTEGER 0/1
-- VARCHAR 'true'/'false'
```

### Textos
```sql
-- Curto (até 255 caracteres)
nome VARCHAR(255) NOT NULL
email VARCHAR(100) NOT NULL

-- Médio (até 1000 caracteres)
descricao VARCHAR(1000)

-- Longo (sem limite)
conteudo TEXT
observacoes TEXT

-- Nunca
-- ❌ CHAR(N) (espaço preenchido)
-- ❌ VARCHAR sem tamanho limite
-- ❌ BYTEA para texto
```

### JSON/JSONB
**Use apenas para**:
- Dados não estruturados (raw API responses)
- Campos customizados do usuário
- Metadata/settings sem schema definido

**Nunca use JSONB para**:
- ❌ Relacionamentos (use FK)
- ❌ Arrays de valores (use tabela join)
- ❌ Dados que podem ser queryados frequentemente

**✅ Correto**:
```sql
-- Metadata do usuário (não estruturado)
metadata JSONB DEFAULT '{}'::JSONB

-- Settings da aplicação
settings JSONB

-- Raw response de API externa
cvcrm_raw_data JSONB
```

**❌ Incorreto**:
```sql
-- Tags como JSONB (deveria ser tabela)
tags JSONB  -- ['tag1', 'tag2']

-- Related objects como JSONB
corretor JSONB  -- {id, nome, email}

-- Fields que serão consultados frequentemente
dados JSONB  -- {'campo1': valor, 'campo2': valor}
```

---

## 🔗 Multi-Tenant (Workspace)

### Obrigatoriedade
**TODAS as tabelas com dados do usuário DEVEM ter `workspace_id`**

```sql
CREATE TABLE exemplo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- ... outros campos
);

-- Não é opcional:
-- ❌ workspace_id INTEGER (pode ser NULL)
-- ❌ SEM workspace_id (falta coluna)
```

### Índices
**Primeira coluna de índices DEVE ser workspace_id**

```sql
-- ✅ Correto: workspace_id é primeira coluna
CREATE INDEX idx_cvcrm_leads_workspace_status
  ON cvcrm_leads(workspace_id, status);

-- ❌ Incorreto: workspace_id não é primeira coluna
CREATE INDEX idx_cvcrm_leads_status_workspace
  ON cvcrm_leads(status, workspace_id);
```

### Foreign Keys
```sql
ALTER TABLE exemplo
  ADD CONSTRAINT fk_exemplo_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
```

---

## ⏰ Timestamps

### Padrão
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Trigger para Atualização Automática
```sql
CREATE TRIGGER update_exemplo_updated_at
  BEFORE UPDATE ON exemplo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Nunca usar
- ❌ `TIMESTAMP` (sem timezone)
- ❌ `BIGINT` para timestamps (usar epoch)
- ❌ `VARCHAR` para datas

---

## 🔐 Foreign Keys

### Obrigatoriedade
**TODAS as colunas `*_id` DEVEM ter Foreign Key Constraint**

```sql
-- ✅ Correto
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_cvcrm_leads_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  ON DELETE CASCADE;

-- ❌ Incorreto: sem FK
ALTER TABLE cvcrm_leads
  ADD COLUMN workspace_id INTEGER;
```

### ON DELETE Behavior

**ON DELETE CASCADE**: Quando pai é deletado, filho também é
```sql
-- Exemplo: deletar lead remove interações
ALTER TABLE cvcrm_lead_interacoes
  ADD CONSTRAINT fk_lead_interacoes_lead
  FOREIGN KEY (lead_id) REFERENCES cvcrm_leads(id)
  ON DELETE CASCADE;
```

**ON DELETE SET NULL**: Quando pai é deletado, filho fica NULL
```sql
-- Exemplo: deletar corretor deixa lead sem corretor
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_leads_corretor
  FOREIGN KEY (corretor_id) REFERENCES cvcrm_corretores(id)
  ON DELETE SET NULL;
```

**ON DELETE RESTRICT**: Não permite deletar se houver filhos
```sql
-- Exemplo: não permite deletar empreendimento com unidades
ALTER TABLE cvcrm_unidades
  ADD CONSTRAINT fk_unidades_empreendimento
  FOREIGN KEY (empreendimento_id) REFERENCES cvcrm_empreendimentos(id)
  ON DELETE RESTRICT;
```

### Regra de Decisão
```
Tipo de dado:
├─ Metadado (corretor, situacao) → ON DELETE SET NULL
├─ Composição (interação pertence a lead) → ON DELETE CASCADE
└─ Referência estável (unidade em empreendimento) → ON DELETE RESTRICT
```

---

## ✅ Constraints

### NOT NULL
```sql
-- ✅ Use quando faz sentido semanticamente
nome VARCHAR(255) NOT NULL
email VARCHAR(100) NOT NULL
created_at TIMESTAMP WITH TIME ZONE NOT NULL

-- ⚠️ Dados opcionais devem permitir NULL
phone_number VARCHAR(20)  -- Opcional, pode ser NULL
notes TEXT  -- Opcional
```

### DEFAULT
```sql
-- ✅ Use para valores padrão razoáveis
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
status VARCHAR(20) DEFAULT 'pendente'
attempt_count INTEGER DEFAULT 0

-- ❌ Evite defaults não documentados
metadata JSONB DEFAULT '{}'::JSONB  -- Precisa de contexto
```

### UNIQUE
```sql
-- ✅ Para garantir unicidade lógica
CREATE UNIQUE INDEX uk_users_email ON users(email);
CREATE UNIQUE INDEX uk_tags_workspace_name
  ON tags(workspace_id, name);  -- Unique por workspace

-- Nunca use apenas UNIQUE sem colocar em constraint
-- (Sempre ser explícito no schema)
```

### CHECK
```sql
-- ✅ Validação em nível de schema
status VARCHAR(20) CHECK (status IN ('ativa', 'pausada', 'cancelada'))
percentual NUMERIC(5,4) CHECK (percentual >= 0 AND percentual <= 1)
idade INTEGER CHECK (idade >= 0 AND idade <= 150)
```

---

## 📐 Estrutura de Criação

### Template Completo
```sql
-- 1. Criar tabela com todos os constraints
CREATE TABLE nova_tabela (
  -- IDs e Workspace
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL,

  -- Foreign Keys
  parent_id UUID REFERENCES outra_tabela(id) ON DELETE CASCADE,

  -- Dados principais
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,

  -- Flags
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Números
  quantidade INTEGER DEFAULT 0,
  valor NUMERIC(15,2),
  percentual NUMERIC(5,4) CHECK (percentual >= 0 AND percentual <= 1),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT fk_nova_tabela_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT uk_nova_tabela_workspace_nome
    UNIQUE(workspace_id, nome),
  CONSTRAINT ck_nova_tabela_valores
    CHECK (quantidade >= 0)
);

-- 2. Criar índices
CREATE INDEX idx_nova_tabela_workspace ON nova_tabela(workspace_id);
CREATE INDEX idx_nova_tabela_workspace_ativo ON nova_tabela(workspace_id, is_active)
  WHERE is_active = TRUE;

-- 3. Criar trigger para updated_at
CREATE TRIGGER update_nova_tabela_updated_at
  BEFORE UPDATE ON nova_tabela
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Adicionar comentários
COMMENT ON TABLE nova_tabela IS 'Descrição clara do propósito';
COMMENT ON COLUMN nova_tabela.nome IS 'Descrição do campo';
```

---

## 🚫 Antipatterns (Não Fazer)

### ❌ Campos Desnecessários
```sql
-- Evite:
id SERIAL PRIMARY KEY,
uuid UUID UNIQUE,
-- Duas chaves primárias? Use apenas UUID

-- Evite:
deleted_at TIMESTAMP,
is_deleted BOOLEAN,
-- Uma coluna é o suficiente (melhor is_deleted + trigger)
```

### ❌ Tipos Imprecisos
```sql
-- ❌ Evite:
data_nascimento VARCHAR(10)   -- Deveria ser DATE
preco FLOAT                    -- Deveria ser NUMERIC
ativo CHAR(1)                  -- Deveria ser BOOLEAN
telefone BIGINT                -- Deveria ser VARCHAR

-- ✅ Use:
data_nascimento DATE
preco NUMERIC(15,2)
ativo BOOLEAN
telefone VARCHAR(20)
```

### ❌ Denormalização Sem Justificativa
```sql
-- ❌ Evite (redundância):
CREATE TABLE vendas (
  id UUID,
  cliente_id UUID,
  cliente_nome VARCHAR(255),  -- Deveria vir de clients
  cliente_email VARCHAR(100), -- Deveria vir de clients
  ...
);

-- ✅ Use (normalizado):
CREATE TABLE vendas (
  id UUID,
  cliente_id UUID REFERENCES clients(id),
  ...
);
-- Jogar com clients table quando necessário
```

### ❌ Dados Estruturados em JSONB
```sql
-- ❌ Evite:
CREATE TABLE leads (
  id UUID,
  empreendimentos JSONB,  -- array ['{"id": 1, "nome": "..."}']
  tags JSONB,            -- array ['tag1', 'tag2']
  ...
);

-- ✅ Use (tabelas join):
CREATE TABLE lead_empreendimentos (
  lead_id UUID,
  empreendimento_id UUID,
  ...
);

CREATE TABLE lead_tags (
  lead_id UUID,
  tag_id UUID,
  ...
);
```

---

## 📚 Referências Rápidas

### Checklist para Nova Tabela
- [ ] Nome em `snake_case` plural
- [ ] `id UUID PRIMARY KEY`
- [ ] `workspace_id INTEGER NOT NULL` (se dados do usuário)
- [ ] `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- [ ] `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- [ ] Todas as FK têm constraint
- [ ] Índices definidos (especialmente `workspace_id` como primeira coluna)
- [ ] `ON DELETE` behavior decidido
- [ ] Comentários documentados
- [ ] Trigger para `updated_at` (se houver)

### Checklist para Nova Coluna
- [ ] Nome em `snake_case`
- [ ] Tipo apropriado (UUID, VARCHAR, NUMERIC, DATE, BOOLEAN, JSONB)
- [ ] `NOT NULL` if necessário
- [ ] `DEFAULT` se faz sentido
- [ ] Comentário documentando propósito
- [ ] `CHECK` constraint se houver validação

---

## 🔄 Evolução do Schema

### Adicionar Coluna
```sql
ALTER TABLE exemplo
  ADD COLUMN nova_coluna VARCHAR(255);

-- Com default
ALTER TABLE exemplo
  ADD COLUMN contador INTEGER DEFAULT 0 NOT NULL;
```

### Renomear Coluna
```sql
ALTER TABLE exemplo
  RENAME COLUMN nome_antigo TO nome_novo;
```

### Remover Coluna
```sql
-- Primeiro validar que não há dependências
ALTER TABLE exemplo
  DROP COLUMN nome_coluna;
```

### Adicionar Index
```sql
CREATE INDEX CONCURRENTLY idx_novo ON tabela(colunas);
-- CONCURRENTLY não trava a tabela
```

---

## 🎯 Conclusão

Seguir estas convenções garante:
- ✅ Código consistente e legível
- ✅ Facilita onboarding de novos devs
- ✅ Melhor performance (índices bem planejados)
- ✅ Segurança (FKs garantem integridade)
- ✅ Escalabilidade (multi-tenant correto)

**Para dúvidas**: Consultar `STANDARDIZATION_PLAN.md` ou comentários em migrations.

---

**Última atualização**: Fevereiro 2026
**Versão do Schema**: Pós-Phase 1
**Mantém**: DevOps / Database Team
