"use client"

import { Building2, Calendar, HardHat, Ruler, Home, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface AboutSectionProps {
    description?: string
    construtora?: string
    previsaoEntrega?: string
    tipo?: string
    totalUnidades?: number
}

export function AboutSection({ 
    description, 
    construtora, 
    previsaoEntrega, 
    tipo,
    totalUnidades 
}: AboutSectionProps) {
    return (
        <div className="grid lg:grid-cols-[2fr,1fr] gap-8 animate-in fade-in duration-500">
            {/* Texto Principal */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold mb-4">Sobre o Empreendimento</h2>
                    <div className="prose prose-muted dark:prose-invert max-w-none">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {description || "Descrição não disponível para este empreendimento."}
                        </p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="bg-primary/5 border-primary/10">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm text-primary">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Construtora</p>
                                <p className="font-semibold">{construtora || "Não informada"}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/10">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm text-primary">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Previsão de Entrega</p>
                                <p className="font-semibold">{previsaoEntrega || "A definir"}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Sidebar de Detalhes */}
            <div className="space-y-4">
                <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 space-y-4">
                        <h3 className="font-semibold text-lg">Ficha Técnica</h3>
                        <Separator />
                        
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <HardHat className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Estágio da Obra</p>
                                    <p className="text-sm text-muted-foreground">Em construção</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <Home className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Tipologia</p>
                                    <p className="text-sm text-muted-foreground">{tipo || "Residencial"}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Total de Unidades</p>
                                    <p className="text-sm text-muted-foreground">{totalUnidades || "-"} unidades</p>
                                </div>
                            </div>

                            {/* Mock Data for completeness */}
                            <div className="flex items-start gap-3">
                                <Ruler className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Área do Terreno</p>
                                    <p className="text-sm text-muted-foreground">2.500 m²</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
