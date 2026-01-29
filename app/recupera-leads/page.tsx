"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Brain,
  Calendar,
  Clock,
  Edit3,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  User,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  QrCode,
  Smartphone,
  WifiOff,
  Wifi,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/auth-context"
import { AnimatedBackground } from "@/components/animated-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ColdLead {
  id: string
  nome: string
  telefone: string
  last_message_date: string | null
  days_since_contact: number
  empreendimento?: { nome: string } | null
  situacao?: string
  conversation_history?: Array<{
    content: string
    timestamp: string
    is_from_me: boolean
  }>
}

interface LeadWithSuggestion extends ColdLead {
  suggestion?: string
  isLoadingSuggestion?: boolean
  suggestionError?: string
  editedMessage?: string
  isSending?: boolean
  sendError?: string
  sendSuccess?: boolean
}

interface WhatsAppStatus {
  status: "ready" | "connecting" | "disconnected"
  pairedPhone?: string | null
  profileName?: string | null
  profilePicUrl?: string | null
  lastQr?: string | null
  pairingCode?: string | null
  error?: string | null
}

export default function CataVendasPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  
  const [leads, setLeads] = useState<LeadWithSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>({ status: "disconnected" })
  const [checkingWhatsApp, setCheckingWhatsApp] = useState(true)
  const [scanningLeads, setScanningLeads] = useState(false)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Check WhatsApp status
  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch("/api/whatsapp/session/status")
      if (!response.ok) throw new Error("Failed to check WhatsApp status")
      
      const data = await response.json()
      setWhatsappStatus(data)
    } catch (error) {
      console.error("Erro ao verificar status WhatsApp:", error)
      setWhatsappStatus({ status: "disconnected", error: "Erro ao verificar conexão" })
    } finally {
      setCheckingWhatsApp(false)
    }
  }

  // Fetch cold leads
  const fetchLeads = async (page: number = 1, showScanningLoader = false) => {
    try {
      if (showScanningLoader) setScanningLeads(true)
      
      const response = await fetch(`/api/recupera-leads?page=${page}&limit=10`)
      if (!response.ok) throw new Error('Failed to fetch leads')
      
      const data = await response.json()
      
      if (page === 1) {
        setLeads(data.leads || [])
      } else {
        setLeads(prev => [...prev, ...(data.leads || [])])
      }
      
      setCurrentPage(data.currentPage || 1)
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Erro ao buscar leads frios:', error)
    } finally {
      if (showScanningLoader) setScanningLeads(false)
    }
  }

  // Check WhatsApp status on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkWhatsAppStatus()
    }
  }, [isAuthenticated])

  // Auto-scan when WhatsApp is ready
  useEffect(() => {
    if (isAuthenticated && whatsappStatus.status === "ready") {
      setLoading(true)
      fetchLeads(1, true).finally(() => setLoading(false))
    }
  }, [isAuthenticated, whatsappStatus.status])

  // Generate AI suggestion for a lead
  const generateSuggestion = async (leadId: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, isLoadingSuggestion: true, suggestionError: undefined }
        : lead
    ))

    try {
      const response = await fetch('/api/recupera-leads/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId })
      })

      if (!response.ok) throw new Error('Failed to generate suggestion')
      
      const data = await response.json()
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              suggestion: data.suggestion,
              editedMessage: data.suggestion,
              isLoadingSuggestion: false 
            }
          : lead
      ))
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error)
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              isLoadingSuggestion: false,
              suggestionError: 'Erro ao gerar sugestão. Tente novamente.'
            }
          : lead
      ))
    }
  }

  // Send WhatsApp message
  const sendMessage = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead?.editedMessage?.trim()) return

    setLeads(prev => prev.map(l => 
      l.id === leadId 
        ? { ...l, isSending: true, sendError: undefined, sendSuccess: false }
        : l
    ))

    try {
      const response = await fetch('/api/whatsapp/session/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: lead.telefone.replace(/\D/g, ''),
          message: lead.editedMessage.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to send message')
      
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { ...l, isSending: false, sendSuccess: true }
          : l
      ))

      // Remove lead from list after successful send
      setTimeout(() => {
        setLeads(prev => prev.filter(l => l.id !== leadId))
      }, 2000)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { 
              ...l, 
              isSending: false,
              sendError: 'Erro ao enviar mensagem. Verifique a conexão WhatsApp.'
            }
          : l
      ))
    }
  }

  // Update edited message
  const updateMessage = (leadId: string, message: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, editedMessage: message }
        : lead
    ))
  }

  // Load more leads
  const loadMore = async () => {
    if (currentPage >= totalPages || loadingMore) return
    
    setLoadingMore(true)
    await fetchLeads(currentPage + 1)
    setLoadingMore(false)
  }

  // Open WhatsApp with message
  const openWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  // Refresh leads and WhatsApp status
  const refreshData = async () => {
    setCheckingWhatsApp(true)
    setLoading(true)
    
    await Promise.all([
      checkWhatsAppStatus(),
      fetchLeads(1, true)
    ])
    
    setLoading(false)
  }

  // Format days ago
  const formatDaysAgo = (days: number) => {
    if (days === 0) return "hoje"
    if (days === 1) return "ontem"
    if (days <= 7) return `há ${days} dias`
    if (days <= 30) return `há ${Math.ceil(days / 7)} semana(s)`
    return `há ${Math.ceil(days / 30)} mês(es)`
  }

  // Get priority color based on days
  const getPriorityColor = (days: number) => {
    if (days >= 30) return "destructive"
    if (days >= 14) return "secondary" 
    return "default"
  }

  if (authLoading || (loading && checkingWhatsApp)) {
    return (
      <AppShell title="CataVendas">
        <div className="min-h-screen flex items-center justify-center p-4">
          <AnimatedBackground />
          <div className="relative text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-30 animate-pulse" />
            <div className="relative space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                <Search className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  CataVendas 🔍
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {scanningLeads ? "Escavando oportunidades no seu WhatsApp..." : "Conectando..."}
                </p>
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-green-500 mx-auto" />
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="CataVendas">
      <div className="min-h-screen relative">
        <AnimatedBackground />

        <div className="relative z-10 space-y-4 sm:space-y-6 animate-page-in">
          {/* Header */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-1 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <span>CataVendas</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    CataVendas
                    <span className="text-2xl sm:text-3xl">🔍</span>
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Escavando oportunidades no seu WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                {/* WhatsApp Status */}
                <div className="flex items-center gap-2">
                  {whatsappStatus.status === "ready" ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                      <Wifi className="h-3 w-3 mr-1" />
                      WhatsApp Conectado
                    </Badge>
                  ) : whatsappStatus.status === "connecting" ? (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Conectando...
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <WifiOff className="h-3 w-3 mr-1" />
                      WhatsApp Desconectado
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={refreshData}
                  variant="outline"
                  size="sm"
                  disabled={loading || checkingWhatsApp}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", (loading || checkingWhatsApp) && "animate-spin")} />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
              </div>
            </div>
          </div>

          {/* WhatsApp Connection Required */}
          {whatsappStatus.status === "disconnected" && (
            <Card className="p-6 sm:p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Conecte seu WhatsApp
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Para começar a escavar oportunidades, conecte seu WhatsApp Business ao CataVendas.
                  </p>
                  {whatsappStatus.error && (
                    <div className="text-sm text-red-600 dark:text-red-400 mb-4">
                      {whatsappStatus.error}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Button asChild className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    <Link href="/admin/whatsapp">
                      <QrCode className="h-4 w-4 mr-2" />
                      Conectar WhatsApp
                    </Link>
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    QR Code • Pareamento • Seguro e criptografado
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Connecting State */}
          {whatsappStatus.status === "connecting" && (
            <Card className="p-6 sm:p-8 text-center">
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Conectando WhatsApp
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Aguardando confirmação do seu dispositivo...
                  </p>
                  {whatsappStatus.pairingCode && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Código de pareamento:
                      </p>
                      <code className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                        {whatsappStatus.pairingCode}
                      </code>
                    </div>
                  )}
                </div>
                <Button asChild variant="outline">
                  <Link href="/admin/whatsapp">
                    Ver QR Code
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {/* Leads List */}
          {whatsappStatus.status === "ready" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Results Summary */}
              {leads.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {leads.length} oportunidades encontradas
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Leads sem contato há 7+ dias • Pronto para reativação
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-400">
                    {whatsappStatus.profileName ? `📱 ${whatsappStatus.profileName}` : '📱 Conectado'}
                  </Badge>
                </div>
              )}

              {leads.length === 0 && !loading && !scanningLeads ? (
                <Card className="p-8 sm:p-12 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Excelente trabalho! 🎉
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Nenhuma oportunidade perdida encontrada. Seu pipeline está em dia!
                  </p>
                  <div className="space-y-3">
                    <Button onClick={refreshData} className="bg-green-600 hover:bg-green-700">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Escanear Novamente
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      O CataVendas monitora automaticamente seus chats
                    </p>
                  </div>
                </Card>
            ) : (
              <>
                {leads.map((lead, index) => (
                  <Card key={lead.id} className={cn(
                    "relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4",
                    lead.sendSuccess && "opacity-50 scale-95",
                    lead.days_since_contact >= 30 ? "border-l-red-500" : 
                    lead.days_since_contact >= 14 ? "border-l-yellow-500" : "border-l-green-500"
                  )}>
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                              {lead.nome}
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                                {lead.telefone}
                              </span>
                              {lead.empreendimento?.nome && (
                                <span className="flex items-center gap-1 truncate">
                                  <span className="hidden sm:inline">•</span>
                                  <span className="truncate">{lead.empreendimento.nome}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <Badge variant={getPriorityColor(lead.days_since_contact)} className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDaysAgo(lead.days_since_contact)}
                          </Badge>
                          {lead.situacao && (
                            <Badge variant="outline" className="text-xs">
                              {lead.situacao}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* AI Suggestion Section */}
                      <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                              Mensagem IA Personalizada
                            </span>
                          </div>
                          {!lead.suggestion && !lead.isLoadingSuggestion && (
                            <Button
                              onClick={() => generateSuggestion(lead.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 text-xs sm:text-sm"
                            >
                              <Zap className="h-3 w-3" />
                              <span className="hidden sm:inline">Gerar</span>
                              <span className="sm:hidden">IA</span>
                            </Button>
                          )}
                        </div>

                        {lead.isLoadingSuggestion ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>IA analisando conversa e gerando mensagem...</span>
                          </div>
                        ) : lead.suggestionError ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-red-600 dark:text-red-400">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">{lead.suggestionError}</span>
                            </div>
                            <Button
                              onClick={() => generateSuggestion(lead.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 text-xs"
                            >
                              Tentar novamente
                            </Button>
                          </div>
                        ) : lead.suggestion ? (
                          <div className="space-y-3">
                            <Textarea
                              value={lead.editedMessage || ''}
                              onChange={(e) => updateMessage(lead.id, e.target.value)}
                              placeholder="Edite a mensagem se necessário..."
                              className="min-h-[100px] sm:min-h-[120px] resize-none text-sm"
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                                <Edit3 className="h-3 w-3" />
                                <span className="hidden sm:inline">Você pode editar a mensagem antes de enviar</span>
                                <span className="sm:hidden">Editável</span>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                                {lead.sendError && (
                                  <span className="text-xs text-red-600 dark:text-red-400">
                                    {lead.sendError}
                                  </span>
                                )}
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => openWhatsApp(lead.telefone, lead.editedMessage || '')}
                                    disabled={!lead.editedMessage?.trim()}
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50 flex items-center gap-1 flex-1 sm:flex-initial"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="hidden sm:inline">Abrir WhatsApp</span>
                                    <span className="sm:hidden">Abrir</span>
                                  </Button>
                                  <Button
                                    onClick={() => sendMessage(lead.id)}
                                    disabled={!lead.editedMessage?.trim() || lead.isSending || lead.sendSuccess}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 flex-1 sm:flex-initial"
                                  >
                                    {lead.isSending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : lead.sendSuccess ? (
                                      <CheckCircle className="h-3 w-3" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                    <span className="hidden sm:inline">
                                      {lead.sendSuccess ? 'Enviado!' : lead.isSending ? 'Enviando...' : 'Enviar Direto'}
                                    </span>
                                    <span className="sm:hidden">
                                      {lead.sendSuccess ? '✓' : lead.isSending ? '...' : 'Enviar'}
                                    </span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Clique em <span className="font-medium text-green-600">"Gerar"</span> para que a IA crie uma mensagem personalizada baseada no histórico de conversas.
                          </p>
                        )}
                      </div>

                      {/* Last Contact Info */}
                      {lead.last_message_date && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>
                              Último contato: {new Date(lead.last_message_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <Badge 
                            variant={lead.days_since_contact >= 30 ? "destructive" : lead.days_since_contact >= 14 ? "secondary" : "default"}
                            className="text-xs"
                          >
                            {lead.days_since_contact >= 30 ? "🔥 Urgente" : lead.days_since_contact >= 14 ? "⚠️ Atenção" : "✅ Normal"}
                          </Badge>
                        </div>
                      )}

                      {/* Success Message */}
                      {lead.sendSuccess && (
                        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium text-sm">Mensagem enviada com sucesso!</span>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            Lead removido da lista de recuperação. Continue o acompanhamento!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Load More Button */}
                {currentPage < totalPages && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={loadMore}
                      disabled={loadingMore}
                      variant="outline"
                      className="flex items-center gap-2 w-full sm:w-auto"
                    >
                      {loadingMore ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {loadingMore ? 'Carregando...' : 'Carregar mais oportunidades'}
                    </Button>
                  </div>
                )}
              </>
            )}
            </div>
          )}

          {/* Scanning State */}
          {whatsappStatus.status === "ready" && scanningLeads && (
            <Card className="p-6 sm:p-8 text-center">
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                  <Search className="h-8 w-8 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Escavando oportunidades...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Analisando suas conversas do WhatsApp para encontrar leads que precisam de atenção
                  </p>
                </div>
                <Loader2 className="h-6 w-6 animate-spin text-green-500 mx-auto" />
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}