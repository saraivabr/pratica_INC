"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Filter,
  Grid3X3,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  UserCircle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface Beneficiario {
  id: string
  tipo_pessoa: "fisica" | "juridica"
  nome: string
  documento: string
  cargo: "corretor" | "gerente" | "proprietario" | "imobiliaria" | "outro"
  email: string
  telefone?: string
  is_active: boolean
  total_a_receber: number
  total_pendente: number
  total_pago: number
  created_at: string
}

type ViewMode = "grid" | "list"
type CargoFilter = "todos" | "corretor" | "gerente" | "proprietario" | "imobiliaria"

const ITEMS_PER_PAGE = 12

// Funcao para mascarar documento
function maskDocument(doc: string, tipo: "fisica" | "juridica"): string {
  if (tipo === "fisica") {
    // CPF: 123.456.789-00 -> 123.***.***-00
    return doc.replace(/^(\d{3})\.(\d{3})\.(\d{3})-(\d{2})$/, "$1.***.***-$4")
  } else {
    // CNPJ: 12.345.678/0001-90 -> 12.***.***/****-90
    return doc.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})$/, "$1.***.***/****-$5")
  }
}

// Funcao para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Mapa de labels para cargo
const cargoLabels: Record<string, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  proprietario: "Proprietario",
  imobiliaria: "Imobiliaria",
  outro: "Outro",
}

export default function BeneficiariosPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [cargoFilter, setCargoFilter] = useState<CargoFilter>("todos")
  const [showOnlyActive, setShowOnlyActive] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchBeneficiarios()
    }
  }, [hasAccess])

  const fetchBeneficiarios = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/intermediacao/beneficiarios")
      if (res.ok) {
        const data = await res.json()
        setBeneficiarios(data.beneficiarios || [])
      }
    } catch (error) {
      console.error("Error fetching beneficiarios:", error)
    }
    setLoading(false)
  }

  // Filtragem
  const filteredBeneficiarios = useMemo(() => {
    let result = beneficiarios

    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (b) =>
          b.nome.toLowerCase().includes(search) ||
          b.documento.includes(search)
      )
    }

    // Filtro de cargo
    if (cargoFilter !== "todos") {
      result = result.filter((b) => b.cargo === cargoFilter)
    }

    // Filtro de ativos
    if (showOnlyActive) {
      result = result.filter((b) => b.is_active)
    }

    return result
  }, [beneficiarios, searchTerm, cargoFilter, showOnlyActive])

  // Paginacao
  const totalPages = Math.ceil(filteredBeneficiarios.length / ITEMS_PER_PAGE)
  const paginatedBeneficiarios = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredBeneficiarios.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredBeneficiarios, currentPage])

  // Reset pagina quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, cargoFilter, showOnlyActive])

  if (!authLoading && isAuthenticated && !hasAccess) {
    return (
      <AppShell title="Acesso Negado">
        <div className="container px-4 py-12 animate-page-in">
          <div className="max-w-md mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AppShell title="Beneficiarios">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Beneficiarios</h1>
            <p className="text-muted-foreground">
              {loading
                ? "Carregando..."
                : `${filteredBeneficiarios.length} beneficiario(s) encontrado(s)`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/admin/intermediacao/beneficiarios/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Beneficiario
            </Button>
            <Button variant="outline" size="sm" onClick={fetchBeneficiarios} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Busca */}
              <div className="relative flex-1 w-full md:max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar nome/documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtro de Cargo */}
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Cargo:</Label>
                <Select
                  value={cargoFilter}
                  onValueChange={(v) => setCargoFilter(v as CargoFilter)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="corretor">Corretor</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="proprietario">Proprietario</SelectItem>
                    <SelectItem value="imobiliaria">Imobiliaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Ativos */}
              <div className="flex items-center gap-2">
                <Switch
                  id="show-active"
                  checked={showOnlyActive}
                  onCheckedChange={setShowOnlyActive}
                />
                <Label htmlFor="show-active" className="text-sm cursor-pointer">
                  Ativos
                </Label>
              </div>

              {/* Alternar View */}
              <div className="flex border rounded-lg p-1 bg-muted/30 ml-auto">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 h-8"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 h-8"
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="h-4 w-4" />
                  Lista
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteudo */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedBeneficiarios.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <UserCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum beneficiario encontrado</p>
                {(searchTerm || cargoFilter !== "todos" || !showOnlyActive) && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchTerm("")
                      setCargoFilter("todos")
                      setShowOnlyActive(true)
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedBeneficiarios.map((beneficiario) => (
              <Card
                key={beneficiario.id}
                className={cn(
                  "relative transition-all hover:shadow-md",
                  !beneficiario.is_active && "opacity-60"
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                        beneficiario.tipo_pessoa === "fisica"
                          ? "bg-primary/10"
                          : "bg-amber-500/10"
                      )}
                    >
                      {beneficiario.tipo_pessoa === "fisica" ? (
                        <User className="h-6 w-6 text-primary" />
                      ) : (
                        <Building2 className="h-6 w-6 text-amber-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" title={beneficiario.nome}>
                        {beneficiario.nome}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {cargoLabels[beneficiario.cargo] || beneficiario.cargo}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {beneficiario.tipo_pessoa === "fisica" ? "CPF" : "CNPJ"}:{" "}
                        {maskDocument(beneficiario.documento, beneficiario.tipo_pessoa)}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <Badge variant={beneficiario.is_active ? "default" : "secondary"}>
                      {beneficiario.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  {/* Valores */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">A receber:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(beneficiario.total_a_receber)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pendente:</span>
                      <span className="font-medium text-amber-600">
                        {formatCurrency(beneficiario.total_pendente)}
                      </span>
                    </div>
                  </div>

                  {/* Acoes */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        router.push(`/admin/intermediacao/beneficiarios/${beneficiario.id}`)
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        router.push(
                          `/admin/intermediacao/beneficiarios/${beneficiario.id}?edit=true`
                        )
                      }
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="hidden md:table-cell">Documento</TableHead>
                    <TableHead className="text-right">A Receber</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Pendente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBeneficiarios.map((beneficiario) => (
                    <TableRow
                      key={beneficiario.id}
                      className={cn(!beneficiario.is_active && "opacity-60")}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                              beneficiario.tipo_pessoa === "fisica"
                                ? "bg-primary/10"
                                : "bg-amber-500/10"
                            )}
                          >
                            {beneficiario.tipo_pessoa === "fisica" ? (
                              <User className="h-4 w-4 text-primary" />
                            ) : (
                              <Building2 className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[150px]">
                            {beneficiario.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cargoLabels[beneficiario.cargo] || beneficiario.cargo}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {maskDocument(beneficiario.documento, beneficiario.tipo_pessoa)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(beneficiario.total_a_receber)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600 hidden sm:table-cell">
                        {formatCurrency(beneficiario.total_pendente)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={beneficiario.is_active ? "default" : "secondary"}>
                          {beneficiario.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/admin/intermediacao/beneficiarios/${beneficiario.id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/admin/intermediacao/beneficiarios/${beneficiario.id}?edit=true`
                              )
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Paginacao */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
