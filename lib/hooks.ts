'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Empreendimento, Unidade } from '@/lib/data';

// ============================================
// React Query Keys para caching
// ============================================

export const queryKeys = {
  empreendimentos: ['empreendimentos'] as const,
  empreendimento: (id: string) => ['empreendimento', id] as const,
  unidades: (idEmpreendimento: string) => ['unidades', idEmpreendimento] as const,
  series: (idEmpreendimento: string) => ['series', idEmpreendimento] as const,
  interacoes: (idEmpreendimento: string) => ['interacoes', idEmpreendimento] as const,
  leads: (limit: number) => ['leads', limit] as const,
  reservas: (limit: number) => ['reservas', limit] as const,
  corretores: ['corretores'] as const,
  activities: (userId?: string) => userId ? ['activities', userId] : ['activities'] as const,
  automations: ['automations'] as const,
  pipeline: ['pipeline'] as const,
  campaigns: ['campaigns'] as const,
  dashboardStats: ['dashboardStats'] as const,
};

// ============================================
// Fetchers
// ============================================

async function fetchEmpreendimentos() {
  const response = await fetch(`/api/empreendimentos?t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar dados');
  }

  const result = await response.json();

  if (result.success && result.data?.length > 0) {
    return { data: result.data, source: 'cvcrm' as const };
  }

  return { data: [], source: 'error' as const };
}

interface UseEmpreendimentosResult {
    empreendimentos: Empreendimento[];
    loading: boolean;
    error: Error | null;
    source: 'cvcrm' | 'error';
    refetch: () => void;
}

/**
 * Hook para buscar empreendimentos da API do CV CRM
 * Com React Query para caching inteligente (5 min stale time)
 */
export function useEmpreendimentos(): UseEmpreendimentosResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.empreendimentos,
    queryFn: fetchEmpreendimentos,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes era cacheTime)
    retry: 2,
  });

  return {
    empreendimentos: data?.data || [],
    loading: isLoading,
    error: error as Error | null,
    source: data?.source || 'error',
    refetch,
  };
}

/**
 * Hook para buscar um empreendimento específico por ID
 * Usa os dados cacheados de useEmpreendimentos para evitar requests desnecessários
 */
export function useEmpreendimento(id: string) {
  const { empreendimentos, loading, error, source } = useEmpreendimentos();
  const empreendimento = empreendimentos.find(e => e.id === id) || null;

  return {
    empreendimento,
    loading,
    error,
    source,
  };
}

/**
 * Hook para buscar unidades de um empreendimento
 * Cache de 10 minutos para unidades
 */
export function useUnidades(idEmpreendimento: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.unidades(idEmpreendimento),
    queryFn: async () => {
      const res = await fetch(`/api/unidades?empreendimento_id=${idEmpreendimento}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Falha ao buscar unidades");
      }

      // API returns array directly or { data: [] }
      const unidadesArray = Array.isArray(result) ? result : (result.data || []);

      // Build situacoes map
      const situacoesMap: Record<string, string> = {};
      unidadesArray.forEach((u: any) => {
        if (u.situacaoId && u.situacaoLabel) {
          situacoesMap[u.situacaoId] = u.situacaoLabel;
        }
      });

      return {
        unidades: unidadesArray,
        situacoes: situacoesMap,
      };
    },
    enabled: !!idEmpreendimento,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000,
  });

  return {
    unidades: data?.unidades || [],
    situacoes: data?.situacoes || {},
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook para buscar séries de preço (condições de pagamento)
 * Cache de 15 minutos (dados relativamente estáveis)
 */
export function useSeries(idEmpreendimento?: string) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.series(idEmpreendimento || ''),
    queryFn: async () => {
      const res = await fetch(`/api/series?idempreendimento=${idEmpreendimento}`);
      const data = await res.json();
      return data.success && Array.isArray(data.data) ? data.data : [];
    },
    enabled: !!idEmpreendimento,
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000,
  });

  return {
    series: data || [],
    loading: isLoading,
  };
}

/**
 * Hook para buscar interações (histórico de compartilhamentos) de um empreendimento
 * Cache de 2 minutos (dados dinâmicos)
 */
export function useInteracoes(idEmpreendimento: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.interacoes(idEmpreendimento),
    queryFn: async () => {
      const res = await fetch(`/api/interacoes?empreendimento_id=${idEmpreendimento}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao buscar interações");
      }

      return data.interacoes || [];
    },
    enabled: !!idEmpreendimento,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });

  return {
    interacoes: data || [],
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============================================
// Hooks para Admin Dashboard
// ============================================

interface Lead {
    id: number
    nome: string
    email?: string
    telefone?: string
    origem?: string
    midia?: string
    gestor?: string
    imobiliaria?: string
    corretor?: string
    data_cadastro?: string
    empreendimento?: string
    situacao?: string
}

interface Reserva {
    id: number
    cliente?: string
    empreendimento?: string
    unidade?: string
    valor?: number
    data?: string
    status?: string
    corretor?: string
}

/**
 * Hook para buscar leads do CV CRM
 * Cache de 3 minutos (dados que mudam frequentemente)
 */
export function useLeads(limit = 30) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.leads(limit),
    queryFn: async () => {
      const res = await fetch(`/api/leads?limit=${limit}`);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const leadsData = data.data || data.registros || data.leads || [];
      return {
        leads: Array.isArray(leadsData) ? leadsData : [],
        total: data.total || leadsData.length || 0,
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  return {
    leads: data?.leads || [],
    total: data?.total || 0,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook para buscar reservas do CV CRM
 */
export function useReservas(limit = 30) {
    const [reservas, setReservas] = useState<Reserva[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchReservas() {
            setLoading(true)
            try {
                const res = await fetch(`/api/reservas?limit=${limit}`)
                const data = await res.json()

                if (data.error) {
                    setError(data.error)
                    setReservas([])
                } else {
                    const reservasData = data.data || data.registros || data.reservas || []
                    setReservas(Array.isArray(reservasData) ? reservasData : [])
                    setTotal(data.total || reservasData.length || 0)
                    setError(null)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao buscar reservas')
                setReservas([])
            } finally {
                setLoading(false)
            }
        }

        fetchReservas()
    }, [limit])

    return { reservas, total, loading, error }
}

/**
 * Hook para buscar corretores do CV CRM
 */
export function useCorretores() {
    const [corretores, setCorretores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchCorretores() {
            try {
                const res = await fetch("/api/corretores")
                const data = await res.json()
                const corretoresData = data.data || data.registros || data.corretores || []
                setCorretores(Array.isArray(corretoresData) ? corretoresData : [])
            } catch (error) {
                console.error("Erro ao buscar corretores:", error)
                setCorretores([])
            } finally {
                setLoading(false)
            }
        }

        fetchCorretores()
    }, [])

    return { corretores, loading }
}

/**
 * Hook para estatísticas do dashboard admin
 */
export function useDashboardStats() {
    const { leads, total: totalLeads, loading: loadingLeads, error: errorLeads } = useLeads(100)
    const { reservas, total: totalReservas, loading: loadingReservas } = useReservas(100)
    const { empreendimentos, loading: loadingEmpreendimentos } = useEmpreendimentos()
    const { corretores, loading: loadingCorretores } = useCorretores()

    const loading = loadingLeads || loadingReservas || loadingEmpreendimentos || loadingCorretores

    // Agrupar leads por origem
    const leadsPorOrigem = leads.reduce((acc: Record<string, number>, lead) => {
        const origem = lead.origem || lead.midia || 'Outros'
        acc[origem] = (acc[origem] || 0) + 1
        return acc
    }, {})

    // Converter para array para gráficos
    const leadsPorOrigemArray = Object.entries(leadsPorOrigem)
        .map(([origem, count]) => ({ origem, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

    const stats = {
        totalLeads: totalLeads || leads.length,
        totalReservas: totalReservas || reservas.length,
        totalEmpreendimentos: empreendimentos.length,
        totalCorretores: corretores.length,
        leadsPorOrigem: leadsPorOrigemArray,
        leadsRecentes: leads.slice(0, 10),
        reservasRecentes: reservas.slice(0, 5),
        errorLeads,
    }

    return { stats, loading }
}

// ============================================
// CRM Hooks
// ============================================

interface Activity {
    id: string
    lead_id: string
    lead_name?: string
    lead_phone?: string
    title: string
    description?: string
    activity_type: string
    status: string
    priority: string
    scheduled_at: string
    completed_at?: string
}

interface Automation {
    id: string
    name: string
    is_active: boolean
    trigger_type: string
    trigger_config: any
    action_type: string
    action_config: any
    executions_count: number
}

interface PipelineStage {
    id: string
    name: string
    color: string
    position: number
    is_won_stage: boolean
    is_lost_stage: boolean
}

interface PipelineLead {
    id: string
    funnel_id: string
    stage_id: string
    name: string
    email?: string
    phone?: string
    score?: number
    temperature?: "cold" | "warm" | "hot"
    source?: string
    created_at: string
    last_interaction_at?: string
    tags?: string[]
    user_id?: string
}

interface Campaign {
    id: string
    name: string
    message_template: string
    status: string
    stats: { total: number; sent: number; delivered: number; read: number; replied: number; failed: number }
    created_at: string
}

/**
 * Hook para buscar atividades (agenda)
 */
export function useActivities(userId?: string) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchActivities = useCallback(async () => {
        setLoading(true)
        try {
            const params = userId ? `?userId=${userId}` : ''
            const res = await fetch(`/api/crm/activities${params}`)
            const data = await res.json()

            if (res.ok) {
                setActivities(data)
                setError(null)
            } else {
                setError(data.error || 'Erro ao carregar atividades')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar atividades')
            setActivities([])
        } finally {
            setLoading(false)
        }
    }, [userId])

    const createActivity = async (activity: Partial<Activity>) => {
        const res = await fetch('/api/crm/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activity)
        })
        if (!res.ok) throw new Error('Erro ao criar atividade')
        const newActivity = await res.json()
        setActivities(prev => [...prev, newActivity])
        return newActivity
    }

    const updateActivity = async (id: string, updates: Partial<Activity>) => {
        const res = await fetch('/api/crm/activities', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates })
        })
        if (!res.ok) throw new Error('Erro ao atualizar atividade')
        const updated = await res.json()
        setActivities(prev => prev.map(a => a.id === id ? updated : a))
        return updated
    }

    const completeActivity = async (id: string, outcome?: string) => {
        return updateActivity(id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            outcome
        } as any)
    }

    const deleteActivity = async (id: string) => {
        const res = await fetch(`/api/crm/activities?id=${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Erro ao deletar atividade')
        setActivities(prev => prev.filter(a => a.id !== id))
    }

    useEffect(() => {
        fetchActivities()
    }, [fetchActivities])

    return {
        activities,
        loading,
        error,
        refetch: fetchActivities,
        createActivity,
        updateActivity,
        completeActivity,
        deleteActivity
    }
}

/**
 * Hook para buscar automações
 */
export function useAutomations() {
    const [automations, setAutomations] = useState<Automation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAutomations = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/crm/automations')
            const data = await res.json()

            if (res.ok) {
                setAutomations(data)
                setError(null)
            } else {
                setError(data.error || 'Erro ao carregar automações')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar automações')
            setAutomations([])
        } finally {
            setLoading(false)
        }
    }, [])

    const createAutomation = async (automation: Partial<Automation>) => {
        const res = await fetch('/api/crm/automations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(automation)
        })
        if (!res.ok) throw new Error('Erro ao criar automação')
        const newAutomation = await res.json()
        setAutomations(prev => [...prev, newAutomation])
        return newAutomation
    }

    const toggleAutomation = async (id: string, is_active: boolean) => {
        const res = await fetch('/api/crm/automations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_active })
        })
        if (!res.ok) throw new Error('Erro ao atualizar automação')
        const updated = await res.json()
        setAutomations(prev => prev.map(a => a.id === id ? updated : a))
        return updated
    }

    const deleteAutomation = async (id: string) => {
        const res = await fetch(`/api/crm/automations?id=${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Erro ao deletar automação')
        setAutomations(prev => prev.filter(a => a.id !== id))
    }

    useEffect(() => {
        fetchAutomations()
    }, [fetchAutomations])

    return {
        automations,
        loading,
        error,
        refetch: fetchAutomations,
        createAutomation,
        toggleAutomation,
        deleteAutomation
    }
}

/**
 * Hook para buscar dados do pipeline (funil de vendas)
 */
export function usePipeline() {
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [leads, setLeads] = useState<PipelineLead[]>([])
    const [funnelId, setFunnelId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPipeline = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/crm/pipeline')
            const data = await res.json()

            if (res.ok) {
                setStages(data.stages || [])
                setLeads(data.leads || [])
                setFunnelId(data.funnelId)
                setError(null)
            } else {
                setError(data.error || 'Erro ao carregar pipeline')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar pipeline')
            setStages([])
            setLeads([])
        } finally {
            setLoading(false)
        }
    }, [])

    const createLead = async (lead: Partial<PipelineLead>) => {
        const res = await fetch('/api/crm/pipeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead)
        })
        if (!res.ok) throw new Error('Erro ao criar lead')
        const newLead = await res.json()
        setLeads(prev => [...prev, newLead])
        return newLead
    }

    const moveLead = async (leadId: string, stageId: string) => {
        const res = await fetch('/api/crm/pipeline/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId, stageId })
        })
        if (!res.ok) throw new Error('Erro ao mover lead')
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: stageId } : l))
    }

    useEffect(() => {
        fetchPipeline()
    }, [fetchPipeline])

    return {
        stages,
        leads,
        funnelId,
        loading,
        error,
        refetch: fetchPipeline,
        createLead,
        moveLead
    }
}

/**
 * Hook para buscar campanhas
 */
export function useCampaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCampaigns = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/crm/campaigns')
            const data = await res.json()

            if (res.ok) {
                setCampaigns(data)
                setError(null)
            } else {
                setError(data.error || 'Erro ao carregar campanhas')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
            setCampaigns([])
        } finally {
            setLoading(false)
        }
    }, [])

    const createCampaign = async (campaign: { name: string; message_template: string; segmentation_config?: any; scheduled_at?: string }) => {
        const res = await fetch('/api/crm/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaign)
        })
        if (!res.ok) throw new Error('Erro ao criar campanha')
        const newCampaign = await res.json()
        setCampaigns(prev => [...prev, newCampaign])
        return newCampaign
    }

    useEffect(() => {
        fetchCampaigns()
    }, [fetchCampaigns])

    return {
        campaigns,
        loading,
        error,
        refetch: fetchCampaigns,
        createCampaign
    }
}

// ============================================
// Academy Hooks
// ============================================

interface AcademyCategory {
    id: string
    nome: string
    slug: string
    descricao?: string
    ordem: number
    total_modules: number
    completed_modules: number
    progress_percentage: number
}

interface AcademyModule {
    id: string
    categoria_id: string
    nome: string
    slug: string
    descricao?: string
    thumbnail_url?: string
    ordem: number
    total_lessons: number
    completed_lessons: number
    progress_percentage: number
    duracao_estimada?: number
}

interface AcademyLesson {
    id: string
    modulo_id: string
    nome: string
    slug: string
    descricao?: string
    conteudo?: string
    video_url?: string
    duracao?: number
    ordem: number
    is_completed: boolean
    completed_at?: string
}

interface AcademyProgress {
    total_lessons: number
    completed_lessons: number
    progress_percentage: number
    total_time_spent?: number
    streak_days?: number
}

interface AcademyStats {
    categories_completed: number
    modules_completed: number
    lessons_completed: number
    certificates_earned: number
}

interface AcademyCertificate {
    id: string
    modulo_id: string
    modulo_nome: string
    user_id: string
    issued_at: string
    certificate_url?: string
}

/**
 * Hook para buscar categorias do Academy com progresso
 * Cache de 5 minutos
 */
export function useAcademyCategories() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['academy', 'categories'],
        queryFn: async () => {
            const res = await fetch('/api/academy/categories')
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao buscar categorias')
            }

            return data.categories || data.data || []
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })

    return {
        categories: (data || []) as AcademyCategory[],
        loading: isLoading,
        error: error as Error | null,
        refetch,
    }
}

/**
 * Hook para buscar módulos do Academy
 * Opcionalmente filtrados por categoria
 * Cache de 5 minutos
 */
export function useAcademyModules(categoriaSlug?: string) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['academy', 'modules', categoriaSlug],
        queryFn: async () => {
            const params = categoriaSlug ? `?categoria=${categoriaSlug}` : ''
            const res = await fetch(`/api/academy/modules${params}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao buscar módulos')
            }

            return data.modules || data.data || []
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })

    return {
        modules: (data || []) as AcademyModule[],
        loading: isLoading,
        error: error as Error | null,
        refetch,
    }
}

/**
 * Hook para buscar lições de um módulo
 * Cache de 5 minutos
 */
export function useAcademyLessons(moduloSlug: string) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['academy', 'lessons', moduloSlug],
        queryFn: async () => {
            const res = await fetch(`/api/academy/lessons?modulo=${moduloSlug}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao buscar lições')
            }

            return {
                lessons: data.lessons || data.data || [],
                module: data.module || null,
            }
        },
        enabled: !!moduloSlug,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })

    return {
        lessons: (data?.lessons || []) as AcademyLesson[],
        module: data?.module as AcademyModule | null,
        loading: isLoading,
        error: error as Error | null,
        refetch,
    }
}

/**
 * Hook para buscar uma lição específica
 * Cache de 5 minutos
 */
export function useAcademyLesson(moduloSlug: string, licaoSlug: string) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['academy', 'lesson', moduloSlug, licaoSlug],
        queryFn: async () => {
            const res = await fetch(`/api/academy/lessons?modulo=${moduloSlug}&licao=${licaoSlug}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao buscar lição')
            }

            return data.lesson || data.data || null
        },
        enabled: !!moduloSlug && !!licaoSlug,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })

    return {
        lesson: data as AcademyLesson | null,
        loading: isLoading,
        error: error as Error | null,
        refetch,
    }
}

/**
 * Hook para buscar progresso geral do usuário no Academy
 * Cache de 2 minutos (dados dinâmicos)
 */
export function useAcademyProgress() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['academy', 'progress'],
        queryFn: async () => {
            const res = await fetch('/api/academy/progress')
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao buscar progresso')
            }

            return {
                progress: data.progress || null,
                stats: data.stats || null,
                lastLesson: data.lastLesson || data.last_lesson || null,
                nextLesson: data.nextLesson || data.next_lesson || null,
            }
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
    })

    return {
        progress: data?.progress as AcademyProgress | null,
        stats: data?.stats as AcademyStats | null,
        lastLesson: data?.lastLesson as AcademyLesson | null,
        nextLesson: data?.nextLesson as AcademyLesson | null,
        loading: isLoading,
        error: error as Error | null,
    }
}

/**
 * Hook para buscar certificados do usuário
 * Cache de 5 minutos
 */
export function useAcademyCertificates() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['academy', 'certificates'],
        queryFn: async () => {
            const res = await fetch('/api/academy/certificates')
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao buscar certificados')
            }

            return {
                certificates: data.certificates || data.data || [],
                availableModules: data.availableModules || data.available_modules || [],
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    })

    return {
        certificates: (data?.certificates || []) as AcademyCertificate[],
        availableModules: (data?.availableModules || []) as AcademyModule[],
        loading: isLoading,
        error: error as Error | null,
    }
}

/**
 * Hook mutation para marcar lição como concluída
 */
export function useMarkLessonComplete() {
    const queryClient = useQueryClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const markComplete = async (lessonId: string) => {
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/academy/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lesson_id: lessonId }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Falha ao marcar lição como concluída')
            }

            // Invalidate related queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['academy', 'progress'] })
            queryClient.invalidateQueries({ queryKey: ['academy', 'lessons'] })
            queryClient.invalidateQueries({ queryKey: ['academy', 'modules'] })
            queryClient.invalidateQueries({ queryKey: ['academy', 'categories'] })
            queryClient.invalidateQueries({ queryKey: ['academy', 'certificates'] })

            return data
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Erro desconhecido')
            setError(error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    return {
        markComplete,
        loading,
        error,
    }
}
