/**
 * Comprehensive CV CRM API Client
 * Supports all 68 endpoints from CV CRM documentation
 */

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

interface CVCRMResponse<T> {
  codigo?: number;
  total?: number;
  data?: T;
  leads?: T;
  registros?: T;
  [key: string]: unknown;
}

interface FetchOptions {
  limit?: number;
  offset?: number;
  id?: number;
  [key: string]: any;
}

/**
 * Generic fetch function for CV CRM API
 */
async function fetchCVCRM<T>(
  endpoint: string,
  token: string,
  options?: FetchOptions,
  init?: RequestInit
): Promise<CVCRMResponse<T>> {
  const queryParams = new URLSearchParams();

  if (options) {
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, String(value));
      }
    });
  }

  const url = `${BASE_URL}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  const response = await fetch(url, {
    method: init?.method || 'GET',
    ...init,
    headers: {
      accept: 'application/json',
      email: EMAIL,
      token: token,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CV CRM API error: ${response.status} - ${text}`);
  }

  return response.json();
}

// ============================================
// DOMAIN: LEADS (12 endpoints)
// ============================================

export async function getLeads(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM('/api/v1/comercial/leads', token, options);
}

export async function getLeadById(id: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${id}`, token);
}

export async function getLeadConversoes(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM('/api/v1/comercial/leads/conversoes', token, options);
}

export async function getLeadInteracoes(leadId: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${leadId}/interacoes`, token);
}

export async function getLeadInfos(leadId: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${leadId}/infos`, token);
}

export async function getLeadMomentos(leadId: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${leadId}/momentos`, token);
}

export async function getLeadTarefas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM('/api/v1/comercial/leads/tarefas', token, options);
}

export async function getLeadVisitas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM('/api/v1/comercial/leads/visitas', token, options);
}

export async function getLeadWorkflow(leadId: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${leadId}/workflow`, token);
}

export async function getLeadHistoricoSituacoes(leadId: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${leadId}/historico-situacoes`, token);
}

export async function getLeadHistoricoCorretores(leadId: number) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM(`/api/v1/comercial/leads/${leadId}/historico-corretores`, token);
}

export async function getLeadOrigem(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_LEAD || '';
  return fetchCVCRM('/api/v1/comercial/leads/origem', token, options);
}

// ============================================
// DOMAIN: PESSOAS (7 endpoints)
// ============================================

export async function getPessoas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM('/api/v1/cadastros/pessoas', token, options);
}

export async function getPessoaById(id: number) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM(`/api/v1/cadastros/pessoas/${id}`, token);
}

export async function getPessoaContatos(pessoaId: number) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM(`/api/v1/cadastros/pessoas/${pessoaId}/contatos`, token);
}

export async function getPessoaDadosProfissionais(pessoaId: number) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM(`/api/v1/cadastros/pessoas/${pessoaId}/dados-profissionais`, token);
}

export async function getPessoaBancarios(pessoaId: number) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM(`/api/v1/cadastros/pessoas/${pessoaId}/bancarios`, token);
}

export async function getPessoaFinanceiros(pessoaId: number) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM(`/api/v1/cadastros/pessoas/${pessoaId}/financeiros`, token);
}

export async function getPessoaBens(pessoaId: number) {
  const token = process.env.CVCRM_TOKEN_PESSOA || '';
  return fetchCVCRM(`/api/v1/cadastros/pessoas/${pessoaId}/bens`, token);
}

// ============================================
// DOMAIN: RESERVAS (13 endpoints)
// ============================================

export async function getReservas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM('/api/v1/comercial/reservas', token, options);
}

export async function getReservaById(id: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${id}`, token);
}

export async function getReservaAssociados(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/associados`, token);
}

export async function getReservaComissoes(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/comissoes`, token);
}

export async function getReservaCoordenadores(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/coordenadores`, token);
}

export async function getReservaCamposAdicionais(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/campos-adicionais`, token);
}

export async function getReservaCondicoes(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/condicoes`, token);
}

export async function getReservaContratos(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/contratos`, token);
}

export async function getReservaHistorico(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/historico`, token);
}

export async function getReservaWorkflow(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/workflow`, token);
}

export async function getReservaFlags(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/flags`, token);
}

export async function getReservaSienge(reservaId: number) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM(`/api/v1/comercial/reservas/${reservaId}/sienge`, token);
}

export async function getReservaSituacoes(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_RESERVA || '';
  return fetchCVCRM('/api/v1/comercial/reservas/situacoes', token, options);
}

// ============================================
// DOMAIN: ATENDIMENTOS (7 endpoints)
// ============================================

export async function getAtendimentos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM('/api/v1/pos-vendas/atendimentos', token, options);
}

export async function getAtendimentoById(id: number) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM(`/api/v1/pos-vendas/atendimentos/${id}`, token);
}

export async function getAtendimentoInteracoes(atendimentoId: number) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM(`/api/v1/pos-vendas/atendimentos/${atendimentoId}/interacoes`, token);
}

export async function getAtendimentoRespostas(atendimentoId: number) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM(`/api/v1/pos-vendas/atendimentos/${atendimentoId}/respostas`, token);
}

export async function getAtendimentoTarefas(atendimentoId: number) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM(`/api/v1/pos-vendas/atendimentos/${atendimentoId}/tarefas`, token);
}

export async function getAtendimentoWorkflow(atendimentoId: number) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM(`/api/v1/pos-vendas/atendimentos/${atendimentoId}/workflow`, token);
}

export async function getAtendimentoTimes(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_ATENDIMENTO || '';
  return fetchCVCRM('/api/v1/pos-vendas/atendimentos/times', token, options);
}

// ============================================
// DOMAIN: ASSISTÊNCIAS (5 endpoints)
// ============================================

export async function getAssistencias(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_ASSISTENCIA || '';
  return fetchCVCRM('/api/v1/pos-vendas/assistencias', token, options);
}

export async function getAssistenciaById(id: number) {
  const token = process.env.CVCRM_TOKEN_ASSISTENCIA || '';
  return fetchCVCRM(`/api/v1/pos-vendas/assistencias/${id}`, token);
}

export async function getAssistenciaItens(assistenciaId: number) {
  const token = process.env.CVCRM_TOKEN_ASSISTENCIA || '';
  return fetchCVCRM(`/api/v1/pos-vendas/assistencias/${assistenciaId}/itens`, token);
}

export async function getAssistenciaVisitas(assistenciaId: number) {
  const token = process.env.CVCRM_TOKEN_ASSISTENCIA || '';
  return fetchCVCRM(`/api/v1/pos-vendas/assistencias/${assistenciaId}/visitas`, token);
}

export async function getAssistenciaWorkflow(assistenciaId: number) {
  const token = process.env.CVCRM_TOKEN_ASSISTENCIA || '';
  return fetchCVCRM(`/api/v1/pos-vendas/assistencias/${assistenciaId}/workflow`, token);
}

// ============================================
// DOMAIN: COMERCIAIS (15 endpoints)
// ============================================

export async function getComissoes(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_COMISSAO || '';
  return fetchCVCRM('/api/v1/comercial/comissoes', token, options);
}

export async function getComissaoPagamentos(comissaoId: number) {
  const token = process.env.CVCRM_TOKEN_COMISSAO || '';
  return fetchCVCRM(`/api/v1/comercial/comissoes/${comissaoId}/pagamentos`, token);
}

export async function getCorretores(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_CORRETOR || '';
  return fetchCVCRM('/api/v1/cadastros/corretores', token, options);
}

export async function getCorretorById(id: number) {
  const token = process.env.CVCRM_TOKEN_CORRETOR || '';
  return fetchCVCRM(`/api/v1/cadastros/corretores/${id}`, token);
}

export async function getImobiliarias(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_IMOBILIARIA || '';
  return fetchCVCRM('/api/v1/cadastros/imobiliarias', token, options);
}

export async function getImobiliariaById(id: number) {
  const token = process.env.CVCRM_TOKEN_IMOBILIARIA || '';
  return fetchCVCRM(`/api/v1/cadastros/imobiliarias/${id}`, token);
}

export async function getPrecadastros(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_PRECADASTRO || '';
  return fetchCVCRM('/api/v1/comercial/precadastros', token, options);
}

export async function getPrecadastroWorkflow(precadastroId: number) {
  const token = process.env.CVCRM_TOKEN_PRECADASTRO || '';
  return fetchCVCRM(`/api/v1/comercial/precadastros/${precadastroId}/workflow`, token);
}

export async function getRepasses(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_REPASSE || '';
  return fetchCVCRM('/api/v1/comercial/repasses', token, options);
}

export async function getRepasseWorkflow(repasseId: number) {
  const token = process.env.CVCRM_TOKEN_REPASSE || '';
  return fetchCVCRM(`/api/v1/comercial/repasses/${repasseId}/workflow`, token);
}

export async function getPesquisas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_PESQUISA || '';
  return fetchCVCRM('/api/v1/pos-vendas/pesquisas', token, options);
}

export async function getUnidades(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_UNIDADE || '';
  return fetchCVCRM('/api/cvio/unidade', token, options);
}

export async function getUnidadeSituacao(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_UNIDADE || '';
  return fetchCVCRM('/api/cvio/unidade/situacao', token, options);
}

export async function getUnidadePrecos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_UNIDADE || '';
  return fetchCVCRM('/api/cvio/unidade/precos', token, options);
}

export async function getSeries(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_SERIE || '';
  return fetchCVCRM('/api/cvio/serie', token, options);
}

// ============================================
// DOMAIN: PROCESSOS, VENDAS, ADMIN (9 endpoints)
// ============================================

export async function getProcessos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_PROCESSO || '';
  return fetchCVCRM('/api/v1/juridico/processos', token, options);
}

export async function getProcessoDemandas(processoId: number) {
  const token = process.env.CVCRM_TOKEN_PROCESSO || '';
  return fetchCVCRM(`/api/v1/juridico/processos/${processoId}/demandas`, token);
}

export async function getDistratos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_DISTRATO || '';
  return fetchCVCRM('/api/v1/comercial/distratos', token, options);
}

export async function getVendas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_VENDA || '';
  return fetchCVCRM('/api/v1/comercial/vendas', token, options);
}

export async function getVendaSimulacoes(vendaId: number) {
  const token = process.env.CVCRM_TOKEN_VENDA || '';
  return fetchCVCRM(`/api/v1/comercial/vendas/${vendaId}/simulacoes`, token);
}

export async function getCampanhas(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_CAMPANHA || '';
  return fetchCVCRM('/api/v1/marketing/campanhas', token, options);
}

export async function getUsuarios(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_USUARIO || '';
  return fetchCVCRM('/api/v1/cadastros/usuarios', token, options);
}

export async function getCampos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_CAMPO || '';
  return fetchCVCRM('/api/v1/configuracoes/campos', token, options);
}

export async function getAgendamentos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_AGENDAMENTO || '';
  return fetchCVCRM('/api/v1/comercial/agendamentos', token, options);
}

// ============================================
// EMPREENDIMENTOS (Existing)
// ============================================

export async function getEmpreendimentos(options?: FetchOptions) {
  const token = process.env.CVCRM_TOKEN_EMPREENDIMENTO || '';
  return fetchCVCRM('/api/v1/cadastros/empreendimentos', token, options);
}

export type { CVCRMResponse, FetchOptions };
