"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
  MessageSquare,
  Clock,
  Edit3,
  Check,
  X,
  AlertCircle,
  Flame,
  Snowflake,
  Sun,
  Loader2,
  Copy,
  Calendar,
  DollarSign,
  FileCheck,
  BookmarkCheck,
  TrendingUp,
  Home,
  CreditCard,
  FolderOpen,
  BadgeCheck,
  Sparkles,
  Target,
  Lightbulb,
  Shield,
  ChevronRight,
  Send,
  Zap,
  Brain,
} from "lucide-react"

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
  const { score, loading: scoreLoading, error: scoreError, consultarScore, limparScore } = useScore()
  const [fullLead, setFullLead] = useState<any>(null)
  const [loadingLead, setLoadingLead] = useState(false)
  const [scoreConsultado, setScoreConsultado] = useState(false)
  const [cpfInput, setCpfInput] = useState("")
  const [isEditingCpf, setIsEditingCpf] = useState(false)
  const [savingCpf, setSavingCpf] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("resumo")
  const [abordagem, setAbordagem] = useState<any>(null)
  const [loadingAbordagem, setLoadingAbordagem] = useState(false)
  const [abordagemError, setAbordagemError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, string>>({})
  const [savingFields, setSavingFields] = useState(false)

  const fetchFullLead = useCallback(async (leadId: string | number) => {
    setLoadingLead(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (res.ok) {
        const data = await res.json()
        const leadData = data.data || data
        setFullLead(leadData)
        setCpfInput(leadData.cpf || "")
      }
    } catch (err) {
      console.error("Error fetching lead:", err)
    }
    setLoadingLead(false)
  }, [])

  useEffect(() => {
    if (open && lead) {
      const id = lead.idlead || lead.id
      if (id) fetchFullLead(id)
      else {
        setFullLead(lead)
        setCpfInput(lead.cpf || "")
      }
    }
  }, [open, lead, fetchFullLead])

  const fetchAbordagem = useCallback(async (leadId: string | number) => {
    setLoadingAbordagem(true)
    setAbordagemError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/abordagem`)
      if (!res.ok) throw new Error("Erro ao gerar abordagem")
      const json = await res.json()
      setAbordagem(json.data)
    } catch (err) {
      setAbordagemError(err instanceof Error ? err.message : "Erro desconhecido")
    }
    setLoadingAbordagem(false)
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      limparScore()
      setScoreConsultado(false)
      setIsEditingCpf(false)
      setFullLead(null)
      setActiveTab("resumo")
      setAbordagem(null)
      setAbordagemError(null)
      setIsEditing(false)
      setEditData({})
    }
    onOpenChange(newOpen)
  }

  const startEditing = () => {
    setEditData({
      nome: data?.nome || "",
      email: data?.email || "",
      telefone: data?.telefone || data?.celular || "",
      cidade: data?.cidade || "",
      estado: data?.estado || "",
      origem: data?.origem || data?.midia || "",
      valor_negocio: data?.valor_negocio ? String(data.valor_negocio) : "",
      renda_familiar: data?.renda_familiar ? String(data.renda_familiar) : "",
      observacao: data?.observacao || "",
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditData({})
  }

  const saveEditing = async () => {
    const id = data?.idlead || data?.id || lead?.id
    if (!id) return
    setSavingFields(true)
    try {
      const payload: Record<string, any> = {}
      for (const [key, value] of Object.entries(editData)) {
        const original = key === "telefone"
          ? (data?.telefone || data?.celular || "")
          : key === "origem"
          ? (data?.origem || data?.midia || "")
          : data?.[key]
        const originalStr = original ? String(original) : ""
        if (value !== originalStr) {
          payload[key] = value
        }
      }
      if (Object.keys(payload).length === 0) {
        setIsEditing(false)
        return
      }
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setIsEditing(false)
        fetchFullLead(id)
        onUpdate?.()
      }
    } catch (err) {
      console.error("Error saving lead:", err)
    }
    setSavingFields(false)
  }

  const handleCopy = (text: string, type: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConsultarScore = async () => {
    const cpfToUse = cpfInput || data?.cpf
    if (cpfToUse) {
      await consultarScore(cpfToUse)
      setScoreConsultado(true)
    }
  }

  const handleSaveCpf = async () => {
    if (!cpfInput || !data?.idlead) {
      setIsEditingCpf(false)
      return
    }
    setSavingCpf(true)
    try {
      const response = await fetch(`/api/leads/${data.idlead}/cpf`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: cpfInput }),
      })
      const result = await response.json()
      if (result.success) {
        setIsEditingCpf(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error("Erro ao salvar CPF:", error)
    } finally {
      setSavingCpf(false)
    }
  }

  if (!lead) return null

  const data = fullLead || lead
  const interacoes = data?.interacoes || data?.interacao || []
  const lastInteraction = interacoes[0]
  const daysSinceInteraction = lastInteraction
    ? daysSince(lastInteraction.data || lastInteraction.data_cad)
    : null

  const temperature =
    daysSinceInteraction === null
      ? null
      : daysSinceInteraction <= 3
      ? "hot"
      : daysSinceInteraction <= 7
      ? "warm"
      : "cold"

  const tempMap = {
    hot: { icon: Flame, color: "text-orange-500", label: "Quente" },
    warm: { icon: Sun, color: "text-amber-500", label: "Morno" },
    cold: { icon: Snowflake, color: "text-blue-400", label: "Frio" },
  }

  const temp = temperature ? tempMap[temperature] : null
  const TempIcon = temp?.icon
  const hasCpf = !!(cpfInput || data?.cpf)
  const phoneRaw = data?.telefone || data?.celular || data?.phone || ""
  const phoneCleaned = cleanPhone(phoneRaw)
  const corretorNome = data?.corretor_nome || (typeof data?.corretor === "object" ? data?.corretor?.nome : data?.corretor) || ""
  const empreendimentoNome = data?.empreendimento_nome || (typeof data?.empreendimento === "object" ? data?.empreendimento?.nome : data?.empreendimento) || ""

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetDescription className="sr-only">
          Detalhes do lead {data?.nome || "sem nome"}
        </SheetDescription>

        {/* ───── Header ───── */}
        <header className="shrink-0 border-b border-border/50 bg-muted/20 dark:bg-muted/10">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-base font-bold text-primary">
                    {getInitials(data?.nome || lead?.name)}
                  </span>
                </div>
                {daysSinceInteraction !== null && (
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center",
                      daysSinceInteraction > 7 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                  >
                    {daysSinceInteraction > 7 ? (
                      <AlertCircle className="h-2.5 w-2.5 text-white" />
                    ) : (
                      <Check className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <SheetTitle className="text-lg font-bold truncate leading-tight">
                  {data?.nome || lead?.name || "Lead sem nome"}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {corretorNome && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {corretorNome}
                    </span>
                  )}
                  {temp && TempIcon && (
                    <span className={cn("text-[11px] font-medium flex items-center gap-0.5", temp.color)}>
                      <TempIcon className="h-3 w-3" />
                      {temp.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {daysSinceInteraction !== null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-5 font-medium",
                    daysSinceInteraction > 7
                      ? "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                      : "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                  )}
                >
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {daysSinceInteraction === 0
                    ? "Hoje"
                    : daysSinceInteraction === 1
                    ? "Ontem"
                    : `${daysSinceInteraction}d atras`}
                </Badge>
              )}
              {data?.situacao && (
                <Badge className={cn("text-[10px] h-5 font-semibold rounded-md border", getStatusColor(data.situacao))}>
                  {data.situacao}
                </Badge>
              )}
              {data?.score > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 font-semibold">
                  Score: {data.score}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 px-5 pb-3">
            {phoneCleaned && (
              <a
                href={`https://wa.me/55${phoneCleaned}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                WhatsApp
              </a>
            )}
            {phoneCleaned && (
              <a
                href={`tel:+55${phoneCleaned}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[11px] font-medium transition-colors"
              >
                <Phone className="h-3 w-3" />
                Ligar
              </a>
            )}
            {data?.email && (
              <a
                href={`mailto:${data.email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium transition-colors"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            )}
          </div>
        </header>

        {/* ───── Tabs ───── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 grid w-full grid-cols-5 rounded-none border-b bg-transparent h-10 p-0">
            <TabsTrigger
              value="resumo"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Resumo
            </TabsTrigger>
            <TabsTrigger
              value="abordagem"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full gap-1"
            >
              <Sparkles className="h-3 w-3" />
              IA
            </TabsTrigger>
            <TabsTrigger
              value="jornada"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Jornada
            </TabsTrigger>
            <TabsTrigger
              value="atividade"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Atividade
              {interacoes.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">
                  {interacoes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="credito"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs h-full"
            >
              Credito
            </TabsTrigger>
          </TabsList>

          {loadingLead ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* === TAB: Resumo === */}
              <TabsContent value="resumo" className="flex-1 overflow-y-auto mt-0 p-5 space-y-4">
                {/* Edit toggle */}
                <div className="flex items-center justify-end">
                  {!isEditing ? (
                    <button
                      onClick={startEditing}
                      className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Editar informacoes
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cancelEditing}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={saveEditing} disabled={savingFields}>
                        {savingFields ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Contato */}
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contato</h3>
                  {isEditing ? (
                    <div className="space-y-2">
                      <EditableField label="Nome" value={editData.nome} onChange={(v) => setEditData(p => ({...p, nome: v}))} />
                      <EditableField label="Telefone" value={editData.telefone} onChange={(v) => setEditData(p => ({...p, telefone: v}))} type="tel" />
                      <EditableField label="Email" value={editData.email} onChange={(v) => setEditData(p => ({...p, email: v}))} type="email" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {phoneRaw && (
                        <ContactRow
                          icon={Phone}
                          label="Telefone"
                          value={formatPhone(phoneRaw)}
                          onCopy={() => handleCopy(phoneRaw, "phone")}
                          copied={copied === "phone"}
                          iconColor="text-violet-500"
                        />
                      )}
                      {data?.email && (
                        <ContactRow
                          icon={Mail}
                          label="Email"
                          value={data.email}
                          onCopy={() => handleCopy(data.email, "email")}
                          copied={copied === "email"}
                          iconColor="text-blue-500"
                        />
                      )}
                      {!phoneRaw && !data?.email && (
                        <p className="text-xs text-muted-foreground italic">Nenhum contato cadastrado</p>
                      )}
                    </div>
                  )}
                </section>

                <Separator className="opacity-50" />

                {/* Detalhes */}
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detalhes</h3>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <EditableField label="Cidade" value={editData.cidade} onChange={(v) => setEditData(p => ({...p, cidade: v}))} />
                        <EditableField label="Estado" value={editData.estado} onChange={(v) => setEditData(p => ({...p, estado: v}))} />
                      </div>
                      <EditableField label="Origem" value={editData.origem} onChange={(v) => setEditData(p => ({...p, origem: v}))} />
                      <div className="grid grid-cols-2 gap-2">
                        <EditableField label="Valor Imovel (R$)" value={editData.valor_negocio} onChange={(v) => setEditData(p => ({...p, valor_negocio: v}))} type="number" />
                        <EditableField label="Renda Familiar (R$)" value={editData.renda_familiar} onChange={(v) => setEditData(p => ({...p, renda_familiar: v}))} type="number" />
                      </div>
                      <EditableField label="Observacao" value={editData.observacao} onChange={(v) => setEditData(p => ({...p, observacao: v}))} multiline />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <DetailItem icon={Building2} label="Empreendimento" value={empreendimentoNome} />
                      <DetailItem icon={MapPin} label="Origem" value={data?.origem || data?.midia} />
                      <DetailItem icon={Calendar} label="Cadastro" value={data?.data_cadastro ? formatDate(data.data_cadastro) : null} />
                      <DetailItem icon={DollarSign} label="Valor" value={data?.valor_negocio ? `R$ ${Number(data.valor_negocio).toLocaleString("pt-BR")}` : null} />
                      {data?.cidade && <DetailItem icon={MapPin} label="Cidade" value={`${data.cidade}${data.estado ? `/${data.estado}` : ""}`} />}
                      {data?.renda_familiar && <DetailItem icon={DollarSign} label="Renda" value={`R$ ${Number(data.renda_familiar).toLocaleString("pt-BR")}`} />}
                    </div>
                  )}
                </section>

                {!isEditing && data?.tags && data.tags.length > 0 && (
                  <>
                    <Separator className="opacity-50" />
                    <section className="space-y-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {data.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[11px]">{tag}</Badge>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {!isEditing && data?.observacao && (
                  <>
                    <Separator className="opacity-50" />
                    <section className="space-y-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observacao</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{data.observacao}</p>
                    </section>
                  </>
                )}

                {!isEditing && lastInteraction && (
                  <>
                    <Separator className="opacity-50" />
                    <section className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ultima Interacao</h3>
                        <button
                          onClick={() => setActiveTab("atividade")}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          Ver todas
                        </button>
                      </div>
                      <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium">{lastInteraction.tipo || "Interacao"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(lastInteraction.data_cad || lastInteraction.data)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {lastInteraction.descricao || lastInteraction.observacao || "Sem descricao"}
                          </p>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </TabsContent>

              {/* === TAB: Abordagem (Salesbook IA) === */}
              <TabsContent value="abordagem" className="flex-1 overflow-y-auto mt-0 p-5 space-y-4">
                {!abordagem && !loadingAbordagem && !abordagemError && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                        <Brain className="h-8 w-8 text-violet-500" />
                      </div>
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <h3 className="font-bold text-base">Salesbook IA</h3>
                      <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                        A IA vai analisar o perfil deste lead e gerar um guia completo de abordagem personalizado
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-[280px] text-[11px]">
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
                        <Target className="h-3 w-3 text-blue-500" />
                        <span>Perfil do cliente</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
                        <Lightbulb className="h-3 w-3 text-amber-500" />
                        <span>Estrategia</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
                        <Send className="h-3 w-3 text-emerald-500" />
                        <span>Scripts prontos</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
                        <Shield className="h-3 w-3 text-red-500" />
                        <span>Objecoes</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const id = data?.idlead || data?.id || lead?.id
                        if (id) fetchAbordagem(id)
                      }}
                      className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25"
                    >
                      <Zap className="h-4 w-4" />
                      Gerar Salesbook
                    </Button>
                  </div>
                )}

                {loadingAbordagem && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Analisando perfil do lead...</p>
                    <p className="text-[11px] text-muted-foreground/60">Isso pode levar alguns segundos</p>
                  </div>
                )}

                {abordagemError && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {abordagemError}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const id = data?.idlead || data?.id || lead?.id
                        if (id) fetchAbordagem(id)
                      }}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}

                {abordagem && (
                  <div className="space-y-4">
                    {/* Perfil do Cliente */}
                    {abordagem.perfil && (
                      <section className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Target className="h-3.5 w-3.5 text-violet-500" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider">Perfil do Cliente</h3>
                        </div>
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200/40 dark:border-violet-800/30 space-y-2.5">
                          <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                            {abordagem.perfil.titulo}
                          </p>
                          <div className="flex items-center gap-2">
                            {abordagem.perfil.nivel_interesse && (
                              <Badge className={cn(
                                "text-[10px] h-5",
                                abordagem.perfil.nivel_interesse === "alto"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300/40"
                                  : abordagem.perfil.nivel_interesse === "medio"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300/40"
                                  : "bg-red-500/15 text-red-700 dark:text-red-400 border-red-300/40"
                              )}>
                                Interesse {abordagem.perfil.nivel_interesse}
                              </Badge>
                            )}
                            {abordagem.perfil.probabilidade_fechamento && (
                              <Badge className={cn(
                                "text-[10px] h-5",
                                abordagem.perfil.probabilidade_fechamento === "alta"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300/40"
                                  : abordagem.perfil.probabilidade_fechamento === "media"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300/40"
                                  : "bg-red-500/15 text-red-700 dark:text-red-400 border-red-300/40"
                              )}>
                                Fechamento {abordagem.perfil.probabilidade_fechamento}
                              </Badge>
                            )}
                          </div>
                          {abordagem.perfil.pontos_fortes?.length > 0 && (
                            <div className="space-y-1">
                              {abordagem.perfil.pontos_fortes.map((p: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                                  <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                  <span className="text-foreground/80">{p}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {abordagem.perfil.pontos_atencao?.length > 0 && (
                            <div className="space-y-1">
                              {abordagem.perfil.pontos_atencao.map((p: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                                  <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                  <span className="text-foreground/80">{p}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {/* Estrategia */}
                    {abordagem.estrategia && (
                      <section className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider">Estrategia de Abordagem</h3>
                        </div>
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200/40 dark:border-blue-800/30 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Canal</p>
                              <p className="text-xs font-bold">{abordagem.estrategia.melhor_canal}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Horario</p>
                              <p className="text-xs font-bold">{abordagem.estrategia.melhor_horario}</p>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-white/60 dark:bg-white/5">
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Tom</p>
                            <p className="text-xs font-semibold">{abordagem.estrategia.tom_recomendado}</p>
                          </div>
                          <p className="text-[11px] leading-relaxed text-foreground/80">
                            {abordagem.estrategia.abordagem}
                          </p>
                        </div>
                      </section>
                    )}

                    {/* Scripts Prontos */}
                    {abordagem.scripts?.length > 0 && (
                      <section className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Send className="h-3.5 w-3.5 text-emerald-500" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider">Scripts Prontos</h3>
                        </div>
                        <div className="space-y-2">
                          {abordagem.scripts.map((script: any, i: number) => (
                            <ScriptCard
                              key={i}
                              script={script}
                              leadNome={data?.nome || lead?.name || ""}
                              empreendimento={empreendimentoNome}
                              onCopy={handleCopy}
                              copied={copied}
                              index={i}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Objecoes */}
                    {abordagem.objecoes?.length > 0 && (
                      <section className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Shield className="h-3.5 w-3.5 text-red-500" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider">Contornando Objecoes</h3>
                        </div>
                        <div className="space-y-2">
                          {abordagem.objecoes.map((obj: any, i: number) => (
                            <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
                              <div className="px-3 py-2 bg-red-50/50 dark:bg-red-950/20 border-b border-border/30">
                                <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                  <X className="h-3 w-3" />
                                  &ldquo;{obj.objecao}&rdquo;
                                </p>
                              </div>
                              <div className="px-3 py-2.5 bg-emerald-50/30 dark:bg-emerald-950/10">
                                <p className="text-[11px] text-foreground/80 leading-relaxed flex items-start gap-1.5">
                                  <ChevronRight className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                  <span>{obj.resposta}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Proximos Passos */}
                    {abordagem.proximos_passos?.length > 0 && (
                      <section className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                          </div>
                          <h3 className="text-xs font-bold uppercase tracking-wider">Proximos Passos</h3>
                        </div>
                        <div className="space-y-1.5">
                          {abordagem.proximos_passos.map((passo: string, i: number) => (
                            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 border border-border/30">
                              <div className="h-5 w-5 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{i + 1}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed text-foreground/80">{passo}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Regenerate */}
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs"
                        onClick={() => {
                          const id = data?.idlead || data?.id || lead?.id
                          if (id) fetchAbordagem(id)
                        }}
                        disabled={loadingAbordagem}
                      >
                        {loadingAbordagem ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Gerar novo salesbook
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* === TAB: Jornada === */}
              <TabsContent value="jornada" className="flex-1 overflow-y-auto mt-0 p-5 space-y-5">
                <JourneyTimeline situacao={data?.situacao} />

                {/* Financial Readiness */}
                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prontidao Financeira</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(data?.valor_negocio > 0 || lead?.valor_negocio > 0) && (
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Home className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Valor do Imovel</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          R$ {Number(data?.valor_negocio || lead?.valor_negocio).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                    {(data?.renda_familiar > 0 || lead?.renda_familiar > 0) && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-[10px] text-blue-700 dark:text-blue-400">Renda Familiar</span>
                        </div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                          R$ {Number(data?.renda_familiar || lead?.renda_familiar).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Affordability indicator */}
                  {(data?.valor_negocio > 0 || lead?.valor_negocio > 0) && (data?.renda_familiar > 0 || lead?.renda_familiar > 0) && (() => {
                    const valor = Number(data?.valor_negocio || lead?.valor_negocio);
                    const renda = Number(data?.renda_familiar || lead?.renda_familiar);
                    const ratio = valor / (renda * 12);
                    const years = Math.round(ratio);
                    const isGood = ratio <= 30;
                    const isOk = ratio <= 40;
                    return (
                      <div className={cn(
                        "p-3 rounded-lg border text-xs flex items-center gap-2",
                        isGood
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
                          : isOk
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 text-red-700 dark:text-red-400"
                      )}>
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        <div>
                          <span className="font-semibold">
                            {isGood ? "Boa capacidade" : isOk ? "Capacidade moderada" : "Capacidade limitada"}
                          </span>
                          <span className="opacity-80"> — Imovel equivale a ~{years} anos de renda</span>
                        </div>
                      </div>
                    );
                  })()}
                </section>

                {/* Milestones */}
                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Marcos</h3>
                  <div className="space-y-2">
                    <MilestoneItem
                      icon={FileCheck}
                      label="Simulacoes"
                      value={data?.simulacoes || lead?.simulacoes || 0}
                      suffix="realizadas"
                      color="amber"
                    />
                    <MilestoneItem
                      icon={BookmarkCheck}
                      label="Reservas"
                      value={data?.reservas || lead?.reservas || 0}
                      suffix="ativas"
                      color="violet"
                    />
                    <MilestoneItem
                      icon={CreditCard}
                      label="Score Lead"
                      value={data?.score || lead?.score || 0}
                      suffix="pontos"
                      color="blue"
                    />
                  </div>
                </section>

                {/* Property Interest */}
                {empreendimentoNome && (
                  <section className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Imovel de Interesse</h3>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{empreendimentoNome}</p>
                        {(data?.valor_negocio > 0 || lead?.valor_negocio > 0) && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            R$ {Number(data?.valor_negocio || lead?.valor_negocio).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </TabsContent>

              {/* === TAB: Atividade === */}
              <TabsContent value="atividade" className="flex-1 overflow-y-auto mt-0 p-5">
                {interacoes.length > 0 ? (
                  <div className="space-y-0">
                    {interacoes.map((interacao: any, index: number) => (
                      <div key={interacao.id || index} className="relative flex gap-3 pb-4">
                        {index < interacoes.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border/60" />
                        )}
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-border/40">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold">{interacao.tipo || "Interacao"}</span>
                            {interacao.usuario && (
                              <span className="text-[10px] text-muted-foreground">por {interacao.usuario}</span>
                            )}
                          </div>
                          {(interacao.data_cad || interacao.data) && (
                            <time className="text-[10px] text-muted-foreground block mb-1">
                              {formatDate(interacao.data_cad || interacao.data)}
                            </time>
                          )}
                          <p className="text-xs text-muted-foreground/80 leading-relaxed">
                            {interacao.descricao || interacao.observacao || "Sem descricao"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma atividade</p>
                    <p className="text-xs mt-1">As interacoes aparecerao aqui</p>
                  </div>
                )}
              </TabsContent>

              {/* === TAB: Credito === */}
              <TabsContent value="credito" className="flex-1 overflow-y-auto mt-0 p-5 space-y-4">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">CPF</h3>
                    {hasCpf && !isEditingCpf && (
                      <button
                        className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                        onClick={() => setIsEditingCpf(true)}
                      >
                        <Edit3 className="h-3 w-3" />
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingCpf || !hasCpf ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Digite o CPF..."
                          value={cpfInput}
                          onChange={(e) => setCpfInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          className="pl-9 font-mono h-9 text-sm"
                          inputMode="numeric"
                        />
                      </div>
                      {isEditingCpf && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSaveCpf} disabled={savingCpf}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setIsEditingCpf(false)}>
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-medium text-sm">{formatCPF(cpfInput || data?.cpf)}</span>
                    </div>
                  )}
                </section>

                <Separator className="opacity-50" />

                <section className="space-y-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Analise de Credito</h3>

                  {!hasCpf && cpfInput.length !== 11 ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Adicione o CPF acima para consultar o score
                    </div>
                  ) : !scoreConsultado ? (
                    <Button onClick={handleConsultarScore} disabled={scoreLoading} size="sm" className="w-full gap-2">
                      {scoreLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" />Consultando...</>
                      ) : (
                        <><Search className="h-3.5 w-3.5" />Consultar Score</>
                      )}
                    </Button>
                  ) : null}

                  {scoreError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {scoreError}
                    </div>
                  )}

                  {scoreConsultado && score && (
                    <ScoreDisplay score={score.score} faixa={score.risco} probabilidade={score.probabilidade} />
                  )}
                </section>
              </TabsContent>
            </>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Sub-components ─── */

function ContactRow({
  icon: Icon,
  label,
  value,
  onCopy,
  copied,
  iconColor,
}: {
  icon: any
  label: string
  value?: string | null
  onCopy?: () => void
  copied?: boolean
  iconColor?: string
}) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between group py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor || "text-muted-foreground")} />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
          <p className="text-sm font-medium truncate">{value}</p>
        </div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
      )}
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/30">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none mb-1">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

const JOURNEY_DISPLAY = [
  { id: "aguardando_atendimento", label: "Novo Lead", icon: User, position: 1 },
  { id: "em_atendimento", label: "Em Atendimento", icon: MessageSquare, position: 2 },
  { id: "visita_agendada", label: "Visita ao Imovel", icon: Home, position: 3 },
  { id: "simulacao", label: "Simulacao", icon: FileCheck, position: 4 },
  { id: "analise_credito", label: "Analise Credito", icon: CreditCard, position: 5 },
  { id: "com_reserva", label: "Reserva", icon: BookmarkCheck, position: 6 },
  { id: "venda_realizada", label: "Venda Realizada", icon: BadgeCheck, position: 7 },
]

function getJourneyPosition(situacao: string | null | undefined): number {
  if (!situacao) return 1
  const s = situacao.toLowerCase()
  if (s.includes("venda realizada")) return 7
  if (s.includes("reserva")) return 6
  if (s.includes("montagem pasta") || s.includes("credito") || s.includes("crédito")) return 5
  if (s.includes("simulac") || s.includes("simulaç")) return 4
  if (s.includes("visita realizada")) return 3
  if (s.includes("visita agendada")) return 3
  if (s.includes("em atendimento")) return 2
  if (s.includes("aguardando")) return 1
  return 1
}

function JourneyTimeline({ situacao }: { situacao?: string | null }) {
  const currentPosition = getJourneyPosition(situacao)

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Jornada de Compra</h3>
      <div className="relative">
        {JOURNEY_DISPLAY.map((step, index) => {
          const StepIcon = step.icon
          const isCompleted = step.position < currentPosition
          const isCurrent = step.position === currentPosition
          const isPending = step.position > currentPosition

          return (
            <div key={step.id} className="flex items-start gap-3 relative">
              {/* Vertical line */}
              {index < JOURNEY_DISPLAY.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[15px] top-8 h-6 w-0.5",
                    isCompleted ? "bg-primary" : "bg-border/50"
                  )}
                />
              )}

              {/* Step circle */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/10 border-primary text-primary ring-4 ring-primary/20",
                  isPending && "bg-muted/30 border-border/50 text-muted-foreground/40"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Step label */}
              <div className={cn("pb-6 pt-1", isPending && "opacity-40")}>
                <p className={cn(
                  "text-xs font-medium",
                  isCurrent && "text-primary font-semibold"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-[10px] text-primary/70 mt-0.5">Etapa atual</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          rows={3}
          placeholder={`Adicionar ${label.toLowerCase()}...`}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
          placeholder={`Adicionar ${label.toLowerCase()}...`}
        />
      )}
    </div>
  )
}

function ScriptCard({
  script,
  leadNome,
  empreendimento,
  onCopy,
  copied,
  index,
}: {
  script: { titulo: string; contexto: string; mensagem: string }
  leadNome: string
  empreendimento: string
  onCopy: (text: string, type: string) => void
  copied: string | null
  index: number
}) {
  const firstName = leadNome?.split(" ")[0] || "Cliente"
  const finalMessage = script.mensagem
    .replace(/\{nome\}/gi, firstName)
    .replace(/\{empreendimento\}/gi, empreendimento || "nosso empreendimento")

  const copyKey = `script-${index}`

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden group">
      <div className="px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-border/30 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{script.titulo}</p>
          <p className="text-[10px] text-muted-foreground">{script.contexto}</p>
        </div>
        <button
          onClick={() => onCopy(finalMessage, copyKey)}
          className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          title="Copiar mensagem"
        >
          {copied === copyKey ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
          )}
        </button>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-foreground/80 whitespace-pre-line">
          {finalMessage}
        </p>
      </div>
    </div>
  )
}

function MilestoneItem({
  icon: Icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: any
  label: string
  value: number
  suffix: string
  color: "amber" | "violet" | "blue"
}) {
  const colors = {
    amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: "text-amber-500" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", icon: "text-violet-500" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: "text-blue-500" },
  }
  const c = colors[color]

  return (
    <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", c.bg)}>
      <Icon className={cn("h-4 w-4", c.icon)} />
      <div className="flex-1">
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={cn("text-sm font-bold", c.text)}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{suffix}</span>
    </div>
  )
}
