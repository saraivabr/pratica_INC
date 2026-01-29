#!/bin/bash
# Script to update sync agents for multi-tenant support

# Agent 02: leads-interacoes
sed -i '' \
  -e 's/export async function syncLeadsInteracoes(fullSync = false)/export async function syncLeadsInteracoes(tenantId: number, fullSync = false)/' \
  -e "s/console.log('\\\\n🔄 Starting Leads Interações Sync...')/console.log(\`\\\\n🔄 Starting Leads Interações Sync (Tenant \${tenantId})...\`)/" \
  -e 's/agent_name, table_name, status/agent_name, table_name, tenant_id, status/' \
  -e "s/VALUES (\$1, \$2, \$3)/VALUES (\$1, \$2, \$3, \$4)/" \
  -e "s/\['leads-interacoes', 'cvcrm_leads_interacoes', 'running'\]/['leads-interacoes', 'cvcrm_leads_interacoes', tenantId, 'running']/" \
  -e 's/INSERT INTO cvcrm_leads_interacoes (/INSERT INTO cvcrm_leads_interacoes (\n        tenant_id,/' \
  -e 's/ON CONFLICT (idinteracao)/ON CONFLICT (tenant_id, idinteracao)/' \
  -e 's/\$1, \$2, \$3, \$4,/\$1, \$2, \$3, \$4, \$5,/' \
  -e 's/syncLeadsInteracoes(true)/const tenantId = process.argv[2] ? parseInt(process.argv[2]) : 1;\n  syncLeadsInteracoes(tenantId, true)/' \
  lib/sync/agents-simple/02-leads-interacoes.ts

echo "Agent 02 updated"

# Agent 03: leads-tarefas
sed -i '' \
  -e 's/export async function syncLeadsTarefas(fullSync = false)/export async function syncLeadsTarefas(tenantId: number, fullSync = false)/' \
  -e "s/console.log('\\\\n🔄 Starting Leads Tarefas Sync...')/console.log(\`\\\\n🔄 Starting Leads Tarefas Sync (Tenant \${tenantId})...\`)/" \
  -e 's/agent_name, table_name, status/agent_name, table_name, tenant_id, status/' \
  -e "s/VALUES (\$1, \$2, \$3)/VALUES (\$1, \$2, \$3, \$4)/" \
  -e "s/\['leads-tarefas', 'cvcrm_leads_tarefas', 'running'\]/['leads-tarefas', 'cvcrm_leads_tarefas', tenantId, 'running']/" \
  -e 's/INSERT INTO cvcrm_leads_tarefas (/INSERT INTO cvcrm_leads_tarefas (\n        tenant_id,/' \
  -e 's/ON CONFLICT (idtarefa)/ON CONFLICT (tenant_id, idtarefa)/' \
  -e 's/syncLeadsTarefas(true)/const tenantId = process.argv[2] ? parseInt(process.argv[2]) : 1;\n  syncLeadsTarefas(tenantId, true)/' \
  lib/sync/agents-simple/03-leads-tarefas.ts

echo "Agent 03 updated"

# Agent 04: atendimentos
sed -i '' \
  -e 's/export async function syncAtendimentosCore(fullSync = false)/export async function syncAtendimentosCore(tenantId: number, fullSync = false)/' \
  -e "s/console.log('\\\\n🔄 Starting Atendimentos Core Sync...')/console.log(\`\\\\n🔄 Starting Atendimentos Core Sync (Tenant \${tenantId})...\`)/" \
  -e 's/agent_name, table_name, status/agent_name, table_name, tenant_id, status/' \
  -e "s/VALUES (\$1, \$2, \$3)/VALUES (\$1, \$2, \$3, \$4)/" \
  -e "s/\['atendimentos-core', 'cvcrm_atendimentos', 'running'\]/['atendimentos-core', 'cvcrm_atendimentos', tenantId, 'running']/" \
  -e 's/INSERT INTO cvcrm_atendimentos (/INSERT INTO cvcrm_atendimentos (\n        tenant_id,/' \
  -e 's/ON CONFLICT (idatendimento)/ON CONFLICT (tenant_id, idatendimento)/' \
  -e 's/syncAtendimentosCore(true)/const tenantId = process.argv[2] ? parseInt(process.argv[2]) : 1;\n  syncAtendimentosCore(tenantId, true)/' \
  lib/sync/agents-simple/04-atendimentos-core.ts

echo "Agent 04 updated"

# Agent 05: assistencias
sed -i '' \
  -e 's/export async function syncAssistenciasCore(fullSync = false)/export async function syncAssistenciasCore(tenantId: number, fullSync = false)/' \
  -e "s/console.log('\\\\n🔄 Starting Assistências Core Sync...')/console.log(\`\\\\n🔄 Starting Assistências Core Sync (Tenant \${tenantId})...\`)/" \
  -e 's/agent_name, table_name, status/agent_name, table_name, tenant_id, status/' \
  -e "s/VALUES (\$1, \$2, \$3)/VALUES (\$1, \$2, \$3, \$4)/" \
  -e "s/\['assistencias-core', 'cvcrm_assistencias', 'running'\]/['assistencias-core', 'cvcrm_assistencias', tenantId, 'running']/" \
  -e 's/INSERT INTO cvcrm_assistencias (/INSERT INTO cvcrm_assistencias (\n        tenant_id,/' \
  -e 's/ON CONFLICT (idassistencia)/ON CONFLICT (tenant_id, idassistencia)/' \
  -e 's/syncAssistenciasCore(true)/const tenantId = process.argv[2] ? parseInt(process.argv[2]) : 1;\n  syncAssistenciasCore(tenantId, true)/' \
  lib/sync/agents-simple/05-assistencias-core.ts

echo "Agent 05 updated"

echo "All agents updated for multi-tenant support!"
