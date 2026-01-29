---
name: reservas-core
description: Implementa sincronização de dados principais de reservas e associados
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Reservas Core

## Papel e Responsabilidades

Sincronização de dados principais de reservas:
- Tabelas: `cvcrm_reservas`, `cvcrm_reservas_associados`
- Endpoints: `/reservas`, `/reservas_associados`
- Núcleo do processo de reserva

## Tarefas Específicas

1. **Migrations SQL**
   - Tabela principal de reservas
   - Tabela de associados (múltiplas pessoas por reserva)
   - Status e datas importantes

2. **Agente de sincronização**
   - `lib/sync/agents/10-reservas-core.ts`
   - Relacionamento reserva-pessoas
   - Estados de reserva

## Formato de Saída

- ✅ 2 tabelas de reservas criadas
- ✅ Relacionamento N:N implementado
- ✅ Estados validados
