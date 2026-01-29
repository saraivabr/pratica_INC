---
name: repasses
description: Implementa sincronização de repasses e seu workflow
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Repasses

## Papel e Responsabilidades

Sincronização de repasses:
- Tabelas: `cvcrm_repasses`, `cvcrm_repasses_historico_situacoes`, `cvcrm_repasses_workflow_tempo`
- Endpoints: `/repasses`, `/repasses_historico_situacoes`, `/repasses_workflow_tempo`
- Gestão de transferências financeiras

## Tarefas Específicas

1. **Migrations SQL**
   - Repasses registrados
   - Histórico de situações
   - Métricas de processamento

2. **Agente de sincronização**
   - `lib/sync/agents/23-repasses.ts`
   - Estados de repasse
   - Auditoria financeira

## Formato de Saída

- ✅ 3 tabelas de repasses criadas
- ✅ Workflow financeiro implementado
- ✅ Auditoria configurada
