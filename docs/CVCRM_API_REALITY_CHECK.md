# CV CRM API - Reality Check

**Data:** 2026-01-17
**Status:** Mapeamento Completo Realizado

---

## 🎯 Problema Descoberto

Os 28 agentes foram criados para usar a **API CVDW** (`/api/v1/cvdw/...`), mas:

1. ❌ Você **NÃO tem acesso ao CVDW** (retorna 403 Forbidden)
2. ✅ Você **TEM acesso à API Comercial** (`/api/v1/comercial/...`)
3. ⚠️ A API Comercial tem **muito menos endpoints** disponíveis

---

## 📊 Mapeamento Completo dos Seus Tokens

### ✅ Endpoints Funcionais (GET)

| Endpoint | Total Registros | Token Usado |
|----------|----------------|-------------|
| `/api/v1/comercial/leads` | 19.642 | CVCRM_TOKEN_LEAD |
| `/api/v1/comercial/leads/interacoes` | 35.305 | CVCRM_TOKEN_LEAD |
| `/api/v1/comercial/leads/tarefas` | 8.182 | CVCRM_TOKEN_LEAD |
| `/api/v1/comercial/reservas` | 0 (vazio) | CVCRM_TOKEN_RESERVA |

**Total de dados acessíveis:** ~63.000 registros

---

### ❌ Endpoints Não Funcionais (405/400/403)

Estes tokens existem mas seus endpoints **não aceitam GET**:

- `CVCRM_TOKEN_EMPREENDIMENTO` → 405 Method Not Allowed
- `CVCRM_TOKEN_UNIDADE` → 405 Method Not Allowed
- `CVCRM_TOKEN_SERIE` → 405 Method Not Allowed
- `CVCRM_TOKEN_CORRETOR` → 405 Method Not Allowed
- `CVCRM_TOKEN_IMOBILIARIA` → 405 Method Not Allowed
- `CVCRM_TOKEN_DISPONIBILIDADE` → 405 Method Not Allowed
- `CVCRM_TOKEN_INFORMAR_VENDA` → 405 Method Not Allowed

**Possíveis motivos:**
1. São tokens apenas para POST (criar/atualizar dados)
2. Endpoints não existem na API Comercial
3. Requerem parâmetros específicos que não testamos

---

### 🔍 Outros Endpoints Testados (com token LEAD)

Todos retornaram **405 Method Not Allowed**:

- `/api/v1/comercial/leads/conversoes`
- `/api/v1/comercial/leads/ganhos`
- `/api/v1/comercial/leads/perdas`
- `/api/v1/comercial/pessoas`
- `/api/v1/comercial/atendimentos`
- `/api/v1/comercial/assistencias`
- `/api/v1/comercial/comissoes`
- `/api/v1/comercial/processos`
- `/api/v1/comercial/vendas`
- `/api/v1/comercial/simulacoes`

---

## 🎯 Solução Real

### Opção A: Adaptar para API Comercial (RECOMENDADO)

**Implementar apenas os agentes que funcionam:**

#### Domínio Leads (3 agentes)
1. **leads-core** → `/api/v1/comercial/leads`
2. **leads-interacoes** → `/api/v1/comercial/leads/interacoes`
3. **leads-tarefas** → `/api/v1/comercial/leads/tarefas`

#### Domínio Reservas (1 agente)
4. **reservas-core** → `/api/v1/comercial/reservas`

**Total:** 4 agentes funcionais cobrindo ~63.000 registros

**Vantagens:**
- ✅ Funciona AGORA com seus tokens atuais
- ✅ Sem custo adicional
- ✅ 63.000+ registros acessíveis
- ✅ Implementação rápida

**Desvantagens:**
- ⚠️ Cobertura limitada (4 agentes vs 28 planejados)
- ⚠️ Sem dados de pessoas, corretores, unidades, etc.

---

### Opção B: Solicitar Acesso CVDW (IDEAL FUTURO)

**Entrar em contato com CV CRM para ativar:**
- Acesso à API CVDW (`/api/v1/cvdw/...`)
- Todos os 68 endpoints disponíveis
- Rate limit: 20 req/min (vs 200 req/min da API Comercial)

**Vantagens:**
- ✅ Todos os 28 agentes funcionarão
- ✅ Acesso a 68 endpoints
- ✅ Sync completo de todos os domínios
- ✅ Arquitetura já está pronta

**Desvantagens:**
- ⏳ Requer aprovação do CV CRM
- 💰 Pode ter custo adicional
- ⏱️ Tempo de aprovação desconhecido

---

## 🚀 Próximos Passos

### Implementação Imediata (Opção A)

1. **Criar 4 agentes funcionais:**
   - lib/sync/agents/01-leads-core.ts
   - lib/sync/agents/02-leads-interacoes.ts
   - lib/sync/agents/03-leads-tarefas.ts
   - lib/sync/agents/04-reservas-core.ts

2. **Atualizar base-agent.ts:**
   - Mudar path base de `/api/v1/cvdw/` para `/api/v1/comercial/`
   - Ajustar formato de resposta (diferente entre CVDW e Comercial)

3. **Criar migration simplificada:**
   - Apenas 4 tabelas principais
   - Indexes otimizados

4. **Testar sync:**
   - Executar sync completo dos 4 agentes
   - Validar dados no PostgreSQL

### Planejamento Futuro (Opção B)

1. Abrir ticket com CV CRM solicitando acesso CVDW
2. Aguardar aprovação
3. Ativar os 28 agentes completos
4. Migrar para arquitetura completa

---

## 📝 Decisão Necessária

**Qual caminho você prefere?**

A) **Implementar os 4 agentes agora** (leads + reservas)
   → Rápido, funcional, limitado

B) **Solicitar acesso CVDW primeiro**
   → Completo, mas requer aprovação

C) **Ambos**: Implementar 4 agentes agora + solicitar CVDW em paralelo
   → Melhor dos dois mundos

---

**Próxima Ação:** Aguardando sua decisão para prosseguir.
