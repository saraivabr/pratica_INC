"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Edit,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Ban,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Local {
  id: string
  nome: string
  endereco: string | null
  descricao: string | null
  latitude: number | null
  longitude: number | null
  raio_geofence: number
  qr_code_token: string
  is_active: boolean
  created_at: string
}

export default function LocaisPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [localToDelete, setLocalToDelete] = useState<Local | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrData, setQrData] = useState<{
    local_nome: string
    qr_code_image_url: string
    checkin_url: string
  } | null>(null)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (hasAccess) {
      fetchLocais()
    }
  }, [hasAccess])

  const fetchLocais = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/recepcao/locais?includeInactive=true")
      const result = await response.json()

      if (result.success) {
        setLocais(result.data)
      } else {
        toast.error(result.error || "Erro ao carregar locais")
      }
    } catch (error) {
      console.error("Error fetching locais:", error)
      toast.error("Erro ao carregar locais")
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!localToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/recepcao/locais/${localToDelete.id}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (result.success) {
        setLocais(locais.map(l =>
          l.id === localToDelete.id ? { ...l, is_active: false } : l
        ))
        toast.success("Local desativado com sucesso")
      } else {
        toast.error(result.error || "Erro ao desativar local")
      }
    } catch (error) {
      toast.error("Erro ao desativar local")
    }
    setDeleting(false)
    setDeleteDialogOpen(false)
    setLocalToDelete(null)
  }

  const handleShowQr = async (local: Local) => {
    try {
      const response = await fetch(`/api/recepcao/locais/${local.id}/qr-code`)
      const result = await response.json()

      if (result.success) {
        setQrData(result.data)
        setQrDialogOpen(true)
      } else {
        toast.error(result.error || "Erro ao gerar QR Code")
      }
    } catch (error) {
      toast.error("Erro ao gerar QR Code")
    }
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
            <Button onClick={() => router.push("/")}>Voltar para Home</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Locais">
      <div className="container px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Locais de Recepcao</h1>
            <p className="text-muted-foreground">
              Stands e pontos de atendimento
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLocais} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button onClick={() => router.push("/admin/recepcao/locais/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Local
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : locais.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">Nenhum local cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Cadastre seu primeiro local de recepcao
                </p>
                <Button onClick={() => router.push("/admin/recepcao/locais/novo")}>
                  Criar Local
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead>Endereco</TableHead>
                      <TableHead>GPS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locais.map((local) => (
                      <TableRow key={local.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{local.nome}</p>
                              {local.descricao && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {local.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {local.endereco ? (
                            <div className="flex items-center gap-2 max-w-[250px]">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{local.endereco}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {local.latitude && local.longitude ? (
                            <Badge variant="outline" className="text-xs">
                              {local.raio_geofence}m
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Nao configurado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={local.is_active ? "default" : "secondary"}>
                            {local.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/admin/recepcao/locais/${local.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShowQr(local)}>
                                <QrCode className="h-4 w-4 mr-2" />
                                Ver QR Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {local.is_active && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setLocalToDelete(local)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Desativar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desativar Local</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja desativar o local "{localToDelete?.nome}"?
                Plantoes futuros neste local serao afetados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Desativar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code - {qrData?.local_nome}</DialogTitle>
              <DialogDescription>
                Escaneie para fazer check-in
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              {qrData && (
                <>
                  <img
                    src={qrData.qr_code_image_url}
                    alt="QR Code"
                    className="w-64 h-64 border rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground text-center break-all">
                    {qrData.checkin_url}
                  </p>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}
