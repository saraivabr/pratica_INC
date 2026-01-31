"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Bell,
  Ban,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

// Zod schema for form validation
const eventoSchema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(255, "Nome deve ter no maximo 255 caracteres"),
  descricao: z.string().optional(),
  data: z.string().min(1, "Data e obrigatoria"),
  hora: z.string().min(1, "Hora e obrigatoria"),
  local: z.string()
    .min(5, "Local deve ter pelo menos 5 caracteres")
    .max(500, "Local deve ter no maximo 500 caracteres"),
  lembrete_horas: z.string().min(1, "Selecione o lembrete"),
})

type EventoFormData = z.infer<typeof eventoSchema>

const lembreteOptions = [
  { value: "1", label: "1 hora antes" },
  { value: "6", label: "6 horas antes" },
  { value: "12", label: "12 horas antes" },
  { value: "24", label: "24 horas antes (1 dia)" },
  { value: "48", label: "48 horas antes (2 dias)" },
]

export default function NovoEventoPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [saving, setSaving] = useState(false)

  const hasAccess = user && (user.role === "admin" || user.role === "gerente")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<EventoFormData>({
    resolver: zodResolver(eventoSchema),
    mode: "onChange",
    defaultValues: {
      nome: "",
      descricao: "",
      data: "",
      hora: "",
      local: "",
      lembrete_horas: "24",
    },
  })

  const lembreteValue = watch("lembrete_horas")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const onSubmit = async (data: EventoFormData) => {
    setSaving(true)
    try {
      // Combine date and time
      const dataHora = `${data.data}T${data.hora}:00`

      const payload = {
        nome: data.nome,
        descricao: data.descricao || null,
        data_hora: dataHora,
        local: data.local,
        lembrete_horas: parseInt(data.lembrete_horas),
      }

      const response = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao criar evento")
      }

      const eventoId = result.data.id

      toast.success("Evento criado com sucesso!")
      router.push(`/admin/eventos/${eventoId}/convidados`)
    } catch (error) {
      console.error("Error creating evento:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao criar evento")
    }
    setSaving(false)
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0]

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
    <AppShell title="Novo Evento" showBackButton backHref="/admin/eventos">
      <div className="container max-w-2xl px-4 py-6 animate-page-in space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/eventos")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Evento</h1>
            <p className="text-muted-foreground">
              Preencha os dados do evento para criar convites
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              1
            </div>
            <span className="font-medium">Dados do Evento</span>
          </div>
          <div className="h-px flex-1 bg-muted" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-muted flex items-center justify-center font-medium">
              2
            </div>
            <span>Convidados</span>
          </div>
          <div className="h-px flex-1 bg-muted" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-muted flex items-center justify-center font-medium">
              3
            </div>
            <span>Disparar</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informacoes do Evento
              </CardTitle>
              <CardDescription>
                Preencha as informacoes basicas do evento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome do Evento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Lancamento Edificio Aurora"
                  {...register("nome")}
                  className={errors.nome ? "border-destructive" : ""}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome.message}</p>
                )}
              </div>

              {/* Data e Hora */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data">
                    Data <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="data"
                      type="date"
                      min={today}
                      {...register("data")}
                      className={`pl-10 ${errors.data ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.data && (
                    <p className="text-sm text-destructive">{errors.data.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hora">
                    Horario <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hora"
                      type="time"
                      {...register("hora")}
                      className={`pl-10 ${errors.hora ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.hora && (
                    <p className="text-sm text-destructive">{errors.hora.message}</p>
                  )}
                </div>
              </div>

              {/* Local */}
              <div className="space-y-2">
                <Label htmlFor="local">
                  Local <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="local"
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista, Sao Paulo"
                    autoComplete="off"
                    {...register("local")}
                    className={`pl-10 min-h-[80px] ${errors.local ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.local && (
                  <p className="text-sm text-destructive">{errors.local.message}</p>
                )}
              </div>

              {/* Descricao */}
              <div className="space-y-2">
                <Label htmlFor="descricao">
                  Descricao <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="descricao"
                  placeholder="Detalhes adicionais sobre o evento, agenda, o que esperar..."
                  {...register("descricao")}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  A Sofia usara esta descricao para responder duvidas dos convidados
                </p>
              </div>

              {/* Lembrete */}
              <div className="space-y-2">
                <Label htmlFor="lembrete">
                  Lembrete Automatico <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Bell className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={lembreteValue}
                    onValueChange={(value) => setValue("lembrete_horas", value)}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Selecione quando enviar lembrete" />
                    </SelectTrigger>
                    <SelectContent>
                      {lembreteOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Um lembrete sera enviado automaticamente para os confirmados
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/eventos")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Proximo: Selecionar Corretores
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
