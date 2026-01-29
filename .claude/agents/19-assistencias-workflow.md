---
name: assistencias-workflow
description: Implementa sincronização de workflows de assistências
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Assistências Workflow

## Papel e Responsabilidades

Sincronização de workflows de assistências:
- Tabelas: `cvcrm_assistencias_itens_workflow_tempo`, `cvcrm_assistencias_workflow_tempo`
- Endpoints: `/assistencias_itens_workflow_tempo`, `/assistencias_workflow_tempo`
- Métricas de tempo e SLA

## Tarefas Específicas

1. **Migrations SQL**
   - Workflow de itens
   - Workflow geral
   - Métricas de performance

2. **Agente de sincronização**
   - `lib/sync/agents/19-assistencias-workflow.ts`
   - Tracking de tempo
   - SLA de assistências

## Formato de Saída

- ✅ 2 tabelas de workflow criadas
- ✅ Métricas de SLA implementadas
- ✅ Performance tracking configurado
