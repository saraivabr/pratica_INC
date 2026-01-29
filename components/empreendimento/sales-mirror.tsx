"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatCurrency, type Unidade } from "@/lib/data"
import { Building2, Home, Square, Bed, Car, X, MousePointerClick } from "lucide-react"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { Button } from "@/components/ui/button"

interface SalesMirrorProps {
    unidades: Unidade[]
    onSimular?: (valor: number, unitId?: string) => void
}

export function SalesMirror({ unidades, onSimular }: SalesMirrorProps) {
    const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null)
    const [filterStatus, setFilterStatus] = useState<string | null>(null)

    // Extrair finais únicos e ordenar (01, 02, 03... 08)
    const finaisUnicos = useMemo(() => {
        const finais = [...new Set(unidades.map(u => String(u.final || "")))]
        return finais.sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Estatísticas clicáveis para filtrar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setFilterStatus(null)}
                    className={cn(
                        "text-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
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
                        "text-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
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
                        "text-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
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
                        "text-center p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
                        filterStatus === "vendido"
                            ? "border-slate-500 bg-slate-500/10 shadow-md"
                            : "border-slate-500/30 bg-slate-500/5 hover:border-slate-500"
                    )}
                >
                    <p className="text-3xl font-black text-slate-500">{vendidas}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Vendidas</p>
                </button>
            </div>

            {/* Espelho Visual - Layout Split */}
            <div className="grid lg:grid-cols-[1fr,380px] gap-6">
                <Card className="overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
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
                    <CardContent className="p-6">
                        {/* Cabeçalho com finais */}
                        <div className="flex gap-2 mb-3 pl-14">
                            {finaisUnicos.map(final => (
                                <div
                                    key={final}
                                    className="flex-1 text-center text-xs font-bold text-muted-foreground py-1 bg-muted/50 rounded"
                                >
                                    Final {final}
                                </div>
                            ))}
                        </div>

                        {/* Grid do Prédio */}
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {andaresUnicos.map((andar) => (
                                <div key={andar} className="flex items-center gap-3">
                                    {/* Número do Andar */}
                                    <div className="w-12 shrink-0 text-right pr-2 py-2 border-r border-border/50">
                                        <span className="text-sm font-bold text-primary">{andar}º</span>
                                    </div>

                                    {/* Unidades do Andar */}
                                    <div className="flex-1 flex gap-2">
                                        {finaisUnicos.map(final => {
                                            const unidade = unidadesMap.get(`${andar}-${final}`)

                                            if (!unidade) {
                                                // Célula vazia
                                                return (
                                                    <div
                                                        key={final}
                                                        className="flex-1 aspect-[4/3] rounded-md bg-muted/20 border border-dashed border-muted-foreground/10"
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
                                                    title={`Unidade ${andar}${final} - ${formatCurrency(unidade.valor)}`}
                                                    className={cn(
                                                        "flex-1 aspect-[4/3] rounded-md transition-all duration-300 relative group",
                                                        "flex flex-col items-center justify-center gap-0.5",
                                                        "shadow-sm hover:shadow-md border border-transparent",
                                                        getStatusColor(unidade.status),
                                                        isSelected && "ring-2 ring-primary ring-offset-2 scale-105 z-10 shadow-xl",
                                                        isFiltered && "opacity-20 cursor-not-allowed grayscale",
                                                        !isFiltered && "hover:scale-105 active:scale-95 cursor-pointer"
                                                    )}
                                                >
                                                    <span className="text-white font-bold text-sm drop-shadow-sm">
                                                        {andar}{final}
                                                    </span>
                                                    <span className="text-[10px] text-white/90 hidden sm:inline-block">
                                                        {unidade.metragem}m²
                                                    </span>
                                                    
                                                    {/* Indicador de disponível */}
                                                    {unidade.status === "disponivel" && !isFiltered && (
                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full shadow-sm animate-pulse z-20" />
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Legenda */}
                        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-border/50 justify-center bg-muted/10 rounded-xl p-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-emerald-500 shadow-sm ring-1 ring-emerald-500/50" />
                                <span className="text-xs font-medium text-muted-foreground">Disponível</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-amber-500 shadow-sm ring-1 ring-amber-500/50" />
                                <span className="text-xs font-medium text-muted-foreground">Reservado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-slate-400 shadow-sm ring-1 ring-slate-400/50" />
                                <span className="text-xs font-medium text-muted-foreground">Vendido</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalhes da Unidade Selecionada */}
                <div className="relative">
                    {selectedUnidade ? (
                        <Card className="sticky top-24 border-2 border-primary/20 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Header com número da unidade */}
                            <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/3 -translate-y-1/3">
                                    <Building2 className="w-32 h-32" />
                                </div>
                                
                                <div className="relative z-10 flex items-start justify-between">
                                    <div>
                                        <p className="text-sm opacity-90 font-medium mb-1">Unidade Selecionada</p>
                                        <h3 className="text-5xl font-black tracking-tight">
                                            {selectedUnidade.andar}{selectedUnidade.final}
                                        </h3>
                                    </div>
                                    <Badge className={cn(
                                        "text-sm px-3 py-1.5 shadow-lg border-0",
                                        selectedUnidade.status === "disponivel" ? "bg-emerald-500 hover:bg-emerald-600" :
                                            selectedUnidade.status === "reservado" ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-500 hover:bg-slate-600"
                                    )}>
                                        {getStatusLabel(selectedUnidade.status)}
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                {/* Características */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 rounded-xl bg-secondary/50 border border-border/50">
                                        <Square className="h-5 w-5 mx-auto mb-2 text-primary" />
                                        <p className="text-xl font-bold">{selectedUnidade.metragem}</p>
                                        <p className="text-xs text-muted-foreground font-medium">m² privativos</p>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-secondary/50 border border-border/50">
                                        <Bed className="h-5 w-5 mx-auto mb-2 text-primary" />
                                        <p className="text-xl font-bold">{selectedUnidade.quartos}</p>
                                        <p className="text-xs text-muted-foreground font-medium">quartos</p>
                                    </div>
                                    <div className="text-center p-3 rounded-xl bg-secondary/50 border border-border/50">
                                        <Car className="h-5 w-5 mx-auto mb-2 text-primary" />
                                        <p className="text-xl font-bold">{selectedUnidade.vagas}</p>
                                        <p className="text-xs text-muted-foreground font-medium">vagas</p>
                                    </div>
                                </div>

                                {/* Informações Adicionais */}
                                <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/50">
                                    {selectedUnidade.tipo && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Tipologia</span>
                                            <span className="font-semibold">{selectedUnidade.tipo}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Andar</span>
                                        <span className="font-semibold">{selectedUnidade.andar}º Andar</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Posição</span>
                                        <span className="font-semibold">Final {selectedUnidade.final}</span>
                                    </div>
                                </div>

                                {/* Valor */}
                                <div className="pt-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-bold">Valor de Tabela</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-black text-primary">
                                            {formatCurrency(selectedUnidade.valor)}
                                        </p>
                                    </div>
                                    {selectedUnidade.metragem > 0 && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {formatCurrency(selectedUnidade.valor / selectedUnidade.metragem)}/m²
                                        </p>
                                    )}
                                </div>

                                {/* Ações */}
                                <div className="space-y-3 pt-2">
                                    {selectedUnidade.status === "disponivel" && onSimular && (
                                        <Button
                                            onClick={() => onSimular(selectedUnidade.valor, selectedUnidade.id)}
                                            className="w-full h-12 font-bold text-base shadow-lg shadow-primary/20"
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
                        <Card className="sticky top-24 border-dashed border-2 bg-muted/5 h-full min-h-[400px]">
                            <CardContent className="flex flex-col items-center justify-center text-center h-full py-12">
                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                                    <MousePointerClick className="h-10 w-10 text-primary/60" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Selecione uma unidade</h3>
                                <p className="text-muted-foreground max-w-[200px]">
                                    Clique em qualquer unidade no espelho ao lado para ver todos os detalhes e valores
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
