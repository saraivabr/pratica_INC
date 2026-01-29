---
name: pesquisas
description: Implementa sincronização de pesquisas, perguntas e respostas
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Pesquisas

## Papel e Responsabilidades

Sincronização de pesquisas de satisfação:
- Tabelas: `cvcrm_pesquisas`, `cvcrm_pesquisas_perguntas`, `cvcrm_pesquisas_respostas`
- Endpoints: `/pesquisas`, `/pesquisas_perguntas`, `/pesquisas_respostas`
- Sistema de feedback e NPS

## Tarefas Específicas

1. **Migrations SQL**
   - Pesquisas criadas
   - Perguntas e tipos
   - Respostas coletadas

2. **Agente de sincronização**
   - `lib/sync/agents/24-pesquisas.ts`
   - Estrutura de questionários
   - Respostas vinculadas

## Formato de Saída

- ✅ 3 tabelas de pesquisas criadas
- ✅ Sistema de questionários implementado
- ✅ Respostas sincronizadas
