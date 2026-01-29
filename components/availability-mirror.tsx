"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, type Unidade } from "@/lib/data"
import { Building2, Home, Square, Bed, Car, X } from "lucide-react"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { Button } from "@/components/ui/button"

interface AvailabilityMirrorProps {
    unidades: Unidade[]
    onSimular?: (valor: number, unitId?: string) => void
}

export function AvailabilityMirror({ unidades, onSimular }: AvailabilityMirrorProps) {
    const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)

    // Extrair finais únicos e ordenar (01, 02, 03... 08)
    const finaisUnicos = useMemo(() => {
        const finais = [...new Set(unidades.map(u => String(u.final || "")))]
        return finais.sort((a, b) => {
            const numA = parseInt(a) || 0
            const numB = parseInt(b) || 0
            return numA - numB
        })
    }, [unidades])

    // Extrair andares únicos e ordenar (do mais alto para o mais baixo)
    const andaresUnicos = useMemo(() => {
        const andares = [...new Set(unidades.map(u => u.andar ?? 0))]
        return andares.sort((a, b) => b - a)
    }, [unidades])

    // Criar mapa de unidades para acesso rápido: andar-final -> unidade
    const unidadesMap = useMemo(() => {
        const map = new Map<string, Unidade>()
        unidades.forEach(u => {
            const key = `${u.andar}-${u.final}`
            map.set(key, u)
        })
        return map
    }, [unidades])

    // Filtrar por status se necessário
    const unidadesFiltradas = filterStatus
        ? unidades.filter(u => u.status === filterStatus)
        : unidades

    const getStatusColor = (status: string) => {
        switch (status) {
            case "disponivel":
                return "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30"
            case "reservado":
                return "bg-amber-500 hover:bg-amber-400 shadow-amber-500/30"
            case "vendido":
                return "bg-slate-400 hover:bg-slate-300 shadow-slate-400/30"
            default:
                return "bg-muted hover:bg-muted/80"
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "disponivel":
                return "Disponível"
            case "reservado":
                return "Reservado"
            case "vendido":
                return "Vendido"
            default:
                return status
        }
    }

    const totalUnidades = unidades.length
    const disponiveis = unidades.filter((u) => u.status === "disponivel").length
    const reservadas = unidades.filter((u) => u.status === "reservado").length
    const vendidas = unidades.filter((u) => u.status === "vendido").length

    const numColunas = finaisUnicos.length

    return (
        <div className="space-y-6">
            {/* Estatísticas clicáveis para filtrar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setFilterStatus(null)}
                    className={cn(
                        "text-center p-4 rounded-xl border-2 transition-all",
                        filterStatus === null
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border bg-card hover:border-primary/50"
                    )}
                >
                    <p className="text-3xl font-black">{totalUnidades}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total</p>
                </button>
                <button
                    onClick={() => setFilterStatus(filterStatus === "disponivel" ? null : "disponivel")}
                    className={cn(
                        "text-center p-4 rounded-xl border-2 transition-all",
                        filterStatus === "disponivel"
                            ? "border-emerald-500 bg-emerald-500/10 shadow-md"
                            : "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500"
                    )}
                >
                    <p className="text-3xl font-black text-emerald-600">{disponiveis}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Disponíveis</p>
                </button>
                <button
                    onClick={() => setFilterStatus(filterStatus === "reservado" ? null : "reservado")}
                    className={cn(
                        "text-center p-4 rounded-xl border-2 transition-all",
                        filterStatus === "reservado"
                            ? "border-amber-500 bg-amber-500/10 shadow-md"
                            : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500"
                    )}
                >
                    <p className="text-3xl font-black text-amber-600">{reservadas}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Reservadas</p>
                </button>
                <button
                    onClick={() => setFilterStatus(filterStatus === "vendido" ? null : "vendido")}
                    className={cn(
                        "text-center p-4 rounded-xl border-2 transition-all",
                        filterStatus === "vendido"
                            ? "border-slate-500 bg-slate-500/10 shadow-md"
                            : "border-slate-500/30 bg-slate-500/5 hover:border-slate-500"
                    )}
                >
                    <p className="text-3xl font-black text-slate-500">{vendidas}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Vendidas</p>
                </button>
            </div>

            {/* Espelho Visual - Parece um Prédio */}
            <div className="grid lg:grid-cols-[1fr,380px] gap-6">
                <Card className="overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    Espelho de Vendas
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {numColunas} unidades por andar · {andaresUnicos.length} andares
                                </p>
                            </div>
                            {filterStatus && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setFilterStatus(null)}
                                    className="gap-2"
                                >
                                    <X className="h-3 w-3" />
                                    Limpar filtro
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {/* Cabeçalho com finais */}
                        <div className="flex gap-1 mb-2 pl-14">
                            {finaisUnicos.map(final => (
                                <div
                                    key={final}
                                    className="flex-1 text-center text-xs font-bold text-muted-foreground py-1"
                                >
                                    {final}
                                </div>
                            ))}
                        </div>

                        {/* Grid do Prédio */}
                        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                            {andaresUnicos.map((andar) => (
                                <div key={andar} className="flex items-center gap-2">
                                    {/* Número do Andar */}
                                    <div className="w-12 shrink-0 text-right pr-2">
                                        <span className="text-sm font-bold text-primary">{andar}º</span>
                                    </div>

                                    {/* Unidades do Andar */}
                                    <div className="flex-1 flex gap-1">
                                        {finaisUnicos.map(final => {
                                            const unidade = unidadesMap.get(`${andar}-${final}`)

                                            if (!unidade) {
                                                // Célula vazia se não existir unidade nessa posição
                                                return (
                                                    <div
                                                        key={final}
                                                        className="flex-1 aspect-square rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20"
                                                    />
                                                )
                                            }

                                            // Verificar se está filtrado
                                            const isFiltered = filterStatus !== null && unidade.status !== filterStatus
                                            const isSelected = selectedUnidade?.id === unidade.id

                                            return (
                                                <button
                                                    key={final}
                                                    onClick={() => setSelectedUnidade(unidade)}
                                                    disabled={isFiltered}
                                                    className={cn(
                                                        "flex-1 aspect-square rounded-lg transition-all duration-200 relative",
                                                        "flex items-center justify-center",
                                                        "shadow-md hover:shadow-lg",
                                                        getStatusColor(unidade.status),
                                                        isSelected && "ring-2 ring-primary ring-offset-2 scale-105 z-10",
                                                        isFiltered && "opacity-20 cursor-not-allowed",
                                                        !isFiltered && "hover:scale-105 active:scale-95 cursor-pointer"
                                                    )}
                                                >
                                                    <span className="text-white font-bold text-sm drop-shadow-sm">
                                                        {andar}{final}
                                                    </span>
                                                    {/* Indicador de disponível */}
                                                    {unidade.status === "disponivel" && !isFiltered && (
                                                        <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Legenda */}
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t justify-center">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-emerald-500 shadow-sm" />
                                <span className="text-xs text-muted-foreground">Disponível</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-amber-500 shadow-sm" />
                                <span className="text-xs text-muted-foreground">Reservado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-slate-400 shadow-sm" />
                                <span className="text-xs text-muted-foreground">Vendido</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalhes da Unidade Selecionada */}
                <div>
                    {selectedUnidade ? (
                        <Card className="sticky top-24 border-2 border-primary/20 overflow-hidden shadow-lg animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Header com número da unidade */}
                            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm opacity-80 font-medium">Unidade</p>
                                        <h3 className="text-4xl font-black">
                                            {selectedUnidade.andar}{selectedUnidade.final}
                                        </h3>
                                    </div>
                                    <Badge className={cn(
                                        "text-sm px-3 py-1",
                                        selectedUnidade.status === "disponivel" ? "bg-emerald-500" :
                                            selectedUnidade.status === "reservado" ? "bg-amber-500" : "bg-slate-400"
                                    )}>
                                        {getStatusLabel(selectedUnidade.status)}
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-5">
                                {/* Características */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 rounded-xl bg-secondary/50">
                                        <Square className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{selectedUnidade.metragem}</p>
                                        <p className="text-xs text-muted-foreground">m²</p>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-secondary/50">
                                        <Bed className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{selectedUnidade.quartos}</p>
                                        <p className="text-xs text-muted-foreground">quartos</p>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-secondary/50">
                                        <Car className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{selectedUnidade.vagas}</p>
                                        <p className="text-xs text-muted-foreground">vagas</p>
                                    </div>
                                </div>

                                {/* Tipo da unidade */}
                                {selectedUnidade.tipo && (
                                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</p>
                                        <p className="font-semibold">{selectedUnidade.tipo}</p>
                                    </div>
                                )}

                                {/* Valor */}
                                <div className="pt-3 border-t">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Valor</p>
                                    <p className="text-3xl font-black text-primary">
                                        {formatCurrency(selectedUnidade.valor)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(selectedUnidade.valor / selectedUnidade.metragem)}/m²
                                    </p>
                                </div>

                                {/* Ações */}
                                <div className="space-y-3 pt-3">
                                    {selectedUnidade.status === "disponivel" && onSimular && (
                                        <Button
                                            onClick={() => onSimular(selectedUnidade.valor, selectedUnidade.id)}
                                            className="w-full h-12 font-bold text-base"
                                        >
                                            Simular Financiamento
                                        </Button>
                                    )}
                                    <WhatsAppButton
                                        message={`Olá! Tenho interesse na unidade ${selectedUnidade.andar}${selectedUnidade.final} de ${selectedUnidade.metragem}m² (${formatCurrency(selectedUnidade.valor)}). Gostaria de mais informações.`}
                                        variant="outline"
                                        className="w-full h-12 font-semibold"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="sticky top-24 border-dashed border-2 bg-muted/5">
                            <CardContent className="flex flex-col items-center justify-center text-center py-16">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                    <Home className="h-8 w-8 text-primary/60" />
                                </div>
                                <p className="text-muted-foreground font-medium">
                                    Selecione uma unidade
                                </p>
                                <p className="text-sm text-muted-foreground/60 mt-1">
                                    Clique no espelho para ver detalhes
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
