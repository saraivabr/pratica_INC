"use client"

import { useState } from "react"
import { Check, Copy, CreditCard, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DadosBancarios, TipoConta } from "../types"
import { mascararConta, mascararPix } from "./utils"

interface BeneficiarioDadosBancariosProps {
  dados: DadosBancarios
  showFull?: boolean // mostrar dados completos ou mascarados por padrao
  onToggleVisibility?: (visible: boolean) => void
}

const tipoContaLabels: Record<TipoConta, string> = {
  corrente: "Conta Corrente",
  poupanca: "Poupanca",
}

export function BeneficiarioDadosBancarios({
  dados,
  showFull = false,
  onToggleVisibility,
}: BeneficiarioDadosBancariosProps) {
  const [showFullData, setShowFullData] = useState(showFull)
  const [copied, setCopied] = useState(false)

  const handleToggleVisibility = () => {
    const newValue = !showFullData
    setShowFullData(newValue)
    onToggleVisibility?.(newValue)
  }

  const handleCopyPix = async () => {
    if (!dados.chavePix) return

    try {
      await navigator.clipboard.writeText(dados.chavePix)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  // Verifica se tem dados bancarios
  const temDadosBancarios =
    dados.banco || dados.agencia || dados.conta || dados.chavePix

  if (!temDadosBancarios) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Dados Bancarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum dado bancario cadastrado
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Dados Bancarios
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            className="h-8"
          >
            {showFullData ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Ocultar
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Mostrar
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Banco */}
          {dados.banco && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Banco</span>
              <span className="font-medium">{dados.banco}</span>
            </div>
          )}

          {/* Agencia */}
          {dados.agencia && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agencia</span>
              <span className="font-mono font-medium">{dados.agencia}</span>
            </div>
          )}

          {/* Conta */}
          {dados.conta && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conta</span>
              <span className="font-mono font-medium">
                {showFullData ? dados.conta : mascararConta(dados.conta)}
              </span>
            </div>
          )}

          {/* Tipo de Conta */}
          {dados.tipoConta && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <span className="font-medium">
                {tipoContaLabels[dados.tipoConta]}
              </span>
            </div>
          )}

          {/* Chave PIX */}
          {dados.chavePix && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chave PIX</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2",
                    copied && "text-emerald-600"
                  )}
                  onClick={handleCopyPix}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-1 break-all font-mono text-sm font-medium">
                {showFullData ? dados.chavePix : mascararPix(dados.chavePix)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
