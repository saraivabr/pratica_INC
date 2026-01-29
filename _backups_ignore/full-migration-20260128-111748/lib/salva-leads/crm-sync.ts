/**
 * Sincronização com CV CRM
 * 
 * Cria leads no CV CRM baseado nos leads do Salva-Leads
 * Sincroniza dados bidirecionais
 */

import axios from 'axios';

const CVCRM_API_URL = process.env.CVCRM_API_URL || '';
const CVCRM_API_KEY = process.env.CVCRM_API_KEY || '';
const CVCRM_IMOBILIARIA_ID = process.env.CVCRM_IMOBILIARIA_ID || '';

/**
 * Interface para lead no formato CV CRM
 */
export interface CVCRMLead {
  nome: string;
  email?: string;
  telefone: string;
  origem?: string;
  imovel_id?: number;
  preco_indicado?: number;
  observacoes?: string;
  status?: 'novo' | 'em_contato' | 'agendado' | 'visitou' | 'proposta' | 'encerrado';
  imobiliaria_id?: string | number;
}

/**
 * Cria um lead no CV CRM
 */
export async function criarLeadCVCRM(dados: CVCRMLead): Promise<any> {
  try {
    if (!CVCRM_API_URL || !CVCRM_API_KEY) {
      console.warn('[CV CRM Sync] Credenciais não configuradas');
      return null;
    }

    const payload = {
      nome: dados.nome,
      email: dados.email || '',
      telefone: dados.telefone.replace(/\D/g, ''),
      origem: dados.origem || 'WhatsApp Sofia',
      preco_indicado: dados.preco_indicado,
      status: dados.status || 'novo',
      imobiliaria_id: dados.imobiliaria_id || CVCRM_IMOBILIARIA_ID,
      observacoes: dados.observacoes || '',
      imovel_id: dados.imovel_id,
    };

    const response = await axios.post(
      `${CVCRM_API_URL}/leads`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${CVCRM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('[CV CRM Sync] Lead criado com sucesso:', response.data?.id);
    return response.data;

  } catch (error: any) {
    console.error('[CV CRM Sync] Erro ao criar lead:', error.message);
    return null;
  }
}

/**
 * Atualiza status de um lead no CV CRM
 */
export async function atualizarStatusLead(
  leadId: number,
  novoStatus: 'novo' | 'em_contato' | 'agendado' | 'visitou' | 'proposta' | 'encerrado'
): Promise<boolean> {
  try {
    if (!CVCRM_API_URL || !CVCRM_API_KEY) {
      return false;
    }

    await axios.patch(
      `${CVCRM_API_URL}/leads/${leadId}`,
      { status: novoStatus },
      {
        headers: {
          'Authorization': `Bearer ${CVCRM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log('[CV CRM Sync] Status atualizado:', leadId, novoStatus);
    return true;

  } catch (error: any) {
    console.error('[CV CRM Sync] Erro ao atualizar status:', error.message);
    return false;
  }
}

/**
 * Registra uma visita no CV CRM
 */
export async function registrarVisitaCVCRM(
  leadId: number,
  dataVisita: Date,
  observacoes?: string
): Promise<boolean> {
  try {
    if (!CVCRM_API_URL || !CVCRM_API_KEY) {
      return false;
    }

    await axios.post(
      `${CVCRM_API_URL}/leads/${leadId}/visitas`,
      {
        data: dataVisita.toISOString(),
        observacoes: observacoes || '',
      },
      {
        headers: {
          'Authorization': `Bearer ${CVCRM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log('[CV CRM Sync] Visita registrada:', leadId);
    return true;

  } catch (error: any) {
    console.error('[CV CRM Sync] Erro ao registrar visita:', error.message);
    return false;
  }
}

/**
 * Busca imóveis do CV CRM por filtros
 */
export async function buscarImoveisCVCRM(filtros: {
  quartos?: number;
  precoMin?: number;
  precoMax?: number;
  bairro?: string;
  imobiliariaId?: string;
}): Promise<any[]> {
  try {
    if (!CVCRM_API_URL || !CVCRM_API_KEY) {
      return [];
    }

    const params = new URLSearchParams();
    if (filtros.quartos) params.append('quartos', filtros.quartos.toString());
    if (filtros.precoMin) params.append('preco_min', filtros.precoMin.toString());
    if (filtros.precoMax) params.append('preco_max', filtros.precoMax.toString());
    if (filtros.bairro) params.append('bairro', filtros.bairro);
    if (filtros.imobiliariaId) params.append('imobiliaria_id', filtros.imobiliariaId);

    const response = await axios.get(
      `${CVCRM_API_URL}/imoveis?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${CVCRM_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    return response.data?.imoveis || [];

  } catch (error: any) {
    console.error('[CV CRM Sync] Erro ao buscar imóveis:', error.message);
    return [];
  }
}

/**
 * Envia interação (mensagem, visualização) para o CV CRM
 */
export async function registrarInteracaoCVCRM(
  leadId: number,
  tipo: 'mensagem' | 'visualizacao' | 'chamada' | 'contato',
  descricao?: string
): Promise<boolean> {
  try {
    if (!CVCRM_API_URL || !CVCRM_API_KEY) {
      return false;
    }

    await axios.post(
      `${CVCRM_API_URL}/leads/${leadId}/interacoes`,
      {
        tipo,
        descricao: descricao || '',
        data: new Date().toISOString(),
      },
      {
        headers: {
          'Authorization': `Bearer ${CVCRM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    return true;

  } catch (error: any) {
    console.error('[CV CRM Sync] Erro ao registrar interação:', error.message);
    return false;
  }
}
