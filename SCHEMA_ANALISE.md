# 🔍 ANÁLISE COMPLETA DO SCHEMA - Colunas Faltando

**Data:** 29/01/2025  
**Projeto:** /var/www/pratica  
**Status:** ⚠️ CRÍTICO - Múltiplas colunas faltando causando erros em produção

---

## 📊 RESUMO EXECUTIVO

### Erros Identificados nos Logs PM2
```
1. [Sofia] Error: relation "onboarding_leads" does not exist
2. [Message] Error: column "total_messages_received" of relation "whatsapp_contacts" does not exist
3. [AgentConfig] Error: column "workspace_id" does not exist
```

### Status da Migration 027
- **Arquivo existe:** ✅ `/var/www/pratica/migrations/027_fix_missing_columns_critical.sql`
- **Aplicada no banco:** ❌ **NÃO** - Colunas ainda não existem
- **Ação necessária:** Aplicar migration + adicionar colunas extras identificadas

---

## 🔴 COLUNAS FALTANDO (CRÍTICO)

### 1. Tabela: `whatsapp_contacts`

#### Colunas Faltando:
| Coluna | Tipo | Default | Motivo |
|--------|------|---------|--------|
| `total_messages_received` | INTEGER | 0 | Contagem de mensagens recebidas |
| `total_messages_sent` | INTEGER | 0 | Contagem de mensagens enviadas |
| `is_business` | BOOLEAN | false | Identifica conta business WhatsApp |
| `is_group` | BOOLEAN | false | Identifica se é grupo |
| `last_interaction_at` | TIMESTAMP | NULL | Última interação com contato |

#### Referências no Código:
```typescript
// app/api/webhook/evolution/[workspaceId]/route.ts
total_messages_received: existingContacts[0].total_messages_received + 1
total_messages_sent: 0

// app/api/leads/by-phone/route.ts
is_business: whatsappContact.is_business
is_group: whatsappContact.is_group
last_interaction_at: whatsappContact.last_interaction_at
```

#### Impacto:
- ❌ **ALTA SEVERIDADE** - Webhook do Evolution API falhando
- ❌ Endpoint `/api/leads/by-phone` retornando erro
- ❌ Estatísticas de contatos incorretas

---

### 2. Tabela: `agent_configs`

#### Colunas Faltando:
| Coluna | Tipo | Default | Motivo |
|--------|------|---------|--------|
| `workspace_id` | INTEGER | NULL | Isolamento multi-tenant |

#### Referências no Código:
```typescript
// lib/agents/config.ts
SELECT * FROM agent_configs WHERE workspace_id = $1

// .next/server (compiled)
WHERE workspace_id = $1 AND instance_name = $2
```

#### Impacto:
- ❌ **CRÍTICO** - Sistema de agentes não funciona
- ❌ Multi-tenancy quebrado
- ❌ Configs de Sofia/Luna compartilhadas entre workspaces

---

### 3. Tabela: `agent_conversation_logs`

#### Colunas Faltando:
| Coluna | Tipo | Default | Motivo |
|--------|------|---------|--------|
| `workspace_id` | INTEGER | NULL | Isolamento de logs por workspace |

#### Referências no Código:
```typescript
// lib/agents/config.ts:274
INSERT INTO agent_conversation_logs (
  workspace_id, agent_config_id, instance_name, ...
)

// lib/agents/config.ts:371
SELECT COUNT(*) FROM agent_conversation_logs WHERE workspace_id = $1
```

#### Impacto:
- ❌ **ALTA SEVERIDADE** - Logs de conversação não salvam
- ❌ Analytics de agentes quebrados
- ❌ Histórico de interações perdido

---

## ⚠️ TABELAS FALTANDO

### 1. Tabela: `onboarding_leads`

#### Status:
- **Existe no código de backup:** ✅ `backups/*/lib/sofia/flows.ts`
- **Existe no banco atual:** ❌ **NÃO**

#### Schema Esperado (extraído do código):
```sql
CREATE TABLE onboarding_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255),
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'collecting',  -- collecting, completed, cancelled
  step VARCHAR(50) DEFAULT 'name',  -- name, email, interest, finalization
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW()
);
```

#### Referências:
```typescript
// backups/full-migration-20260128-111748/lib/sofia/flows.ts
SELECT * FROM onboarding_leads WHERE phone = $1
INSERT INTO onboarding_leads (phone, status, step) VALUES ...
UPDATE onboarding_leads SET ... WHERE id = $1
```

#### Impacto:
- ⚠️ **MÉDIA SEVERIDADE** - Flow de onboarding com Sofia quebrado
- ⚠️ Código de backup não pode ser restaurado
- ✅ **Nota:** Código atual em `/var/www/pratica` não usa mais, mas backups sim

---

## 📋 CONFLITOS DE TIPO (Não encontrados)

✅ **Boa notícia:** Não foram identificados conflitos de tipo (UUID vs TEXT, etc)

---

## 🎯 ANÁLISE DE CÓDIGO

### Arquivos Verificados:
- ✅ `lib/agents/config.ts` - Configurações de agentes
- ✅ `app/api/webhook/evolution/[workspaceId]/route.ts` - Webhook WhatsApp
- ✅ `app/api/leads/by-phone/route.ts` - API de leads
- ✅ `scripts/sync-whatsapp-history.ts` - Sync histórico
- ✅ `migrations/027_fix_missing_columns_critical.sql` - Migration parcial

### Padrões Encontrados:
```typescript
// Padrão 1: Incremento de contadores
total_messages_received: existingContacts[0].total_messages_received + 1

// Padrão 2: Filtros multi-tenant
WHERE workspace_id = $1 AND instance_name = $2

// Padrão 3: Inserção com workspace
INSERT INTO agent_conversation_logs (workspace_id, ...)
```

---

## 🔧 AÇÕES NECESSÁRIAS

### Prioridade 1 - CRÍTICO (Fazer AGORA)
1. ✅ Aplicar colunas em `whatsapp_contacts`
2. ✅ Aplicar coluna `workspace_id` em `agent_configs`
3. ✅ Aplicar coluna `workspace_id` em `agent_conversation_logs`

### Prioridade 2 - ALTA (Fazer hoje)
4. ⚠️ Decidir sobre tabela `onboarding_leads`
   - Opção A: Criar (se planos de reativar)
   - Opção B: Ignorar (se código descontinuado)

### Prioridade 3 - MANUTENÇÃO
5. 📝 Atualizar migrations com todas as colunas
6. 🧪 Testar webhooks após correções
7. 📊 Verificar logs pós-deploy

---

## 💾 SCHEMA ATUAL vs ESPERADO

### `whatsapp_contacts` - Schema Atual
```
id, tenant_id, instance_name, phone_number, contact_name,
profile_picture_url, lead_id, matched_at, last_message_at,
total_messages, raw_data, created_at, updated_at, workspace_id
```

### `whatsapp_contacts` - Schema Esperado
```
[TODAS AS COLUNAS ACIMA] +
total_messages_received, total_messages_sent,
is_business, is_group, last_interaction_at
```

---

## 📝 NOTAS TÉCNICAS

### Migration 027 - Incompleta
O arquivo `027_fix_missing_columns_critical.sql` cobre:
- ✅ `total_messages_received` em `whatsapp_contacts`
- ✅ `total_messages_sent` em `whatsapp_contacts`
- ✅ `workspace_id` em `agent_configs`

**Falta adicionar:**
- ❌ `is_business` em `whatsapp_contacts`
- ❌ `is_group` em `whatsapp_contacts`
- ❌ `last_interaction_at` em `whatsapp_contacts`
- ❌ `workspace_id` em `agent_conversation_logs`

### Observações
1. **Multi-tenancy:** Sistema fortemente dependente de `workspace_id` após migração 022
2. **WhatsApp:** Colunas `is_business` e `is_group` são essenciais para filtros na UI
3. **Analytics:** `last_interaction_at` usado para métricas de engajamento

---

## 🔍 MÉTODO DE ANÁLISE

### Fontes Utilizadas:
1. ✅ Logs PM2 (últimas 1000 linhas)
2. ✅ Grep em todo código-fonte (129.641 arquivos)
3. ✅ Schema atual do banco via `\d` (136 tabelas)
4. ✅ Migrations existentes (027 arquivos)
5. ✅ Código compilado `.next/server` (padrões de uso)

### Comandos Executados:
```bash
pm2 logs --lines 1000 | grep "does not exist"
grep -r "INSERT INTO\|UPDATE.*SET" --include="*.ts" .
psql -d pratica -c "\d whatsapp_contacts"
```

---

**Relatório gerado por:** Subagent Análise Profunda  
**Próximo passo:** Aplicar `SCHEMA_FIX_COMPLETO.sql`
