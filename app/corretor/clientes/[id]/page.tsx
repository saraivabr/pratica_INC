"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AnimatedBackground } from "@/components/animated-background"
import useScore from "@/lib/hooks/useScore"
import { ScoreDisplay } from "@/components/lead/ScoreDisplay"
import {
  formatCPF,
  formatPhone,
  cleanPhone,
  getStatusColor,
  getInitials,
  formatDate,
  daysSince,
  formatPhoneForWhatsApp,
} from "@/utils/leadUtils"
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  FileText,
  Search,
  MapPin,
  Calendar,
  MessageSquare,
  Clock,
  Edit3,
  Check,
  X,
  ExternalLink,
  Copy,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Briefcase,
  Tag,
  RefreshCcw,
  Home,
  Globe,
} from "lucide-react"

interface Lead {
  id: number
  idlead: number
  nome: string
  email: string
  telefone: string
  celular?: string
  cpf?: string
  data_cadastro?: string
  origem?: string
  midia?: string
  corretor?: { id?: number; nome?: string; telefone?: string }
  corretor_nome?: string
  imobiliaria?: { id?: number; nome?: string }
  imobiliaria_nome?: string
  situacao?: string
  situacao_id?: number
  empreendimento?: { id?: number; nome?: string }
  empreendimento_nome?: string
  score?: number
  valor_negocio?: number
  renda_familiar?: number
  cidade?: string
  estado?: string
  bairro?: string
  cep?: string
  endereco?: string
  tags?: string[]
  ultima_conversao?: string
  interacoes?: Array<{
    id: number
    tipo?: string
    descricao?: string
    data_cad?: string
    usuario?: string
  }>
}

// Info Card Component
function InfoCard({
  icon: Icon,
  label,
  value,
  iconColor = "text-muted-foreground",
  onCopy,
  className,
}: {
  icon: React.ElementType
  label: string
  value?: string | null
  iconColor?: string
  onCopy?: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (value && onCopy) {
      navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn(
      "group relative p-4 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-lg",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40 group-hover:from-primary/10 group-hover:to-primary/5 transition-colors",
        )}>
          <Icon className={cn("h-5 w-5 transition-colors group-hover:text-primary", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className={cn(
            "font-semibold truncate",
            value ? "text-foreground" : "text-muted-foreground/50 italic"
          )}>
            {value || "Não informado"}
          </p>
        </div>
        {value && onCopy && (
          <button
            onClick={handleCopy}
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all",
              "bg-muted/50 hover:bg-muted",
              copied && "opacity-100 bg-emerald-100 dark:bg-emerald-900/30"
            )}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Section Component
function Section({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("corretor-cliente-detail")

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllInteractions, setShowAllInteractions] = useState(false)

  // CPF & Score
  const { score, loading: scoreLoading, error: scoreError, consultarScore, limparScore } = useScore()
  const [scoreConsultado, setScoreConsultado] = useState(false)
  const [cpfInput, setCpfInput] = useState("")
  const [isEditingCpf, setIsEditingCpf] = useState(false)
  const [savingCpf, setSavingCpf] = useState(false)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch lead data
  useEffect(() => {
    const fetchLead = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/leads/${resolvedParams.id}`)
        const data = await res.json()
        if (data.error) {
          setError(data.error)
        } else {
          setLead(data.data)
          setCpfInput(data.data?.cpf || "")
        }
      } catch (err) {
        console.error("Erro ao buscar lead:", err)
        setError("Erro ao carregar dados do cliente")
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && resolvedParams.id) {
      fetchLead()
    }
  }, [isAuthenticated, resolvedParams.id])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${resolvedParams.id}`)
      const data = await res.json()
      if (!data.error) {
        setLead(data.data)
        setCpfInput(data.data?.cpf || "")
      }
    } catch (err) {
      console.error("Erro ao atualizar:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleConsultarScore = async () => {
    const cpfToUse = cpfInput || lead?.cpf
    if (cpfToUse) {
      await consultarScore(cpfToUse)
      setScoreConsultado(true)
    }
  }

  const handleSaveCpf = async () => {
    if (!cpfInput || !lead?.idlead) {
      setIsEditingCpf(false)
      return
    }

    setSavingCpf(true)
    try {
      const response = await fetch(`/api/leads/${lead.idlead}/cpf`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfInput }),
      })

      const data = await response.json()

      if (data.success) {
        setIsEditingCpf(false)
        handleRefresh()
      } else {
        toast.error(data.error || 'Erro ao salvar CPF')
      }
    } catch (error) {
      console.error('Erro ao salvar CPF:', error)
      toast.error('Erro ao salvar CPF')
    } finally {
      setSavingCpf(false)
    }
  }

  // Computed values
  const interacoes = lead?.interacoes || []
  const visibleInteractions = showAllInteractions ? interacoes : interacoes.slice(0, 5)
  const lastInteraction = interacoes[0]
  const daysSinceInteraction = lastInteraction ? daysSince(lastInteraction.data_cad) : null
  const hasCpf = !!(cpfInput || lead?.cpf)
  const cpfFormatted = formatCPF(cpfInput || lead?.cpf || "")

  const telefone = lead?.telefone || lead?.celular || ""
  const telefoneLimpo = cleanPhone(telefone)
  const whatsappPhone = telefoneLimpo.startsWith("55") && telefoneLimpo.length > 11
    ? telefoneLimpo
    : formatPhoneForWhatsApp(telefone)

  if (authLoading || loading) {
    return (
      <AppShell title="Carregando...">
        <div className="relative min-h-full">
          <AnimatedBackground />
          <div className="relative z-10 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-48" />
            </div>

            {/* Hero Skeleton */}
            <div className="rounded-3xl border bg-card/50 p-8">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-2xl" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-40" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !lead) {
    return (
      <AppShell title="Erro">
        <div className="relative min-h-full">
          <AnimatedBackground />
          <div className="relative z-10 flex flex-col items-center justify-center py-20">
            <AlertCircle className="h-16 w-16 text-red-500/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cliente nao encontrado</h2>
            <p className="text-muted-foreground mb-6">{error || "O cliente solicitado nao existe ou voce nao tem permissao para ve-lo."}</p>
            <Button asChild variant="outline">
              <Link href="/corretor/clientes">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para clientes
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={lead.nome || "Detalhes do Cliente"}>
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp pb-8">
          {/* Top Navigation */}
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/corretor/clientes">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={loading}>
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>

          {/* Hero Card */}
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />

            {/* Status Bar */}
            <div className={cn(
              "h-1.5 w-full",
              daysSinceInteraction !== null && daysSinceInteraction > 7
                ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"
                : "bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400"
            )} />

            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-2xl ring-4 ring-background">
                    <span className="text-4xl md:text-5xl font-bold text-white">
                      {getInitials(lead.nome)}
                    </span>
                  </div>
                  {/* Status Indicator */}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center shadow-lg",
                    daysSinceInteraction !== null && daysSinceInteraction > 7
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-emerald-400 to-green-500"
                  )}>
                    {daysSinceInteraction !== null && daysSinceInteraction > 7 ? (
                      <AlertCircle className="h-4 w-4 text-white" />
                    ) : (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div>
                    <div className="flex flex-wrap items-start gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lead.nome}</h1>
                      <Badge className={cn("text-xs font-semibold px-3 py-1 rounded-lg", getStatusColor(lead.situacao))}>
                        {lead.situacao || "Novo"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      {lead.corretor_nome && (
                        <span className="flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          {lead.corretor_nome}
                        </span>
                      )}
                      {daysSinceInteraction !== null && (
                        <span className={cn(
                          "flex items-center gap-1.5",
                          daysSinceInteraction > 7 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          <Clock className="h-4 w-4" />
                          {daysSinceInteraction === 0
                            ? "Interagiu hoje"
                            : daysSinceInteraction === 1
                              ? "Interagiu ontem"
                              : `Ha ${daysSinceInteraction} dias`}
                        </span>
                      )}
                      {lead.data_cadastro && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          Cadastro: {formatDate(lead.data_cadastro)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {telefone && (
                      <Button asChild size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25">
                        <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer">
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    {telefone && (
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <a href={`tel:+55${telefoneLimpo}`}>
                          <Phone className="h-4 w-4" />
                          Ligar
                        </a>
                      </Button>
                    )}
                    {lead.email && (
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <a href={`mailto:${lead.email}`}>
                          <Mail className="h-4 w-4" />
                          Email
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <Section title="Informacoes de Contato" icon={Phone}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoCard
                    icon={Phone}
                    label="Telefone"
                    value={formatPhone(telefone)}
                    iconColor="text-violet-500"
                    onCopy={() => navigator.clipboard.writeText(telefone)}
                  />
                  <InfoCard
                    icon={Mail}
                    label="Email"
                    value={lead.email}
                    iconColor="text-blue-500"
                    onCopy={() => lead.email && navigator.clipboard.writeText(lead.email)}
                  />
                  <InfoCard
                    icon={FileText}
                    label="CPF"
                    value={cpfFormatted || undefined}
                    iconColor="text-slate-500"
                  />
                  <InfoCard
                    icon={Calendar}
                    label="Data de Cadastro"
                    value={lead.data_cadastro ? formatDate(lead.data_cadastro) : undefined}
                    iconColor="text-pink-500"
                  />
                </div>
              </Section>

              {/* Location Info */}
              <Section title="Localizacao" icon={MapPin}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoCard
                    icon={MapPin}
                    label="Cidade/Estado"
                    value={[lead.cidade, lead.estado].filter(Boolean).join(" - ") || undefined}
                    iconColor="text-rose-500"
                  />
                  <InfoCard
                    icon={Home}
                    label="Bairro"
                    value={lead.bairro}
                    iconColor="text-orange-500"
                  />
                  <InfoCard
                    icon={Globe}
                    label="CEP"
                    value={lead.cep}
                    iconColor="text-cyan-500"
                  />
                  <InfoCard
                    icon={Building2}
                    label="Endereco"
                    value={lead.endereco}
                    iconColor="text-indigo-500"
                  />
                </div>
              </Section>

              {/* Business Info */}
              <Section title="Informacoes Comerciais" icon={Briefcase}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoCard
                    icon={Building2}
                    label="Interesse"
                    value={lead.empreendimento_nome || lead.empreendimento?.nome}
                    iconColor="text-emerald-500"
                  />
                  <InfoCard
                    icon={Sparkles}
                    label="Origem"
                    value={lead.origem || lead.midia}
                    iconColor="text-amber-500"
                  />
                  <InfoCard
                    icon={DollarSign}
                    label="Valor do Negocio"
                    value={lead.valor_negocio ? `R$ ${lead.valor_negocio.toLocaleString('pt-BR')}` : undefined}
                    iconColor="text-green-500"
                  />
                  <InfoCard
                    icon={DollarSign}
                    label="Renda Familiar"
                    value={lead.renda_familiar ? `R$ ${lead.renda_familiar.toLocaleString('pt-BR')}` : undefined}
                    iconColor="text-teal-500"
                  />
                  <InfoCard
                    icon={Briefcase}
                    label="Imobiliaria"
                    value={lead.imobiliaria_nome || lead.imobiliaria?.nome}
                    iconColor="text-purple-500"
                  />
                  <InfoCard
                    icon={User}
                    label="Corretor"
                    value={lead.corretor_nome || lead.corretor?.nome}
                    iconColor="text-blue-500"
                  />
                </div>

                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                  <div className="pt-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            </div>

            {/* Right Column - Score & History */}
            <div className="space-y-6">
              {/* Credit Score */}
              <Section title="Analise de Credito" icon={TrendingUp}>
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <div className="p-4 border-b border-border/40 bg-muted/30">
                    <p className="text-xs text-muted-foreground">Consulta de score Serasa</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* CPF Input */}
                    {isEditingCpf || !hasCpf ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Digite o CPF..."
                            value={cpfInput}
                            onChange={(e) => setCpfInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                            className="pl-10 font-mono"
                          />
                        </div>
                        {isEditingCpf && (
                          <>
                            <Button size="icon" variant="ghost" onClick={handleSaveCpf} disabled={savingCpf}>
                              {savingCpf ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                              ) : (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setIsEditingCpf(false)} disabled={savingCpf}>
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-medium">{cpfFormatted}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => setIsEditingCpf(true)}>
                          <Edit3 className="h-3 w-3" />
                          Editar
                        </Button>
                      </div>
                    )}

                    {/* Score Button & Display */}
                    {(hasCpf || cpfInput.length === 11) && (
                      <div className="space-y-4">
                        {!scoreConsultado && (
                          <Button
                            onClick={handleConsultarScore}
                            disabled={scoreLoading || (!hasCpf && cpfInput.length !== 11)}
                            className="w-full gap-2"
                          >
                            {scoreLoading ? (
                              <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Consultando...
                              </>
                            ) : (
                              <>
                                <Search className="h-4 w-4" />
                                Consultar Score
                              </>
                            )}
                          </Button>
                        )}

                        {scoreError && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {scoreError}
                          </div>
                        )}

                        {scoreConsultado && score && (
                          <ScoreDisplay
                            score={score.score}
                            faixa={score.risco}
                            probabilidade={score.probabilidade}
                          />
                        )}
                      </div>
                    )}

                    {!hasCpf && cpfInput.length !== 11 && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Adicione o CPF para consultar o score
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              {/* Interaction History */}
              <Section
                title="Historico"
                icon={Clock}
                action={
                  daysSinceInteraction !== null && (
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      daysSinceInteraction > 7 ? "border-amber-300 text-amber-600" : "border-emerald-300 text-emerald-600"
                    )}>
                      {daysSinceInteraction === 0 ? "Hoje" : `${daysSinceInteraction} dias`}
                    </Badge>
                  )
                }
              >
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <div className="p-4 border-b border-border/40 bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      {interacoes.length > 0 ? `${interacoes.length} interacao(oes)` : "Nenhuma interacao"}
                    </p>
                  </div>
                  <div className="p-4">
                    {interacoes.length > 0 ? (
                      <div className="space-y-3">
                        {visibleInteractions.map((interacao, index) => (
                          <div key={interacao.id || index} className="relative flex gap-3 pb-3 last:pb-0">
                            {index < visibleInteractions.length - 1 && (
                              <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                            )}
                            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border-2 border-background">
                              <MessageSquare className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{interacao.tipo || "Interacao"}</span>
                                {interacao.data_cad && (
                                  <span className="text-xs text-muted-foreground">{formatDate(interacao.data_cad)}</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {interacao.descricao || "Sem descricao"}
                              </p>
                              {interacao.usuario && (
                                <p className="text-xs text-muted-foreground/70 mt-1">por {interacao.usuario}</p>
                              )}
                            </div>
                          </div>
                        ))}

                        {interacoes.length > 5 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs mt-2"
                            onClick={() => setShowAllInteractions(!showAllInteractions)}
                          >
                            {showAllInteractions ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Ver menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Ver mais {interacoes.length - 5} interacoes
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nenhuma interacao registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
