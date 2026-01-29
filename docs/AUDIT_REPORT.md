# 🔍 Auditoria Completa - Projeto Pratica

**Data:** 2025-07-15
**Auditor:** Claude (subagent)
**Projeto:** Next.js + TypeScript + PostgreSQL

---

## 📊 RESUMO EXECUTIVO

| Severidade | Quantidade |
|------------|-----------|
| 🔴 CRÍTICO | 8 |
| 🟠 ALTO | 12 |
| 🟡 MÉDIO | 9 |
| 🔵 BAIXO | 6 |
| **Total** | **35** |

### Categorias principais:
- **Tabelas inexistentes referenciadas em queries**: 3
- **Colunas `workspace_id` faltantes em tabelas usadas com filtro**: 5
- **APIs sem autenticação que deveriam ter**: ~30
- **APIs sem isolamento de tenant (cross-tenant data leak)**: 8
- **Queries em tabela `conversations` vazia/inútil**: 2
- **INSERT em VIEW (não-insertável)**: 2

---

## 🔴 CRÍTICO

### C1. Tabela `notificacoes` NÃO EXISTE

**Arquivo:** `app/api/notificacoes/route.ts` (linhas 16-23)
**Arquivo:** `app/api/notificacoes/[id]/route.ts`
**Arquivo:** `app/api/notificacoes/unread-count/route.ts`
**Problema:** API faz `SELECT ... FROM notificacoes` mas a tabela não existe no banco.
**Impacto:** Qualquer chamada a `/api/notificacoes` retorna erro 500.
**Solução:** Criar tabela `notificacoes` ou remover essas rotas se não estão em uso.

---

### C2. Tabela `goals` NÃO EXISTE

**Arquivo:** `app/api/sofia/proactive/route.ts` (linha 146)
**Problema:** Query `SELECT ... FROM goals g` mas tabela não existe.
**Impacto:** Rota `/api/sofia/proactive` falha com erro 500.
**Solução:** Criar tabela `goals` ou remover referência.

---

### C3. Tabela `reservations` NÃO EXISTE

**Arquivo:** `app/api/sofia/proactive/route.ts` (linha 223)
**Problema:** Query `SELECT ... FROM reservations r` mas tabela não existe.
**Impacto:** Rota `/api/sofia/proactive` falha com erro 500.
**Solução:** Criar tabela ou usar `cvcrm_reservas`.

---

### C4. Tabela `leads_visits` NÃO EXISTE

**Arquivo:** `app/api/salva-leads/agendar-visita/route.ts` (linha 51)
**Problema:** `INSERT INTO leads_visits (...)` mas tabela não existe.
**Impacto:** Agendamento de visitas via salva-leads falha com erro 500.
**Solução:** Criar tabela `leads_visits` ou usar `agendamentos`.

---

### C5. Academy: Queries usam `workspace_id` mas tabelas NÃO TÊM essa coluna

**Arquivos:**
- `app/api/academy/lessons/route.ts` (linhas 31, 68, 169)
- `app/api/academy/modules/route.ts` (linhas 21, 119)
- `app/api/academy/categories/route.ts` (linhas 25, 92)
- `app/api/academy/progress/route.ts` (linhas 77, 179)
- `app/api/academy/certificates/route.ts` (linha 78)

**Problema:** TODAS as queries Academy usam `WHERE workspace_id = $1` ou `INSERT ... (workspace_id, ...)`, mas as 5 tabelas academy (`academy_lessons`, `academy_modules`, `academy_categories`, `academy_progress`, `academy_certificates`) têm apenas `tenant_id`, NÃO `workspace_id`.

**Impacto:** TODA a funcionalidade Academy está quebrada — lições não carregam, progresso não salva, certificados não emitem.

**Solução:** 
- Opção A: Adicionar coluna `workspace_id` às 5 tabelas academy
- Opção B: Alterar queries para usar `tenant_id`

---

### C6. `dispatch_batches` NÃO tem `workspace_id`

**Arquivo:** `app/api/cron/dispatch-batches/route.ts` (linha 46, 272)
**Arquivo:** `app/api/eventos/[id]/disparar/route.ts` (linhas 84, 101, 298)

**Problema:** Interface TypeScript define `workspace_id: number` e o código desestrutura `workspace_id` do resultado, mas a tabela `dispatch_batches` NÃO tem coluna `workspace_id`. O campo retornará `undefined`, quebrando `tenantQuery(workspace_id)` na linha 273.

**Impacto:** Disparo de mensagens em lote para eventos falha — `tenantQuery(undefined)` gera queries sem filtro de tenant.

**Solução:** Adicionar coluna `workspace_id` à tabela `dispatch_batches`.

---

### C7. `im_vendas` NÃO tem `workspace_id`

**Arquivo:** `app/api/intermediacao/vendas/route.ts` (linhas 44-45, 86)
**Problema:** Queries filtram por `v.workspace_id = $1` mas tabela `im_vendas` NÃO tem coluna `workspace_id` (tem apenas `tenant_id`).
**Impacto:** Todas as queries de vendas do módulo intermediação retornam erro SQL.
**Solução:** Adicionar `workspace_id` à tabela `im_vendas` ou alterar queries para usar `tenant_id`.

---

### C8. `cvcrm_lead_interacoes` NÃO tem `workspace_id`

**Arquivo:** `app/api/leads/by-phone/route.ts` (linhas ~139-143)
**Problema:** Query filtra `WHERE workspace_id = $1 AND cvcrm_lead_id = $2` mas tabela `cvcrm_lead_interacoes` NÃO tem coluna `workspace_id`.
**Impacto:** Busca de interações de leads por telefone falha com erro SQL.
**Solução:** Adicionar `workspace_id` à tabela `cvcrm_lead_interacoes`.

---

## 🟠 ALTO

### A1. `crm/reports` — Sem autenticação, sem isolamento de tenant

**Arquivo:** `app/api/crm/reports/route.ts`
**Problema:** 
1. Sem `requireWorkspaceContext` ou qualquer auth
2. Queries em `leads`, `funnel_stages`, `users`, `conversations` sem filtro `workspace_id`
3. Retorna dados de TODOS os tenants misturados

**Impacto:** Qualquer pessoa pode acessar `/api/crm/reports` e ver dados de todos os clientes.
**Solução:** Adicionar `requireWorkspaceContext` e filtrar por `workspace_id`.

---

### A2. `crm/campaigns` — Sem autenticação, sem isolamento

**Arquivo:** `app/api/crm/campaigns/route.ts`
**Problema:**
1. Sem auth
2. GET: `SELECT * FROM campaigns` retorna campanhas de todos os tenants
3. POST: Cria campanha sem `workspace_id`
4. Seleciona leads sem filtro de tenant

**Impacto:** Dados de campanhas expostos, leads de outros tenants podem ser incluídos.
**Solução:** Adicionar auth e filtro `workspace_id`.

---

### A3. `crm/automations` — Sem autenticação, sem isolamento

**Arquivo:** `app/api/crm/automations/route.ts`
**Problema:** Tabela `automations` NÃO tem `workspace_id`. CRUD completo sem auth.
**Impacto:** Automações compartilhadas entre todos os tenants.
**Solução:** Adicionar `workspace_id` à tabela e auth à rota.

---

### A4. `crm/conversations` — Sem autenticação

**Arquivo:** `app/api/crm/conversations/route.ts`
**Problema:** Sem auth. Query em `whatsapp_messages` sem filtro de `workspace_id`.
**Impacto:** Retorna conversas de TODOS os tenants misturadas.
**Solução:** Adicionar `requireWorkspaceContext` e filtrar por `workspace_id`.

---

### A5. `crm/pipeline/move` — Sem autenticação, sem verificação de tenant

**Arquivo:** `app/api/crm/pipeline/move/route.ts`
**Problema:** `UPDATE leads SET stage_id = $1 WHERE id = $2` sem verificar workspace_id.
**Impacto:** Qualquer pessoa pode mover leads de qualquer tenant no pipeline.
**Solução:** Adicionar auth e `WHERE workspace_id = $X`.

---

### A6. INSERT em VIEW `interacoes` (não-insertável)

**Arquivos:** 
- `app/api/leads/[id]/stage/route.ts` (linha 73)
- `app/api/leads/[id]/cpf/route.ts` (linha 97)
- `app/api/leads/[id]/schedule-visit/route.ts` (linha ~90)

**Problema:** `INSERT INTO interacoes (...)` — mas `interacoes` é uma VIEW sobre `cvcrm_lead_interacoes`. Sem INSTEAD OF trigger, INSERT falha.

**Impacto:** Registrar interações (mudança de estágio, CPF, visitas) falha silenciosamente (catch ignora o erro).
**Solução:** Inserir diretamente em `cvcrm_lead_interacoes` ou criar INSTEAD OF INSERT trigger.

---

### A7. `analytics/*` — Sem autenticação, sem isolamento

**Arquivos:**
- `app/api/analytics/conversao/route.ts`
- `app/api/analytics/top-imoveis/route.ts`
- `app/api/analytics/vendas/route.ts`
- `app/api/analytics/tempo-medio/route.ts`

**Problema:** Sem auth. Queries em `leads` e `agendamentos` sem filtro `workspace_id`.
**Impacto:** Dados analíticos de todos os tenants acessíveis por qualquer pessoa.
**Solução:** Adicionar `requireWorkspaceContext` e filtros.

---

### A8. `team-metrics` query tabela `interacoes` sem workspace_id

**Arquivo:** `app/api/crm/team-metrics/route.ts` (linhas 95, 116)
**Problema:** 
1. `FROM interacoes WHERE created_at >= $1 GROUP BY corretor_id` — sem filtro workspace
2. `FROM interacoes i LEFT JOIN users u ON u.id = i.corretor_id` — sem filtro workspace
3. A view `interacoes` não tem coluna `workspace_id`
4. JOIN `users u ON u.id = i.corretor_id` — `corretor_id` é TEXT na view mas UUID em users

**Impacto:** Métricas de equipe misturam dados de todos os tenants.
**Solução:** Filtrar por workspace na view ou na query.

---

### A9. `tenants/` — Rotas expostas sem autenticação

**Arquivos:**
- `app/api/tenants/route.ts`
- `app/api/tenants/[id]/route.ts`
- `app/api/tenants/[id]/whatsapp/route.ts`

**Problema:** CRUD de tenants sem auth. Qualquer pessoa pode listar, editar tenants.
**Impacto:** Exposição de dados sensíveis de configuração (tokens CVCRM, etc).
**Solução:** Adicionar auth (admin only).

---

### A10. `sofia/metrics` — Queries na tabela `conversations` com dados obsoletos

**Arquivo:** `app/api/sofia/metrics/route.ts`
**Problema:** Queries complexas na tabela `conversations` que tem dados no formato antigo (messages como JSONB). Tabela provavelmente vazia ou com dados irrelevantes desde que as conversas migraram para `whatsapp_messages`.
**Impacto:** Métricas da Sofia sempre retornam zeros.
**Solução:** Reescrever para usar `salva_leads_conversations` ou `whatsapp_messages`.

---

### A11. `admin/users/equipe` — Queries em `leads` (tabela local) em vez de `cvcrm_leads`

**Arquivo:** `app/api/admin/users/equipe/route.ts` (linhas 45-46)
**Problema:** `(SELECT COUNT(*) FROM leads WHERE corretor_id = u.id)` — usa tabela `leads` local. A tabela `leads` local tem poucos dados; os leads reais estão em `cvcrm_leads`.
**Impacto:** Contadores de leads por corretor sempre mostram 0 ou valores incorretos.
**Solução:** Usar `cvcrm_leads` com `corretor_id` adequado.

---

### A12. `admin/users/gerentes` — Mesmo problema com tabela `leads`

**Arquivo:** `app/api/admin/users/gerentes/route.ts` (linhas 22-24)
**Problema:** Mesma situação — conta leads de `leads` em vez de `cvcrm_leads`.
**Impacto:** Dashboard de gerentes com contadores incorretos.
**Solução:** Usar `cvcrm_leads`.

---

## 🟡 MÉDIO

### M1. `visitas_agendadas` — Criada on-the-fly sem `workspace_id`

**Arquivo:** `app/api/leads/[id]/schedule-visit/route.ts` (linhas 54-74)
**Problema:** Tabela não existe e é criada com `CREATE TABLE IF NOT EXISTS` no catch block, mas sem coluna `workspace_id`. Isso gera problemas de isolamento de tenant.
**Solução:** Usar tabela `agendamentos` existente em vez de criar tabela nova.

---

### M2. `DATABASE_URL` não definida em `.env.local`

**Arquivo:** `.env.local`
**Problema:** `DATABASE_URL` é usada em todo o projeto (`lib/db.ts`, várias APIs) mas não está definida em `.env.local`. O DB funciona porque deve estar definida via variável de ambiente do sistema.
**Impacto:** Pode causar confusão. Se a var do sistema sumir, tudo quebra.
**Solução:** Adicionar `DATABASE_URL` ao `.env.local`.

---

### M3. Variáveis de ambiente usadas no código mas NÃO definidas em `.env.local`

| Variável | Usada em | Status |
|----------|----------|--------|
| `DATABASE_URL` | lib/db.ts, tenant-context, várias APIs | ❌ Faltante |
| `ANTHROPIC_API_KEY` | lib/ai, multi-chat | ❌ Faltante |
| `ELEVENLABS_API_KEY` | lib/elevenlabs | ❌ Faltante |
| `ELEVENLABS_AGENT_ID` | voice-agent | ❌ Faltante |
| `ELEVENLABS_AGENT_PHONE_NUMBER_ID` | voice-agent | ❌ Faltante |
| `BYPASS_OTP_CODE` | auth/send-otp | ❌ Faltante |
| `ADMIN_BYPASS_PHONES` | auth | ❌ Faltante |
| `WEBHOOK_BASE_URL` | evolution, webhooks | ❌ Faltante |
| `EVOLUTION_WEBHOOK_SECRET` | webhook validation | ❌ Faltante |
| `LEAD_RECOVERY_TOKEN` | lead-recovery | ❌ Faltante |
| `LANGGRAPH_REMOTE_GRAPH_*` | AI agents | ❌ Faltante |
| `LANGSMITH_API_KEY` | tracing | ❌ Faltante |
| `UPSTASH_REDIS_*` | rate-limiter | ❌ Faltante |
| `GEMINI_API_KEY` | AI models | ❌ Faltante |
| `AZURE_OPENAI_*` | AI models | ❌ Faltante |
| `SCALINGO_*` | DB/Redis fallback | ❌ Faltante |
| `NEXT_PUBLIC_BASE_URL` | crm/stats/stream | ❌ Faltante |
| `CVCRM_TOKEN_PESSOA` | sync (pessoa) | ❌ Faltante |
| `CVCRM_TOKEN_ATENDIMENTO` | sync (atendimento) | ❌ Faltante |
| `CVCRM_TOKEN_ASSISTENCIA` | sync (assistencia) | ❌ Faltante |
| `CVCRM_TOKEN_COMISSAO` | sync (comissao) | ❌ Faltante |
| `CVCRM_TOKEN_PRECADASTRO` | sync (precadastro) | ❌ Faltante |
| `CVCRM_TOKEN_REPASSE` | sync (repasse) | ❌ Faltante |
| `CVCRM_TOKEN_PESQUISA` | sync (pesquisa) | ❌ Faltante |
| `CVCRM_TOKEN_PROCESSO` | sync (processo) | ❌ Faltante |
| `CVCRM_TOKEN_DISTRATO` | sync (distrato) | ❌ Faltante |
| `CVCRM_TOKEN_VENDA` | sync (venda) | ❌ Faltante |
| `CVCRM_TOKEN_CAMPANHA` | sync (campanha) | ❌ Faltante |
| `CVCRM_TOKEN_USUARIO` | sync (usuario) | ❌ Faltante |
| `CVCRM_TOKEN_CAMPO` | sync (campos) | ❌ Faltante |
| `CVCRM_TOKEN_AGENDAMENTO` | sync (agendamento) | ❌ Faltante |
| `CVCRM_API_URL` | cvcrm client | ❌ Faltante |
| `CVCRM_API_KEY` | cvcrm client | ❌ Faltante |
| `CVCRM_IMOBILIARIA_ID` | cvcrm | ❌ Faltante |

**Nota:** Algumas podem ser opcionais (AI providers alternativos, ferramentas não usadas). As mais preocupantes são `DATABASE_URL`, `WEBHOOK_BASE_URL`, e `EVOLUTION_WEBHOOK_SECRET`.

---

### M4. `crm/ai-suggestions` — Query na tabela `conversations` com dados vazios

**Arquivo:** `app/api/crm/ai-suggestions/route.ts` (linhas 32-36)
**Problema:** `SELECT ... FROM conversations c WHERE c.id = $1 AND c.workspace_id = $2` — a tabela `conversations` tem dados no formato antigo (chat bot), não WhatsApp real.
**Impacto:** Sugestões AI não encontram conversas.
**Solução:** Usar `whatsapp_messages` ou `salva_leads_conversations`.

---

### M5. `debug/route.ts` — Rota de debug sem auth

**Arquivo:** `app/api/debug/route.ts`
**Problema:** Sem autenticação. Pode expor informações sensíveis.
**Impacto:** Info leak.
**Solução:** Adicionar auth ou remover em produção.

---

### M6. `sync/all`, `sync/cvcrm`, `sync/test` — Sem autenticação

**Arquivos:**
- `app/api/sync/all/route.ts`
- `app/api/sync/cvcrm/route.ts`
- `app/api/sync/test/route.ts`

**Problema:** Endpoints de sync sem auth. Qualquer pessoa pode triggar sync completo.
**Impacto:** Possível abuso (sobrecarga API CVCRM, manipulação de dados).
**Solução:** Adicionar auth (admin only ou CRON_SECRET).

---

### M7. `whatsapp/sync` queries `whatsapp_chats` — VIEW compatibilidade

**Arquivo:** `app/api/whatsapp/sync/route.ts` (linha 302)
**Problema:** `SELECT COUNT(*) as total FROM whatsapp_chats WHERE workspace_id = $1` — `whatsapp_chats` é uma VIEW sobre `whatsapp_synced_chats`. A view mapeou `tenant_id` -> `workspace_id`. Funciona mas é frágil.
**Impacto:** Funciona agora, mas manutenção confusa.
**Solução:** Documentar ou migrar para usar a tabela diretamente.

---

### M8. `agendamentos` NÃO tem `workspace_id`

**Tabela:** `agendamentos`
**Problema:** Tabela `agendamentos` tem `tenant_id` mas NÃO `workspace_id`. Algumas queries analytics filtram `agendamentos` sem qualquer filtro de tenant.
**Impacto:** Queries analytics misturam dados de agendamentos de todos os tenants.
**Solução:** Adicionar `workspace_id` ou alterar queries.

---

### M9. `campaign_leads` NÃO tem `workspace_id`

**Tabela:** `campaign_leads`
**Problema:** Inserções feitas sem `workspace_id`. Como `campaigns` tem `workspace_id` mas `campaign_leads` não, fica difícil fazer isolamento.
**Impacto:** Leads de outros tenants poderiam ser adicionados a campanhas.
**Solução:** Adicionar `workspace_id` à tabela.

---

## 🔵 BAIXO

### B1. `crm/reports` queries `leads` (local) em vez de `cvcrm_leads`

**Arquivo:** `app/api/crm/reports/route.ts`
**Problema:** Todas as queries usam tabela `leads` (local, poucos dados) em vez de `cvcrm_leads` (dados reais do CRM).
**Impacto:** Reports mostram dados incompletos.
**Solução:** Migrar queries para `cvcrm_leads`.

---

### B2. `crm/stats/stream` — Fetch interno sem auth forwarding

**Arquivo:** `app/api/crm/stats/stream/route.ts` (linhas 11-13)
**Problema:** Faz `fetch()` para `/api/crm/stats` internamente mas não passa cookies/headers de auth. A chamada interna pode falhar se `/api/crm/stats` exigir auth.
**Impacto:** Stream de stats pode retornar erros.
**Solução:** Passar headers de auth ou fazer query direta ao DB.

---

### B3. `salva-leads/leads` queries tabela `leads` (local)

**Arquivo:** `app/api/salva-leads/leads/route.ts` (linha 120)
**Problema:** `FROM leads l` — usa tabela local em vez de `cvcrm_leads`.
**Impacto:** Lista de leads do salva-leads pode estar incompleta.
**Solução:** Verificar se o fluxo salva-leads cria na tabela `leads` propositalmente.

---

### B4. `user/update` — Sem auth verificada

**Arquivo:** `app/api/user/update/route.ts`
**Problema:** Sem `requireWorkspaceContext` ou `getAuthenticatedUser`.
**Impacto:** Possível atualização de dados de usuário sem autenticação.
**Solução:** Adicionar auth.

---

### B5. Columns `nome` vs `name` inconsistência em `leads`

**Tabela:** `leads`
**Problema:** Tabela `leads` tem AMBAS colunas `name` e `nome`. Queries alternam entre uma e outra.
**Impacto:** Confusão no código, dados podem ser salvos em coluna errada.
**Solução:** Consolidar para uma única coluna.

---

### B6. `leads` tabela tem `telefone` vs `phone` inconsistência em users

**Tabela:** `users`
**Problema:** Tabela `users` tem AMBAS colunas `telefone` e `phone`. 
**Impacto:** Confusão no código.
**Solução:** Consolidar.

---

## 📋 TABELAS SEM `workspace_id` (usadas com filtro workspace)

| Tabela | Tem workspace_id? | Usada com filtro workspace? | Severidade |
|--------|-------------------|---------------------------|------------|
| academy_lessons | ❌ | ✅ | 🔴 CRÍTICO |
| academy_modules | ❌ | ✅ | 🔴 CRÍTICO |
| academy_categories | ❌ | ✅ | 🔴 CRÍTICO |
| academy_progress | ❌ | ✅ | 🔴 CRÍTICO |
| academy_certificates | ❌ | ✅ | 🔴 CRÍTICO |
| dispatch_batches | ❌ | ✅ | 🔴 CRÍTICO |
| im_vendas | ❌ | ✅ | 🔴 CRÍTICO |
| cvcrm_lead_interacoes | ❌ | ✅ | 🔴 CRÍTICO |
| automations | ❌ | ❌ (sem filtro) | 🟠 ALTO |
| agendamentos | ❌ | ⚠️ (deveria) | 🟡 MÉDIO |
| campaign_leads | ❌ | ❌ | 🟡 MÉDIO |
| leads_interactions | ❌ | ❌ | 🟡 MÉDIO |
| analytics_events | ❌ | ❌ | 🔵 BAIXO |
| tracking_events | ❌ | ❌ | 🔵 BAIXO |

---

## 📋 TABELAS/VIEWS INEXISTENTES referenciadas no código

| Tabela/View | Arquivo | Linha |
|-------------|---------|-------|
| `notificacoes` | `app/api/notificacoes/route.ts` | 16 |
| `goals` | `app/api/sofia/proactive/route.ts` | 146 |
| `reservations` | `app/api/sofia/proactive/route.ts` | 223 |
| `leads_visits` | `app/api/salva-leads/agendar-visita/route.ts` | 51 |
| `visitas_agendadas` | `app/api/leads/[id]/schedule-visit/route.ts` | 55 |

---

## 📋 APIs SEM AUTENTICAÇÃO (seleção das mais preocupantes)

| Rota | Dados expostos | Risco |
|------|---------------|-------|
| `/api/crm/reports` | Reports de todos os tenants | 🟠 ALTO |
| `/api/crm/campaigns` | CRUD campanhas sem auth | 🟠 ALTO |
| `/api/crm/automations` | CRUD automações sem auth | 🟠 ALTO |
| `/api/crm/conversations` | Conversas WhatsApp | 🟠 ALTO |
| `/api/crm/pipeline/move` | Mover leads no pipeline | 🟠 ALTO |
| `/api/tenants/*` | CRUD tenants (config, tokens) | 🟠 ALTO |
| `/api/debug` | Debug info | 🟡 MÉDIO |
| `/api/sync/*` | Trigger sync | 🟡 MÉDIO |
| `/api/notificacoes/*` | Notificações | 🟡 MÉDIO |
| `/api/analytics/*` | Dados analíticos | 🟡 MÉDIO |
| `/api/sofia/config` | Config do bot | 🟡 MÉDIO |
| `/api/admin/imobiliarias` | Imobiliárias (via ADMIN_SECRET_KEY) | ⚠️ Verificar |
| `/api/user/update` | Atualizar user | 🟡 MÉDIO |

**Nota:** Rotas de auth (`/api/auth/*`), track, health, e webhooks são esperadamente sem auth.

---

## 🔧 RECOMENDAÇÕES PRIORITÁRIAS

### Prioridade 1 (Corrigir AGORA):
1. **Academy**: Adicionar `workspace_id` às 5 tabelas academy
2. **dispatch_batches**: Adicionar `workspace_id`
3. **im_vendas**: Adicionar `workspace_id`
4. **cvcrm_lead_interacoes**: Adicionar `workspace_id`
5. **notificacoes**: Criar tabela ou remover rotas

### Prioridade 2 (Esta semana):
6. **Auth**: Adicionar `requireWorkspaceContext` a: `crm/reports`, `crm/campaigns`, `crm/automations`, `crm/conversations`, `crm/pipeline/move`
7. **Tenant isolation**: Adicionar `WHERE workspace_id = $X` a todas as queries que faltam
8. **INSERT em VIEW**: Trocar `INSERT INTO interacoes` por `INSERT INTO cvcrm_lead_interacoes`

### Prioridade 3 (Esta sprint):
9. **Tabelas inexistentes**: `goals`, `reservations`, `leads_visits` — criar ou remover referências
10. **Queries na tabela `leads` local**: Migrar para `cvcrm_leads` onde apropriado
11. **Variáveis de ambiente**: Documentar quais são obrigatórias vs opcionais

---

*Relatório gerado automaticamente. NÃO foram feitas correções — apenas diagnóstico.*
