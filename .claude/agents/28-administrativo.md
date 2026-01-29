---
name: administrativo
description: Implementa sincronização de usuários, campos customizados e agendamentos
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# Agente: Administrativo

## Papel e Responsabilidades

Sincronização de dados administrativos:
- Tabelas: `cvcrm_usuarios_administrativos`, `cvcrm_campos_adicionais`, `cvcrm_agendamentos_vistorias`
- Endpoints: `/usuarios_administrativos`, `/campos_adicionais`, `/agendamentos_vistorias`
- Configurações e gestão do sistema

## Tarefas Específicas

1. **Migrations SQL**
   - Usuários administrativos
   - Campos customizados (metadata)
   - Agendamentos de vistorias

2. **Agente de sincronização**
   - `lib/sync/agents/28-administrativo.ts`
   - Sincronização de configurações
   - Metadados dinâmicos

## Formato de Saída

- ✅ 3 tabelas administrativas criadas
- ✅ Sistema de configuração implementado
- ✅ Metadados sincronizados
