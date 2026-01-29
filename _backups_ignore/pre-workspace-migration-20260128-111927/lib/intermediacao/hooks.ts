"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { intermediacaoApi } from "./api"
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
} from "./types"

// Tipo para periodo de dashboard
export type PeriodoDashboard = "7d" | "30d" | "90d" | "1y" | "all"

// ============================================
// Query Keys
// ============================================

// Tipos para filtros de auditoria
export interface FiltrosAuditoria {
  tabela?: string
  registro_id?: string
  operacao?: string
  usuario_id?: string
  data_inicio?: string
  data_fim?: string
  page?: number
  pageSize?: number
}

export const intermediacaoKeys = {
  all: ["intermediacao"] as const,
  vendas: () => [...intermediacaoKeys.all, "vendas"] as const,
  vendasList: (filtros?: FiltroVendas) =>
    [...intermediacaoKeys.vendas(), "list", filtros] as const,
  venda: (id: string) => [...intermediacaoKeys.vendas(), id] as const,
  beneficiarios: () => [...intermediacaoKeys.all, "beneficiarios"] as const,
  beneficiariosList: (filtros?: FiltroBeneficiarios) =>
    [...intermediacaoKeys.beneficiarios(), "list", filtros] as const,
  beneficiario: (id: string) =>
    [...intermediacaoKeys.beneficiarios(), id] as const,
  parcelas: () => [...intermediacaoKeys.all, "parcelas"] as const,
  parcelasList: (filtros?: FiltroParcelas) =>
    [...intermediacaoKeys.parcelas(), "list", filtros] as const,
  parcela: (id: string) => [...intermediacaoKeys.parcelas(), id] as const,
  pagamentos: () => [...intermediacaoKeys.all, "pagamentos"] as const,
  pagamentosList: (filtros?: Record<string, unknown>) =>
    [...intermediacaoKeys.pagamentos(), "list", filtros] as const,
  pagamento: (id: string) => [...intermediacaoKeys.pagamentos(), id] as const,
  dashboard: (periodo?: PeriodoDashboard) =>
    [...intermediacaoKeys.all, "dashboard", periodo] as const,
  auditoria: () => [...intermediacaoKeys.all, "auditoria"] as const,
  auditoriaList: (filtros?: FiltrosAuditoria) =>
    [...intermediacaoKeys.auditoria(), "list", filtros] as const,
}

// ============================================
// Hooks de Vendas
// ============================================

export function useVendas(filtros?: FiltroVendas) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.vendasList(filtros),
    queryFn: () => intermediacaoApi.vendas.list(filtros),
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000,
  })

  return {
    vendas: (data?.data || []) as VendaIntermediacao[],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useVenda(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.venda(id),
    queryFn: () => intermediacaoApi.vendas.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })

  return {
    venda: (data || null) as VendaIntermediacao | null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useCreateVenda() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: VendaIntermediacoInput) => intermediacaoApi.vendas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.vendas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

export function useUpdateVenda() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VendaIntermediacoInput> }) =>
      intermediacaoApi.vendas.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.venda(id) })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.vendas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

export function useDeleteVenda() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => intermediacaoApi.vendas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.vendas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

// ============================================
// Hooks de Beneficiarios
// ============================================

export function useBeneficiarios(filtros?: FiltroBeneficiarios) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.beneficiariosList(filtros),
    queryFn: () => intermediacaoApi.beneficiarios.list(filtros),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000,
  })

  return {
    beneficiarios: (data?.data || []) as BeneficiarioIntermediacao[],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useBeneficiario(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.beneficiario(id),
    queryFn: () => intermediacaoApi.beneficiarios.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  return {
    beneficiario: (data || null) as BeneficiarioIntermediacao | null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useCreateBeneficiario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BeneficiarioIntermediacoInput) =>
      intermediacaoApi.beneficiarios.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: intermediacaoKeys.beneficiarios(),
      })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

export function useUpdateBeneficiario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BeneficiarioIntermediacoInput> }) =>
      intermediacaoApi.beneficiarios.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: intermediacaoKeys.beneficiario(id),
      })
      queryClient.invalidateQueries({
        queryKey: intermediacaoKeys.beneficiarios(),
      })
    },
  })
}

export function useDeleteBeneficiario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => intermediacaoApi.beneficiarios.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: intermediacaoKeys.beneficiarios(),
      })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

// ============================================
// Hooks de Parcelas
// ============================================

export function useParcelas(filtros?: FiltroParcelas) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.parcelasList(filtros),
    queryFn: () => intermediacaoApi.parcelas.list(filtros),
    staleTime: 2 * 60 * 1000, // 2 minutos (dados dinamicos)
    gcTime: 5 * 60 * 1000,
  })

  return {
    parcelas: (data?.data || []) as ParcelaDetalhada[],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useParcelasVencidas() {
  return useParcelas({ status: ["vencida"] })
}

export function useParcela(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.parcela(id),
    queryFn: () => intermediacaoApi.parcelas.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })

  return {
    parcela: (data || null) as ParcelaIntermediacao | null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useMarcarParcelaPaga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { data_pagamento: string; metodo: string }
    }) => intermediacaoApi.parcelas.marcarPaga(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.parcelas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.vendas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

// ============================================
// Hooks de Pagamentos
// ============================================

export function usePagamentos(filtros?: Record<string, unknown>) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.pagamentosList(filtros),
    queryFn: () => intermediacaoApi.pagamentos.list(filtros),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  return {
    pagamentos: (data?.data || []) as PagamentoIntermediacao[],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function usePagamento(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.pagamento(id),
    queryFn: () => intermediacaoApi.pagamentos.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })

  return {
    pagamento: (data || null) as PagamentoIntermediacao | null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

export function useCreatePagamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PagamentoIntermediacoInput) =>
      intermediacaoApi.pagamentos.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: intermediacaoKeys.pagamentos(),
      })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.parcelas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

export function useEstornarPagamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      intermediacaoApi.pagamentos.estornar(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: intermediacaoKeys.pagamentos(),
      })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.parcelas() })
      queryClient.invalidateQueries({ queryKey: intermediacaoKeys.dashboard() })
    },
  })
}

// ============================================
// Hooks de Dashboard
// ============================================

export function useDashboardStats(periodo: PeriodoDashboard = "30d") {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.dashboard(periodo),
    queryFn: () => intermediacaoApi.dashboard.stats(periodo),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  })

  return {
    stats: (data || null) as DashboardComissoes | null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}

// ============================================
// Hooks de Auditoria
// ============================================

export function useAuditoria(filtros?: FiltrosAuditoria) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: intermediacaoKeys.auditoriaList(filtros),
    queryFn: () => intermediacaoApi.auditoria.list(filtros),
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000,
  })

  return {
    eventos: (data?.data || []) as LogAuditoriaIntermediacao[],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}
