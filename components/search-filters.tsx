"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { formatCurrency } from "@/lib/data"

interface SearchFiltersProps {
  search: string
  setSearch: (value: string) => void
  cidade: string
  setCidade: (value: string) => void
  tipo: string
  setTipo: (value: string) => void
  precoRange: [number, number]
  setPrecoRange: (value: [number, number]) => void
  cidades: string[]
  quartos?: string
  setQuartos?: (value: string) => void
  statusUnidade?: string
  setStatusUnidade?: (value: string) => void
  ordenacao?: string
  setOrdenacao?: (value: string) => void
}

export function SearchFilters({
  search,
  setSearch,
  cidade,
  setCidade,
  tipo,
  setTipo,
  precoRange,
  setPrecoRange,
  cidades,
  quartos,
  setQuartos,
  statusUnidade,
  setStatusUnidade,
  ordenacao,
  setOrdenacao,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const hasActiveFilters =
    cidade !== "todas" ||
    tipo !== "todos" ||
    precoRange[0] > 0 ||
    precoRange[1] < 3000000 ||
    (quartos && quartos !== "todos") ||
    (statusUnidade && statusUnidade !== "todos")

  const clearFilters = () => {
    setCidade("todas")
    setTipo("todos")
    setPrecoRange([0, 3000000])
    setSearch("")
    setQuartos?.("todos")
    setStatusUnidade?.("todos")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empreendimento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative shrink-0 bg-transparent">
                <SlidersHorizontal className="h-4 w-4" />
                {hasActiveFilters && <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />}
                <span className="sr-only">Filtros</span>
              </Button>
            </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <Select value={cidade} onValueChange={setCidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as cidades</SelectItem>
                    {cidades.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Imóvel</label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">Faixa de Preço</label>
                <Slider
                  value={precoRange}
                  onValueChange={(value) => setPrecoRange(value as [number, number])}
                  min={0}
                  max={3000000}
                  step={50000}
                  className="mt-2"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatCurrency(precoRange[0])}</span>
                  <span>{formatCurrency(precoRange[1])}</span>
                </div>
              </div>

              {setQuartos && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quartos</label>
                  <Select value={quartos || "todos"} onValueChange={setQuartos}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="1">1 quarto</SelectItem>
                      <SelectItem value="2">2 quartos</SelectItem>
                      <SelectItem value="3">3 quartos</SelectItem>
                      <SelectItem value="4">4+ quartos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {setStatusUnidade && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusUnidade || "todos"} onValueChange={setStatusUnidade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="vendido">Vendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {setOrdenacao && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordenar por</label>
                  <Select value={ordenacao || "relevancia"} onValueChange={setOrdenacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Relevância" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevancia">Relevância</SelectItem>
                      <SelectItem value="preco-menor">Menor preço</SelectItem>
                      <SelectItem value="preco-maior">Maior preço</SelectItem>
                      <SelectItem value="disponiveis">Mais disponíveis</SelectItem>
                      <SelectItem value="entrega">Entrega mais próxima</SelectItem>
                      <SelectItem value="lancamento">Lançamentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={clearFilters}>
                  Limpar
                </Button>
                <Button className="flex-1" onClick={() => setIsOpen(false)}>
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

        {/* Quick Filter Chips */}
        {setStatusUnidade && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={statusUnidade === "disponivel" ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => setStatusUnidade(statusUnidade === "disponivel" ? "todos" : "disponivel")}
            >
              Disponível
            </Badge>
            <Badge
              variant={statusUnidade === "reservado" ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105"
              onClick={() => setStatusUnidade(statusUnidade === "reservado" ? "todos" : "reservado")}
            >
              Reservado
            </Badge>
            {setOrdenacao && (
              <Badge
                variant={ordenacao === "entrega" ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => setOrdenacao(ordenacao === "entrega" ? "relevancia" : "entrega")}
              >
                Entrega Próxima
              </Badge>
            )}
            {setOrdenacao && (
              <Badge
                variant={ordenacao === "lancamento" ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => setOrdenacao(ordenacao === "lancamento" ? "relevancia" : "lancamento")}
              >
                Lançamentos
              </Badge>
            )}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 animate-in fade-in-0 slide-in-from-top-2">
          {cidade !== "todas" && (
            <Badge variant="secondary" className="gap-1">
              {cidade}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => setCidade("todas")} />
            </Badge>
          )}
          {tipo !== "todos" && (
            <Badge variant="secondary" className="gap-1">
              {tipo === "apartamento" ? "Apartamento" : tipo === "casa" ? "Casa" : "Comercial"}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => setTipo("todos")} />
            </Badge>
          )}
          {(precoRange[0] > 0 || precoRange[1] < 3000000) && (
            <Badge variant="secondary" className="gap-1">
              {formatCurrency(precoRange[0])} - {formatCurrency(precoRange[1])}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => setPrecoRange([0, 3000000])} />
            </Badge>
          )}
          {quartos && quartos !== "todos" && (
            <Badge variant="secondary" className="gap-1">
              {quartos === "4" ? "4+ quartos" : `${quartos} quarto${quartos === "1" ? "" : "s"}`}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => setQuartos?.("todos")} />
            </Badge>
          )}
          {statusUnidade && statusUnidade !== "todos" && statusUnidade !== "disponivel" && statusUnidade !== "reservado" && (
            <Badge variant="secondary" className="gap-1">
              {statusUnidade === "vendido" ? "Vendido" : statusUnidade}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => setStatusUnidade?.("todos")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
