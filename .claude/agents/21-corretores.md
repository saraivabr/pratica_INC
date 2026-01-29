---
name: corretores
description: Implementa sincronização de corretores, dados profissionais e imobiliárias
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Corretores

## Papel e Responsabilidades

Sincronização de corretores e imobiliárias:
- Tabelas: `cvcrm_corretores`, `cvcrm_corretores_profissional`, `cvcrm_imobiliarias`
- Endpoints: `/corretores`, `/corretores_profissional`, `/imobiliarias`
- Cadastro de parceiros comerciais

## Tarefas Específicas

1. **Migrations SQL**
   - Corretores cadastrados
   - Dados profissionais (CRECI, etc.)
   - Imobiliárias vinculadas

2. **Agente de sincronização**
   - `lib/sync/agents/21-corretores.ts`
   - Validação de CRECI
   - Relacionamento corretor-imobiliária

## Formato de Saída

- ✅ 3 tabelas de corretores criadas
- ✅ Validação de CRECI implementada
- ✅ Vínculos sincronizados
