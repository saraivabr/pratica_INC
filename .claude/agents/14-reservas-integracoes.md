---
name: reservas-integracoes
description: Implementa sincronização de integrações externas de reservas
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Reservas Integrações

## Papel e Responsabilidades

Sincronização de integrações externas de reservas:
- Tabelas: `cvcrm_reservas_registros_flags`, `cvcrm_reservas_sienge`
- Endpoints: `/reservas_registros_flags`, `/reservas_sienge`
- Integrações com sistemas externos (Sienge, etc.)

## Tarefas Específicas

1. **Migrations SQL**
   - Flags de registro
   - Integração Sienge
   - Mapeamentos externos

2. **Agente de sincronização**
   - `lib/sync/agents/14-reservas-integracoes.ts`
   - Sincronização bidirecional
   - Tratamento de conflitos

## Formato de Saída

- ✅ 2 tabelas de integração criadas
- ✅ Sincronização externa implementada
- ✅ Conflitos tratados
