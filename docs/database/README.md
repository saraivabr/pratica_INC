# 📊 Documentação do Banco de Dados - Prática

## 🎯 Propósito

Esta pasta contém documentação completa sobre a arquitetura, convenções e padronização do banco de dados PostgreSQL do Prática.

---

## 📚 Documentos Principais

### 1. **STANDARDIZATION_PLAN.md** ⭐ LEIA PRIMEIRO
- Plano estratégico completo de padronização do banco
- 5 fases de execução com cronograma
- Problemas identificados e soluções
- Riscos e mitigações
- **Público**: Tech lead, arquitetos, database admin

### 2. **PHASE1_IMPLEMENTATION.md** 🚀 EXECUTE AGORA
- Guia prático passo-a-passo para Phase 1
- Migrações 040, 041, 042 (Foreign Keys, Remove tenant_id)
- Checklist de validação
- Testes de integridade
- **Público**: Desenvolvedores, DevOps

### 3. **CONVENTIONS.md** 📖 REFERÊNCIA DIÁRIA
- Convenções obrigatórias para novo código
- Nomenclatura (tabelas, colunas, índices)
- Tipos de dados recomendados
- Antipatterns a evitar
- Exemplos corretos e incorretos
- **Público**: Todos os desenvolvedores

### 4. **ERD Diagrams** (a ser gerado)
- Entity Relationship Diagrams visuais
- Estrutura por domínio
- Relacionamentos entre tabelas
- **Público**: Documentação, discussões de arquitetura

---

## 🗂️ Estrutura de Pastas

```
docs/database/
├── README.md (este arquivo)
├── STANDARDIZATION_PLAN.md
├── PHASE1_IMPLEMENTATION.md
├── CONVENTIONS.md
├── ERD/
│   ├── erd-full.png
│   ├── erd-cvcrm.png
│   ├── erd-comissoes.png
│   └── erd-recepcao.png
└── migrations/
    └── (referência para as 49 migrations)
```

---

## 📋 Status Atual (Fevereiro 2026)

| Aspecto | Status | Descrição |
|---------|--------|-----------|
| **Total de Tabelas** | 157 | Estrutura estável |
| **Foreign Keys** | 🔴 Incompleto | 40+ faltando (Migration 040) |
| **tenant_id** | 🔴 Deprecated | Presente em 150+ tabelas (Migration 041) |
| **Nomenclatura** | 🟡 Misto | ~200 colunas em camelCase (Migration 046) |
| **JSONB Normalizado** | 🟡 Parcial | Tags e empreendimentos (Migrations 043-045) |
| **Índices Compostos** | 🔴 Faltando | ~30 índices necessários (Migration 048) |
| **RLS Enabled** | 🔴 Não | Pronto para ativar (Migration 049) |
| **Documentação** | ✅ Completa | Plano e convenções documentadas |

---

## 🚀 Roadmap (Próximas 12 Semanas)

### Phase 1: Integridade (Sprint 1-2) 🔴 CRÍTICO
- **Migration 040**: Adicionar 40+ Foreign Keys
- **Migration 041**: Remover tenant_id deprecated
- **Migration 042**: Consolidar tabelas duplicadas
- **Status**: Pronto para execução
- **Esforço**: 80 horas

### Phase 2: Normalização (Sprint 3-4)
- **Migration 043**: Normalizar tags
- **Migration 044**: Normalizar empreendimentos
- **Migration 045**: Normalizar relacionamentos JSON
- **Status**: Migrations prontas
- **Esforço**: 60 horas

### Phase 3: Padronização (Sprint 5-8) ⚠️ BREAKING
- **Migration 046**: Renomear colunas para snake_case
- **Migration 047**: Migrar IDs para UUID
- **Status**: Migrations prontas, impacto alto
- **Esforço**: 120 horas

### Phase 4: Performance (Sprint 9-10)
- **Migration 048**: Adicionar índices compostos
- **Migration 049**: Ativar Row Level Security
- **Status**: Migrations prontas
- **Esforço**: 40 horas

### Phase 5: Documentação (Sprint 11-12)
- Gerar ERDs visuais
- Documentar convenções
- Criar testes automáticos
- **Status**: Parcialmente completo
- **Esforço**: 40 horas

---

## 🔧 Como Usar Esta Documentação

### Para Entender o Projeto
1. Ler **STANDARDIZATION_PLAN.md** (visão geral)
2. Ler **CONVENTIONS.md** (como escrever novo código)
3. Consultar ERDs (visualizar estrutura)

### Para Implementar Mudanças
1. Ler **PHASE1_IMPLEMENTATION.md**
2. Executar migrações conforme guia
3. Atualizar código seguindo **CONVENTIONS.md**

### Para Escrever Novo Código
1. Consultar **CONVENTIONS.md** regularmente
2. Usar template de tabela em CONVENTIONS.md
3. Validar com checklist em CONVENTIONS.md

### Para Troubleshooting
1. Verificar Migration relevante em `/migrations/`
2. Consultar seção "Problemas Comuns" em PHASE1_IMPLEMENTATION.md
3. Contactar Database Admin se persistir

---

## 📊 Estatísticas

### Escopo do Banco
| Métrica | Valor |
|---------|-------|
| Total de tabelas | 157 |
| Total de colunas | ~2,500+ |
| Foreign Keys (atuais) | ~5 |
| Foreign Keys (após Phase 1) | 45+ |
| Índices (atuais) | ~50 |
| Índices (após Phase 4) | 80+ |
| Migrations (atuais) | 39 |
| Migrations (após Phase 5) | 49 |

### Domínios Principais
| Domínio | Tabelas | Status |
|---------|---------|--------|
| CV CRM Sync | 68 | Pronto Phase 1 |
| Comissões | 11 | Pronto Phase 1 |
| Recepção | 12 | Pronto Phase 1 |
| WhatsApp | 11 | Pronto Phase 1 |
| Salva-Leads | 7 | Pronto Phase 1 |
| Academy | 5 | Pronto Phase 1 |
| Workspaces | 7 | Pronto Phase 1 |
| CRM Interno | 10 | Pronto Phase 1 |

---

## 🔑 Conceitos Principais

### Multi-Tenant Architecture
Cada "workspace" é um tenant isolado. Dados nunca devem vazar entre workspaces.

```sql
-- Toda tabela de dados DEVE ter:
workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
```

### Foreign Key Constraints
Garantem integridade referencial. Impossível ter dados órfãos.

```sql
ALTER TABLE tabela_a
  ADD CONSTRAINT fk_tabela_a_tabela_b
  FOREIGN KEY (tabela_b_id) REFERENCES tabela_b(id)
  ON DELETE CASCADE;
```

### Índices Compostos
Primeira coluna DEVE ser workspace_id para isolamento correto.

```sql
CREATE INDEX idx_tabela_workspace_status
  ON tabela(workspace_id, status);
```

### Row Level Security (RLS)
Camada extra de segurança no banco. Impossível vazar dados mesmo se bug na aplicação.

```sql
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolamento ON tabela
  USING (workspace_id = current_setting('app.current_workspace_id')::INTEGER);
```

---

## ✅ Checklist Antes de Deploy

### Fase 1 (Fevereiro 2026)
- [ ] Backup completo feito
- [ ] Branch `feat/database-standardization` criado
- [ ] Migrations 040, 041, 042 testadas em staging
- [ ] Testes unitários passam
- [ ] Testes E2E passam
- [ ] Documentação revisada
- [ ] PR aprovada
- [ ] Deploy em produção scheduled

### Antes de Cada Fase
- [ ] Ler plano correspondente
- [ ] Backup completo feito
- [ ] Testes em staging por 24+ horas
- [ ] Rollback plan documentado
- [ ] Equipe notificada
- [ ] Janela de manutenção agendada (se downtime)

---

## 🆘 Support & Troubleshooting

### Problemas Comuns

**"FK constraint failed"**
```sql
-- Verificar orphan records
SELECT * FROM tabela
WHERE coluna_id NOT IN (SELECT id FROM outra_tabela);

-- Limpar orphans
UPDATE tabela SET coluna_id = NULL
WHERE coluna_id NOT IN (SELECT id FROM outra_tabela);
```

**"Query muito lenta"**
```sql
-- Executar EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM tabela WHERE workspace_id = $1 AND status = $2;

-- Criar índice se falta
CREATE INDEX idx_tabela_workspace_status
  ON tabela(workspace_id, status);
```

**"tenant_id vs workspace_id confuso"**
- ✅ Use apenas `workspace_id` (tenant_id será removido)
- ❌ Nunca misture ambos

**"RLS impactando performance"**
- RLS adiciona 1-2% overhead em queries simples
- Se > 10% overhead, revisar policies
- `EXPLAIN ANALYZE` mostra impacto

### Contatos
- **Database Admin**: [Adicionar contato]
- **DevOps**: [Adicionar contato]
- **Tech Lead**: [Adicionar contato]

---

## 📖 Recursos Adicionais

### PostgreSQL Docs
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### Projeto
- **CLAUDE.md**: Configuração do projeto
- **migrations/**: Todas as 49 migrations
- **lib/db.ts**: Cliente do banco

---

## 📝 Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-02-05 | 1.0 | Documentação inicial + Plano Phase 1-5 |

---

## ⚠️ IMPORTANTE

**Não execute migrações sem entender impacto**

Cada migration teve esforço significativo em planejamento. Leia documentação correspondente antes de executar.

Para dúvidas: Consultar STANDARDIZATION_PLAN.md ou contactar database admin.

---

**Status**: ✅ Documentação Completa
**Próximo Milestone**: Phase 1 Execution (Semana 1)
**Maintainer**: Database Team
