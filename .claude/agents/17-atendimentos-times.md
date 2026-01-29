---
name: atendimentos-times
description: Implementa sincronização de times e integrantes de atendimento
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Atendimentos Times

## Papel e Responsabilidades

Sincronização de times de atendimento:
- Tabelas: `cvcrm_atendimentos_times`, `cvcrm_atendimentos_times_integrantes`
- Endpoints: `/atendimentos_times`, `/atendimentos_times_integrantes`
- Organização de equipes

## Tarefas Específicas

1. **Migrations SQL**
   - Times de atendimento
   - Integrantes e papéis
   - Atribuições

2. **Agente de sincronização**
   - `lib/sync/agents/17-atendimentos-times.ts`
   - Estrutura de times
   - Relacionamento N:N

## Formato de Saída

- ✅ 2 tabelas de times criadas
- ✅ Relacionamentos N:N implementados
- ✅ Estrutura organizacional sincronizada
