"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  User,
  Phone,
  MessageSquare,
  Sparkles,
  Users,
  RefreshCw,
  Globe,
  MoreHorizontal,
  Check,
  Loader2,
  Search,
  Clock,
  UserCircle,
  ClipboardList,
  Plus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
interface Corretor {
  id: string
  nome: string
  telefone: string
  avatar_url?: string
}

interface Lead {
  id: string
  nome: string
  whatsapp: string
  corretor_id?: string
  corretor_nome?: string
  tipo_visita: string
  fonte: string
  observacoes?: string
  created_at: string
}

interface Stats {
  total: number
  primeira_vez: number
  indicacao: number
  retorno: number
}

// ────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────
const TIPOS_VISITA = [
  { value: "primeira_vez", label: "1a Vez", icon: Sparkles, color: "emerald", description: "Primeiro contato do cliente" },
  { value: "indicacao", label: "Indicacao", icon: Users, color: "blue", description: "Veio por indicacao" },
  { value: "retorno", label: "Retorno", icon: RefreshCw, color: "amber", description: "Cliente retornando" },
] as const

const FONTES = [
  { value: "presencial", label: "Presencial", icon: UserCircle, color: "emerald" },
  { value: "telefone", label: "Telefone", icon: Phone, color: "blue" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "green" },
  { value: "instagram", label: "Instagram", icon: () => <span className="text-xs font-bold">IG</span>, color: "pink" },
  { value: "facebook", label: "Facebook", icon: () => <span className="text-xs font-bold">f</span>, color: "indigo" },
  { value: "site", label: "Site", icon: Globe, color: "violet" },
  { value: "indicacao", label: "Indicacao", icon: Users, color: "amber" },
  { value: "outros", label: "Outros", icon: MoreHorizontal, color: "zinc" },
] as const

type TipoVisita = typeof TIPOS_VISITA[number]["value"]
type Fonte = typeof FONTES[number]["value"]

const colorMap: Record<string, { bg: string; text: string; border: string; bgActive: string; textActive: string }> = {
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", bgActive: "bg-emerald-500", textActive: "text-white" },
  blue: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", bgActive: "bg-blue-500", textActive: "text-white" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", bgActive: "bg-amber-500", textActive: "text-white" },
  green: { bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800", bgActive: "bg-green-500", textActive: "text-white" },
  pink: { bg: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800", bgActive: "bg-pink-500", textActive: "text-white" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800", bgActive: "bg-indigo-500", textActive: "text-white" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800", bgActive: "bg-violet-500", textActive: "text-white" },
  zinc: { bg: "bg-zinc-50 dark:bg-zinc-800/40", text: "text-zinc-700 dark:text-zinc-300", border: "border-zinc-200 dark:border-zinc-700", bgActive: "bg-zinc-500", textActive: "text-white" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", bgActive: "bg-purple-500", textActive: "text-white" },
}

// ────────────────────────────────────────────────────────
// Phone Formatter
// ────────────────────────────────────────────────────────
function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "")
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// ────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────
export default function RecepcionistaPage() {
  // Form state
  const [nome, setNome] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [tipoVisita, setTipoVisita] = useState<TipoVisita | null>(null)
  const [fonte, setFonte] = useState<Fonte>("presencial")
  const [corretorId, setCorretorId] = useState<string | null>(null)
  const [corretorNome, setCorretorNome] = useState<string>("")
  const [observacoes, setObservacoes] = useState("")
  const [openCorretorCombobox, setOpenCorretorCombobox] = useState(false)

  // Data state
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, primeira_vez: 0, indicacao: 0, retorno: 0 })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ nome: string; corretor?: string } | null>(null)
  const [loadingCorretores, setLoadingCorretores] = useState(false)

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  // Fetch corretores
  useEffect(() => {
    setLoadingCorretores(true)
    fetch("/api/recepcionista/corretores")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCorretores(data.data)
      })
      .catch(console.error)
      .finally(() => setLoadingCorretores(false))
  }, [])

  // Fetch leads + stats
  const fetchLeads = useCallback(() => {
    fetch("/api/recepcionista/leads")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLeads(data.data)
          setStats(data.stats)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Reset form
  const resetForm = () => {
    setNome("")
    setWhatsapp("")
    setTipoVisita(null)
    setFonte("presencial")
    setCorretorId(null)
    setCorretorNome("")
    setObservacoes("")
  }

  // Submit
  const handleSubmit = async () => {
    if (!nome.trim() || !whatsapp.trim() || !tipoVisita) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/recepcionista/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          tipo_visita: tipoVisita,
          corretor_id: corretorId || undefined,
          fonte,
          observacoes: observacoes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccessData({ nome: nome.trim(), corretor: corretorNome || undefined })
        setShowSuccess(true)
        resetForm()
        fetchLeads()
      }
    } catch (error) {
      console.error("Erro ao cadastrar lead:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = nome.trim().length >= 2 && whatsapp.replace(/\D/g, "").length >= 10 && tipoVisita

  // ──── Success Animation ────
  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30"
          >
            <Check className="h-12 w-12 text-white" strokeWidth={3} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2"
          >
            Lead cadastrado!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-zinc-500 dark:text-zinc-400 mb-1"
          >
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">{successData?.nome}</span>
          </motion.p>

          {successData?.corretor && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-zinc-400 dark:text-zinc-500 mb-8"
            >
              Corretor: <span className="font-medium text-zinc-600 dark:text-zinc-300">{successData.corretor}</span>
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              size="lg"
              onClick={() => setShowSuccess(false)}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 px-8 h-12"
            >
              <Plus className="h-5 w-5" />
              Cadastrar outro lead
            </Button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // ──── Main Render ────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Cadastro de Leads</h1>
              <p className="text-emerald-100 text-sm mt-0.5 capitalize">{today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Total Hoje</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">1a Vez</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.primeira_vez}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Indicacao</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.indicacao}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Retorno</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{stats.retorno}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-5 sm:p-7 shadow-sm space-y-6">
        {/* Nome */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Nome do cliente <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              className="h-12 pl-11 text-base"
            />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            WhatsApp <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              type="tel"
              className="h-12 pl-11 text-base"
            />
          </div>
        </div>

        {/* Tipo de Visita */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Tipo de visita <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {TIPOS_VISITA.map((tipo) => {
              const isSelected = tipoVisita === tipo.value
              const colors = colorMap[tipo.color]
              return (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => setTipoVisita(tipo.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150",
                    isSelected
                      ? `${colors.bgActive} ${colors.textActive} border-transparent shadow-lg`
                      : `${colors.bg} ${colors.text} ${colors.border} hover:border-opacity-80 hover:shadow-sm`
                  )}
                >
                  <tipo.icon className="h-6 w-6" />
                  <span className="text-sm font-semibold">{tipo.label}</span>
                  <span className={cn(
                    "text-[10px] leading-tight text-center",
                    isSelected ? "text-white/80" : "opacity-60"
                  )}>
                    {tipo.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Corretor */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Corretor <span className="text-zinc-400 font-normal">(opcional)</span>
          </Label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Tem algum corretor que deseja falar?</p>
          <Popover open={openCorretorCombobox} onOpenChange={setOpenCorretorCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCorretorCombobox}
                className="w-full justify-between h-12"
                disabled={loadingCorretores}
              >
                {loadingCorretores ? (
                  <span className="flex items-center gap-2 text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </span>
                ) : corretorId ? (
                  <span className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {corretorNome.substring(0, 2).toUpperCase()}
                    </div>
                    {corretorNome}
                  </span>
                ) : (
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Buscar corretor...
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar corretor..." />
                <CommandList>
                  <CommandEmpty>Nenhum corretor encontrado.</CommandEmpty>
                  <CommandGroup>
                    {/* Option to clear */}
                    {corretorId && (
                      <CommandItem
                        value="__limpar__"
                        onSelect={() => {
                          setCorretorId(null)
                          setCorretorNome("")
                          setOpenCorretorCombobox(false)
                        }}
                        className="text-zinc-400"
                      >
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Nenhum (remover)
                      </CommandItem>
                    )}
                    {corretores.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.nome}
                        onSelect={() => {
                          setCorretorId(c.id)
                          setCorretorNome(c.nome)
                          setOpenCorretorCombobox(false)
                        }}
                        className="flex items-center gap-2"
                      >
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                          {c.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{c.nome}</p>
                        </div>
                        {corretorId === c.id && <Check className="h-4 w-4 text-emerald-500" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Fonte */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">De onde veio?</Label>
          <div className="flex flex-wrap gap-2">
            {FONTES.map((f) => {
              const isSelected = fonte === f.value
              const colors = colorMap[f.color]
              const Icon = f.icon
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFonte(f.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full border transition-all text-sm font-medium",
                    isSelected
                      ? `${colors.bgActive} ${colors.textActive} border-transparent shadow-md`
                      : `${colors.bg} ${colors.text} ${colors.border} hover:shadow-sm`
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Observacoes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Observacoes <span className="text-zinc-400 font-normal">(opcional)</span>
          </Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Alguma observacao sobre o cliente..."
            className="min-h-[80px] resize-y"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Cadastrando...
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Cadastrar Lead
            </>
          )}
        </Button>
      </div>

      {/* Recent Leads */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            Leads de hoje
            {leads.length > 0 && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {leads.length}
              </span>
            )}
          </h2>
        </div>

        {leads.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <ClipboardList className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Nenhum lead cadastrado hoje</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Os leads aparecerao aqui conforme forem cadastrados</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {leads.map((lead) => {
              const tipoInfo = TIPOS_VISITA.find((t) => t.value === lead.tipo_visita)
              const fonteInfo = FONTES.find((f) => f.value === lead.fonte)
              const tipoColors = tipoInfo ? colorMap[tipoInfo.color] : colorMap.zinc
              const fonteColors = fonteInfo ? colorMap[fonteInfo.color] : colorMap.zinc

              return (
                <div key={lead.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center text-sm font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                    {lead.nome.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{lead.nome}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{lead.whatsapp}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      tipoColors.bg, tipoColors.text
                    )}>
                      {tipoInfo?.label || lead.tipo_visita}
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      fonteColors.bg, fonteColors.text
                    )}>
                      {fonteInfo?.label || lead.fonte}
                    </span>
                  </div>

                  {/* Corretor + Time */}
                  <div className="text-right shrink-0 hidden sm:block">
                    {lead.corretor_nome && (
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[120px]">{lead.corretor_nome}</p>
                    )}
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{formatTime(lead.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
