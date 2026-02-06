"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Megaphone,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Users,
  Filter,
  Sparkles,
  AlertTriangle,
  RefreshCcw,
  Ban,
  MessageSquare,
  Building2,
  Calendar,
  Phone,
  Upload,
  ClipboardPaste,
  Trash2,
  Database,
  Wifi,
  WifiOff,
  ExternalLink,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ============================================================================
// Types
// ============================================================================

interface Lead {
  id: string
  id_lead: number
  nome: string
  telefone: string
  empreendimento: string
  situacao: string
}

interface Disparo {
  id: string
  tipo: string
  intencao: string
  total_leads: number
  processed_count: number
  sent_count: number
  failed_count: number
  status: string
  created_at: string
  completed_at: string | null
}

interface PreviewMsg {
  lead_nome: string
  mensagem: string
}

const TIPOS = [
  {
    value: "follow_up",
    label: "Follow-up",
    desc: "Retomar contato com leads que demonstraram interesse",
    icon: RefreshCcw,
    color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  },
  {
    value: "novidade",
    label: "Novidade",
    desc: "Compartilhar lançamento ou oportunidade",
    icon: Sparkles,
    color: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
  },
  {
    value: "convite",
    label: "Convite",
    desc: "Convidar para evento, feirão ou visita",
    icon: Calendar,
    color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  },
  {
    value: "livre",
    label: "Livre",
    desc: "Mensagem personalizada com sua intenção",
    icon: MessageSquare,
    color: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950",
  },
]

// ============================================================================
// Component
// ============================================================================

export default function DisparadorPage() {
  usePageTracking("disparador")
  const { user } = useAuth()

  // Wizard state
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState("")
  const [intencao, setIntencao] = useState("")
  const [filtros, setFiltros] = useState<{
    situacao?: string
    empreendimento?: string
    dias_sem_contato?: number
  }>({})
  const [leadSource, setLeadSource] = useState<"crm" | "importar">("crm")

  // WhatsApp status
  const [whatsappStatus, setWhatsappStatus] = useState<"checking" | "connected" | "disconnected">("checking")
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null)

  // Data
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [importText, setImportText] = useState("")
  const [importedLeads, setImportedLeads] = useState<Array<{ nome: string; telefone: string; empreendimento?: string }>>([])
  const [importError, setImportError] = useState("")
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState<{
    situacoes: string[]
    empreendimentos: string[]
  }>({ situacoes: [], empreendimentos: [] })
  const [preview, setPreview] = useState<PreviewMsg[]>([])
  const [disparos, setDisparos] = useState<Disparo[]>([])
  const [activeDisparo, setActiveDisparo] = useState<any>(null)

  // Loading states
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [loadingDisparos, setLoadingDisparos] = useState(false)
  const [error, setError] = useState("")

  // Parse imported text into leads
  const parseImportText = (text: string) => {
    setImportError("")
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    const parsed: Array<{ nome: string; telefone: string; empreendimento?: string }> = []
    const errors: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Support: "Nome, Telefone" or "Nome; Telefone" or "Nome\tTelefone" or "Nome, Telefone, Empreendimento"
      const parts = line.split(/[,;\t]/).map(p => p.trim())

      if (parts.length < 2) {
        errors.push(`Linha ${i + 1}: formato inválido (use: Nome, Telefone)`)
        continue
      }

      const nome = parts[0]
      const telefone = parts[1].replace(/\D/g, "")

      if (!nome || nome.length < 2) {
        errors.push(`Linha ${i + 1}: nome inválido`)
        continue
      }
      if (telefone.length < 8) {
        errors.push(`Linha ${i + 1}: telefone inválido`)
        continue
      }

      parsed.push({
        nome,
        telefone,
        empreendimento: parts[2] || "",
      })
    }

    if (errors.length > 0 && parsed.length === 0) {
      setImportError(errors.slice(0, 3).join(". "))
    } else if (errors.length > 0) {
      setImportError(`${errors.length} linha(s) ignorada(s). ${parsed.length} lead(s) válido(s).`)
    }

    setImportedLeads(parsed.slice(0, 50))
  }

  // Get the effective lead list depending on source
  const effectiveLeads = leadSource === "crm" ? leads : importedLeads.map((l, i) => ({
    id: `imp-${i}`,
    id_lead: 0,
    nome: l.nome,
    telefone: l.telefone,
    empreendimento: l.empreendimento || "",
    situacao: "",
  }))

  // Fetch leads with filters
  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (filtros.situacao) params.set("situacao", filtros.situacao)
      if (filtros.empreendimento) params.set("empreendimento", filtros.empreendimento)
      if (filtros.dias_sem_contato) params.set("dias_sem_contato", String(filtros.dias_sem_contato))

      const res = await fetch(`/api/disparador/leads?${params}`)
      const data = await res.json()

      if (data.success) {
        setLeads(data.leads)
        setTotalLeads(data.total)
        setFiltrosDisponiveis(data.filtros)
      } else {
        setError(data.error || "Erro ao buscar leads")
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoadingLeads(false)
    }
  }, [filtros])

  // Fetch previous disparos
  const fetchDisparos = useCallback(async () => {
    setLoadingDisparos(true)
    try {
      const res = await fetch("/api/disparador")
      const data = await res.json()
      if (data.success) setDisparos(data.data)
    } catch (err) { console.error('Erro ao buscar disparos:', err) } finally {
      setLoadingDisparos(false)
    }
  }, [])

  // Generate preview
  const gerarPreview = async () => {
    setLoadingPreview(true)
    setError("")
    try {
      const sampleLeads = effectiveLeads.slice(0, 3).map((l) => ({
        nome: l.nome,
        empreendimento: l.empreendimento,
      }))

      const res = await fetch("/api/disparador/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, intencao, leads: sampleLeads }),
      })
      const data = await res.json()

      if (data.success) {
        setPreview(data.mensagens)
      } else {
        setError(data.error || "Erro ao gerar preview")
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoadingPreview(false)
    }
  }

  // Create disparo
  const criarDisparo = async () => {
    setLoadingCreate(true)
    setError("")
    try {
      const payload: any = { tipo, intencao, filtros }
      if (leadSource === "importar" && importedLeads.length > 0) {
        payload.leads_importados = importedLeads
      }

      const res = await fetch("/api/disparador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setActiveDisparo({ id: data.disparo_id, total: data.total, status: data.status })
        setStep(5)
      } else {
        setError(data.error || "Erro ao criar disparo")
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoadingCreate(false)
    }
  }

  // Cancel disparo
  const cancelarDisparo = async (id: string) => {
    try {
      await fetch(`/api/disparador/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancelar" }),
      })
      if (activeDisparo?.id === id) {
        setActiveDisparo((prev: any) => prev ? { ...prev, status: "cancelado" } : null)
      }
      fetchDisparos()
    } catch (err) { console.error('Erro ao cancelar disparo:', err) }
  }

  // Polling for active disparo progress
  useEffect(() => {
    if (!activeDisparo?.id || activeDisparo.status !== "enviando") return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/disparador/${activeDisparo.id}`)
        const data = await res.json()
        if (data.success) {
          setActiveDisparo({
            id: activeDisparo.id,
            ...data.data,
          })
          if (data.data.status !== "enviando") {
            clearInterval(interval)
            fetchDisparos()
          }
        }
      } catch (err) { console.error('Erro ao verificar progresso do disparo:', err) }
    }, 3000)

    return () => clearInterval(interval)
  }, [activeDisparo?.id, activeDisparo?.status, fetchDisparos])

  // Check WhatsApp connection (with polling retry when disconnected)
  const whatsappConnectedRef = useRef(false)
  useEffect(() => {
    const checkWhatsApp = async () => {
      try {
        const res = await fetch("/api/whatsapp/session/status")
        const data = await res.json()
        if (data.status === "ready") {
          setWhatsappStatus("connected")
          setWhatsappPhone(data.pairedPhone || null)
          whatsappConnectedRef.current = true
        } else {
          setWhatsappStatus("disconnected")
          whatsappConnectedRef.current = false
        }
      } catch {
        setWhatsappStatus("disconnected")
        whatsappConnectedRef.current = false
      }
    }

    checkWhatsApp()
    // Retry every 10s until connected
    const intervalId = setInterval(() => {
      if (!whatsappConnectedRef.current) {
        checkWhatsApp()
      }
    }, 10000)

    return () => clearInterval(intervalId)
  }, [])

  // Initial load
  useEffect(() => {
    fetchDisparos()
  }, [fetchDisparos])

  // Load leads when entering step 2
  useEffect(() => {
    if (step === 2) fetchLeads()
  }, [step, fetchLeads])

  const canProceed = () => {
    switch (step) {
      case 1: return !!tipo
      case 2: return effectiveLeads.length > 0
      case 3: return intencao.length >= 5 && preview.length > 0
      case 4: return true
      default: return false
    }
  }

  const tipoInfo = TIPOS.find((t) => t.value === tipo)

  return (
    <AppShell title="Disparador">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header + WhatsApp info */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Disparador Inteligente
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Envie mensagens personalizadas por IA para seus leads via WhatsApp
            </p>
          </div>

          {/* Painel explicativo WhatsApp */}
          {step <= 1 && (
            <div className="relative overflow-hidden rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/40 dark:via-emerald-950/30 dark:to-teal-950/20 p-4">
              <div className="flex gap-4">
                {/* WhatsApp icon */}
                <div className="shrink-0 h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-white fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-green-800 dark:text-green-300 text-sm">
                    Mensagens via WhatsApp com IA
                  </h3>
                  <p className="text-xs text-green-700/80 dark:text-green-400/70 mt-1 leading-relaxed">
                    A IA gera uma mensagem <strong>unica e personalizada</strong> para cada lead, usando o nome e interesse de cada um. As mensagens sao enviadas pelo <strong>seu WhatsApp conectado</strong> com intervalos naturais entre cada envio, como se voce estivesse digitando manualmente.
                  </p>
                </div>
              </div>

              {/* Como funciona - steps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-green-200/60 dark:border-green-800/40">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-300">1</span>
                  </div>
                  <p className="text-[11px] text-green-700/80 dark:text-green-400/70 leading-tight">Escolha o tipo de mensagem</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-300">2</span>
                  </div>
                  <p className="text-[11px] text-green-700/80 dark:text-green-400/70 leading-tight">Selecione ou importe seus leads</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-300">3</span>
                  </div>
                  <p className="text-[11px] text-green-700/80 dark:text-green-400/70 leading-tight">Descreva o que quer comunicar</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-green-700 dark:text-green-300">4</span>
                  </div>
                  <p className="text-[11px] text-green-700/80 dark:text-green-400/70 leading-tight">Confirme e a IA faz o resto</p>
                </div>
              </div>

              {/* Decorative circle */}
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green-200/30 dark:bg-green-800/10 blur-xl" />
            </div>
          )}
        </div>

        {/* WhatsApp connection status */}
        {whatsappStatus === "connected" && (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
              <Wifi className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">WhatsApp conectado</p>
              {whatsappPhone && (
                <p className="text-xs text-green-600 dark:text-green-400">{whatsappPhone}</p>
              )}
            </div>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          </div>
        )}

        {whatsappStatus === "disconnected" && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="h-8 w-8 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
              <WifiOff className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">WhatsApp desconectado</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Voce precisa conectar seu WhatsApp antes de disparar mensagens.
              </p>
            </div>
            <a
              href="/onboarding/whatsapp"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Conectar
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {whatsappStatus === "checking" && (
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            <span className="text-sm text-zinc-500">Verificando conexao WhatsApp...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* Steps indicator */}
        {step <= 5 && (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    s === step
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : s < step
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                  )}
                >
                  {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                {s < 5 && <div className={cn("h-0.5 w-6 sm:w-10", s < step ? "bg-green-300 dark:bg-green-700" : "bg-zinc-200 dark:bg-zinc-700")} />}
              </div>
            ))}
          </div>
        )}

        {/* ================================================================
            STEP 1: Tipo
        ================================================================ */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">1. Tipo de mensagem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    tipo === t.value
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  )}
                >
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-3", t.color)}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{t.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 2: Leads (CRM ou Importar)
        ================================================================ */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="h-4 w-4" />
              2. Selecionar leads
            </h3>

            {/* Source tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
              <button
                onClick={() => setLeadSource("crm")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  leadSource === "crm"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                )}
              >
                <Database className="h-4 w-4" />
                Meus Leads (CRM)
              </button>
              <button
                onClick={() => setLeadSource("importar")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                  leadSource === "importar"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                )}
              >
                <Upload className="h-4 w-4" />
                Importar Lista
              </button>
            </div>

            {/* CRM mode */}
            {leadSource === "crm" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Situacao</label>
                    <select
                      value={filtros.situacao || ""}
                      onChange={(e) => setFiltros({ ...filtros, situacao: e.target.value || undefined })}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">Todas</option>
                      {filtrosDisponiveis.situacoes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Empreendimento</label>
                    <select
                      value={filtros.empreendimento || ""}
                      onChange={(e) => setFiltros({ ...filtros, empreendimento: e.target.value || undefined })}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="">Todos</option>
                      {filtrosDisponiveis.empreendimentos.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">Dias sem contato</label>
                    <select
                      value={filtros.dias_sem_contato || 0}
                      onChange={(e) => setFiltros({ ...filtros, dias_sem_contato: parseInt(e.target.value) || undefined })}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <option value="0">Qualquer</option>
                      <option value="7">7+ dias</option>
                      <option value="15">15+ dias</option>
                      <option value="30">30+ dias</option>
                      <option value="60">60+ dias</option>
                      <option value="90">90+ dias</option>
                    </select>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loadingLeads}>
                  {loadingLeads ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  <span className="ml-2">Atualizar</span>
                </Button>
              </div>
            )}

            {/* Import mode */}
            {leadSource === "importar" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
                    Cole a lista de leads (um por linha)
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value)
                      if (e.target.value.trim()) {
                        parseImportText(e.target.value)
                      } else {
                        setImportedLeads([])
                        setImportError("")
                      }
                    }}
                    placeholder={"Nome, Telefone\nJoão Silva, 11999887766\nMaria Santos, 21988776655, Residencial Aurora"}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono min-h-[140px] resize-none"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-zinc-400">
                      Formato: Nome, Telefone ou Nome, Telefone, Empreendimento
                    </p>
                    {importText && (
                      <button
                        onClick={() => { setImportText(""); setImportedLeads([]); setImportError("") }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {importError && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{importError}</p>
                )}
              </div>
            )}

            {/* Lead count */}
            <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <Users className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {leadSource === "crm" && loadingLeads ? "Buscando..." : (
                  <>
                    <strong>{effectiveLeads.length}</strong> leads {leadSource === "importar" ? "importados" : "encontrados"}
                    {leadSource === "crm" && totalLeads > 50 && <span className="text-zinc-500"> (max 50 por disparo)</span>}
                    {leadSource === "importar" && importedLeads.length >= 50 && <span className="text-zinc-500"> (max 50 por disparo)</span>}
                  </>
                )}
              </span>
            </div>

            {/* Lead preview list */}
            {effectiveLeads.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                {effectiveLeads.slice(0, 10).map((lead, idx) => (
                  <div key={lead.id || idx} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{lead.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {lead.empreendimento && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {lead.empreendimento}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.telefone}
                        </span>
                      </div>
                    </div>
                    {lead.situacao && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">{lead.situacao}</Badge>
                    )}
                  </div>
                ))}
                {effectiveLeads.length > 10 && (
                  <div className="px-3 py-2 text-xs text-zinc-500 text-center">
                    + {effectiveLeads.length - 10} leads
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            STEP 3: Intencao + Preview
        ================================================================ */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              3. Sua mensagem
            </h3>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
                O que voce quer comunicar?
              </label>
              <textarea
                value={intencao}
                onChange={(e) => setIntencao(e.target.value)}
                placeholder="Ex: Quero avisar sobre condições especiais de pagamento no Residencial Aurora até sexta-feira..."
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-zinc-400 mt-1">{intencao.length}/500</p>
            </div>

            <Button
              onClick={gerarPreview}
              disabled={intencao.length < 5 || loadingPreview}
              variant="outline"
            >
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Gerar Preview
            </Button>

            {/* Preview messages */}
            {preview.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Exemplos de mensagens que serao geradas:
                </p>
                {preview.map((msg, i) => (
                  <div key={i} className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                      Para: {msg.lead_nome}
                    </p>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                      {msg.mensagem}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            STEP 4: Confirmar
        ================================================================ */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">4. Confirmar disparo</h3>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Tipo</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tipoInfo?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Leads</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {effectiveLeads.length}
                  {leadSource === "importar" && <span className="text-zinc-500 font-normal ml-1">(importados)</span>}
                </span>
              </div>
              <div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Intencao</span>
                <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-1">{intencao}</p>
              </div>
              {leadSource === "crm" && (filtros.situacao || filtros.empreendimento || filtros.dias_sem_contato) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  {filtros.situacao && <Badge variant="secondary">{filtros.situacao}</Badge>}
                  {filtros.empreendimento && <Badge variant="secondary">{filtros.empreendimento}</Badge>}
                  {filtros.dias_sem_contato && <Badge variant="secondary">{filtros.dias_sem_contato}+ dias sem contato</Badge>}
                </div>
              )}
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Atenção:</strong> Cada lead receberá uma mensagem única gerada por IA.
              O envio será feito com delays humanizados (8-25s entre mensagens) para evitar bloqueio.
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 5: Progresso
        ================================================================ */}
        {step === 5 && activeDisparo && (
          <div className="space-y-4">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Send className="h-4 w-4" />
              5. Progresso do envio
            </h3>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl space-y-4">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    activeDisparo.status === "concluido" ? "default" :
                    activeDisparo.status === "cancelado" ? "secondary" :
                    activeDisparo.status === "falhou" ? "destructive" :
                    "default"
                  }
                  className={activeDisparo.status === "enviando" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : ""}
                >
                  {activeDisparo.status === "enviando" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  {activeDisparo.status === "concluido" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {activeDisparo.status === "falhou" && <XCircle className="h-3 w-3 mr-1" />}
                  {activeDisparo.status === "cancelado" && <Ban className="h-3 w-3 mr-1" />}
                  {activeDisparo.status}
                </Badge>

                {activeDisparo.status === "enviando" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelarDisparo(activeDisparo.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Progresso</span>
                  <span>
                    {(activeDisparo.sent_count || 0) + (activeDisparo.failed_count || 0)}/
                    {activeDisparo.total_leads || activeDisparo.total || 0}
                  </span>
                </div>
                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      activeDisparo.status === "falhou" ? "bg-red-500" :
                      activeDisparo.status === "cancelado" ? "bg-zinc-400" :
                      "bg-green-500"
                    )}
                    style={{
                      width: `${Math.min(100, (((activeDisparo.sent_count || 0) + (activeDisparo.failed_count || 0)) / (activeDisparo.total_leads || activeDisparo.total || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{activeDisparo.sent_count || 0}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-500">Enviados</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">{activeDisparo.failed_count || 0}</p>
                  <p className="text-[10px] text-red-600 dark:text-red-500">Falhas</p>
                </div>
                <div className="text-center p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
                  <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                    {Math.max(0, (activeDisparo.total_leads || activeDisparo.total || 0) - (activeDisparo.sent_count || 0) - (activeDisparo.failed_count || 0))}
                  </p>
                  <p className="text-[10px] text-zinc-500">Pendentes</p>
                </div>
              </div>

              {/* Lead list if available */}
              {activeDisparo.leads?.length > 0 && (
                <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800 max-h-48 overflow-y-auto">
                  {activeDisparo.leads.map((lead: any) => (
                    <div key={lead.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      {lead.status === "enviado" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      {lead.status === "falhou" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      {lead.status === "pendente" && <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                      <span className="truncate text-zinc-700 dark:text-zinc-300">{lead.lead_nome}</span>
                      {lead.error_message && (
                        <span className="ml-auto text-red-500 truncate max-w-[120px]">{lead.error_message}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeDisparo.status !== "enviando" && (
              <Button
                onClick={() => {
                  setStep(1)
                  setTipo("")
                  setIntencao("")
                  setFiltros({})
                  setLeadSource("crm")
                  setImportText("")
                  setImportedLeads([])
                  setImportError("")
                  setPreview([])
                  setActiveDisparo(null)
                  fetchDisparos()
                }}
              >
                Novo Disparo
              </Button>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Avançar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : step === 4 ? (
              <Button onClick={criarDisparo} disabled={loadingCreate}>
                {loadingCreate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Disparar ({effectiveLeads.length} leads)
              </Button>
            ) : null}
          </div>
        )}

        {/* ================================================================
            Disparos anteriores
        ================================================================ */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Disparos anteriores</h3>

          {loadingDisparos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : disparos.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Nenhum disparo realizado ainda</p>
          ) : (
            <div className="space-y-2">
              {disparos.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  onClick={() => {
                    setActiveDisparo(d)
                    setStep(5)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {TIPOS.find((t) => t.value === d.tipo)?.label || d.tipo}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          d.status === "concluido" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          d.status === "enviando" && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                          d.status === "falhou" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          d.status === "cancelado" && "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
                        )}
                      >
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{d.intencao}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {d.sent_count}/{d.total_leads}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(d.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
