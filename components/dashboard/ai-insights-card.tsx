"use client"

import { Sparkles, BarChart3, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AIInsightsCardProps {
  insight?: string
}

export function AIInsightsCard({ insight }: AIInsightsCardProps) {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background relative">
      <div className="absolute top-0 right-0 p-4">
        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
      </div>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Sofia Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Insight Principal</p>
          <p className="text-base leading-relaxed">
            {insight || "A IA detectou oportunidades de otimização no seu funil de vendas."}
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-xl text-sm border border-primary/20 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0" />
          <p className="text-primary/80 leading-relaxed">
            A IA detectou que leads vindos de <b>Origem: Facebook</b> têm 2.4x mais chances de
            converter quando respondidos em menos de 10 minutos.{" "}
            <span className="font-bold ml-1">Recomendação: Ative o modo 24/7 da Sofia.</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
