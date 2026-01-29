/**
 * Lead Response SLA Alert System
 * 
 * Tracks lead response times and triggers alerts when SLA is violated.
 * SLA Rules:
 * - First contact must happen within 4 hours for hot/warm leads (score >= 50)
 * - Follow-up should happen within 24 hours after last interaction
 * 
 * Urgency Levels:
 * - CRITICAL: 8+ hours without first contact, score >= 70
 * - URGENT: 4-8 hours without first contact, score >= 50
 * - ATTENTION: 24+ hours since last contact
 */

export interface LeadAlert {
  leadId: string
  leadName: string
  leadPhone: string
  leadEmail?: string | null
  leadScore: number
  leadOrigin?: string | null
  empreendimento?: string | null
  createdAt: Date
  lastContactAt: Date | null
  firstContactAt: Date | null
  hoursSinceCreated: number
  hoursSinceLastContact: number | null
  urgencyLevel: 'critical' | 'urgent' | 'attention' | 'normal'
  slaViolated: boolean
  violationType: 'first_contact' | 'follow_up' | null
  assignedCorretor?: string | null
  situacao?: string | null
}

export interface SLAMetrics {
  totalLeads: number
  leadsWithinSLA: number
  leadsViolatingSLA: number
  avgResponseTimeHours: number
  slaComplianceRate: number
  criticalAlerts: number
  urgentAlerts: number
  attentionAlerts: number
}

// SLA thresholds (in hours)
const SLA_THRESHOLDS = {
  FIRST_CONTACT_URGENT: 4,
  FIRST_CONTACT_CRITICAL: 8,
  FOLLOW_UP_ATTENTION: 24,
  MIN_LEAD_SCORE_FOR_SLA: 50,
}

/**
 * Calculate hours between two dates
 */
function getHoursDiff(from: Date, to: Date = new Date()): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60))
}

/**
 * Determine urgency level based on lead data
 */
function calculateUrgencyLevel(
  hoursSinceCreated: number,
  hoursSinceLastContact: number | null,
  leadScore: number,
  hasFirstContact: boolean
): LeadAlert['urgencyLevel'] {
  // If lead hasn't been contacted yet
  if (!hasFirstContact) {
    if (leadScore >= 70 && hoursSinceCreated >= SLA_THRESHOLDS.FIRST_CONTACT_CRITICAL) {
      return 'critical'
    }
    if (leadScore >= SLA_THRESHOLDS.MIN_LEAD_SCORE_FOR_SLA && hoursSinceCreated >= SLA_THRESHOLDS.FIRST_CONTACT_URGENT) {
      return 'urgent'
    }
  }

  // If lead was contacted but no recent follow-up
  if (hasFirstContact && hoursSinceLastContact !== null && hoursSinceLastContact >= SLA_THRESHOLDS.FOLLOW_UP_ATTENTION) {
    return 'attention'
  }

  return 'normal'
}

/**
 * Check if lead violates SLA rules
 */
function checkSLAViolation(
  urgencyLevel: LeadAlert['urgencyLevel'],
  hasFirstContact: boolean
): { violated: boolean; type: LeadAlert['violationType'] } {
  if (!hasFirstContact && (urgencyLevel === 'critical' || urgencyLevel === 'urgent')) {
    return { violated: true, type: 'first_contact' }
  }
  if (hasFirstContact && urgencyLevel === 'attention') {
    return { violated: true, type: 'follow_up' }
  }
  return { violated: false, type: null }
}

/**
 * Transform raw lead data into LeadAlert object
 */
function transformToLeadAlert(lead: any): LeadAlert {
  const createdAt = new Date(lead.data_cad || lead.created_at || Date.now())
  const lastContactAt = lead.data_ultima_interacao ? new Date(lead.data_ultima_interacao) : null
  const firstContactAt = lead.first_contacted_at ? new Date(lead.first_contacted_at) : null
  const hasFirstContact = !!firstContactAt

  const hoursSinceCreated = getHoursDiff(createdAt)
  const hoursSinceLastContact = lastContactAt ? getHoursDiff(lastContactAt) : null

  const leadScore = lead.score || 50 // Default to medium score if not set
  const urgencyLevel = calculateUrgencyLevel(hoursSinceCreated, hoursSinceLastContact, leadScore, hasFirstContact)
  const slaCheck = checkSLAViolation(urgencyLevel, hasFirstContact)

  return {
    leadId: lead.id,
    leadName: lead.nome || 'Nome não informado',
    leadPhone: lead.telefone || lead.celular || '',
    leadEmail: lead.email || null,
    leadScore,
    leadOrigin: lead.origem || null,
    empreendimento: lead.empreendimento?.nome || lead.interesse_empreendimento || null,
    createdAt,
    lastContactAt,
    firstContactAt,
    hoursSinceCreated,
    hoursSinceLastContact,
    urgencyLevel,
    slaViolated: slaCheck.violated,
    violationType: slaCheck.type,
    assignedCorretor: lead.corretor_responsavel || lead.usuario_responsavel || null,
    situacao: lead.situacao || null,
  }
}

/**
 * Get all leads that require urgent attention (SLA violated or close to violation)
 */
export async function getUrgentLeads(corretorId?: string): Promise<LeadAlert[]> {
  try {
    // Build query params
    const params = new URLSearchParams({
      limit: '200',
      status: 'ativo', // Only active leads
    })

    if (corretorId) {
      params.append('corretorId', corretorId)
    }

    // Fetch leads from API
    const response = await fetch(`/api/leads?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch leads')
    }

    const data = await response.json()
    const leads = data.data || []

    // Transform and filter to only urgent leads
    const alerts: LeadAlert[] = leads
      .map(transformToLeadAlert)
      .filter((alert: LeadAlert) => alert.urgencyLevel !== 'normal')
      .sort((a: LeadAlert, b: LeadAlert) => {
        // Sort by urgency level first (critical > urgent > attention)
        const urgencyOrder = { critical: 0, urgent: 1, attention: 2, normal: 3 }
        if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
          return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]
        }
        // Then by score (higher first)
        if (a.leadScore !== b.leadScore) {
          return b.leadScore - a.leadScore
        }
        // Finally by time (oldest first)
        return a.hoursSinceCreated - b.hoursSinceCreated
      })

    return alerts
  } catch (error) {
    console.error('Error getting urgent leads:', error)
    return []
  }
}

/**
 * Get SLA metrics for dashboard
 */
export async function getSLAMetrics(corretorId?: string): Promise<SLAMetrics> {
  try {
    // Build query params
    const params = new URLSearchParams({
      limit: '1000', // Get more for accurate metrics
    })

    if (corretorId) {
      params.append('corretorId', corretorId)
    }

    // Fetch leads from API
    const response = await fetch(`/api/leads?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch leads')
    }

    const data = await response.json()
    const leads = data.data || []

    // Transform all leads
    const alerts: LeadAlert[] = leads.map(transformToLeadAlert)

    // Calculate metrics
    const totalLeads = alerts.length
    const leadsViolatingSLA = alerts.filter((a: LeadAlert) => a.slaViolated).length
    const leadsWithinSLA = totalLeads - leadsViolatingSLA

    // Calculate average response time (only for leads that were contacted)
    const contactedLeads = alerts.filter((a: LeadAlert) => a.firstContactAt)
    const totalResponseTime = contactedLeads.reduce((sum: number, lead: LeadAlert) => {
      return sum + getHoursDiff(lead.createdAt, lead.firstContactAt!)
    }, 0)
    const avgResponseTimeHours = contactedLeads.length > 0 ? totalResponseTime / contactedLeads.length : 0

    const slaComplianceRate = totalLeads > 0 ? (leadsWithinSLA / totalLeads) * 100 : 100

    // Count by urgency level
    const criticalAlerts = alerts.filter((a: LeadAlert) => a.urgencyLevel === 'critical').length
    const urgentAlerts = alerts.filter((a: LeadAlert) => a.urgencyLevel === 'urgent').length
    const attentionAlerts = alerts.filter((a: LeadAlert) => a.urgencyLevel === 'attention').length

    return {
      totalLeads,
      leadsWithinSLA,
      leadsViolatingSLA,
      avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
      slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
      criticalAlerts,
      urgentAlerts,
      attentionAlerts,
    }
  } catch (error) {
    console.error('Error getting SLA metrics:', error)
    return {
      totalLeads: 0,
      leadsWithinSLA: 0,
      leadsViolatingSLA: 0,
      avgResponseTimeHours: 0,
      slaComplianceRate: 100,
      criticalAlerts: 0,
      urgentAlerts: 0,
      attentionAlerts: 0,
    }
  }
}

/**
 * Get urgency color for UI display
 */
export function getUrgencyColor(urgencyLevel: LeadAlert['urgencyLevel']): {
  bg: string
  text: string
  border: string
  gradient: string
} {
  switch (urgencyLevel) {
    case 'critical':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-300 dark:border-red-700',
        gradient: 'from-red-500 via-rose-500 to-pink-500',
      }
    case 'urgent':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-300 dark:border-orange-700',
        gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      }
    case 'attention':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-300 dark:border-amber-700',
        gradient: 'from-amber-500 via-yellow-500 to-orange-500',
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-900/30',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-300 dark:border-gray-700',
        gradient: 'from-gray-500 via-gray-600 to-gray-700',
      }
  }
}

/**
 * Get urgency label for UI display
 */
export function getUrgencyLabel(urgencyLevel: LeadAlert['urgencyLevel']): string {
  switch (urgencyLevel) {
    case 'critical':
      return '🔴 CRÍTICO'
    case 'urgent':
      return '🟠 URGENTE'
    case 'attention':
      return '🟡 ATENÇÃO'
    default:
      return '⚪ NORMAL'
  }
}

/**
 * Get time description for display
 */
export function getTimeDescription(alert: LeadAlert): string {
  if (!alert.firstContactAt) {
    const hours = alert.hoursSinceCreated
    if (hours < 1) return 'Criado há menos de 1 hora'
    if (hours < 24) return `Aguardando há ${hours}h`
    const days = Math.floor(hours / 24)
    return `Aguardando há ${days}d ${hours % 24}h`
  }

  if (alert.hoursSinceLastContact !== null) {
    const hours = alert.hoursSinceLastContact
    if (hours < 1) return 'Contatado recentemente'
    if (hours < 24) return `Sem follow-up há ${hours}h`
    const days = Math.floor(hours / 24)
    return `Sem follow-up há ${days}d ${hours % 24}h`
  }

  return 'Status desconhecido'
}
