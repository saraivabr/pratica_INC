---
name: leads-historico
description: Implementa sincronização de histórico de situações e corretores de leads
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Leads Histórico

## Papel e Responsabilidades

Sincronização de histórico e auditoria de leads:
- Tabelas: `cvcrm_leads_historico_situacoes`, `cvcrm_leads_corretores`
- Endpoints: `/leads_historico_situacoes`, `/leads_corretores`
- Rastreamento de mudanças e atribuições

## Tarefas Específicas

1. **Migrations SQL**
   - Histórico com timestamps de mudanças
   - Relacionamento leads-corretores
   - Auditoria completa

2. **Agente de sincronização**
   - `lib/sync/agents/05-leads-historico.ts`
   - Preservação de ordem cronológica
   - Integridade referencial

## Formato de Saída

- ✅ 2 tabelas de auditoria criadas
- ✅ Agente com rastreamento completo
- ✅ Histórico validado
