/**
 * CV CRM Sync Agents - Complete Export Index
 * All 28 agents organized by domain
 */

// ===== DOMAIN: LEADS (5 agents) =====
export { leadsCoreAgent, LeadsCoreAgent } from './01-leads-core';
export { leadsConversoesAgent, LeadsConversoesAgent } from './02-leads-conversoes';
export { leadsInteracoesAgent, LeadsInteracoesAgent } from './03-leads-interacoes';
export { leadsTarefasAgent, LeadsTarefasAgent } from './04-leads-tarefas';
export { leadsHistoricoAgent, LeadsHistoricoAgent } from './05-leads-historico';

// ===== DOMAIN: PESSOAS (4 agents) =====
export { pessoasCoreAgent, PessoasCoreAgent } from './06-pessoas-core';
export { pessoasDetalhesAgent, PessoasDetalhesAgent } from './07-pessoas-detalhes';
export { pessoasFinanceiroAgent, PessoasFinanceiroAgent } from './08-pessoas-financeiro';
export { pessoasBensAgent, PessoasBensAgent } from './09-pessoas-bens';

// ===== DOMAIN: RESERVAS (5 agents) =====
export { reservasCoreAgent, ReservasCoreAgent } from './10-reservas-core';
export { reservasComercialAgent, ReservasComercialAgent } from './11-reservas-comercial';
export { reservasDetalhesAgent, ReservasDetalhesAgent } from './12-reservas-detalhes';
export { reservasHistoricoAgent, ReservasHistoricoAgent } from './13-reservas-historico';
export { reservasIntegracoesAgent, ReservasIntegracoesAgent } from './14-reservas-integracoes';

// ===== DOMAIN: ATENDIMENTOS (3 agents) =====
export { atendimentosCoreAgent, AtendimentosCoreAgent } from './15-atendimentos-core';
export { atendimentosTarefasAgent, AtendimentosTarefasAgent } from './16-atendimentos-tarefas';
export { atendimentosTimesAgent, AtendimentosTimesAgent } from './17-atendimentos-times';

// ===== DOMAIN: ASSISTÊNCIAS (2 agents) =====
export { assistenciasAgent, AssistenciasAgent } from './18-assistencias';
export { assistenciasWorkflowAgent, AssistenciasWorkflowAgent } from './19-assistencias-workflow';

// ===== DOMAIN: COMERCIAIS (6 agents) =====
export { comissoesAgent, ComissoesAgent } from './20-comissoes';
export { corretoresAgent, CorretoresAgent } from './21-corretores';
export { precadastrosAgent, PrecadastrosAgent } from './22-precadastros';
export { repassesAgent, RepassesAgent } from './23-repasses';
export { pesquisasAgent, PesquisasAgent } from './24-pesquisas';
export { unidadesAgent, UnidadesAgent } from './25-unidades';

// ===== DOMAIN: FINAIS (3 agents) =====
export { processosAgent, ProcessosAgent } from './26-processos';
export { vendasAgent, VendasAgent } from './27-vendas';
export { administrativoAgent, AdministrativoAgent } from './28-administrativo';

/**
 * Sync all domains helper functions
 */

export async function syncLeadsDomain(fullSync = false) {
  console.log('🔄 Syncing Leads Domain (5 agents)...\n');

  // Import agents dynamically to avoid circular dependency issues
  const { leadsCoreAgent } = await import('./01-leads-core');
  const { leadsConversoesAgent } = await import('./02-leads-conversoes');
  const { leadsInteracoesAgent } = await import('./03-leads-interacoes');
  const { leadsTarefasAgent } = await import('./04-leads-tarefas');
  const { leadsHistoricoAgent } = await import('./05-leads-historico');

  const results = await Promise.all([
    leadsCoreAgent.sync(fullSync),
    leadsConversoesAgent.sync(fullSync),
    leadsInteracoesAgent.sync(fullSync),
    leadsTarefasAgent.sync(fullSync),
    leadsHistoricoAgent.sync(fullSync),
  ]);
  console.log('\n✅ Leads Domain sync completed!');
  return results;
}

export async function syncPessoasDomain(fullSync = false) {
  console.log('🔄 Syncing Pessoas Domain (4 agents)...\n');

  const { pessoasCoreAgent } = await import('./06-pessoas-core');
  const { pessoasDetalhesAgent } = await import('./07-pessoas-detalhes');
  const { pessoasFinanceiroAgent } = await import('./08-pessoas-financeiro');
  const { pessoasBensAgent } = await import('./09-pessoas-bens');

  const results = await Promise.all([
    pessoasCoreAgent.sync(fullSync),
    pessoasDetalhesAgent.sync(fullSync),
    pessoasFinanceiroAgent.sync(fullSync),
    pessoasBensAgent.sync(fullSync),
  ]);
  console.log('\n✅ Pessoas Domain sync completed!');
  return results;
}

export async function syncReservasDomain(fullSync = false) {
  console.log('🔄 Syncing Reservas Domain (5 agents)...\n');

  const { reservasCoreAgent } = await import('./10-reservas-core');
  const { reservasComercialAgent } = await import('./11-reservas-comercial');
  const { reservasDetalhesAgent } = await import('./12-reservas-detalhes');
  const { reservasHistoricoAgent } = await import('./13-reservas-historico');
  const { reservasIntegracoesAgent } = await import('./14-reservas-integracoes');

  const results = await Promise.all([
    reservasCoreAgent.sync(fullSync),
    reservasComercialAgent.sync(fullSync),
    reservasDetalhesAgent.sync(fullSync),
    reservasHistoricoAgent.sync(fullSync),
    reservasIntegracoesAgent.sync(fullSync),
  ]);
  console.log('\n✅ Reservas Domain sync completed!');
  return results;
}

export async function syncAtendimentosDomain(fullSync = false) {
  console.log('🔄 Syncing Atendimentos Domain (3 agents)...\n');

  const { atendimentosCoreAgent } = await import('./15-atendimentos-core');
  const { atendimentosTarefasAgent } = await import('./16-atendimentos-tarefas');
  const { atendimentosTimesAgent } = await import('./17-atendimentos-times');

  const results = await Promise.all([
    atendimentosCoreAgent.sync(fullSync),
    atendimentosTarefasAgent.sync(fullSync),
    atendimentosTimesAgent.sync(fullSync),
  ]);
  console.log('\n✅ Atendimentos Domain sync completed!');
  return results;
}

export async function syncAssistenciasDomain(fullSync = false) {
  console.log('🔄 Syncing Assistências Domain (2 agents)...\n');

  const { assistenciasAgent } = await import('./18-assistencias');
  const { assistenciasWorkflowAgent } = await import('./19-assistencias-workflow');

  const results = await Promise.all([
    assistenciasAgent.sync(fullSync),
    assistenciasWorkflowAgent.sync(fullSync),
  ]);
  console.log('\n✅ Assistências Domain sync completed!');
  return results;
}

export async function syncComercialDomain(fullSync = false) {
  console.log('🔄 Syncing Commercial Domain (6 agents)...\n');

  const { comissoesAgent } = await import('./20-comissoes');
  const { corretoresAgent } = await import('./21-corretores');
  const { precadastrosAgent } = await import('./22-precadastros');
  const { repassesAgent } = await import('./23-repasses');
  const { pesquisasAgent } = await import('./24-pesquisas');
  const { unidadesAgent } = await import('./25-unidades');

  const results = await Promise.all([
    comissoesAgent.sync(fullSync),
    corretoresAgent.sync(fullSync),
    precadastrosAgent.sync(fullSync),
    repassesAgent.sync(fullSync),
    pesquisasAgent.sync(fullSync),
    unidadesAgent.sync(fullSync),
  ]);
  console.log('\n✅ Commercial Domain sync completed!');
  return results;
}

export async function syncFinalDomain(fullSync = false) {
  console.log('🔄 Syncing Final Domain (3 agents)...\n');

  const { processosAgent } = await import('./26-processos');
  const { vendasAgent } = await import('./27-vendas');
  const { administrativoAgent } = await import('./28-administrativo');

  const results = await Promise.all([
    processosAgent.sync(fullSync),
    vendasAgent.sync(fullSync),
    administrativoAgent.sync(fullSync),
  ]);
  console.log('\n✅ Final Domain sync completed!');
  return results;
}

/**
 * Sync ALL domains (all 28 agents)
 */
export async function syncAllDomains(fullSync = false) {
  console.log('\n🚀 Starting COMPLETE CV CRM Sync (All 28 Agents)...\n');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Sync in sequence (to avoid overwhelming the API)
    const leads = await syncLeadsDomain(fullSync);
    const pessoas = await syncPessoasDomain(fullSync);
    const reservas = await syncReservasDomain(fullSync);
    const atendimentos = await syncAtendimentosDomain(fullSync);
    const assistencias = await syncAssistenciasDomain(fullSync);
    const comercial = await syncComercialDomain(fullSync);
    const final = await syncFinalDomain(fullSync);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE SYNC FINISHED!');
    console.log('='.repeat(60));
    console.log(`Total Duration: ${duration}s`);
    console.log('All 28 agents synchronized successfully!\n');

    return {
      leads,
      pessoas,
      reservas,
      atendimentos,
      assistencias,
      comercial,
      final,
      duration: parseFloat(duration),
    };
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

/**
 * Get all agents organized by domain
 * (Commented out to avoid circular dependency issues in build)
 */
/*
export function getAllAgents() {
  return {
    leads: {
      core: leadsCoreAgent,
      conversoes: leadsConversoesAgent,
      interacoes: leadsInteracoesAgent,
      tarefas: leadsTarefasAgent,
      historico: leadsHistoricoAgent,
    },
    pessoas: {
      core: pessoasCoreAgent,
      detalhes: pessoasDetalhesAgent,
      financeiro: pessoasFinanceiroAgent,
      bens: pessoasBensAgent,
    },
    reservas: {
      core: reservasCoreAgent,
      comercial: reservasComercialAgent,
      detalhes: reservasDetalhesAgent,
      historico: reservasHistoricoAgent,
      integracoes: reservasIntegracoesAgent,
    },
    atendimentos: {
      core: atendimentosCoreAgent,
      tarefas: atendimentosTarefasAgent,
      times: atendimentosTimesAgent,
    },
    assistencias: {
      assistencias: assistenciasAgent,
      workflow: assistenciasWorkflowAgent,
    },
    comercial: {
      comissoes: comissoesAgent,
      corretores: corretoresAgent,
      precadastros: precadastrosAgent,
      repasses: repassesAgent,
      pesquisas: pesquisasAgent,
      unidades: unidadesAgent,
    },
    final: {
      processos: processosAgent,
      vendas: vendasAgent,
      administrativo: administrativoAgent,
    },
  };
}
*/

/**
 * Get comprehensive agent statistics
 */
export function getAgentStats() {
  return {
    total: 28,
    implemented: 28,
    pending: 0,
    completion: 100,
    domains: {
      leads: { total: 5, implemented: 5, complete: true },
      pessoas: { total: 4, implemented: 4, complete: true },
      reservas: { total: 5, implemented: 5, complete: true },
      atendimentos: { total: 3, implemented: 3, complete: true },
      assistencias: { total: 2, implemented: 2, complete: true },
      comerciais: { total: 6, implemented: 6, complete: true },
      finais: { total: 3, implemented: 3, complete: true },
    },
    endpoints: 68,
    tables: 64,
  };
}
