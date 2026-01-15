"use client"

import { useState } from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface Filters {
  status: string[]
  bairro: string[]
}

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  availableBairros: string[]
}

const statusOptions = [
  { value: "em_construcao", label: "Em Construcao" },
  { value: "lancamento", label: "Lancamento" },
  { value: "entregue", label: "Pronto" },
]

export function FilterBar({
  filters,
  onFiltersChange,
  availableBairros,
}: FilterBarProps) {
  const [open, setOpen] = useState(false)

  const activeFiltersCount =
    filters.status.length + filters.bairro.length

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status]
    onFiltersChange({ ...filters, status: newStatus })
  }

  const toggleBairro = (bairro: string) => {
    const newBairro = filters.bairro.includes(bairro)
      ? filters.bairro.filter((b) => b !== bairro)
      : [...filters.bairro, bairro]
    onFiltersChange({ ...filters, bairro: newBairro })
  }

  const clearFilters = () => {
    onFiltersChange({ status: [], bairro: [] })
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="flex-shrink-0">
            <Filter className="w-4 h-4 mr-1.5" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-1.5 h-5 w-5 p-0 justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Filtrar empreendimentos</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6 px-2">
            <div>
              <h4 className="font-medium text-[#1A1A1A] mb-3">Status</h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => toggleStatus(option.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      filters.status.includes(option.value)
                        ? "bg-[#1B4332] text-white"
                        : "bg-[#F0EDE8] text-[#5C5C5C] hover:bg-[#E5E2DC]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-[#1A1A1A] mb-3">Bairro</h4>
              <div className="flex flex-wrap gap-2">
                {availableBairros.map((bairro) => (
                  <button
                    key={bairro}
                    onClick={() => toggleBairro(bairro)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      filters.bairro.includes(bairro)
                        ? "bg-[#1B4332] text-white"
                        : "bg-[#F0EDE8] text-[#5C5C5C] hover:bg-[#E5E2DC]"
                    )}
                  >
                    {bairro}
                  </button>
                ))}
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {filters.status.map((status) => (
        <Badge
          key={status}
          variant="default"
          className="flex-shrink-0 cursor-pointer"
          onClick={() => toggleStatus(status)}
        >
          {statusOptions.find((s) => s.value === status)?.label}
          <X className="w-3 h-3 ml-1" />
        </Badge>
      ))}

      {filters.bairro.map((bairro) => (
        <Badge
          key={bairro}
          variant="default"
          className="flex-shrink-0 cursor-pointer"
          onClick={() => toggleBairro(bairro)}
        >
          {bairro}
          <X className="w-3 h-3 ml-1" />
        </Badge>
      ))}
    </div>
  )
}
