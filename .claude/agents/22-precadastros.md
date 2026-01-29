---
name: precadastros
description: Implementa sincronização de pré-cadastros e seu workflow
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Pré-cadastros

## Papel e Responsabilidades

Sincronização de pré-cadastros:
- Tabelas: `cvcrm_precadastros`, `cvcrm_precadastro_historico_situacoes`, `cvcrm_precadastro_workflow_tempo`
- Endpoints: `/precadastros`, `/precadastro_historico_situacoes`, `/precadastro_workflow_tempo`
- Processo de qualificação inicial

## Tarefas Específicas

1. **Migrations SQL**
   - Pré-cadastros pendentes
   - Histórico de situações
   - Workflow de aprovação

2. **Agente de sincronização**
   - `lib/sync/agents/22-precadastros.ts`
   - Estados de aprovação
   - Timeline de mudanças

## Formato de Saída

- ✅ 3 tabelas de pré-cadastros criadas
- ✅ Workflow de aprovação implementado
- ✅ Histórico sincronizado
