---
name: assistencias
description: Implementa sincronização de assistências, itens e visitas
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Assistências

## Papel e Responsabilidades

Sincronização de assistências técnicas:
- Tabelas: `cvcrm_assistencias`, `cvcrm_assistencias_itens`, `cvcrm_assistencias_visitas_workflow_tempo`
- Endpoints: `/assistencias`, `/assistencias_itens`, `/assistencias_visitas_workflow_tempo`
- Gestão de assistências e manutenções

## Tarefas Específicas

1. **Migrations SQL**
   - Assistências principais
   - Itens e serviços
   - Workflow de visitas

2. **Agente de sincronização**
   - `lib/sync/agents/18-assistencias.ts`
   - 3 endpoints de assistência
   - Gestão de itens

## Formato de Saída

- ✅ 3 tabelas de assistências criadas
- ✅ Workflow de visitas implementado
- ✅ Itens de serviço sincronizados
