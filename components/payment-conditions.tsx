"use client"

import { CreditCard, Banknote, Calendar, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type CondicaoPagamento, formatCurrency } from "@/lib/data"

interface PaymentConditionsProps {
  condicoes: CondicaoPagamento[]
  valorUnidade?: number
}

export function PaymentConditions({ condicoes, valorUnidade = 1000000 }: PaymentConditionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Condições de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {condicoes.map((condicao) => {
          const valorEntrada = (condicao.entrada / 100) * valorUnidade
          const valorFinanciamento = condicao.financiamento ? (condicao.financiamento / 100) * valorUnidade : 0

          return (
            <div key={condicao.id} className="p-4 rounded-lg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">{condicao.nome}</h4>
                <Badge variant="outline">{condicao.entrada}% entrada</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Banknote className="h-4 w-4" />
                    <span>Entrada</span>
                  </div>
                  <p className="font-semibold text-primary">{formatCurrency(valorEntrada)}</p>
                </div>

                {condicao.parcelas > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Parcelas</span>
                    </div>
                    <p className="font-semibold">
                      {condicao.parcelas}x de {formatCurrency(condicao.valorParcela)}
                    </p>
                  </div>
                )}

                {condicao.financiamento && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>Financiamento</span>
                    </div>
                    <p className="font-semibold">{formatCurrency(valorFinanciamento)}</p>
                    <p className="text-xs text-muted-foreground">({condicao.financiamento}% do valor)</p>
                  </div>
                )}
              </div>

              {condicao.reforcos && condicao.reforcos.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-medium mb-2">Reforços programados:</p>
                  <div className="flex flex-wrap gap-2">
                    {condicao.reforcos.map((reforco, index) => (
                      <Badge key={index} variant="secondary">
                        Mês {reforco.mes}: {formatCurrency(reforco.valor)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
