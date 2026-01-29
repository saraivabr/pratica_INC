"use client"

import { Check, Sparkles, Shield, Wifi, Zap, Leaf, Dumbbell, Dog, Baby } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DifferentialsSectionProps {
    items: string[]
}

export function DifferentialsSection({ items }: DifferentialsSectionProps) {
    // Helper to try to match icon to text (simple heuristic)
    const getIcon = (text: string) => {
        const t = text.toLowerCase()
        if (t.includes("segurança") || t.includes("portaria")) return Shield
        if (t.includes("wifi") || t.includes("internet")) return Wifi
        if (t.includes("energia") || t.includes("solar")) return Zap
        if (t.includes("verde") || t.includes("parque") || t.includes("jardim")) return Leaf
        if (t.includes("academia") || t.includes("fitness")) return Dumbbell
        if (t.includes("pet") || t.includes("animal")) return Dog
        if (t.includes("infantil") || t.includes("criança") || t.includes("kids")) return Baby
        return Check
    }

    if (!items || items.length === 0) return null

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Diferenciais Exclusivos</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item, index) => {
                    const Icon = getIcon(item)
                    return (
                        <Card key={index} className="border-border/60 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all hover:-translate-y-1 hover:shadow-md group">
                            <CardContent className="p-4 flex items-start gap-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                    "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm mb-1">{item}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Um diferencial pensado para o seu conforto e bem-estar.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
