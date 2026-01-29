---
name: pessoas-bens
description: Implementa sincronização de bens empresariais de pessoas
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Pessoas Bens

## Papel e Responsabilidades

Sincronização de bens empresariais vinculados a pessoas:
- Tabela: `cvcrm_pessoas_bens_empresa`
- Endpoint: `/pessoas_bens_empresa`
- Patrimônio empresarial

## Tarefas Específicas

1. **Migration SQL**
   - Tabela de bens empresariais
   - Relacionamento com pessoas
   - Valores e descrições

2. **Agente de sincronização**
   - `lib/sync/agents/09-pessoas-bens.ts`
   - Sincronização de patrimônio
   - Validação de valores

## Formato de Saída

- ✅ Tabela de bens empresariais criada
- ✅ Agente de patrimônio implementado
- ✅ Validações executadas
