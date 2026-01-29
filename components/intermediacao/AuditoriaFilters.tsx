"use client"

import { useState, useCallback } from "react"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Calendar as CalendarIcon,
  Filter,
  X,
  Search,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type {
  AuditoriaFilters as AuditoriaFiltersType,
  OperacaoAuditoria,
  EntidadeAuditoria,
} from "./types"

interface Usuario {
  id: string
  nome: string
  email?: string
}

interface AuditoriaFiltersProps {
  filters: AuditoriaFiltersType
  onChange: (filters: AuditoriaFiltersType) => void
  usuarios?: Usuario[]
  loading?: boolean
}

const operacaoOptions: { value: OperacaoAuditoria; label: string; color: string }[] = [
  { value: "create", label: "Criacao", color: "bg-emerald-500" },
  { value: "update", label: "Atualizacao", color: "bg-blue-500" },
  { value: "delete", label: "Remocao", color: "bg-red-500" },
]

const entidadeOptions: { value: EntidadeAuditoria; label: string }[] = [
  { value: "vendas", label: "Vendas" },
  { value: "beneficiarios", label: "Beneficiarios" },
  { value: "parcelas", label: "Parcelas" },
  { value: "pagamentos", label: "Pagamentos" },
  { value: "comissoes", label: "Comissoes" },
  { value: "distribuicoes", label: "Distribuicoes" },
]

interface PresetPeriodo {
  label: string
  getValue: () => { inicio: Date; fim: Date }
}

const presetPeriodos: PresetPeriodo[] = [
  {
    label: "Hoje",
    getValue: () => {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const fim = new Date()
      fim.setHours(23, 59, 59, 999)
      return { inicio: hoje, fim }
    },
  },
  {
    label: "Ultimos 7 dias",
    getValue: () => {
      const fim = new Date()
      fim.setHours(23, 59, 59, 999)
      const inicio = subDays(new Date(), 7)
      inicio.setHours(0, 0, 0, 0)
      return { inicio, fim }
    },
  },
  {
    label: "Ultimos 30 dias",
    getValue: () => {
      const fim = new Date()
      fim.setHours(23, 59, 59, 999)
      const inicio = subDays(new Date(), 30)
      inicio.setHours(0, 0, 0, 0)
      return { inicio, fim }
    },
  },
  {
    label: "Este mes",
    getValue: () => {
      const hoje = new Date()
      return {
        inicio: startOfMonth(hoje),
        fim: endOfMonth(hoje),
      }
    },
  },
  {
    label: "Mes passado",
    getValue: () => {
      const mesPassado = subMonths(new Date(), 1)
      return {
        inicio: startOfMonth(mesPassado),
        fim: endOfMonth(mesPassado),
      }
    },
  },
]

export function AuditoriaFilters({
  filters,
  onChange,
  usuarios = [],
  loading = false,
}: AuditoriaFiltersProps) {
  const [searchUsuario, setSearchUsuario] = useState("")
  const [usuarioPopoverOpen, setUsuarioPopoverOpen] = useState(false)

  const handleOperacaoToggle = useCallback(
    (operacao: OperacaoAuditoria) => {
      const operacoes = filters.operacoes || []
      const novasOperacoes = operacoes.includes(operacao)
        ? operacoes.filter((o) => o !== operacao)
        : [...operacoes, operacao]

      onChange({
        ...filters,
        operacoes: novasOperacoes.length > 0 ? novasOperacoes : undefined,
      })
    },
    [filters, onChange]
  )

  const handleEntidadeToggle = useCallback(
    (entidade: EntidadeAuditoria) => {
      const entidades = filters.entidades || []
      const novasEntidades = entidades.includes(entidade)
        ? entidades.filter((e) => e !== entidade)
        : [...entidades, entidade]

      onChange({
        ...filters,
        entidades: novasEntidades.length > 0 ? novasEntidades : undefined,
      })
    },
    [filters, onChange]
  )

  const handlePresetSelect = useCallback(
    (preset: PresetPeriodo) => {
      const { inicio, fim } = preset.getValue()
      onChange({
        ...filters,
        periodoInicio: inicio,
        periodoFim: fim,
      })
    },
    [filters, onChange]
  )

  const handleUsuarioSelect = useCallback(
    (usuario: Usuario | null) => {
      onChange({
        ...filters,
        usuarioId: usuario?.id,
      })
      setUsuarioPopoverOpen(false)
      setSearchUsuario("")
    },
    [filters, onChange]
  )

  const handleLimparFiltros = useCallback(() => {
    onChange({})
  }, [onChange])

  const filtrosAtivos = [
    filters.periodoInicio && filters.periodoFim ? 1 : 0,
    filters.operacoes?.length || 0,
    filters.entidades?.length || 0,
    filters.usuarioId ? 1 : 0,
    filters.registroId ? 1 : 0,
    filters.apenasCriticos ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchUsuario.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchUsuario.toLowerCase())
  )

  const usuarioSelecionado = usuarios.find((u) => u.id === filters.usuarioId)

  return (
    <div className="space-y-4">
      {/* Header com contador de filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {filtrosAtivos > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filtrosAtivos} ativo{filtrosAtivos > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {filtrosAtivos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLimparFiltros}
            className="h-8 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Periodo */}
        <div className="space-y-2">
          <Label className="text-xs">Periodo</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !filters.periodoInicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.periodoInicio && filters.periodoFim ? (
                  <span className="text-xs">
                    {format(filters.periodoInicio, "dd/MM/yy")} -{" "}
                    {format(filters.periodoFim, "dd/MM/yy")}
                  </span>
                ) : (
                  <span className="text-xs">Selecionar periodo</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 border-b">
                <div className="grid grid-cols-2 gap-1">
                  {presetPeriodos.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs justify-start"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Calendar
                mode="range"
                selected={{
                  from: filters.periodoInicio,
                  to: filters.periodoFim,
                }}
                onSelect={(range) => {
                  onChange({
                    ...filters,
                    periodoInicio: range?.from,
                    periodoFim: range?.to,
                  })
                }}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Operacao */}
        <div className="space-y-2">
          <Label className="text-xs">Operacao</Label>
          <div className="flex flex-wrap gap-2">
            {operacaoOptions.map((op) => {
              const isChecked = filters.operacoes?.includes(op.value) || false
              return (
                <label
                  key={op.value}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-colors text-xs",
                    isChecked
                      ? "border-primary bg-primary/10"
                      : "border-input hover:bg-muted"
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => handleOperacaoToggle(op.value)}
                    className="h-3 w-3"
                  />
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      op.color
                    )}
                  />
                  <span>{op.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Entidade */}
        <div className="space-y-2">
          <Label className="text-xs">Entidade</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start h-9"
              >
                <span className="text-xs truncate">
                  {filters.entidades && filters.entidades.length > 0
                    ? `${filters.entidades.length} selecionada${
                        filters.entidades.length > 1 ? "s" : ""
                      }`
                    : "Todas as entidades"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                {entidadeOptions.map((ent) => {
                  const isChecked =
                    filters.entidades?.includes(ent.value) || false
                  return (
                    <label
                      key={ent.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleEntidadeToggle(ent.value)}
                      />
                      <span className="text-sm">{ent.label}</span>
                    </label>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Usuario */}
        <div className="space-y-2">
          <Label className="text-xs">Usuario</Label>
          <Popover open={usuarioPopoverOpen} onOpenChange={setUsuarioPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start h-9",
                  !filters.usuarioId && "text-muted-foreground"
                )}
              >
                {usuarioSelecionado ? (
                  <span className="flex items-center gap-2 text-xs">
                    {usuarioSelecionado.nome}
                    <X
                      className="h-3 w-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUsuarioSelect(null)
                      }}
                    />
                  </span>
                ) : (
                  <span className="text-xs">Todos os usuarios</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchUsuario}
                    onChange={(e) => setSearchUsuario(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {usuariosFiltrados.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Nenhum usuario encontrado
                  </div>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <button
                      key={usuario.id}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                        filters.usuarioId === usuario.id && "bg-muted"
                      )}
                      onClick={() => handleUsuarioSelect(usuario)}
                    >
                      <div className="font-medium">{usuario.nome}</div>
                      {usuario.email && (
                        <div className="text-xs text-muted-foreground">
                          {usuario.email}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* ID do Registro */}
        <div className="space-y-2">
          <Label className="text-xs">ID do Registro</Label>
          <Input
            placeholder="Buscar por ID..."
            value={filters.registroId || ""}
            onChange={(e) =>
              onChange({
                ...filters,
                registroId: e.target.value || undefined,
              })
            }
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Checkbox apenas criticos */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="apenas-criticos"
          checked={filters.apenasCriticos || false}
          onCheckedChange={(checked) =>
            onChange({
              ...filters,
              apenasCriticos: checked as boolean || undefined,
            })
          }
        />
        <label
          htmlFor="apenas-criticos"
          className="text-sm cursor-pointer select-none"
        >
          Mostrar apenas operacoes criticas
        </label>
      </div>
    </div>
  )
}
