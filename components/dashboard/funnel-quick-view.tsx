"use client"

import { useRouter } from "next/navigation"
import { Workflow, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FunnelStage {
  name: string
  count: number
}

interface FunnelQuickViewProps {
  stages?: FunnelStage[]
  totalLeads?: number
}

export function FunnelQuickView({ stages = [], totalLeads = 1 }: FunnelQuickViewProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Funil Rápido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.slice(0, 4).map((stage, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{stage.name}</span>
              <div className="flex items-center gap-2 flex-1 mx-3">
                <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(stage.count / totalLeads) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-bold">{stage.count}</span>
            </div>
          ))}
          <Button
            variant="ghost"
            className="w-full text-xs h-8 mt-2 text-primary hover:bg-primary/5"
            onClick={() => router.push("/admin/pipeline")}
          >
            Ver Funil Completo <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
