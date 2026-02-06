"use client";

/**
 * Sistema de Calculo de Comissoes - React Query Hooks
 * Hooks para gerenciamento de estado e comunicacao com API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { comissaoApi } from "./api";
import type {
  ComissaoVenda,
  ComissaoCorretor,
  ComissaoParcela,
  MatrizPlanilha,
  FiltroComissaoVendas,
  ComissaoVendaInput,
  ComissaoVendaUpdate,
  ComissaoCorretorInput,
  ComissaoParcelaInput,
  UnidadeBusca,
  CorretorBusca,
  EmpreendimentoBusca,
  ImobiliariaBusca,
  ReservaBusca,
  ClienteBusca,
} from "./types";

// ============================================
// Query Keys
// ============================================

export const comissaoKeys = {
  all: ["comissao"] as const,
  vendas: () => [...comissaoKeys.all, "vendas"] as const,
  vendasList: (filtros?: FiltroComissaoVendas) =>
    [...comissaoKeys.vendas(), "list", filtros] as const,
  venda: (id: number) => [...comissaoKeys.vendas(), id] as const,
  corretores: (vendaId: number) =>
    [...comissaoKeys.venda(vendaId), "corretores"] as const,
  parcelas: (vendaId: number) =>
    [...comissaoKeys.venda(vendaId), "parcelas"] as const,
  matriz: (vendaId: number) =>
    [...comissaoKeys.venda(vendaId), "matriz"] as const,
  busca: () => [...comissaoKeys.all, "busca"] as const,
  empreendimentos: (busca?: string) =>
    [...comissaoKeys.busca(), "empreendimentos", busca] as const,
  unidades: (empreendimentoId: number, busca?: string) =>
    [...comissaoKeys.busca(), "unidades", empreendimentoId, busca] as const,
  corretoresBusca: (busca: string) =>
    [...comissaoKeys.busca(), "corretores", busca] as const,
  imobiliarias: (busca?: string) =>
    [...comissaoKeys.busca(), "imobiliarias", busca] as const,
  reservas: (busca: string, tipo?: string) =>
    [...comissaoKeys.busca(), "reservas", busca, tipo] as const,
  clientePorCpf: (cpf: string) =>
    [...comissaoKeys.busca(), "cliente", cpf] as const,
};

// ============================================
// Hooks de Vendas
// ============================================

export function useComissaoVendas(filtros?: FiltroComissaoVendas) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: comissaoKeys.vendasList(filtros),
    queryFn: () => comissaoApi.vendas.list(filtros),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    vendas: data?.data || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useComissaoVenda(id: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: comissaoKeys.venda(id),
    queryFn: () => comissaoApi.vendas.get(id),
    enabled: !!id && id > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    venda: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useCreateComissaoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ComissaoVendaInput) => comissaoApi.vendas.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.vendas() });
    },
  });
}

export function useCreateComissaoVendaCompleta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      venda: ComissaoVendaInput;
      corretores: ComissaoCorretorInput[];
      parcelas: ComissaoParcelaInput[];
    }) => comissaoApi.vendas.createCompleta(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.vendas() });
    },
  });
}

export function useUpdateComissaoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ComissaoVendaUpdate }) =>
      comissaoApi.vendas.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.venda(id) });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.vendas() });
    },
  });
}

export function useDeleteComissaoVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => comissaoApi.vendas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.vendas() });
    },
  });
}

// ============================================
// Hooks de Corretores
// ============================================

export function useComissaoCorretores(vendaId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: comissaoKeys.corretores(vendaId),
    queryFn: () => comissaoApi.corretores.list(vendaId),
    enabled: !!vendaId && vendaId > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    corretores: data || [],
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useAddComissaoCorretor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      data,
    }: {
      vendaId: number;
      data: ComissaoCorretorInput;
    }) => comissaoApi.corretores.add(vendaId, data),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.corretores(vendaId),
      });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

export function useSyncComissaoCorretores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      corretores,
    }: {
      vendaId: number;
      corretores: ComissaoCorretorInput[];
    }) => comissaoApi.corretores.sync(vendaId, corretores),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.corretores(vendaId),
      });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

export function useRemoveComissaoCorretor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      corretorId,
    }: {
      vendaId: number;
      corretorId: number;
    }) => comissaoApi.corretores.remove(vendaId, corretorId),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.corretores(vendaId),
      });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

// ============================================
// Hooks de Parcelas
// ============================================

export function useComissaoParcelas(vendaId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: comissaoKeys.parcelas(vendaId),
    queryFn: () => comissaoApi.parcelas.list(vendaId),
    enabled: !!vendaId && vendaId > 0,
    staleTime: 2 * 60 * 1000,
  });

  return {
    parcelas: data || [],
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useAddComissaoParcela() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      data,
    }: {
      vendaId: number;
      data: ComissaoParcelaInput;
    }) => comissaoApi.parcelas.add(vendaId, data),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.parcelas(vendaId),
      });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

export function useSyncComissaoParcelas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      parcelas,
    }: {
      vendaId: number;
      parcelas: ComissaoParcelaInput[];
    }) => comissaoApi.parcelas.sync(vendaId, parcelas),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.parcelas(vendaId),
      });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

export function useRemoveComissaoParcela() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      parcelaId,
    }: {
      vendaId: number;
      parcelaId: number;
    }) => comissaoApi.parcelas.remove(vendaId, parcelaId),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({
        queryKey: comissaoKeys.parcelas(vendaId),
      });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

// ============================================
// Hooks de Matriz
// ============================================

export function useComissaoMatriz(vendaId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: comissaoKeys.matriz(vendaId),
    queryFn: () => comissaoApi.matriz.get(vendaId),
    enabled: !!vendaId && vendaId > 0,
    staleTime: 1 * 60 * 1000,
  });

  return {
    matriz: data || null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useCalcularMatriz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendaId: number) => comissaoApi.matriz.calcular(vendaId),
    onSuccess: (_, vendaId) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.venda(vendaId) });
    },
  });
}

export function useMarcarEnviadoPagadoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendaId,
      parcelaIds,
    }: {
      vendaId: number;
      parcelaIds: number[];
    }) => comissaoApi.matriz.marcarEnviado(vendaId, parcelaIds),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.matriz(vendaId) });
    },
  });
}

// ============================================
// Hooks de Busca
// ============================================

export function useBuscarEmpreendimentos(busca?: string, enabled: boolean = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: comissaoKeys.empreendimentos(busca),
    queryFn: () => comissaoApi.busca.empreendimentos(busca),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    empreendimentos: data || [],
    loading: isLoading,
    error: error as Error | null,
  };
}

export function useBuscarUnidades(
  empreendimentoId: number,
  busca?: string,
  enabled: boolean = true
) {
  const { data, isLoading, error } = useQuery({
    queryKey: comissaoKeys.unidades(empreendimentoId, busca),
    queryFn: () => comissaoApi.busca.unidades(empreendimentoId, busca),
    enabled: enabled && empreendimentoId > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    unidades: data || [],
    loading: isLoading,
    error: error as Error | null,
  };
}

export function useBuscarCorretores(busca: string, enabled: boolean = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: comissaoKeys.corretoresBusca(busca),
    queryFn: () => comissaoApi.busca.corretores(busca),
    enabled: enabled && busca.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  return {
    corretores: data || [],
    loading: isLoading,
    error: error as Error | null,
  };
}

export function useBuscarImobiliarias(busca?: string, enabled: boolean = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: comissaoKeys.imobiliarias(busca),
    queryFn: () => comissaoApi.busca.imobiliarias(busca),
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    imobiliarias: data || [],
    loading: isLoading,
    error: error as Error | null,
  };
}

export function useBuscarReservas(
  busca: string,
  tipo?: 'cliente' | 'codigo' | 'unidade' | 'cpf',
  enabled: boolean = true
) {
  const { data, isLoading, error } = useQuery({
    queryKey: comissaoKeys.reservas(busca, tipo),
    queryFn: () => comissaoApi.busca.reservas(busca, tipo),
    enabled: enabled && busca.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  return {
    reservas: data || [],
    loading: isLoading,
    error: error as Error | null,
  };
}

// ============================================
// Hooks de Webropay
// ============================================

export function useEnviarWebropay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendaId: number) => comissaoApi.webropay.enviar(vendaId),
    onSuccess: (_, vendaId) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.venda(vendaId) });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.vendas() });
    },
  });
}

export function useLiberarWebropay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendaId: number) => comissaoApi.webropay.liberar(vendaId),
    onSuccess: (_, vendaId) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.venda(vendaId) });
    },
  });
}

export function useDistratarWebropay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendaId, motivo }: { vendaId: number; motivo: string }) =>
      comissaoApi.webropay.distratar(vendaId, motivo),
    onSuccess: (_, { vendaId }) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.venda(vendaId) });
      queryClient.invalidateQueries({ queryKey: comissaoKeys.vendas() });
    },
  });
}

export function useBloquearWebropay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendaId: number) => comissaoApi.webropay.bloquear(vendaId),
    onSuccess: (_, vendaId) => {
      queryClient.invalidateQueries({ queryKey: comissaoKeys.venda(vendaId) });
    },
  });
}

export function useBuscarClientePorCpf(cpf: string, enabled: boolean = true) {
  const cpfLimpo = cpf.replace(/\D/g, "");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: comissaoKeys.clientePorCpf(cpfLimpo),
    queryFn: () => comissaoApi.busca.clientePorCpf(cpfLimpo),
    enabled: enabled && cpfLimpo.length >= 11,
    staleTime: 5 * 60 * 1000,
  });

  return {
    cliente: data || { encontrado: false },
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}
