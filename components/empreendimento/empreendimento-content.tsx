"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, MapPin, Sparkles, Calculator, List, LayoutGrid, Info, FileText, Home, Grid3X3, TableProperties, PiggyBank, FolderOpen } from "lucide-react"
import { HeroModern } from "./hero-modern"
import { InteractiveTypology } from "./interactive-typology"
import { SmartSidebar } from "./smart-sidebar"
import { SalesMirror } from "./sales-mirror"
import { LocationSection } from "./location-section"
import { DifferentialsSection } from "./differentials-section"
import { AboutSection } from "./about-section"
import { MateriaisSection } from "./materiais-section"
import { UnitsTable } from "@/components/units-table"
import { ShareButton } from "./share-button"
import { FinancialCalculator } from "@/components/financial-calculator"
import { PaymentConditions } from "@/components/payment-conditions"
import { type Unidade, formatCurrency } from "@/lib/data"

interface EmpreendimentoContentProps {
    empreendimento: any
    unidades: Unidade[]
    series: any[]
    unidadeStats: any
    activeTab?: string
    onTabChange?: (tab: string) => void
    onSimular: (valor: number, unitId?: string) => void
    simulacaoData?: any
    condicoesExibicao?: any[]
    precoMinimo: number
    precoMaximo: number
}

export function EmpreendimentoContent({
    empreendimento,
    unidades,
    series,
    unidadeStats,
    activeTab = "visao-geral",
    onTabChange,
    onSimular,
    simulacaoData,
    condicoesExibicao = [],
    precoMinimo,
    precoMaximo
}: EmpreendimentoContentProps) {
    const [localTab, setLocalTab] = useState(activeTab)
    const [selectedType, setSelectedType] = useState<any>(null)

    const currentTab = onTabChange ? activeTab : localTab
    const handleTabChange = (val: string) => {
        setLocalTab(val)
        onTabChange?.(val)
    }

    const scrollToCalculator = () => {
        handleTabChange("simulacao")
        setTimeout(() => {
            document.getElementById("calculadora-financeira")?.scrollIntoView({ behavior: "smooth" })
        }, 100)
    }

    // Stats Logic - prefer Órulo fields over calculated values
    const unidadesComMetragem = unidades.filter(u => u.metragem && !isNaN(u.metragem) && u.metragem > 0)
    const stats = {
        total: empreendimento.total_unidades || unidades.length,
        disponiveis: empreendimento.unidadesDisponiveis || empreendimento.estoque || unidades.filter(u => u.status === 'disponivel').length,
        priceMin: precoMinimo,
        areaMin: empreendimento.areaMin || (unidadesComMetragem.length > 0 ? Math.min(...unidadesComMetragem.map(u => u.metragem)) : 0),
    }

    const navItems = [
        { value: "visao-geral", label: "Início", icon: Home },
        { value: "espelho", label: "Espelho", icon: Grid3X3 },
        { value: "lista", label: "Lista", icon: TableProperties },
        { value: "simulacao", label: "Simular", icon: PiggyBank },
        { value: "materiais", label: "Materiais", icon: FolderOpen },
    ]

    return (
        <div className="min-h-screen bg-gray-50/50 pb-36 md:pb-20">
            {/* Top Navigation Bar (Desktop Only) */}
            <div className="hidden md:block sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="font-bold text-gray-900 truncate pr-4">
                            {empreendimento.nome}
                        </div>
                        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-auto">
                            <TabsList className="bg-transparent h-full p-0 gap-6">
                                {navItems.map((item) => (
                                    <TabsTrigger
                                        key={item.value}
                                        value={item.value}
                                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-600 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none px-2 h-16 transition-all font-medium text-gray-500 hover:text-emerald-600"
                                    >
                                        {item.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation (Instagram-style) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
                <div className="flex items-center justify-around h-14 sm:h-16 px-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentTab === item.value
                        return (
                            <button
                                key={item.value}
                                onClick={() => handleTabChange(item.value)}
                                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                                    isActive
                                        ? "text-emerald-600"
                                        : "text-gray-400 active:text-gray-600"
                                }`}
                            >
                                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? "stroke-[2.5px]" : ""}`} />
                                <span className={`text-[9px] sm:text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                                    {item.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-6 md:space-y-8">
                {/* 1. Immersive Hero */}
                <HeroModern empreendimento={empreendimento} stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">

                    {/* LEFT COLUMN (Content) - Span 8 */}
                    <div className="lg:col-span-8 space-y-6 md:space-y-10">
                        
                        <Tabs value={currentTab} onValueChange={handleTabChange}>
                            <TabsContent value="visao-geral" className="space-y-6 md:space-y-10 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {/* Section: Typologies */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                                        <div className="p-1.5 md:p-2 bg-emerald-100 rounded-lg text-emerald-700">
                                            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <h2 className="text-lg md:text-2xl font-bold text-gray-900">Tipologias Disponíveis</h2>
                                    </div>
                                    <InteractiveTypology 
                                        unidades={unidades} 
                                        onSelectType={setSelectedType} 
                                    />
                                </section>

                                {/* Section: About */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                                        <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg text-blue-700">
                                            <Info className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <h2 className="text-lg md:text-2xl font-bold text-gray-900">Sobre o Imóvel</h2>
                                    </div>
                                    <AboutSection
                                        description={empreendimento.descricao}
                                        construtora={empreendimento.construtora}
                                        previsaoEntrega={empreendimento.previsaoEntrega}
                                        tipo={empreendimento.tipo}
                                        totalUnidades={unidades.length}
                                    />
                                </section>

                                {/* Section: Differentials */}
                                <section>
                                    <DifferentialsSection items={empreendimento.diferenciais ?? []} />
                                </section>

                                {/* Section: Location */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                                        <div className="p-1.5 md:p-2 bg-red-100 rounded-lg text-red-700">
                                            <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <h2 className="text-lg md:text-2xl font-bold text-gray-900">Localização</h2>
                                    </div>
                                    <LocationSection
                                        address={{
                                            cidade: empreendimento.cidade,
                                            bairro: empreendimento.bairro,
                                        }}
                                    />
                                </section>
                            </TabsContent>

                            <TabsContent value="espelho" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <SalesMirror unidades={unidades} onSimular={onSimular} />
                            </TabsContent>

                            <TabsContent value="lista" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-gray-200 shadow-sm overflow-hidden">
                                    <CardContent className="p-0">
                                        <UnitsTable unidades={unidades} onSimular={onSimular} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="simulacao" className="space-y-4 md:space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div id="calculadora-financeira" className="rounded-xl md:rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
                                    <FinancialCalculator
                                        valorInicial={precoMinimo}
                                        series={series}
                                        onSimulacaoChange={() => {}}
                                    />
                                </div>
                                {condicoesExibicao && condicoesExibicao.length > 0 && (
                                    <div className="rounded-xl md:rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
                                        <PaymentConditions condicoes={condicoesExibicao} valorUnidade={precoMinimo} />
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="materiais" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section>
                                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                                        <div className="p-1.5 md:p-2 bg-violet-100 rounded-lg text-violet-700">
                                            <FileText className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <h2 className="text-lg md:text-2xl font-bold text-gray-900">Materiais</h2>
                                    </div>
                                    <MateriaisSection empreendimentoId={empreendimento.id} />
                                </section>
                            </TabsContent>
                        </Tabs>

                    </div>

                    {/* RIGHT COLUMN (Sidebar) - Span 4 */}
                    <div className="hidden lg:block lg:col-span-4 relative">
                        <SmartSidebar 
                            priceMin={precoMinimo} 
                            selectedType={selectedType}
                            onSimular={scrollToCalculator}
                        />
                    </div>

                </div>
            </div>

            {/* Mobile Price CTA - Above Bottom Nav */}
            {currentTab !== "simulacao" && (
                <div className="md:hidden fixed bottom-[58px] sm:bottom-[68px] left-0 right-0 z-40 px-2 sm:px-3 pb-1 sm:pb-2">
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-2.5 sm:p-3 flex items-center justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-wider">A partir de</p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{formatCurrency(precoMinimo)}</p>
                        </div>
                        <button
                            onClick={scrollToCalculator}
                            className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform"
                        >
                            <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Simular
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Actions */}
            <ShareButton
                variant="floating"
                empreendimento={empreendimento}
                unidades={unidades}
                series={series}
                simulacao={simulacaoData}
            />
        </div>
    )
}
