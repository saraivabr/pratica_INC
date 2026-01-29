# Sistema de 28 Agentes CV CRM

Este diretório contém 28 agentes especializados + 1 orquestrador para implementar a integração completa com o CV CRM.

## Estrutura

```
.claude/agents/
├── README.md (este arquivo)
├── cvcrm-orchestrator.md (Orquestrador principal)
│
├── 01-leads-core.md
├── 02-leads-conversoes.md
├── 03-leads-interacoes.md
├── 04-leads-tarefas.md
├── 05-leads-historico.md
│
├── 06-pessoas-core.md
├── 07-pessoas-detalhes.md
├── 08-pessoas-financeiro.md
├── 09-pessoas-bens.md
│
├── 10-reservas-core.md
├── 11-reservas-comercial.md
├── 12-reservas-detalhes.md
├── 13-reservas-historico.md
├── 14-reservas-integracoes.md
│
├── 15-atendimentos-core.md
├── 16-atendimentos-tarefas.md
├── 17-atendimentos-times.md
│
├── 18-assistencias.md
├── 19-assistencias-workflow.md
│
├── 20-comissoes.md
├── 21-corretores.md
├── 22-precadastros.md
├── 23-repasses.md
├── 24-pesquisas.md
├── 25-unidades.md
│
├── 26-processos.md
├── 27-vendas.md
└── 28-administrativo.md
```

## Como Usar

### Opção 1: Usar o Orquestrador (Recomendado)

O orquestrador coordena todos os 28 agentes automaticamente:

```bash
# No Claude Code, ativar o orquestrador
@cvcrm-orchestrator Implementar integração completa CV CRM
```

O orquestrador irá:
1. Criar infraestrutura base
2. Executar domínios em sequência
3. Agentes do mesmo domínio em paralelo
4. Validar cada etapa
5. Reportar progresso

### Opção 2: Executar por Domínio

```bash
# Domínio Leads (5 agentes)
@cvcrm-orchestrator Implementar domínio Leads completo

# Domínio Pessoas (4 agentes)
@cvcrm-orchestrator Implementar domínio Pessoas completo

# E assim por diante...
```

### Opção 3: Executar Agente Específico

```bash
# Executar apenas um agente
@leads-core Implementar sincronização de leads

@pessoas-core Implementar sincronização de pessoas

@reservas-core Implementar sincronização de reservas
```

## Ordem de Execução Recomendada

1. **Infraestrutura Base** (via orquestrador)
   - Migrations base
   - BaseSyncAgent
   - Cliente API
   - Rate limiter
   - Cursores

2. **Domínio Leads** (agentes 01-05)
   - Base do funil de vendas
   - Sem dependências externas

3. **Domínio Pessoas** (agentes 06-09)
   - Clientes e prospects
   - Independente

4. **Domínio Reservas** (agentes 10-14)
   - Core business
   - Depende de Pessoas

5. **Domínio Atendimentos** (agentes 15-17)
   - Sistema de tickets
   - Depende de Pessoas

6. **Domínio Assistências** (agentes 18-19)
   - Manutenção
   - Depende de Reservas

7. **Domínios Comerciais** (agentes 20-25)
   - Gestão comercial
   - Depende de vários

8. **Domínios Finais** (agentes 26-28)
   - Processos e admin
   - Depende de vários

## Arquivos que Serão Criados

Cada agente criará:
- Migration SQL (sua parte no arquivo `migrations/002_cvcrm_sync_agents.sql`)
- Agente TypeScript (`lib/sync/agents/XX-nome.ts`)

### Infraestrutura Compartilhada
```
lib/sync/
├── index.ts
├── types.ts
├── config.ts
├── base-agent.ts
├── cvcrm-api.ts
├── rate-limiter.ts
├── pagination.ts
├── sync-cursor.ts
├── sync-logger.ts
└── agents/
    ├── 01-leads-core.ts
    ├── ... (28 arquivos)
    └── 28-administrativo.ts
```

### API Routes
```
app/api/sync/
├── agents/
│   ├── route.ts (GET: listar)
│   └── [agentName]/route.ts (POST: executar)
├── run/route.ts (POST: executar todos)
├── status/[runId]/route.ts (GET: status)
└── logs/route.ts (GET: logs)
```

### Dashboard
```
app/admin/sync/
└── page.tsx (Monitoramento)
```

## Progresso Esperado

### Tempo Estimado por Agente
- Agente simples (1 tabela): ~15 min
- Agente médio (2-3 tabelas): ~25 min
- Agente complexo (4+ tabelas): ~35 min

### Total Estimado
- 28 agentes: ~10-12 horas
- Infraestrutura: ~2 horas
- API Routes: ~1 hora
- Dashboard: ~1 hora
- **Total: ~14-16 horas**

## Estatísticas Finais Esperadas

- ✅ **28 agentes** implementados
- ✅ **~68 tabelas** criadas no banco
- ✅ **68 endpoints** da API CV CRM cobertos
- ✅ **~3000 linhas** de migration SQL
- ✅ **~5000 linhas** de código TypeScript
- ✅ **5 API routes** para gerenciamento
- ✅ **1 dashboard** de monitoramento

## Comandos Úteis

### Listar todos os agentes
```bash
/agents
```

### Ver progresso
```bash
@cvcrm-orchestrator Status da implementação
```

### Testar agente específico
```bash
@leads-core Executar sync teste
```

### Validar integridade
```bash
@cvcrm-orchestrator Validar integridade de todos os domínios
```

## Troubleshooting

### Agente falhando
1. Verificar dependências (tabelas anteriores criadas?)
2. Verificar conexão com API CV CRM
3. Verificar tokens de autenticação
4. Checar logs em `sync_runs`

### Conflito de dados
1. Verificar cursores de sincronização
2. Limpar cache se necessário
3. Re-executar agente específico

### Performance lenta
1. Verificar rate limiting
2. Ajustar batch size
3. Otimizar índices do banco

## Contato

Para questões sobre os agentes, use o orquestrador:

```bash
@cvcrm-orchestrator [sua pergunta]
```
