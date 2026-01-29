import type {
  VendaIntermediacao,
  VendaIntermediacoInput,
  FiltroVendas,
  BeneficiarioIntermediacao,
  BeneficiarioIntermediacoInput,
  FiltroBeneficiarios,
  ParcelaIntermediacao,
  ParcelaDetalhada,
  FiltroParcelas,
  PagamentoIntermediacao,
  PagamentoIntermediacoInput,
  LogAuditoriaIntermediacao,
  DashboardComissoes,
  RelatorioComissoesPeriodo,
} from "./types"
import type { FiltrosAuditoria, PeriodoDashboard } from "./hooks"

// ============================================
// API Client para Intermediacao
// ============================================

const BASE_URL = "/api/intermediacao"

interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

function buildQueryString(params: Record<string, unknown> | object): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.message || `Erro ${response.status}`)
  }

  const data = await response.json()
  return data.data !== undefined ? data.data : data
}

// ============================================
// Vendas API
// ============================================

export const vendasApi = {
  list: async (filtros?: FiltroVendas): Promise<ListResponse<VendaIntermediacao>> => {
    const query = buildQueryString(filtros || {})
    return fetchApi<ListResponse<VendaIntermediacao>>(`${BASE_URL}/vendas${query}`)
  },

  get: async (id: string): Promise<VendaIntermediacao> => {
    return fetchApi<VendaIntermediacao>(`${BASE_URL}/vendas/${id}`)
  },

  create: async (data: VendaIntermediacoInput): Promise<VendaIntermediacao> => {
    return fetchApi<VendaIntermediacao>(`${BASE_URL}/vendas`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: Partial<VendaIntermediacoInput>): Promise<VendaIntermediacao> => {
    return fetchApi<VendaIntermediacao>(`${BASE_URL}/vendas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/vendas/${id}`, {
      method: "DELETE",
    })
  },

  adicionarBeneficiario: async (
    vendaId: string,
    data: {
      beneficiario_id: string
      percentual: number
      valor: number
    }
  ): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/vendas/${vendaId}/distribuicoes`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  removerBeneficiario: async (
    vendaId: string,
    distribuicaoId: string
  ): Promise<void> => {
    return fetchApi<void>(
      `${BASE_URL}/vendas/${vendaId}/distribuicoes/${distribuicaoId}`,
      {
        method: "DELETE",
      }
    )
  },

  gerarParcelas: async (
    vendaId: string,
    config: {
      num_parcelas: number
      dias_entre_parcelas: number
      data_inicio: string
    }
  ): Promise<ParcelaIntermediacao[]> => {
    return fetchApi<ParcelaIntermediacao[]>(`${BASE_URL}/vendas/${vendaId}/parcelas`, {
      method: "POST",
      body: JSON.stringify(config),
    })
  },
}

// ============================================
// Beneficiarios API
// ============================================

export const beneficiariosApi = {
  list: async (
    filtros?: FiltroBeneficiarios
  ): Promise<ListResponse<BeneficiarioIntermediacao>> => {
    const query = buildQueryString(filtros || {})
    return fetchApi<ListResponse<BeneficiarioIntermediacao>>(
      `${BASE_URL}/beneficiarios${query}`
    )
  },

  get: async (id: string): Promise<BeneficiarioIntermediacao> => {
    return fetchApi<BeneficiarioIntermediacao>(`${BASE_URL}/beneficiarios/${id}`)
  },

  create: async (data: BeneficiarioIntermediacoInput): Promise<BeneficiarioIntermediacao> => {
    return fetchApi<BeneficiarioIntermediacao>(`${BASE_URL}/beneficiarios`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (
    id: string,
    data: Partial<BeneficiarioIntermediacoInput>
  ): Promise<BeneficiarioIntermediacao> => {
    return fetchApi<BeneficiarioIntermediacao>(`${BASE_URL}/beneficiarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string): Promise<void> => {
    return fetchApi<void>(`${BASE_URL}/beneficiarios/${id}`, {
      method: "DELETE",
    })
  },

  // Buscar vendas de um beneficiario
  vendas: async (id: string): Promise<VendaIntermediacao[]> => {
    return fetchApi<VendaIntermediacao[]>(`${BASE_URL}/beneficiarios/${id}/vendas`)
  },

  // Buscar parcelas de um beneficiario
  parcelas: async (id: string, filtros?: FiltroParcelas): Promise<ParcelaDetalhada[]> => {
    const query = buildQueryString(filtros || {})
    return fetchApi<ParcelaDetalhada[]>(`${BASE_URL}/beneficiarios/${id}/parcelas${query}`)
  },
}

// ============================================
// Parcelas API
// ============================================

export const parcelasApi = {
  list: async (filtros?: FiltroParcelas): Promise<ListResponse<ParcelaDetalhada>> => {
    const query = buildQueryString(filtros || {})
    return fetchApi<ListResponse<ParcelaDetalhada>>(`${BASE_URL}/parcelas${query}`)
  },

  get: async (id: string): Promise<ParcelaIntermediacao> => {
    return fetchApi<ParcelaIntermediacao>(`${BASE_URL}/parcelas/${id}`)
  },

  marcarPaga: async (
    id: string,
    data: { data_pagamento: string; metodo: string }
  ): Promise<ParcelaIntermediacao> => {
    return fetchApi<ParcelaIntermediacao>(`${BASE_URL}/parcelas/${id}/pagar`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  cancelar: async (id: string, motivo: string): Promise<ParcelaIntermediacao> => {
    return fetchApi<ParcelaIntermediacao>(`${BASE_URL}/parcelas/${id}/cancelar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    })
  },

  // Parcelas vencidas
  vencidas: async (): Promise<ParcelaDetalhada[]> => {
    return fetchApi<ParcelaDetalhada[]>(`${BASE_URL}/parcelas/vencidas`)
  },

  // Proximas a vencer (proximos 7 dias)
  proximasVencer: async (dias: number = 7): Promise<ParcelaDetalhada[]> => {
    return fetchApi<ParcelaDetalhada[]>(`${BASE_URL}/parcelas/proximas?dias=${dias}`)
  },
}

// ============================================
// Pagamentos API
// ============================================

export const pagamentosApi = {
  list: async (
    filtros?: Record<string, unknown>
  ): Promise<ListResponse<PagamentoIntermediacao>> => {
    const query = buildQueryString(filtros || {})
    return fetchApi<ListResponse<PagamentoIntermediacao>>(`${BASE_URL}/pagamentos${query}`)
  },

  get: async (id: string): Promise<PagamentoIntermediacao> => {
    return fetchApi<PagamentoIntermediacao>(`${BASE_URL}/pagamentos/${id}`)
  },

  create: async (data: PagamentoIntermediacoInput): Promise<PagamentoIntermediacao> => {
    return fetchApi<PagamentoIntermediacao>(`${BASE_URL}/pagamentos`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  estornar: async (id: string, motivo: string): Promise<PagamentoIntermediacao> => {
    return fetchApi<PagamentoIntermediacao>(`${BASE_URL}/pagamentos/${id}/estornar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    })
  },

  // Upload de comprovante
  uploadComprovante: async (id: string, file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("comprovante", file)

    const response = await fetch(`${BASE_URL}/pagamentos/${id}/comprovante`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Erro ao fazer upload do comprovante")
    }

    const data = await response.json()
    return data.url
  },
}

// ============================================
// Dashboard API
// ============================================

export const dashboardApi = {
  stats: async (periodo: PeriodoDashboard = "30d"): Promise<DashboardComissoes> => {
    return fetchApi<DashboardComissoes>(`${BASE_URL}/dashboard?periodo=${periodo}`)
  },
}

// ============================================
// Relatorios API
// ============================================

interface RelatorioFiltros {
  tipo: "vendas" | "comissoes" | "pagamentos" | "beneficiarios"
  periodo_inicio: string
  periodo_fim: string
  empreendimento?: string
  beneficiario_id?: string
  formato?: "json" | "csv" | "pdf"
}

export const relatoriosApi = {
  gerar: async (filtros: RelatorioFiltros): Promise<RelatorioComissoesPeriodo> => {
    return fetchApi<RelatorioComissoesPeriodo>(`${BASE_URL}/relatorios`, {
      method: "POST",
      body: JSON.stringify(filtros),
    })
  },

  exportar: async (
    filtros: RelatorioFiltros
  ): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/relatorios/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filtros),
    })

    if (!response.ok) {
      throw new Error("Erro ao exportar relatorio")
    }

    return response.blob()
  },
}

// ============================================
// Auditoria API
// ============================================

export const auditoriaApi = {
  list: async (
    filtros?: FiltrosAuditoria
  ): Promise<ListResponse<LogAuditoriaIntermediacao>> => {
    const query = buildQueryString(filtros || {})
    return fetchApi<ListResponse<LogAuditoriaIntermediacao>>(
      `${BASE_URL}/auditoria${query}`
    )
  },

  // Historico de uma entidade especifica
  historico: async (
    tabela: string,
    registroId: string
  ): Promise<LogAuditoriaIntermediacao[]> => {
    return fetchApi<LogAuditoriaIntermediacao[]>(
      `${BASE_URL}/auditoria/${tabela}/${registroId}`
    )
  },
}

// ============================================
// Export consolidado
// ============================================

export const intermediacaoApi = {
  vendas: vendasApi,
  beneficiarios: beneficiariosApi,
  parcelas: parcelasApi,
  pagamentos: pagamentosApi,
  dashboard: dashboardApi,
  relatorios: relatoriosApi,
  auditoria: auditoriaApi,
}
