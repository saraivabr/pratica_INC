"use client"

import { useState, useEffect, useCallback } from "react"

export interface PerformanceData {
  period: { start: string; end: string }
  metrics: {
    total_leads: number
    leads_convertidos: number
    leads_perdidos: number
    leads_em_atendimento: number
    leads_novos: number
    leads_qualificados: number
    score_medio: number
    taxa_conversao: number
    vendas_realizadas: number
  }
  comparativo: {
    total_leads: number
    leads_convertidos: number
    leads_qualificados: number
    taxa_conversao: number
  }
  leads_por_status: Array<{ status: string; count: number }>
  timeline: Array<{ date: string; total: number; convertidos: number }>
  ranking: Array<{
    corretor_nome: string
    total_leads: number
    convertidos: number
    perdidos: number
    em_atendimento: number
    score_medio: number
    taxa_conversao: number
  }>
  por_imobiliaria: Array<{
    imobiliaria_id: number
    imobiliaria_nome: string
    total_leads: number
    convertidos: number
    taxa_conversao: number
  }>
  user_role: string
}

interface UsePerformanceOptions {
  period?: string
  corretor_id?: string
  gerente_id?: string
  imobiliaria_id?: string
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.period) params.set('period', options.period)
      if (options.corretor_id) params.set('corretor_id', options.corretor_id)
      if (options.gerente_id) params.set('gerente_id', options.gerente_id)
      if (options.imobiliaria_id) params.set('imobiliaria_id', options.imobiliaria_id)

      const res = await fetch(`/api/reports/performance?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Erro ao carregar dados')
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [options.period, options.corretor_id, options.gerente_id, options.imobiliaria_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
