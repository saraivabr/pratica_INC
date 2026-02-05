# Plano de Padronização Estrutural Completa do Banco de Dados

## 📋 Sumário Executivo

**Sistema**: Prática - Plataforma Multi-Tenant de Gestão Imobiliária
**Banco**: PostgreSQL
**Data**: Fevereiro 2026
**Status**: Pronto para Execução (Fase 1 em Desenvolvimento)

### Situação Atual

- 157 tabelas com 87 problemas estruturais identificados
- Migração de multi-tenant incompleta (tenant_id não removido)
- 40+ Foreign Keys faltando (integridade referencial comprometida)
- Nomenclatura inconsistente (snake_case vs camelCase)
- Tipos de ID misturados (UUID vs SERIAL vs INTEGER)

### Resultado Esperado

✅ Banco de dados totalmente normalizado
✅ Integridade referencial garantida por Foreign Keys
✅ Nomenclatura consistente (snake_case em todo sistema)
✅ Performance otimizada (índices compostos + partial indexes)
✅ Isolamento de workspace garantido (RLS)
✅ Documentação completa (ERDs, convenções, testes)

---

## 🎯 Domínios do Sistema

| Domínio | Tabelas | Prefixo | Status |
|---------|---------|---------|--------|
| CV CRM Sync | 68 | `cvcrm_*` | ⚠️ Incompleto |
| WhatsApp/Evolution | 11 | `whatsapp_*` | ⚠️ Incompleto |
| Salva-Leads | 7 | `salva_leads_*` | ⚠️ Incompleto |
| Eventos | 3 | `eventos`, `evento_*` | ⚠️ Incompleto |
| Recepção | 12 | `recepcao_*` | ⚠️ Incompleto |
| Intermediação/Comissões | 11 | `comissao_*`, `im_*` | ⚠️ Incompleto |
| Academy | 5 | `academy_*` | ⚠️ Incompleto |
| IA/Agentes | 7 | `sofia_*`, `rag_*` | ⚠️ Incompleto |
| Workspaces/Usuários | 7 | `users`, `workspaces` | ⚠️ Incompleto |
| CRM Interno | 10 | `leads`, `pipeline_*` | ⚠️ Incompleto |

---

## 📊 Problemas Identificados

### 🔴 Crítico

#### P1: Ausência de Foreign Keys
**Impacto**: Sem integridade referencial, possibilidade de orphan records

- 40+ colunas `_id` sem Foreign Key Constraint
- Exemplos: `cvcrm_leads.corretor_id`, `agendamentos.unidade_id`
- Consequência: Impossível usar ON DELETE CASCADE, joins lentos

**Solução**: Migration 040 - Adicionar 40+ Foreign Keys

#### P2: tenant_id Não Removido (Arquitetura)
**Impacto**: Confusão de qual campo usar (legacy vs novo)

- Coluna deprecated presente em 150+ tabelas
- Dados já migrados para `workspace_id`
- Código ainda referencia ambos

**Solução**: Migration 041 - Remover tenant_id de todas as tabelas

#### P3: Nomenclatura Inconsistente
**Impacto**: Confusão para desenvolvedores, dificuldade de manutenção

Problemas:
- `codigointerno` (camelCase sem underscore)
- `idlead`, `idcorretor` (camelCase sem underscore)
- Mix de `snake_case` e `camelCase` na mesma tabela

**Solução**: Migration 046 - Renomear colunas para snake_case

#### P4: Tipos de ID Inconsistentes
**Impacto**: Dificuldade em joins, confusão de tipos

| Tabela | Tipo PK | Problema |
|--------|---------|----------|
| `users` | UUID | ✅ |
| `workspaces` | SERIAL | ❌ Mismatch com users.id |
| `cvcrm_leads` | SERIAL + INTEGER | ❌ 2 IDs! |
| `comissao_*` | SERIAL | ❌ |

**Solução**: Migration 047 - Migrar todos para UUID

### 🟡 Importante

#### P5: JSONB para Relacionamentos
**Impacto**: Performance de queries, impossível usar Foreign Keys

Problemas:
- `cvcrm_leads.corretor` (JSONB) - deveria ser FK
- `cvcrm_leads.tags` (JSONB array) - deveria ser tabela many-to-many
- `cvcrm_leads.empreendimento` (JSONB array) - deveria ser join table

**Solução**: Migration 043-045 - Normalizar dados

#### P6: Tabelas Duplicadas
**Impacto**: Confusão, dados inconsistentes

- `sync_logs` (antiga) vs `cvcrm_sync_logs` (nova)
- `sync_cursors` (antiga) vs `cvcrm_sync_cursors` (nova)

**Solução**: Migration 042 - Consolidar duplicatas

#### P7: Falta de Índices Compostos
**Impacto**: Queries lentas (especialmente com 150k+ registros)

Queries comuns sem otimização:
- `SELECT * FROM cvcrm_leads WHERE workspace_id = ? AND status = ?`
- `SELECT * FROM whatsapp_messages WHERE workspace_id = ? AND phone = ?`
- Faltam ~30 índices compostos

**Solução**: Migration 048 - Adicionar índices compostos

#### P8: Views sem Isolamento de Workspace
**Impacto**: Possível vazamento de dados entre workspaces

Exemplo:
```sql
CREATE VIEW interacoes AS SELECT * FROM cvcrm_lead_interacoes;
-- ❌ NÃO filtra por workspace_id
```

**Solução**: Migration 049 - Atualizar views com isolamento + RLS

### 🟢 Otimizações

#### P9: TIMESTAMP sem Timezone
**Impacto**: Ambiguidade de timezone

- `cvcrm_leads.created_at TIMESTAMP` ❌
- `users.created_at TIMESTAMP WITH TIME ZONE` ✅

#### P10: Campos NOT NULL sem DEFAULT
**Impacto**: Erros de INSERT

---

## 📅 Plano de Execução (5 Fases)

### FASE 1: Correções Críticas de Integridade (Sprint 1-2)

**Objetivo**: Garantir integridade referencial básica

#### 1.1 Adicionar Foreign Keys (Migration 040)
```bash
psql -U pratica -d pratica < migrations/040_add_foreign_keys.sql
```

**O que faz**:
- Adiciona 40+ Foreign Key Constraints
- Valida que não há orphan records
- Ativa integridade referencial

**Tabelas afetadas**: 30+
**Duração**: 2-3 minutos
**Downtime**: Não

#### 1.2 Remover tenant_id (Migration 041)
```bash
psql -U pratica -d pratica < migrations/041_remove_tenant_id.sql
```

**O que faz**:
- Remove coluna `tenant_id` de 150+ tabelas
- Valida que `workspace_id` está 100% preenchido
- Remove tabela `tenants` (deprecated)

**Tabelas afetadas**: 150+
**Duração**: 1-2 minutos
**Downtime**: Não

**⚠️ Requer atualização de código**:
- Remover referências a `tenant_id`
- Usar apenas `workspace_id`

#### 1.3 Consolidar Tabelas Duplicadas (Migration 042)
```bash
psql -U pratica -d pratica < migrations/042_consolidate_duplicates.sql
```

**O que faz**:
- Migra dados de `sync_logs` → `cvcrm_sync_logs`
- Migra dados de `sync_cursors` → `cvcrm_sync_cursors`
- Cria views de backup (segurança)

**Tabelas afetadas**: 3
**Duração**: 30s - 2 min
**Downtime**: Não

**Resultado Fase 1**:
✅ Integridade referencial garantida
✅ Arquitetura workspace limpa
✅ Sem duplicação de dados

---

### FASE 2: Normalização de Dados (Sprint 3-4)

**Objetivo**: Mover dados relacionais de JSONB para tabelas

#### 2.1 Normalizar Tags (Migration 043)

**Estrutura**:
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  UNIQUE(workspace_id, name)
);

CREATE TABLE lead_tags (
  lead_id INTEGER NOT NULL,
  tag_id UUID NOT NULL,
  PRIMARY KEY (lead_id, tag_id)
);
```

**Migração**:
- Extrai tags de `cvcrm_leads.tags` (JSONB)
- Cria registros em `tags` + `lead_tags`
- Remove coluna `tags` de `cvcrm_leads`

#### 2.2 Normalizar Relacionamentos (Migrations 044-045)

**Exemplo: Empreendimentos de Leads**

De:
```json
{
  "empreendimento": [
    {"id": 1, "nome": "Condomínio A"},
    {"id": 2, "nome": "Condomínio B"}
  ]
}
```

Para:
```sql
CREATE TABLE lead_empreendimentos (
  lead_id INTEGER NOT NULL,
  empreendimento_id INTEGER NOT NULL,
  PRIMARY KEY (lead_id, empreendimento_id)
);
```

**Resultado Fase 2**:
✅ Tags normalizadas (many-to-many)
✅ Empreendimentos normalizados
✅ Queries mais eficientes (joins vs JSONB)

---

### FASE 3: Padronização de Nomenclatura (Sprint 5-8)

**Objetivo**: Consistência total de nomenclatura

#### 3.1 Renomear Colunas para snake_case (Migration 046)

**Exemplos**:
```sql
ALTER TABLE cvcrm_leads RENAME COLUMN idlead TO id_lead;
ALTER TABLE cvcrm_leads RENAME COLUMN codigointerno TO codigo_interno;
ALTER TABLE cvcrm_lead_interacoes RENAME COLUMN idinteracao TO id_interacao;
```

**Impacto**: BREAKING CHANGE
- Afeta ~200+ colunas
- Requer atualização de código TypeScript
- Recomenda-se usar views de compatibilidade durante transição

#### 3.2 Migrar IDs para UUID (Migration 047)

**Estratégia**:
1. Adicionar coluna `uuid` em tabelas SERIAL
2. Gerar UUIDs para registros existentes
3. Atualizar Foreign Keys para novo UUID
4. Remover coluna SERIAL antiga
5. Renomear `uuid` → `id`

**⚠️ Complexo e longo** - requer:
- Backup completo
- Testes E2E
- Janela de manutenção
- Pode levar 1-2 horas em produção

**Resultado Fase 3**:
✅ Nomenclatura consistente (snake_case)
✅ IDs consistentes (UUID)
✅ Código mais legível e manutenível

---

### FASE 4: Otimização de Performance (Sprint 9-10)

**Objetivo**: Melhorar performance de queries

#### 4.1 Adicionar Índices Compostos (Migration 048)

**Padrão**: `idx_<tabela>_<colunas>`

Exemplos:
```sql
-- Queries de leads por workspace + filtros
CREATE INDEX idx_cvcrm_leads_workspace_situacao
  ON cvcrm_leads(workspace_id, situacao_id);

-- Queries de mensagens WhatsApp
CREATE INDEX idx_whatsapp_messages_workspace_phone
  ON whatsapp_messages(workspace_id, phone_number);

-- Queries de presença por plantão
CREATE INDEX idx_recepcao_presencas_plantao_posicao
  ON recepcao_presencas(plantao_id, posicao_fila);
```

**Total**: ~30+ índices compostos

#### 4.2 Partial Indexes

```sql
-- Apenas para leads ativos
CREATE INDEX idx_cvcrm_leads_ativos
  ON cvcrm_leads(workspace_id, corretor_id)
WHERE status NOT IN ('cancelado', 'perdido');

-- Apenas para mensagens não lidas
CREATE INDEX idx_whatsapp_messages_unread
  ON whatsapp_messages(workspace_id, phone_number)
WHERE read_at IS NULL;
```

#### 4.3 Row Level Security (RLS)

```sql
-- Ativar RLS em tabelas críticas
ALTER TABLE cvcrm_leads ENABLE ROW LEVEL SECURITY;

-- Criar policy
CREATE POLICY workspace_isolation ON cvcrm_leads
  USING (workspace_id = current_setting('app.current_workspace_id')::INTEGER);
```

**Resultado Fase 4**:
✅ Queries 10-100x mais rápidas
✅ Isolamento garantido (RLS)
✅ Menos carga no banco

---

### FASE 5: Documentação e Validação (Sprint 11-12)

**Objetivo**: Documentar estrutura e criar testes

#### 5.1 Gerar Entity Relationship Diagrams (ERDs)

Ferramentas: dbdiagram.io, DBeaver, pg_dump

Saída:
- `docs/database/erd-full.png` - ERD completo (157 tabelas)
- `docs/database/erd-simplified.png` - ERD simplificado por domínio
- `docs/database/erd-cvcrm.png` - ERD do CV CRM Sync
- `docs/database/erd-comissoes.png` - ERD de comissões

#### 5.2 Documentar Convenções (Arquivo: CONVENTIONS.md)

```markdown
# Convenções do Banco de Dados

## Nomenclatura
- **Tabelas**: snake_case, plural (ex: cvcrm_leads)
- **Colunas**: snake_case (ex: id_lead, data_cad)
- **Indexes**: idx_<tabela>_<colunas>
- **Foreign Keys**: fk_<tabela>_<ref>
- **Primary Keys**: sempre `id` (UUID)

## Tipos de Dados
- **IDs**: UUID (gen_random_uuid())
- **Timestamps**: TIMESTAMP WITH TIME ZONE
- **Dinheiro**: NUMERIC(15,2)
- **Percentuais**: NUMERIC(5,4)
- **Booleanos**: BOOLEAN

## Multi-Tenant
- Todo dado DEVE ter workspace_id
- FK: FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
- Indexes SEMPRE incluem workspace_id como primeira coluna

## Timestamps Automáticos
- created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- Usar trigger update_updated_at_column() para atualizar updated_at
```

#### 5.3 Testes de Integridade

Arquivo: `__tests__/database/integrity.test.ts`

```typescript
describe('Database Integrity Tests', () => {
  it('All tables have workspace_id', async () => {
    // Validar que todas as tabelas têm workspace_id
  });

  it('No orphan records exist', async () => {
    // Validar que todos workspace_id apontam para workspaces válidos
  });

  it('All _id columns have foreign keys', async () => {
    // Validar que colunas _id têm FK
  });
});
```

#### 5.4 Gerar Tipos TypeScript

```bash
# Opção 1: Prisma
npx prisma db pull
npx prisma generate

# Opção 2: Kysely Codegen
npx kysely-codegen

# Resultado: lib/database/types.ts
```

**Resultado Fase 5**:
✅ ERDs visuais para documentação
✅ Convenções documentadas
✅ Testes automáticos de integridade
✅ Tipos TypeScript sincronizados

---

## ⚠️ Riscos e Mitigações

### Risco 1: Downtime durante migrações
**Cenário**: Migração de IDs pode levar horas

**Mitigação**:
- Executar em janela de manutenção (2am-4am)
- Backup completo antes
- Testar em staging
- Ter plano de rollback

### Risco 2: Breaking changes no código
**Cenário**: Renomear colunas quebra código existente

**Mitigação**:
- Criar views de compatibilidade com nomes antigos
- Migrar código gradualmente
- Feature flags para habilitar novo schema

### Risco 3: Dados órfãos ao adicionar FKs
**Cenário**: FK constraint falha por orphan records

**Mitigação**:
```sql
-- Identificar órfãos ANTES de adicionar FK
SELECT * FROM cvcrm_leads
WHERE corretor_id NOT IN (SELECT cvcrm_id FROM cvcrm_corretores);

-- Limpar
UPDATE cvcrm_leads SET corretor_id = NULL
WHERE corretor_id NOT IN (SELECT cvcrm_id FROM cvcrm_corretores);
```

### Risco 4: Performance degradada durante CREATE INDEX
**Cenário**: CREATE INDEX CONCURRENTLY pode travar banco

**Mitigação**:
- Usar `CREATE INDEX CONCURRENTLY` (não trava tabela)
- Executar fora de horário de pico
- Monitorar carga

---

## 📋 Checklist de Execução

### Pré-Início
- [ ] Backup completo do banco
- [ ] Aprova plano com stakeholders
- [ ] Cria branch `feat/database-standardization`
- [ ] Agenda janela de manutenção (para Fase 3)

### Fase 1: Integridade (Semana 1-2)
- [ ] Migration 040 executada (Foreign Keys)
- [ ] Migration 041 executada (Remove tenant_id)
- [ ] Migration 042 executada (Consolidate duplicates)
- [ ] Código TypeScript atualizado (remover tenant_id)
- [ ] Testes passam
- [ ] Deploy em staging + validação
- [ ] Deploy em produção

### Fase 2: Normalização (Semana 3-4)
- [ ] Migrations 043-045 executadas (Normalize JSONB)
- [ ] Queries atualizadas para usar joins
- [ ] Testes passam
- [ ] Deploy staging + validação
- [ ] Deploy produção

### Fase 3: Padronização (Semana 5-8)
- [ ] Migration 046 executada (snake_case)
- [ ] Migration 047 executada (UUID)
- [ ] Código TypeScript completamente refatorado
- [ ] Testes E2E passam
- [ ] Deploy em janela de manutenção

### Fase 4: Performance (Semana 9-10)
- [ ] Migrations 048-049 executadas (Indexes + RLS)
- [ ] Queries benchmarked (10x+ mais rápidas)
- [ ] Deploy em produção

### Fase 5: Documentação (Semana 11-12)
- [ ] ERDs gerados
- [ ] Convenções documentadas
- [ ] Testes de integridade criados
- [ ] Tipos TypeScript sincronizados
- [ ] Documentação publicada

---

## 📊 Cronograma Sugerido

| Fase | Sprint | Duração | Esforço | Prioridade |
|------|--------|---------|---------|-----------|
| **1** | 1-2 | 2 semanas | 80h | 🔴 CRÍTICO |
| **2** | 3-4 | 2 semanas | 60h | 🔴 CRÍTICO |
| **3** | 5-8 | 4 semanas | 120h | 🟡 IMPORTANTE |
| **4** | 9-10 | 2 semanas | 40h | 🟡 IMPORTANTE |
| **5** | 11-12 | 2 semanas | 40h | 🟢 NICE-TO-HAVE |
| **Total** | | **12 semanas** | **340h** | |

---

## 📝 Próximos Passos Imediatos

1. **Revisar e aprovar** este plano com tech lead
2. **Criar branch**: `git checkout -b feat/database-standardization`
3. **Executar Fase 1.1** (Migration 040 - Foreign Keys)
4. **Executar Fase 1.2** (Migration 041 - Remove tenant_id)
5. **Executar Fase 1.3** (Migration 042 - Consolidate)
6. **Deploy em staging** e validar
7. **Continuar** com Fases 2-5

---

## 📚 Documentação de Referência

- **CLAUDE.md** - Configuração do projeto
- **CONVENTIONS.md** - Convenções do banco (a ser criado)
- **ERDs** - Diagramas visuais (a ser criado)
- **MIGRATIONS** - Histórico de mudanças estruturais
- **TYPES** - Tipos TypeScript gerados automaticamente

---

**Este plano está pronto para aprovação e execução.**

Data: Fevereiro 5, 2026
Status: ✅ Finalizado (Fase 1 Pronta)
Responsável: Claude Code
Próximo Checkpoint: Semana 1 (Migration 040)
