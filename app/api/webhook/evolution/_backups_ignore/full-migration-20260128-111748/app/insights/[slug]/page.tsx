import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dbQuery } from "@/lib/db"

interface LeadInsight {
  slug: string
  phone: string
  summary: string
  detail: string
  created_at: string
}

async function getInsight(slug: string) {
  const { rows } = await dbQuery("select * from lead_insights where slug = $1", [slug])
  return rows[0] as LeadInsight | undefined
}

export default async function InsightPage({ params }: { params: { slug: string } }) {
  const insight = await getInsight(params.slug)
  if (!insight) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container px-4 mx-auto space-y-4">
        <Card className="border border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Insight Lead</span>
              <Badge variant="outline" className="text-xs">
                {new Date(insight.created_at).toLocaleString("pt-BR")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">Telefone: {insight.phone}</div>
            <div className="text-lg font-semibold">{insight.summary}</div>
            <div className="bg-muted/50 rounded-xl p-4 text-sm">
              <p className="font-semibold mb-2">Detalhes</p>
              <pre className="whitespace-pre-wrap text-xs">{insight.detail}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
