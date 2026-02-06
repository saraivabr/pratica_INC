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
