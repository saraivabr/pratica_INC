"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ChevronsUpDown, Loader2, Plus, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Beneficiario, CargoBeneficiario } from "../types"
import { mascararDocumento } from "./utils"

interface BeneficiarioSearchSelectProps {
  value?: string
  onChange: (id: string, beneficiario: Beneficiario) => void
  excludeIds?: string[]
  placeholder?: string
  disabled?: boolean
  onCreateNew?: () => void
  fetchBeneficiarios?: (search: string) => Promise<Beneficiario[]>
  beneficiarios?: Beneficiario[] // Lista estatica (alternativa ao fetch)
}

const cargoLabels: Record<CargoBeneficiario, string> = {
  corretor: "Corretor",
  gerente: "Gerente",
  diretor: "Diretor",
  coordenador: "Coordenador",
  proprietario: "Proprietario",
  imobiliaria: "Imobiliaria",
  parceiro: "Parceiro",
  outro: "Outro",
}

export function BeneficiarioSearchSelect({
  value,
  onChange,
  excludeIds = [],
  placeholder = "Selecione um beneficiario...",
  disabled = false,
  onCreateNew,
  fetchBeneficiarios,
  beneficiarios: staticBeneficiarios,
}: BeneficiarioSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>(
    staticBeneficiarios || []
  )
  const [selectedBeneficiario, setSelectedBeneficiario] =
    useState<Beneficiario | null>(null)

  // Busca beneficiarios quando abre ou muda a busca
  const loadBeneficiarios = useCallback(async () => {
    if (staticBeneficiarios) {
      // Filtra lista estatica
      const filtered = staticBeneficiarios.filter(
        (b) =>
          !excludeIds.includes(b.id) &&
          (b.nome.toLowerCase().includes(search.toLowerCase()) ||
            b.documento.includes(search.replace(/\D/g, "")))
      )
      setBeneficiarios(filtered)
      return
    }

    if (!fetchBeneficiarios) return

    setLoading(true)
    try {
      const results = await fetchBeneficiarios(search)
      const filtered = results.filter((b) => !excludeIds.includes(b.id))
      setBeneficiarios(filtered)
    } catch (error) {
      console.error("Erro ao buscar beneficiarios:", error)
      setBeneficiarios([])
    } finally {
      setLoading(false)
    }
  }, [search, excludeIds, fetchBeneficiarios, staticBeneficiarios])

  // Carrega beneficiarios ao abrir
  useEffect(() => {
    if (open) {
      loadBeneficiarios()
    }
  }, [open, loadBeneficiarios])

  // Atualiza o beneficiario selecionado quando o value muda
  useEffect(() => {
    if (value && beneficiarios.length > 0) {
      const found = beneficiarios.find((b) => b.id === value)
      setSelectedBeneficiario(found || null)
    } else if (!value) {
      setSelectedBeneficiario(null)
    }
  }, [value, beneficiarios])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        loadBeneficiarios()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, open, loadBeneficiarios])

  const handleSelect = (beneficiario: Beneficiario) => {
    setSelectedBeneficiario(beneficiario)
    onChange(beneficiario.id, beneficiario)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedBeneficiario && "text-muted-foreground"
          )}
        >
          {selectedBeneficiario ? (
            <div className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedBeneficiario.nome}</span>
              <span className="text-xs text-muted-foreground">
                ({cargoLabels[selectedBeneficiario.cargo]})
              </span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou documento..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum beneficiario encontrado
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {beneficiarios.map((beneficiario) => (
                    <CommandItem
                      key={beneficiario.id}
                      value={beneficiario.id}
                      onSelect={() => handleSelect(beneficiario)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === beneficiario.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {beneficiario.nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {cargoLabels[beneficiario.cargo]}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {beneficiario.tipoPessoa === "PJ" ? "CNPJ" : "CPF"}:{" "}
                          {mascararDocumento(beneficiario.documento)}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>

                {onCreateNew && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setOpen(false)
                          onCreateNew()
                        }}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Criar novo beneficiario</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
