"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useScore from "@/lib/hooks/useScore"
import { ScoreDisplay } from "./ScoreDisplay"
import { cn } from "@/lib/utils"
import {
  formatCPF,
  formatPhone,
  cleanPhone,
  getStatusColor,
  getInitials,
  formatDate,
  daysSince,
} from "@/utils/leadUtils"
import {
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
} from "lucide-react"
import { InfoCard } from "./InfoCard"

interface LeadDetailModalProps {
  lead: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onUpdate,
}: LeadDetailModalProps) {
  const { score, loading, error, consultarScore, limparScore } = useScore()
  const [scoreConsultado, setScoreConsultado] = useState(false)
  const [cpfInput, setCpfInput] = useState(() => lead?.cpf || "")
  const [isEditingCpf, setIsEditingCpf] = useState(false)
  const [showAllInteractions, setShowAllInteractions] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [prevLeadCpf, setPrevLeadCpf] = useState(lead?.cpf || "")
  const [savingCpf, setSavingCpf] = useState(false)

  // Sync cpfInput when lead changes (e.g., opening modal with different lead)
  const leadCpf = lead?.cpf || ""
  if (leadCpf !== prevLeadCpf) {
    setPrevLeadCpf(leadCpf)
    if (!isEditingCpf) {
      setCpfInput(leadCpf)
    }
  }

  const handleConsultarScore = async () => {
    const cpfToUse = cpfInput || lead?.cpf
    if (cpfToUse) {
      await consultarScore(cpfToUse)
      setScoreConsultado(true)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      limparScore()
      setScoreConsultado(false)
      setIsEditingCpf(false)
      setShowAllInteractions(false)
    }
    onOpenChange(newOpen)
  }

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
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
        // Trigger parent refresh if available
        onUpdate?.()
      } else {
        alert(data.error || 'Erro ao salvar CPF')
      }
    } catch (error) {
      console.error('Erro ao salvar CPF:', error)
      alert('Erro ao salvar CPF')
    } finally {
      setSavingCpf(false)
    }
  }

  const cpfFormatted = formatCPF(cpfInput || lead?.cpf)
  const hasCpf = !!(cpfInput || lead?.cpf)
  const interacoes = lead?.interacoes || lead?.interacao || []
  const visibleInteractions = showAllInteractions ? interacoes : interacoes.slice(0, 3)
  const lastInteraction = interacoes[0]
  const daysSinceInteraction = lastInteraction ? daysSince(lastInteraction.data || lastInteraction.data_cad) : null

  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 gap-0 overflow-hidden bg-gradient-to-b from-background to-muted/20 dark:from-zinc-950 dark:to-zinc-900/50"
        aria-labelledby="lead-modal-title"
        aria-describedby="lead-modal-description"
      >
        <span id="lead-modal-description" className="sr-only">
          Detalhes do lead {lead.nome || "sem nome"}, incluindo informacoes de contato, status e historico de interacoes
        </span>
        {/* Header Moderno */}
        <header className="relative overflow-hidden" role="banner">
          {/* Background com gradiente e padrão */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDBMNDAgNDBIMHoiLz48cGF0aCBkPSJNMCAwaDFMMSAxSDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9nPjwvc3ZnPg==')] opacity-50" />

          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-start gap-5">
              {/* Avatar com Indicador de Status */}
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-br from-primary/50 to-primary/20 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity" />

                {/* Avatar */}
                <div
                  className="relative h-[88px] w-[88px] rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-xl ring-2 ring-white/10"
                  role="img"
                  aria-label={`Avatar do lead ${lead.nome || "sem nome"}`}
                >
                  <span className="text-3xl font-bold text-white tracking-tight" aria-hidden="true">
                    {getInitials(lead.nome)}
                  </span>
                </div>

                {/* Status Indicator */}
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-[3px] border-slate-900 dark:border-zinc-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                    daysSinceInteraction !== null && daysSinceInteraction > 7
                      ? "bg-gradient-to-br from-amber-400 to-orange-500"
                      : "bg-gradient-to-br from-emerald-400 to-green-500"
                  )}
                  role="status"
                  aria-label={daysSinceInteraction !== null && daysSinceInteraction > 7 ? "Lead necessita atencao" : "Lead ativo"}
                >
                  {daysSinceInteraction !== null && daysSinceInteraction > 7 ? (
                    <AlertCircle className="h-4 w-4 text-white" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4 text-white" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Info Principal */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 id="lead-modal-title" className="text-2xl font-bold text-white tracking-tight truncate leading-tight">
                      {lead.nome || "Lead sem nome"}
                    </h2>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <p className="text-slate-300 text-sm">
                        <span className="sr-only">Corretor responsavel: </span>
                        {lead.corretor?.nome || lead.corretor_nome || lead.corretor || "Sem corretor atribuído"}
                      </p>
                    </div>
                  </div>

                  {/* Badge de Situacao */}
                  <Badge
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-lg border shadow-sm backdrop-blur-sm",
                      getStatusColor(lead.situacao)
                    )}
                    aria-label={`Status do lead: ${lead.situacao || "Novo"}`}
                  >
                    {lead.situacao || "Novo"}
                  </Badge>
                </div>

                {/* Indicador de ultima interacao */}
                {daysSinceInteraction !== null && (
                  <div className="flex items-center gap-2 mt-2" role="status" aria-live="polite">
                    <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    <span className={cn(
                      "text-xs font-medium",
                      daysSinceInteraction > 7 ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {daysSinceInteraction === 0
                        ? "Interagiu hoje"
                        : daysSinceInteraction === 1
                          ? "Interagiu ontem"
                          : `Ultima interacao ha ${daysSinceInteraction} dias`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions - Redesenhados */}
            <nav className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-white/10" aria-label="Acoes rapidas de contato">
              {(lead.telefone || lead.celular) && (
                <a
                  href={`https://wa.me/55${cleanPhone(lead.celular || lead.telefone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  aria-label={`Abrir conversa no WhatsApp com ${lead.nome || "este lead"}`}
                >
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  aria-label={`Enviar email para ${lead.email}`}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email
                </a>
              )}
              {(lead.telefone || lead.celular) && (
                <a
                  href={`tel:+55${cleanPhone(lead.telefone || lead.celular)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-400 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  aria-label={`Ligar para ${formatPhone(lead.telefone || lead.celular)}`}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Ligar
                </a>
              )}
            </nav>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 pt-4 space-y-6 max-h-[60vh] overflow-y-auto" role="main">
          {/* Cards de Info Grid */}
          <section aria-label="Informacoes de contato" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCard
              icon={Phone}
              label="Telefone"
              value={formatPhone(lead.telefone || lead.celular)}
              onCopy={() => handleCopy(lead.telefone || lead.celular, "phone")}
              copied={copied === "phone"}
              variant="elevated"
              iconColor="text-violet-500"
            />
            <InfoCard
              icon={Mail}
              label="Email"
              value={lead.email}
              onCopy={() => lead.email && handleCopy(lead.email, "email")}
              copied={copied === "email"}
              variant="elevated"
              iconColor="text-blue-500"
            />
            <InfoCard
              icon={Building2}
              label="Interesse"
              value={lead.empreendimento?.nome || lead.empreendimento_nome || lead.empreendimento}
              variant="elevated"
              iconColor="text-emerald-500"
            />
            <InfoCard
              icon={MapPin}
              label="Origem"
              value={lead.origem || lead.midia}
              variant="elevated"
              iconColor="text-amber-500"
            />
          </section>

          {/* CPF e Score Section */}
          <section aria-labelledby="credit-analysis-title" className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 id="credit-analysis-title" className="font-semibold text-sm">Analise de Credito</h3>
                    <p className="text-xs text-muted-foreground">Consulta de score Serasa</p>
                  </div>
                </div>
                {hasCpf && !isEditingCpf && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => setIsEditingCpf(true)}
                    aria-label="Editar numero do CPF"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Editar CPF
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4">
              {/* CPF Input/Display */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  {isEditingCpf || !hasCpf ? (
                    <div className="flex items-center gap-2" role="group" aria-label="Edicao de CPF">
                      <div className="relative flex-1">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <label htmlFor="cpf-input" className="sr-only">Numero do CPF</label>
                        <Input
                          id="cpf-input"
                          placeholder="Digite o CPF..."
                          value={cpfInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 11)
                            setCpfInput(value)
                          }}
                          className="pl-10 font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-describedby="cpf-hint"
                          inputMode="numeric"
                        />
                        <span id="cpf-hint" className="sr-only">Digite apenas os 11 numeros do CPF</span>
                      </div>
                      {isEditingCpf && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            onClick={handleSaveCpf}
                            disabled={savingCpf}
                            aria-label="Salvar CPF"
                          >
                            {savingCpf ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" aria-hidden="true" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            onClick={() => setIsEditingCpf(false)}
                            disabled={savingCpf}
                            aria-label="Cancelar edicao do CPF"
                          >
                            <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50" aria-label={`CPF: ${cpfFormatted}`}>
                      <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="font-mono font-medium">{cpfFormatted}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Score Button & Display */}
              {(hasCpf || cpfInput.length === 11) && (
                <div className="space-y-4">
                  {!scoreConsultado && (
                    <Button
                      onClick={handleConsultarScore}
                      disabled={loading || (!hasCpf && cpfInput.length !== 11)}
                      className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Consultar score de credito no Serasa"
                      aria-busy={loading}
                    >
                      {loading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                          <span>Consultando...</span>
                          <span className="sr-only">Aguarde, consultando score</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" aria-hidden="true" />
                          Consultar Score
                        </>
                      )}
                    </Button>
                  )}

                  {error && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                      role="alert"
                      aria-live="assertive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {error}
                    </div>
                  )}

                  {scoreConsultado && score && (
                    <div className="pt-2">
                      <ScoreDisplay
                        score={score.score}
                        faixa={score.risco}
                        probabilidade={score.probabilidade}
                      />
                    </div>
                  )}
                </div>
              )}

              {!hasCpf && cpfInput.length !== 11 && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm"
                  role="status"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Adicione o CPF para consultar o score de credito
                </div>
              )}
            </div>
          </section>

          {/* Historico de Interacoes */}
          <section
            aria-labelledby="history-section-title"
            className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-4 border-b border-border/40 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 id="history-section-title" className="font-semibold text-sm">Historico</h3>
                    <p className="text-xs text-muted-foreground">
                      {interacoes.length > 0
                        ? `${interacoes.length} interacao(oes)`
                        : "Nenhuma interacao"}
                    </p>
                  </div>
                </div>
                {daysSinceInteraction !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      daysSinceInteraction > 7 ? "border-amber-300 text-amber-600" : "border-emerald-300 text-emerald-600"
                    )}
                    aria-label={`Ultima interacao: ${daysSinceInteraction === 0 ? "Hoje" : `${daysSinceInteraction} dias atras`}`}
                  >
                    {daysSinceInteraction === 0 ? "Hoje" : `${daysSinceInteraction} dias atras`}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-4">
              {interacoes.length > 0 ? (
                <ol className="space-y-3" aria-label="Lista de interacoes" id="interactions-list">
                  {visibleInteractions.map((interacao: any, index: number) => (
                    <li
                      key={interacao.id || index}
                      className="relative flex gap-3 pb-3 last:pb-0"
                    >
                      {/* Timeline */}
                      {index < visibleInteractions.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" aria-hidden="true" />
                      )}

                      <div
                        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border-2 border-background"
                        aria-hidden="true"
                      >
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>

                      <article className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {interacao.tipo || "Interacao"}
                          </span>
                          {(interacao.data_cad || interacao.data) && (
                            <time
                              className="text-xs text-muted-foreground"
                              dateTime={interacao.data_cad || interacao.data}
                            >
                              {formatDate(interacao.data_cad || interacao.data)}
                            </time>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {interacao.descricao || interacao.observacao || "Sem descricao"}
                        </p>
                      </article>
                    </li>
                  ))}

                  {interacoes.length > 3 && (
                    <li>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs mt-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() => setShowAllInteractions(!showAllInteractions)}
                        aria-expanded={showAllInteractions}
                        aria-controls="interactions-list"
                      >
                        {showAllInteractions ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" aria-hidden="true" />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" aria-hidden="true" />
                            Ver mais {interacoes.length - 3} interacoes
                          </>
                        )}
                      </Button>
                    </li>
                  )}
                </ol>
              ) : (
                <div className="text-center py-8 text-muted-foreground" role="status">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" aria-hidden="true" />
                  <p className="text-sm">Nenhuma interacao registrada</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </DialogContent>
    </Dialog>
  )
}
