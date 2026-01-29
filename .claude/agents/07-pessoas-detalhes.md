---
name: pessoas-detalhes
description: Implementa sincronização de contatos e dados profissionais de pessoas
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Pessoas Detalhes

## Papel e Responsabilidades

Sincronização de dados complementares de pessoas:
- Tabelas: `cvcrm_pessoas_contatos`, `cvcrm_pessoas_profissional`
- Endpoints: `/pessoas_contatos`, `/pessoas_profissional`
- Informações de contato e dados profissionais

## Tarefas Específicas

1. **Migrations SQL**
   - Tabela de contatos (emails, telefones múltiplos)
   - Tabela profissional (empresa, cargo, renda)
   - Relacionamento 1:N com pessoas

2. **Agente de sincronização**
   - `lib/sync/agents/07-pessoas-detalhes.ts`
   - Múltiplos contatos por pessoa
   - Validação de formatos

## Formato de Saída

- ✅ 2 tabelas de detalhes criadas
- ✅ Relacionamento 1:N implementado
- ✅ Validação de formatos executada
