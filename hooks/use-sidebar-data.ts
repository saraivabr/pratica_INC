'use client'

import { useQuery } from '@tanstack/react-query'

// ============================================================================
// useSidebarGoals — wraps /api/crm/goals, staleTime 5min
// ============================================================================

interface GoalsData {
  overallProgress: number
  current: { revenue: number; leads: number; conversions: number }
  goals: { revenue: number; leads: number; conversions: number }
  progress: { revenue: number; leads: number; conversions: number }
}

export function useSidebarGoals() {
  const { data, isLoading } = useQuery<GoalsData>({
    queryKey: ['sidebar-goals'],
    queryFn: async () => {
      const res = await fetch('/api/crm/goals')
      if (!res.ok) throw new Error('Failed to fetch goals')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  return {
    overallProgress: data?.overallProgress ?? 0,
    currentRevenue: data?.current?.revenue ?? 0,
    goals: data?.goals ?? { revenue: 0, leads: 0, conversions: 0 },
    progress: data?.progress ?? { revenue: 0, leads: 0, conversions: 0 },
    isLoading,
  }
}

// ============================================================================
// useSidebarLeads — wraps /api/leads, staleTime 3min
// ============================================================================

interface LeadsResponse {
  data: Array<{ data_cadastro: string | null }>
  total: number
}

export function useSidebarLeads() {
  const { data, isLoading } = useQuery<{ total: number; newToday: number }>({
    queryKey: ['sidebar-leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads?limit=100&offset=0')
      if (!res.ok) throw new Error('Failed to fetch leads')
      const json: LeadsResponse = await res.json()

      const today = new Date().toISOString().slice(0, 10)
      const newToday = json.data.filter(lead => {
        if (!lead.data_cadastro) return false
        return lead.data_cadastro.slice(0, 10) === today
      }).length

      return { total: json.total, newToday }
    },
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  })

  return {
    total: data?.total ?? 0,
    newToday: data?.newToday ?? 0,
    isLoading,
  }
}

// ============================================================================
// useWhatsAppSidebarData — fetches status + instanceName + unread count
// ============================================================================

interface WhatsAppStatusResponse {
  status: string
  instanceName: string | null
}

export function useWhatsAppSidebarData() {
  // Step 1: Fetch connection status + instanceName
  const { data: statusData } = useQuery<{ isConnected: boolean; instanceName: string | null }>({
    queryKey: ['sidebar-whatsapp-status'],
    queryFn: async () => {
      const res = await fetch('/api/whatsapp/session/status')
      const json: WhatsAppStatusResponse = await res.json()
      return {
        isConnected: json.status === 'ready' || json.status === 'open',
        instanceName: json.instanceName || null,
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const instanceName = statusData?.instanceName ?? null
  const isConnected = statusData?.isConnected ?? false

  // Step 2: Fetch unread count using instanceName
  const { data: unreadData } = useQuery<number>({
    queryKey: ['sidebar-whatsapp-unread', instanceName],
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/messages?instance=${instanceName}`)
      const json = await res.json()
      return json.success ? (json.total_unread || 0) : 0
    },
    refetchInterval: 15000,
    enabled: !!instanceName && isConnected,
    staleTime: 10000,
  })

  return {
    isConnected,
    instanceName,
    totalUnread: unreadData ?? 0,
  }
}

// ============================================================================
// useDashboardStats — wraps /api/crm/stats, staleTime 5min
// ============================================================================

interface StatsData {
  totalLeads: number
  leadsVariation: number
  conversion: { won: number; total: number; rate: number; variation: number }
  revenue: { current: number; lastMonth: number; variation: number }
  insights: { hotLeadsNoContact: number }
}

export function useDashboardStats() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/crm/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  return {
    totalLeads: data?.totalLeads ?? 0,
    leadsVariation: data?.leadsVariation ?? 0,
    conversionRate: data?.conversion?.rate ?? 0,
    conversionVariation: data?.conversion?.variation ?? 0,
    revenue: data?.revenue?.current ?? 0,
    revenueVariation: data?.revenue?.variation ?? 0,
    hotLeadsNoContact: data?.insights?.hotLeadsNoContact ?? 0,
    isLoading,
  }
}

// ============================================================================
// useDashboardActivities — wraps /api/crm/activities, staleTime 5min
// ============================================================================

interface Activity {
  id: string
  title: string
  activity_type: string
  status: string
  scheduled_at: string
  lead_name: string | null
  lead_phone: string | null
}

export function useDashboardActivities() {
  const { data, isLoading } = useQuery<{ upcoming: Activity[]; recent: Activity[] }>({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      const res = await fetch('/api/crm/activities')
      if (!res.ok) throw new Error('Failed to fetch activities')
      const activities: Activity[] = await res.json()

      const now = new Date()
      const upcoming = activities
        .filter(a => new Date(a.scheduled_at) >= now && a.status !== 'completed')
        .slice(0, 5)
      const recent = activities
        .filter(a => a.status === 'completed' || new Date(a.scheduled_at) < now)
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
        .slice(0, 5)

      return { upcoming, recent }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  return {
    upcoming: data?.upcoming ?? [],
    recent: data?.recent ?? [],
    isLoading,
  }
}

// ============================================================================
// useRecentLeads — wraps /api/leads?limit=5, staleTime 3min
// ============================================================================

interface RecentLead {
  id: number
  nome: string
  origem: string
  data_cadastro: string | null
  situacao: string | null
}

export function useRecentLeads() {
  const { data, isLoading } = useQuery<RecentLead[]>({
    queryKey: ['dashboard-recent-leads'],
    queryFn: async () => {
      const res = await fetch('/api/leads?limit=5&offset=0')
      if (!res.ok) throw new Error('Failed to fetch recent leads')
      const json = await res.json()
      return json.data.map((l: any) => ({
        id: l.id,
        nome: l.nome,
        origem: l.origem,
        data_cadastro: l.data_cadastro,
        situacao: l.situacao,
      }))
    },
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  })

  return {
    leads: data ?? [],
    isLoading,
  }
}
