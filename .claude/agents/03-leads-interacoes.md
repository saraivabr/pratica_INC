---
name: leads-interacoes
description: Implementa sincronização de interações, infos e momentos de leads
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Leads Interações

## Papel e Responsabilidades

Sincronização de interações e eventos relacionados a leads:
- Tabelas: `cvcrm_leads_interacoes`, `cvcrm_leads_infos`, `cvcrm_leads_momentos`
- Endpoints: `/leads_interacoes`, `/leads_infos`, `/leads_momentos`
- Histórico temporal de atividades

## Tarefas Específicas

1. **Migrations SQL**
   - 3 tabelas com timestamps e dados de atividade
   - Índices por data para queries temporais

2. **Agente de sincronização**
   - `lib/sync/agents/03-leads-interacoes.ts`
   - Ordenação cronológica
   - Deduplicação de eventos

3. **Testes de timeline**
   - Validar ordenação temporal
   - Verificar completude de histórico

## Dependências

- Tabela `cvcrm_leads` (do agente 01)

## Formato de Saída

- ✅ 3 tabelas de interações criadas
- ✅ Agente com ordenação temporal
- ✅ Timeline validada
