"use client"

import { MapPin, Navigation, School, ShoppingBag, Utensils, Trees } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LocationSectionProps {
    address?: {
        cidade?: string
        bairro?: string
        logradouro?: string
        numero?: string
        cep?: string
    }
    nearbyPoints?: Array<{
        name: string
        distance: string
        type: "school" | "shopping" | "food" | "park" | "transport"
    }>
}

export function LocationSection({ address, nearbyPoints = [] }: LocationSectionProps) {
    const fullAddress = [
        address?.logradouro,
        address?.numero,
        address?.bairro,
        address?.cidade,
        address?.cep
    ].filter(Boolean).join(", ")

    // Mock points if none provided
    const points = nearbyPoints.length > 0 ? nearbyPoints : [
        { name: "Shopping Center", distance: "5 min", type: "shopping" },
        { name: "Parque Municipal", distance: "8 min", type: "park" },
        { name: "Supermercado", distance: "3 min", type: "food" },
        { name: "Escola Internacional", distance: "10 min", type: "school" },
        { name: "Metrô", distance: "12 min", type: "transport" },
    ] as const

    const getIcon = (type: string) => {
        switch (type) {
            case "school": return School
            case "shopping": return ShoppingBag
            case "food": return Utensils
            case "park": return Trees
            default: return Navigation
        }
    }

    return (
        <div className="grid md:grid-cols-[1fr,300px] gap-6 animate-in fade-in duration-500">
            {/* Mapa (Placeholder visual) */}
            <Card className="overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm h-[400px] md:h-auto">
                <div className="relative w-full h-full bg-muted/30 group cursor-pointer">
                    {/* Imagem de mapa estática ou placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[url('/map-pattern.png')] bg-cover opacity-20 group-hover:opacity-30 transition-opacity">
                        <MapPin className="h-12 w-12 text-primary animate-bounce" />
                    </div>
                    
                    <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur p-4 rounded-xl border shadow-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Endereço do Empreendimento</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">{fullAddress || "Endereço não informado"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Pontos de Interesse */}
            <div className="space-y-4">
                <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-primary" />
                            O que tem por perto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {points.map((point, i) => {
                            const Icon = getIcon(point.type)
                            return (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Icon className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-sm font-medium">{point.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {point.distance}
                                    </Badge>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-4">
                        <h4 className="font-semibold text-primary mb-2 text-sm">Localização Privilegiada</h4>
                        <p className="text-xs text-muted-foreground">
                            Este empreendimento está situado em uma das regiões mais valorizadas da cidade, com fácil acesso a vias principais e cercado por conveniências.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
