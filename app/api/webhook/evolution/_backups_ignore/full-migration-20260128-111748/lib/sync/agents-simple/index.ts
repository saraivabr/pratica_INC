/**
 * CV CRM Sync Agents - Export Index
 *
 * 5 agents covering real API endpoints with actual access
 */

export { syncLeadsCore } from './01-leads-core';
export { syncLeadsInteracoes } from './02-leads-interacoes';
export { syncLeadsTarefas } from './03-leads-tarefas';
export { syncAtendimentosCore } from './04-atendimentos-core';
export { syncAssistenciasCore } from './05-assistencias-core';

// Agent metadata
export const AGENTS = [
  {
    id: '01',
    name: 'leads-core',
    endpoint: '/api/v1/comercial/leads',
    table: 'cvcrm_leads',
    records: 19642,
    description: 'Leads principais do CV CRM'
  },
  {
    id: '02',
    name: 'leads-interacoes',
    endpoint: '/api/v1/cv/leads_interacoes',
    table: 'cvcrm_leads_interacoes',
    records: 35305,
    description: 'Interações dos leads'
  },
  {
    id: '03',
    name: 'leads-tarefas',
    endpoint: '/api/v1/comercial/leads/tarefas',
    table: 'cvcrm_leads_tarefas',
    records: 8182,
    description: 'Tarefas vinculadas aos leads'
  },
  {
    id: '04',
    name: 'atendimentos-core',
    endpoint: '/api/v1/relacionamento/atendimentos',
    table: 'cvcrm_atendimentos',
    records: 1558,
    description: 'Atendimentos e arquivos'
  },
  {
    id: '05',
    name: 'assistencias-core',
    endpoint: '/api/v1/relacionamento/assistencias',
    table: 'cvcrm_assistencias',
    records: 1,
    description: 'Assistências técnicas'
  }
] as const;

export const TOTAL_RECORDS = AGENTS.reduce((sum, agent) => sum + agent.records, 0); // 64,688
