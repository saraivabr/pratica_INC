/**
 * Tipos para o dashboard e CRM
 */

export interface DashboardStats {
  totalLeads: number
  totalCorretores: number
  leadsPorOrigem: LeadPorOrigem[]
  leadsRecentes: Lead[]
  errorLeads?: string
}

export interface LeadPorOrigem {
  origem: string
  count: number
}

export interface Lead {
  id?: string
  nome?: string
  email?: string
  telefone?: string
  origem?: string
  midia?: string
  corretor?: string | { nome: string }
  created_at?: string
}

export interface CRMStats {
  conversion?: {
    total: number
    won: number
    rate: number
  }
  temperatures?: LeadTemperature[]
  stages?: FunnelStage[]
  avgScore?: number
}

export interface LeadTemperature {
  temperature: "hot" | "warm" | "cold"
  count: number
}

export interface FunnelStage {
  name: string
  count: number
  order?: number
}

export interface StatCard {
  title: string
  value: string | number
  icon: any // LucideIcon
  color: string
  bgColor: string
}
