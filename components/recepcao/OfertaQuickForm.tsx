"use client"

import { useState, useEffect } from "react"
import {
  Phone,
  MessageSquare,
  Building2,
  QrCode,
  User,
  Loader2,
  Check,
  Search,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

// Origens de contato com icones e labels
const ORIGENS_CONTATO = [
  { value: "ligacao", label: "Ligacao", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "presencial", label: "Presencial", icon: User },
  { value: "facebook", label: "Facebook", icon: () => <span className="text-sm">f</span> },
  { value: "instagram", label: "Instagram", icon: () => <span className="text-sm">IG</span> },
  { value: "qr_terreno", label: "QR Terreno", icon: QrCode },
] as const

type OrigemContato = typeof ORIGENS_CONTATO[number]["value"]

interface Empreendimento {
  id: string
  nome: string
  cidade?: string
  bairro?: string
}

interface OfertaQuickFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    empreendimento_id: number | null
    empreendimento_nome: string
    lead_origem: OrigemContato
    lead_telefone?: string
    lead_nome?: string
  }) => Promise<void>
  isLoading?: boolean
}

export function OfertaQuickForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: OfertaQuickFormProps) {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(false)
  const [selectedEmpreendimento, setSelectedEmpreendimento] = useState<Empreendimento | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedOrigem, setSelectedOrigem] = useState<OrigemContato | null>(null)
  const [telefone, setTelefone] = useState("")
  const [nome, setNome] = useState("")

  // Buscar empreendimentos
  useEffect(() => {
    if (open && empreendimentos.length === 0) {
      setLoadingEmpreendimentos(true)
      fetch("/api/empreendimentos")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setEmpreendimentos(data.data)
          }
        })
        .catch(console.error)
        .finally(() => setLoadingEmpreendimentos(false))
    }
  }, [open, empreendimentos.length])

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setSelectedEmpreendimento(null)
      setSelectedOrigem(null)
      setTelefone("")
      setNome("")
    }
  }, [open])

  const handleSubmit = async () => {
    if (!selectedEmpreendimento || !selectedOrigem) return

    await onSubmit({
      empreendimento_id: parseInt(selectedEmpreendimento.id) || null,
      empreendimento_nome: selectedEmpreendimento.nome,
      lead_origem: selectedOrigem,
      lead_telefone: telefone || undefined,
      lead_nome: nome || undefined,
    })
  }

  const formatPhone = (value: string) => {
    // Remove tudo que nao e numero
    const numbers = value.replace(/\D/g, "")
    // Formatar como (XX) XXXXX-XXXX
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const isValid = selectedEmpreendimento && selectedOrigem

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Registrar Oferta</SheetTitle>
          <SheetDescription>
            Cada contato conta. Registre e suba na fila.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Empreendimento - Combobox */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Empreendimento <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Qual produto voce ofereceu?
            </p>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between h-12"
                  disabled={loadingEmpreendimentos}
                >
                  {loadingEmpreendimentos ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : selectedEmpreendimento ? (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {selectedEmpreendimento.nome}
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Buscar empreendimento...
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar empreendimento..." />
                  <CommandList>
                    <CommandEmpty>Nenhum empreendimento encontrado.</CommandEmpty>
                    <CommandGroup>
                      {empreendimentos.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={emp.nome}
                          onSelect={() => {
                            setSelectedEmpreendimento(emp)
                            setOpenCombobox(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">{emp.nome}</p>
                            {(emp.cidade || emp.bairro) && (
                              <p className="text-xs text-muted-foreground">
                                {[emp.bairro, emp.cidade].filter(Boolean).join(", ")}
                              </p>
                            )}
                          </div>
                          {selectedEmpreendimento?.id === emp.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Origem do contato - Chips */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Origem do contato <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {ORIGENS_CONTATO.map((origem) => {
                const Icon = origem.icon
                const isSelected = selectedOrigem === origem.value
                return (
                  <button
                    key={origem.value}
                    type="button"
                    onClick={() => setSelectedOrigem(origem.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all",
                      "text-sm font-medium",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {origem.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Telefone - Opcional */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Telefone (opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Para acompanhar depois
            </p>
            <Input
              type="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
              className="h-12"
            />
          </div>

          {/* Nome - Opcional */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome do contato (opcional)</Label>
            <Input
              type="text"
              placeholder="Nome do cliente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Botao Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="w-full h-14 text-lg gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Registrar Oferta
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
