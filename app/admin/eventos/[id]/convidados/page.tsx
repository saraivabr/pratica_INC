"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowRight,
  Ban,
  Building2,
  Check,
  ChevronLeft,
  FileSpreadsheet,
  Filter,
  Loader2,
  Search,
  Trash2,
  Upload,
  Users,
  X,
  AlertCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Corretor {
  id: string
  nome: string
  celular: string
  imobiliaria?: string
  time?: string
  cvcrm_id?: number
}

interface ImportedCorretor {
  nome: string
  celular: string
  valid: boolean
  error?: string
}

interface Evento {
  id: string
  nome: string
}


export default function ConvidadosPage() {
  const router = useRouter()
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const eventoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("base")

  // Da Base state
  const [corretores, setCorretores] = useState<Corretor[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [imobiliariaFilter, setImobiliariaFilter] = useState("")
  const [timeFilter, setTimeFilter] = useState("Todos")
  const [imobiliarias, setImobiliarias] = useState<string[]>([])
  const [times, setTimes] = useState<string[]>(["Todos"])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCorretores, setShowCorretores] = useState(false)

  // Import state
  const [importedData, setImportedData] = useState<ImportedCorretor[]>([])
  const [importing, setImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchCorretores()
    }
  }, [hasAccess])

  const fetchCorretores = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/corretores")
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar corretores")
      }

      // Mapear dados do CV CRM para o formato da tela
      const corretoresMapeados: Corretor[] = (data.data || []).map((c: any) => ({
        id: String(c.idcorretor || c.id),
        nome: c.nome || c.name || "Sem nome",
        celular: c.celular || c.telefone || c.phone || "",
        imobiliaria: c.imobiliaria?.nome || c.imobiliaria_nome || c.imobiliaria || "",
        time: c.equipe?.nome || c.equipe_nome || c.time || "",
        cvcrm_id: c.idcorretor || c.id,
      })).filter((c: Corretor) => c.celular) // Filtrar apenas quem tem celular

      setCorretores(corretoresMapeados)

      // Extrair imobiliárias e times únicos para filtros (sem "Todas" - precisa selecionar)
      const imobsUnicas = [...new Set(corretoresMapeados.map(c => c.imobiliaria).filter(Boolean))].sort()
      const timesUnicos = ["Todos", ...new Set(corretoresMapeados.map(c => c.time).filter(Boolean))]

      setImobiliarias(imobsUnicas as string[])
      setTimes(timesUnicos as string[])
    } catch (error: any) {
      console.error("Error fetching corretores:", error)
      setLoadError(error.message || "Erro ao carregar corretores")
      toast.error("Erro ao carregar corretores do CV CRM")
    }
    setLoading(false)
  }

  // Quando selecionar uma imobiliária, mostrar os corretores
  const handleImobiliariaChange = (value: string) => {
    setImobiliariaFilter(value)
    setShowCorretores(true)
    setTimeFilter("Todos")
    setSearchTerm("")
    setSelectedIds(new Set())
  }

  // Filtered corretores - só mostra se tiver imobiliária selecionada
  const filteredCorretores = !showCorretores || !imobiliariaFilter ? [] : corretores.filter((corretor) => {
    const matchesSearch = corretor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      corretor.celular.includes(searchTerm)
    const matchesImobiliaria = corretor.imobiliaria === imobiliariaFilter
    const matchesTime = timeFilter === "Todos" || corretor.time === timeFilter
    return matchesSearch && matchesImobiliaria && matchesTime
  })

  // Times disponíveis para a imobiliária selecionada
  const timesDisponiveis = !imobiliariaFilter ? ["Todos"] : [
    "Todos",
    ...new Set(
      corretores
        .filter(c => c.imobiliaria === imobiliariaFilter)
        .map(c => c.time)
        .filter(Boolean)
    )
  ]

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    const allIds = new Set(filteredCorretores.map(c => c.id))
    setSelectedIds(allIds)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isAllSelected = filteredCorretores.length > 0 &&
    filteredCorretores.every(c => selectedIds.has(c.id))

  // File import handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]

    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Formato invalido. Use CSV ou Excel.")
      return
    }

    setImporting(true)
    try {
      // Enviar arquivo para a API de importação
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/eventos/${eventoId}/convidados/importar`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        // Se tiver erros de validação, mostrar preview com erros
        if (data.erros && data.erros.length > 0) {
          const errosFormatados: ImportedCorretor[] = data.erros.map((err: { linha: number; motivo: string }) => ({
            nome: `Linha ${err.linha}`,
            celular: "",
            valid: false,
            error: err.motivo,
          }))
          setImportedData(errosFormatados)
          toast.error(data.error || "Erro ao processar arquivo")
        } else {
          throw new Error(data.error || "Erro ao importar arquivo")
        }
        return
      }

      // Montar preview dos dados importados com sucesso
      const importados: ImportedCorretor[] = (data.data || []).map((c: any) => ({
        nome: c.nome,
        celular: c.celular,
        valid: true,
      }))

      // Adicionar erros de validação ao preview (se houver)
      if (data.erros && data.erros.length > 0) {
        data.erros.forEach((err: { linha: number; motivo: string }) => {
          importados.push({
            nome: `Linha ${err.linha}`,
            celular: "",
            valid: false,
            error: err.motivo,
          })
        })
      }

      setImportedData(importados)

      // Mensagem de sucesso
      let msg = `${data.added} convidado${data.added !== 1 ? "s" : ""} importado${data.added !== 1 ? "s" : ""}`
      if (data.skipped > 0) {
        msg += ` (${data.skipped} ja cadastrado${data.skipped !== 1 ? "s" : ""})`
      }
      toast.success(msg)

    } catch (error: any) {
      console.error("Erro ao importar:", error)
      toast.error(error.message || "Erro ao processar arquivo")
    }
    setImporting(false)
  }

  const removeImported = (index: number) => {
    setImportedData(importedData.filter((_, i) => i !== index))
  }

  const clearImported = () => {
    setImportedData([])
  }

  // Format phone
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  // Total selected count
  const totalSelected = selectedIds.size + importedData.filter(d => d.valid).length

  // Save and continue
  const handleContinue = async () => {
    // Se só tem dados importados (já salvos no banco), pode continuar direto
    const convidadosBaseCount = selectedIds.size
    const convidadosImportadosCount = importedData.filter(d => d.valid).length

    if (convidadosBaseCount === 0 && convidadosImportadosCount === 0) {
      toast.error("Selecione pelo menos um convidado")
      return
    }

    // Se só tem importados, já estão salvos - pode ir direto para próxima tela
    if (convidadosBaseCount === 0 && convidadosImportadosCount > 0) {
      toast.success(`${convidadosImportadosCount} convidados importados`)
      router.push(`/admin/eventos/${eventoId}/disparar`)
      return
    }

    setSaving(true)
    try {
      // Só envia os corretores selecionados da base (importados já estão salvos)
      const convidadosBase = Array.from(selectedIds).map(id => {
        const corretor = corretores.find(c => c.id === id)!
        return {
          nome: corretor.nome,
          celular: corretor.celular,
          origem: "cvcrm",
          cvcrm_id: corretor.cvcrm_id,
        }
      })

      const payload = {
        convidados: convidadosBase,
      }

      const response = await fetch(`/api/eventos/${eventoId}/convidados`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao salvar convidados")
      }

      const totalAdicionados = (data.data?.adicionados || convidadosBaseCount) + convidadosImportadosCount
      toast.success(`${totalAdicionados} convidados adicionados`)
      router.push(`/admin/eventos/${eventoId}/disparar`)
    } catch (error: any) {
      console.error("Error saving convidados:", error)
      toast.error(error.message || "Erro ao salvar convidados")
    }
    setSaving(false)
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="text-muted-foreground mb-6">
              Esta area e exclusiva para gerentes e administradores.
            </p>
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Selecionar Convidados" showBackButton backHref={`/admin/eventos/${eventoId}`}>
      <div className="container max-w-5xl px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/eventos/${eventoId}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Selecionar Convidados</h1>
            <p className="text-muted-foreground">
              Escolha os corretores que receberao o convite
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              <Check className="h-4 w-4" />
            </div>
            <span>Dados do Evento</span>
          </div>
          <div className="h-px flex-1 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              2
            </div>
            <span className="font-medium">Convidados</span>
          </div>
          <div className="h-px flex-1 bg-muted" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-muted flex items-center justify-center font-medium">
              3
            </div>
            <span>Disparar</span>
          </div>
        </div>

        {/* Selection counter */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {totalSelected} corretor{totalSelected !== 1 ? "es" : ""} selecionado{totalSelected !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedIds.size} da base + {importedData.filter(d => d.valid).length} importados
                  </p>
                </div>
              </div>
              {totalSelected > 0 && (
                <Button variant="outline" size="sm" onClick={() => { clearSelection(); clearImported() }}>
                  Limpar selecao
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="base" className="gap-2">
              <Users className="h-4 w-4" />
              Da Base
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedIds.size}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="importar" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Importar Planilha
              {importedData.filter(d => d.valid).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {importedData.filter(d => d.valid).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Da Base */}
          <TabsContent value="base" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Corretores do CV CRM</CardTitle>
                    <CardDescription>
                      {!showCorretores
                        ? "Selecione uma imobiliaria para ver os corretores disponiveis"
                        : "Selecione os corretores que deseja convidar"
                      }
                    </CardDescription>
                  </div>
                  {showCorretores && filteredCorretores.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isAllSelected ? clearSelection : selectAll}
                      >
                        {isAllSelected ? "Limpar selecao" : "Selecionar todos"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Seleção de Imobiliária - Sempre visível */}
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Imobiliaria *</label>
                    <Select value={imobiliariaFilter} onValueChange={handleImobiliariaChange}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <Building2 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Selecione uma imobiliaria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {loading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : (
                          imobiliarias.map((imob) => (
                            <SelectItem key={imob} value={imob}>{imob}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtros adicionais - Só aparecem após selecionar imobiliária */}
                  {showCorretores && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por nome ou celular..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={timeFilter} onValueChange={setTimeFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timesDisponiveis.map((time) => (
                            <SelectItem key={time} value={time as string}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Table */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : loadError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive/50" />
                    <h3 className="font-semibold text-lg">Erro ao carregar corretores</h3>
                    <p className="text-muted-foreground mb-4">{loadError}</p>
                    <Button variant="outline" onClick={fetchCorretores}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : !showCorretores || !imobiliariaFilter ? (
                  <div className="text-center py-12 border rounded-lg bg-muted/30">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <h3 className="font-semibold text-lg">Selecione uma imobiliaria</h3>
                    <p className="text-muted-foreground">
                      Escolha uma imobiliaria acima para ver os corretores disponiveis
                    </p>
                  </div>
                ) : filteredCorretores.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <h3 className="font-semibold text-lg">Nenhum corretor encontrado</h3>
                    <p className="text-muted-foreground">
                      Tente ajustar os filtros de busca
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={() => isAllSelected ? clearSelection() : selectAll()}
                            />
                          </TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Celular</TableHead>
                          <TableHead className="hidden md:table-cell">Imobiliaria</TableHead>
                          <TableHead className="hidden md:table-cell">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCorretores.map((corretor) => (
                          <TableRow
                            key={corretor.id}
                            className={cn(
                              "cursor-pointer",
                              selectedIds.has(corretor.id) && "bg-primary/5"
                            )}
                            onClick={() => toggleSelect(corretor.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(corretor.id)}
                                onCheckedChange={() => toggleSelect(corretor.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-primary text-sm font-semibold">
                                    {corretor.nome[0].toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium">{corretor.nome}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatPhone(corretor.celular)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {corretor.imobiliaria || "-"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {corretor.time || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {showCorretores && imobiliariaFilter && (
                  <p className="text-sm text-muted-foreground">
                    Mostrando {filteredCorretores.length} corretor{filteredCorretores.length !== 1 ? "es" : ""} de {imobiliariaFilter}
                    {selectedIds.size > 0 && ` (${selectedIds.size} selecionado${selectedIds.size !== 1 ? "s" : ""})`}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Importar */}
          <TabsContent value="importar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importar Planilha</CardTitle>
                <CardDescription>
                  Importe um arquivo Excel ou CSV com as colunas: Nome, Celular (ou variantes como Telefone, WhatsApp)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload area */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                    importing && "opacity-50 pointer-events-none"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {importing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-muted-foreground">Processando arquivo...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Arraste um arquivo ou clique para selecionar</p>
                        <p className="text-sm text-muted-foreground">CSV ou Excel (.xlsx, .xls)</p>
                      </div>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        Selecionar arquivo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Imported data preview */}
                {importedData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Preview dos dados importados</h3>
                      <Button variant="outline" size="sm" onClick={clearImported}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar
                      </Button>
                    </div>

                    {importedData.some(d => !d.valid) && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {importedData.filter(d => !d.valid).length} registro(s) com erro serao ignorados
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Celular</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importedData.map((item, index) => (
                            <TableRow key={index} className={cn(!item.valid && "bg-destructive/5")}>
                              <TableCell>
                                {item.valid ? (
                                  <Badge className="bg-emerald-100 text-emerald-600 border-0">
                                    <Check className="h-3 w-3 mr-1" />
                                    Valido
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="border-0">
                                    <X className="h-3 w-3 mr-1" />
                                    {item.error || "Erro"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{item.nome}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatPhone(item.celular)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeImported(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {importedData.filter(d => d.valid).length} de {importedData.length} registros validos
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Continue Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/eventos/${eventoId}`)}
          >
            Cancelar
          </Button>
          <Button onClick={handleContinue} disabled={saving || totalSelected === 0}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Proximo: Revisar e Disparar
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
