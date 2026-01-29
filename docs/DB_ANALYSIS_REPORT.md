# Relatório Completo de Análise do Banco de Dados - Prática
**Data:** 2026-01-29
**Banco:** pratica (PostgreSQL)
**Tamanho Total:** 171 MB

---

## 1. ESTRUTURA

### Tabelas com Dados (19 de 129)
| Tabela | Registros | Tamanho |
|--------|-----------|---------|
| cvcrm_leads | 19,667 | 158 MB |
| users | 1,246 | 888 kB |
| workspaces | 1,145 | 672 kB |
| imobiliarias | 237 | 112 kB |
| sync_logs | 80 | 440 kB |
| hierarquia_features | 66 | 56 kB |
| sessions | 21 | 112 kB |
| cvcrm_empreendimentos | 20 | 136 kB |
| academy_lessons | 17 | 192 kB |
| features | 11 | 80 kB |
| academy_modules | 7 | 112 kB |
| funnel_stages | 7 | 24 kB |
| hierarquias | 6 | 80 kB |
| leads | 5 | 144 kB |
| academy_categories | 3 | 96 kB |
| sync_cursors | 3 | 64 kB |
| funnels | 1 | 32 kB |
| tracking_events | 1 | 80 kB |
| tenants | 1 | 120 kB |

### Tabelas Vazias: 110 de 129
A maioria das tabelas cvcrm_* de detalhes (reservas, vendas, comissões, etc.) e módulos como whatsapp, campaigns, intermediação estão vazios.

### Views: 14
beneficiarios, empreendimentos, interacoes, intermediacao_*, log_auditoria, parcelas, vendas, whatsapp_chats

---

## 2. CORREÇÕES APLICADAS

### 2.1 Índices Redundantes Removidos: 53
Removidos índices simples que eram cobertos por índices UNIQUE ou compostos existentes.

**Principais removidos:**
- `idx_cvcrm_leads_cvcrm_id` (coberto pelo UNIQUE `cvcrm_leads_cvcrm_id_key`)
- `idx_leads_corretor_id`, `idx_leads_email`, `idx_leads_situacao_id`, `idx_leads_telefone` (duplicatas exatas)
- 20+ índices `idx_*_cvcrm_id` cobertos por constraints UNIQUE `*_cvcrm_id_key`
- `idx_features_slug`, `idx_hierarquias_slug`, `idx_tenants_slug`, `idx_workspaces_slug` (cobertos por UNIQUE keys)
- `idx_sessions_token` (coberto por `sessions_session_token_key`)
- `idx_academy_progress_user_lesson` (coberto pelo UNIQUE constraint `user_id + lesson_id`)

**Economia:** ~53 índices desnecessários eliminados, reduzindo overhead de INSERT/UPDATE na tabela cvcrm_leads (maior tabela) e melhorando escrita.

### 2.2 Índices Compostos Criados: 6
```sql
idx_cvcrm_leads_ws_created    (workspace_id, created_at DESC)
idx_cvcrm_leads_ws_situacao   (workspace_id, situacao_id)
idx_cvcrm_leads_ws_corretor   (workspace_id, corretor_id)
idx_cvcrm_leads_tenant_created (tenant_id, created_at DESC)
idx_users_ws_role             (workspace_id, role)
idx_users_tenant_role         (tenant_id, role) WHERE tenant_id IS NOT NULL
```

### 2.3 CHECK Constraints Adicionadas
- `chk_users_role`: role IN ('admin', 'gerente', 'corretor', 'user', 'super_admin')
- `chk_workspaces_type`: type IN ('imobiliaria', 'construtora', 'personal', 'demo')

### 2.4 Limpeza de Dados
- **13,823 emails vazios** ('') convertidos para NULL em cvcrm_leads
- **38 telefones normalizados** (formato +550XX → +55XX)
- Resultado telefones: 19,374 no padrão (+55XXXXXXXXXX), 215 não-padrão (internacionais/malformados), 78 nulos

### 2.5 VACUUM ANALYZE
Executado em todas as tabelas com dados + ANALYZE global.
- Dead tuples zerados em todas as tabelas principais
- Autovacuum já estava ativo (OK)

---

## 3. PROBLEMAS ENCONTRADOS

### 3.1 Colunas Duplicadas na tabela `users` ⚠️
| Coluna A | Coluna B | Situação |
|----------|----------|----------|
| `name` | `nome` | 101 têm `name`, TODOS 1246 têm `nome` |
| `telefone` | `phone` | TODOS 1246 têm `telefone`, apenas 1 tem `phone` |
| `last_login` | `last_login_at` | 2 têm `last_login`, 0 têm `last_login_at` |

**Recomendação:** Manter `nome`, `telefone`, `last_login` e deprecar/remover `name`, `phone`, `last_login_at`.

### 3.2 Imobiliárias Sem Dados Completos ⚠️
- **237 imobiliárias** com APENAS o nome preenchido
- 0 têm CNPJ, telefone, email, workspace_id, ou cvcrm_id
- Parecem ser apenas nomes importados do CVCRM sem dados adicionais

### 3.3 User Sem Tenant ⚠️
- 1 usuário (`teste@pratica.com`, "Teste Auto") sem tenant_id
- Provavelmente um registro de teste que pode ser removido

### 3.4 Telefones Não-Padrão em cvcrm_leads
- 215 telefones não seguem o formato +55XXXXXXXXXXX
- Incluem números internacionais (Portugal +351, Espanha +34) e malformados
- 78 leads sem telefone algum

### 3.5 Muitas Tabelas Vazias
- 110 das 129 tabelas estão completamente vazias
- Módulos inteiros sem dados: whatsapp, campaigns, intermediação, academy_progress, etc.
- Tabelas cvcrm_* de detalhes (vendas, reservas, comissões) não foram sincronizadas

### 3.6 Missing NOT NULL em colunas críticas
- `users.tenant_id` é nullable (deveria ser NOT NULL para todos exceto super_admin)
- `users.workspace_id` é nullable (deveria ser NOT NULL)
- `cvcrm_leads.tenant_id` é nullable
- `cvcrm_leads.workspace_id` é nullable

---

## 4. SEGURANÇA

| Item | Status |
|------|--------|
| SSL | ✅ ON |
| Roles | 2: `postgres` (superuser), `pratica` (login only) |
| Autovacuum | ✅ ON |
| Permissões | Adequadas (app usa role `pratica`) |

---

## 5. RECOMENDAÇÕES (Decisão Humana Necessária)

### ALTA PRIORIDADE

1. **Resolver colunas duplicadas em `users`**
   ```sql
   -- Após confirmar que o app usa 'nome' em vez de 'name':
   UPDATE users SET nome = name WHERE nome IS NULL AND name IS NOT NULL;
   ALTER TABLE users DROP COLUMN name;
   ALTER TABLE users DROP COLUMN phone;
   ALTER TABLE users DROP COLUMN last_login_at;
   -- Renomear last_login se precisar
   ```

2. **Adicionar NOT NULL em colunas críticas** (após preencher dados faltantes)
   ```sql
   ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
   ALTER TABLE users ALTER COLUMN workspace_id SET NOT NULL;
   ALTER TABLE cvcrm_leads ALTER COLUMN tenant_id SET NOT NULL;
   ALTER TABLE cvcrm_leads ALTER COLUMN workspace_id SET NOT NULL;
   ```

3. **Limpar/completar imobiliárias** - 237 registros sem CNPJ, telefone, email, workspace

4. **Remover ou atribuir usuário teste** (`teste@pratica.com` sem tenant)

### MÉDIA PRIORIDADE

5. **Limpar telefones não-padrão** (215 leads) - decidir se são internacionais válidos ou lixo

6. **Considerar particionar `cvcrm_leads`** por workspace_id se crescer muito (hoje 158MB, ok por enquanto)

7. **Adicionar FK `cvcrm_leads.workspace_id → workspaces.id`** (hoje não tem FK)
   ```sql
   ALTER TABLE cvcrm_leads ADD CONSTRAINT fk_cvcrm_leads_workspace 
     FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
   ```

8. **Adicionar FK `imobiliarias.workspace_id → workspaces.id`** se workspace_id for preenchido

9. **Remover tabelas vazias não utilizadas** (avaliar se módulos como intermediação serão usados)

### BAIXA PRIORIDADE

10. **Considerar pg_partman** para logs (sync_logs, agent_conversation_logs) quando crescerem
11. **Adicionar UNIQUE constraint em `users.telefone`** por tenant (se telefone deve ser único por organização)
12. **Adicionar índice GIN em campos JSONB** se fizer queries em `cvcrm_leads.cvcrm_data`, `empreendimentos`, etc.

---

## 6. RESUMO DE DADOS

| Entidade | Quantidade | Qualidade |
|----------|------------|-----------|
| Tenants | 1 | OK |
| Workspaces | 1,145 | OK (todos type=personal) |
| Users | 1,246 | 1 admin + 1,245 corretores. 1 sem tenant |
| Imobiliárias | 237 | ⚠️ Só nomes, sem dados de contato |
| Leads (CVCRM) | 19,667 | ✅ Bom - 98.4% com telefone padrão |
| Leads (interno) | 5 | Praticamente não usado |
| Empreendimentos | 20 | OK |
| Academy | 3 cat, 7 mod, 17 lessons | Conteúdo criado, sem progresso |
| Features | 11 | OK |
| Hierarquias | 6 com 66 features | OK |

---

## Balanço Final

| Métrica | Antes | Depois |
|---------|-------|--------|
| Índices totais | 534+ | ~486 |
| Índices redundantes | 53 | 0 |
| Índices compostos úteis | 0 | 6 |
| Dead tuples | 85+ | 0 |
| Emails vazios ('') | 13,823 | 0 (convertidos para NULL) |
| Telefones normalizados | — | 38 corrigidos |
| CHECK constraints | 19 | 21 |
