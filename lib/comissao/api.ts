/**
 * Sistema de Calculo de Comissoes - API Client
 * Cliente para comunicacao com as APIs de comissao
 */

import type {
  ComissaoVenda,
  ComissaoCorretor,
  ComissaoParcela,
  ComissaoMatriz,
  MatrizPlanilha,
  CalculoMatrizResult,
  FiltroComissaoVendas,
  ListResponse,
  UnidadeBusca,
  CorretorBusca,
  EmpreendimentoBusca,
  ImobiliariaBusca,
  ComissaoVendaInput,
  ComissaoVendaUpdate,
  ComissaoCorretorInput,
  ComissaoParcelaInput,
  CorretorEqualizadorItem,
  ParcelaFormItem,
  ReservaBusca,
  ClienteBusca,
} from './types';

// ============================================
// Configuracao
// ============================================

const BASE_URL = '/api/comissao';

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || `Erro ${response.status}`);
  }

  const data = await response.json();
  return data.data !== undefined ? data.data : data;
}

// ============================================
// Vendas API
// ============================================

export const vendasApi = {
  list: async (filtros?: FiltroComissaoVendas): Promise<ListResponse<ComissaoVenda>> => {
    const query = buildQueryString(filtros || {});
    return fetchApi<ListResponse<ComissaoVenda>>(`${BASE_URL}/vendas${query}`);
  },

  get: async (id: number): Promise<ComissaoVenda> => {
    return fetchApi<ComissaoVenda>(`${BASE_URL}/vendas/${id}`);
  },

  create: async (data: ComissaoVendaInput): Promise<ComissaoVenda> => {
    return fetchApi<ComissaoVenda>(`${BASE_URL}/vendas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: ComissaoVendaUpdate): Promise<ComissaoVenda> => {
    return fetchApi<ComissaoVenda>(`${BASE_URL}/vendas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/vendas/${id}`, {
      method: 'DELETE',
    });
  },

  // Criar venda completa com corretores e parcelas
  createCompleta: async (data: {
    venda: ComissaoVendaInput;
    corretores: ComissaoCorretorInput[];
    parcelas: ComissaoParcelaInput[];
  }): Promise<ComissaoVenda> => {
    return fetchApi<ComissaoVenda>(`${BASE_URL}/vendas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Corretores da Venda API
// ============================================

export const corretoresApi = {
  list: async (vendaId: number): Promise<ComissaoCorretor[]> => {
    return fetchApi<ComissaoCorretor[]>(`${BASE_URL}/vendas/${vendaId}/corretores`);
  },

  add: async (vendaId: number, data: ComissaoCorretorInput): Promise<ComissaoCorretor> => {
    return fetchApi<ComissaoCorretor>(`${BASE_URL}/vendas/${vendaId}/corretores`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Adicionar/atualizar multiplos corretores (equalizador)
  sync: async (vendaId: number, corretores: ComissaoCorretorInput[]): Promise<ComissaoCorretor[]> => {
    return fetchApi<ComissaoCorretor[]>(`${BASE_URL}/vendas/${vendaId}/corretores`, {
      method: 'PUT',
      body: JSON.stringify({ corretores }),
    });
  },

  remove: async (vendaId: number, corretorId: number): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/vendas/${vendaId}/corretores/${corretorId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// Parcelas da Venda API
// ============================================

export const parcelasApi = {
  list: async (vendaId: number): Promise<ComissaoParcela[]> => {
    return fetchApi<ComissaoParcela[]>(`${BASE_URL}/vendas/${vendaId}/parcelas`);
  },

  add: async (vendaId: number, data: ComissaoParcelaInput): Promise<ComissaoParcela> => {
    return fetchApi<ComissaoParcela>(`${BASE_URL}/vendas/${vendaId}/parcelas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Adicionar/atualizar multiplas parcelas
  sync: async (vendaId: number, parcelas: ComissaoParcelaInput[]): Promise<ComissaoParcela[]> => {
    return fetchApi<ComissaoParcela[]>(`${BASE_URL}/vendas/${vendaId}/parcelas`, {
      method: 'PUT',
      body: JSON.stringify({ parcelas }),
    });
  },

  update: async (vendaId: number, parcelaId: number, data: Partial<ComissaoParcelaInput>): Promise<ComissaoParcela> => {
    return fetchApi<ComissaoParcela>(`${BASE_URL}/vendas/${vendaId}/parcelas/${parcelaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  remove: async (vendaId: number, parcelaId: number): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/vendas/${vendaId}/parcelas/${parcelaId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// Matriz/Calculo API
// ============================================

export const matrizApi = {
  // Dispara o calculo da matriz
  calcular: async (vendaId: number): Promise<CalculoMatrizResult> => {
    return fetchApi<CalculoMatrizResult>(`${BASE_URL}/vendas/${vendaId}/calcular`, {
      method: 'POST',
    });
  },

  // Retorna a matriz calculada em formato de planilha
  get: async (vendaId: number): Promise<MatrizPlanilha> => {
    return fetchApi<MatrizPlanilha>(`${BASE_URL}/vendas/${vendaId}/matriz`);
  },

  // Marca parcela(s) como enviada(s) para pagadoria
  marcarEnviado: async (vendaId: number, parcelaIds: number[]): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/vendas/${vendaId}/matriz/enviar`, {
      method: 'POST',
      body: JSON.stringify({ parcela_ids: parcelaIds }),
    });
  },
};

// ============================================
// Exportacao API
// ============================================

export const exportarApi = {
  // Exportar matriz para Excel
  excel: async (vendaId: number): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/vendas/${vendaId}/exportar?formato=excel`);
    if (!response.ok) {
      throw new Error('Erro ao exportar para Excel');
    }
    return response.blob();
  },

  // Exportar matriz para PDF
  pdf: async (vendaId: number): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/vendas/${vendaId}/exportar?formato=pdf`);
    if (!response.ok) {
      throw new Error('Erro ao exportar para PDF');
    }
    return response.blob();
  },
};

// ============================================
// Busca API (Integracao)
// ============================================

export const buscaApi = {
  // Buscar empreendimentos
  empreendimentos: async (busca?: string, limit: number = 20): Promise<EmpreendimentoBusca[]> => {
    const query = buildQueryString({ busca, limit });
    return fetchApi<EmpreendimentoBusca[]>(`${BASE_URL}/buscar/empreendimentos${query}`);
  },

  // Buscar unidades de um empreendimento
  unidades: async (empreendimentoId: number, busca?: string): Promise<UnidadeBusca[]> => {
    const query = buildQueryString({ busca });
    return fetchApi<UnidadeBusca[]>(`${BASE_URL}/buscar/unidades/${empreendimentoId}${query}`);
  },

  // Buscar corretores (CV CRM + Beneficiarios)
  corretores: async (busca: string, limit: number = 10): Promise<CorretorBusca[]> => {
    const query = buildQueryString({ busca, limit });
    return fetchApi<CorretorBusca[]>(`${BASE_URL}/buscar/corretores${query}`);
  },

  // Buscar imobiliarias
  imobiliarias: async (busca?: string, limit: number = 20): Promise<ImobiliariaBusca[]> => {
    const query = buildQueryString({ busca, limit });
    return fetchApi<ImobiliariaBusca[]>(`${BASE_URL}/buscar/imobiliarias${query}`);
  },

  // Buscar reservas do CV CRM para importar comissão
  reservas: async (
    busca: string,
    tipo?: 'cliente' | 'codigo' | 'unidade' | 'cpf',
    limit: number = 20
  ): Promise<ReservaBusca[]> => {
    const query = buildQueryString({ busca, tipo, limit });
    return fetchApi<ReservaBusca[]>(`${BASE_URL}/buscar/reservas${query}`);
  },

  // Buscar cliente por CPF
  clientePorCpf: async (cpf: string): Promise<ClienteBusca> => {
    const query = buildQueryString({ cpf });
    return fetchApi<ClienteBusca>(`${BASE_URL}/buscar/cliente${query}`);
  },
};

// ============================================
// Export consolidado
// ============================================

export const comissaoApi = {
  vendas: vendasApi,
  corretores: corretoresApi,
  parcelas: parcelasApi,
  matriz: matrizApi,
  exportar: exportarApi,
  busca: buscaApi,
};
