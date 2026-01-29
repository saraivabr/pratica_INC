# CV CRM Sync Agents (Simplified)

Sistema de sincronização de dados do CV CRM baseado em **5 endpoints reais** com acesso confirmado.

## 📊 Visão Geral

Total de **~64.688 registros** distribuídos em 5 agentes:

| # | Agente | Endpoint | Tabela | Records |
|---|--------|----------|--------|---------|
| 01 | leads-core | `/api/v1/comercial/leads` | `cvcrm_leads` | ~19.642 |
| 02 | leads-interacoes | `/api/v1/cv/leads_interacoes` | `cvcrm_leads_interacoes` | ~35.305 |
| 03 | leads-tarefas | `/api/v1/comercial/leads/tarefas` | `cvcrm_leads_tarefas` | ~8.182 |
| 04 | atendimentos-core | `/api/v1/relacionamento/atendimentos` | `cvcrm_atendimentos` + `arquivos` | ~1.558 |
| 05 | assistencias-core | `/api/v1/relacionamento/assistencias` | `cvcrm_assistencias` | ~1 |

## 🚀 Como Usar

### 1. Rodar Todos os Agentes (Sequencial)

```bash
npx tsx lib/sync/agents-simple/run-all.ts
```

Executa os 5 agentes em sequência, um após o outro.

### 2. Rodar Todos os Agentes (Paralelo)

```bash
npx tsx lib/sync/agents-simple/run-all.ts --parallel
```

Executa os 5 agentes simultaneamente. **⚠️ Cuidado com rate limiting!**

### 3. Rodar Agente Individual

```bash
# Leads Core
npx tsx lib/sync/agents-simple/01-leads-core.ts

# Leads Interações
npx tsx lib/sync/agents-simple/02-leads-interacoes.ts

# Leads Tarefas
npx tsx lib/sync/agents-simple/03-leads-tarefas.ts

# Atendimentos
npx tsx lib/sync/agents-simple/04-atendimentos-core.ts

# Assistências
npx tsx lib/sync/agents-simple/05-assistencias-core.ts
```

## ⚙️ Configuração

### Variáveis de Ambiente (`.env.local`)

```env
# Database
DATABASE_URL="postgres://user:password@host:port/database"

# CV CRM API
CVCRM_BASE_URL="https://pratica.cvcrm.com.br"
CVCRM_EMAIL="seu-email@exemplo.com"
CVCRM_TOKEN_LEAD="seu-token-aqui"
```

### Rate Limiting

- **API Comercial**: 200 req/min
- **Configurado**: 350ms entre requests (171 req/min)
- **Modo Paralelo**: 5x mais chamadas simultâneas - use com cuidado!

## 📁 Estrutura

```
lib/sync/
├── agents-simple/
│   ├── 01-leads-core.ts          # Leads principais
│   ├── 02-leads-interacoes.ts    # Interações
│   ├── 03-leads-tarefas.ts       # Tarefas
│   ├── 04-atendimentos-core.ts   # Atendimentos + arquivos
│   ├── 05-assistencias-core.ts   # Assistências
│   ├── run-all.ts                # Orquestrador
│   ├── index.ts                  # Exports
│   └── README.md                 # Esta doc
├── cvcrm-api-simple.ts           # Cliente API
└── ...
```

## 🔍 Monitoramento

### Verificar Logs de Sync

```sql
SELECT * FROM cvcrm_sync_logs
ORDER BY started_at DESC
LIMIT 10;
```

### Verificar Dados Sincronizados

```sql
-- Leads
SELECT COUNT(*) FROM cvcrm_leads;

-- Interações
SELECT COUNT(*) FROM cvcrm_leads_interacoes;

-- Tarefas
SELECT COUNT(*) FROM cvcrm_leads_tarefas;

-- Atendimentos
SELECT COUNT(*) FROM cvcrm_atendimentos;

-- Assistências
SELECT COUNT(*) FROM cvcrm_assistencias;
```

### Estatísticas Completas

```sql
SELECT
  agent_name,
  table_name,
  status,
  records_processed,
  records_created,
  records_updated,
  completed_at - started_at AS duration
FROM cvcrm_sync_logs
WHERE status = 'completed'
ORDER BY started_at DESC;
```

## 🎯 Features

- ✅ **Upsert Automático**: INSERT...ON CONFLICT para idempotência
- ✅ **Progress Tracking**: Progresso em tempo real no console
- ✅ **Error Handling**: Continua mesmo se um registro falhar
- ✅ **Rate Limiting**: Respeita limites da API automaticamente
- ✅ **Logging**: Registra todas as execuções em `cvcrm_sync_logs`
- ✅ **JSONB Support**: Armazena objetos nested (gestor, corretor, etc.)
- ✅ **Referential Integrity**: Foreign keys entre tabelas

## 📋 Próximos Passos

1. **Sync Incremental**: Implementar cursores baseados em `referencia_data`
2. **Cron Job**: Agendar sync automático (a cada 6h ou diário)
3. **API Routes**: Criar endpoints Next.js para controle via UI
4. **Dashboard**: Página de admin para monitorar syncs
5. **Webhooks**: Receber notificações de mudanças do CV CRM

## 🐛 Troubleshooting

### Erro: Database connection failed

```bash
# Verifique se o DATABASE_URL está correto
echo $DATABASE_URL
```

### Erro: 401 Unauthorized

```bash
# Verifique se o CVCRM_TOKEN_LEAD está válido
# Teste manualmente com curl
curl -H "email: seu@email.com" -H "token: seu-token" \
  https://pratica.cvcrm.com.br/api/v1/comercial/leads?limit=1
```

### Erro: Rate limit exceeded (429)

```bash
# Aumente o delay em cvcrm-api-simple.ts
const RATE_LIMIT_DELAY = 500; // 500ms = 120 req/min
```

### Sync muito lento

```bash
# Use modo paralelo (com cautela!)
npx tsx lib/sync/agents-simple/run-all.ts --parallel

# Ou rode agentes menores primeiro
npx tsx lib/sync/agents-simple/05-assistencias-core.ts  # ~1 registro
npx tsx lib/sync/agents-simple/04-atendimentos-core.ts  # ~1.558 registros
```

## 📖 Documentação Relacionada

- [CVCRM_COMPLETE_API_MAPPING.md](../../../CVCRM_COMPLETE_API_MAPPING.md) - Mapeamento completo da API
- [migrations/003_cvcrm_5_agents.sql](../../../migrations/003_cvcrm_5_agents.sql) - Schema do banco
- [CV CRM API Docs](https://desenvolvedor.cvcrm.com.br) - Documentação oficial

---

**Criado em**: 2026-01-17
**Baseado em**: Testes reais da API CV CRM Comercial
**Status**: ✅ Funcional e testado
