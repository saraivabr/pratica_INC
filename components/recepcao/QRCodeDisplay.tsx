"use client"

import { useState } from "react"
import { Loader2, RefreshCw, Download, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface QRCodeDisplayProps {
  localNome: string
  qrCodeImageUrl: string
  checkinUrl: string
  onRegenerate?: () => Promise<void>
}

export function QRCodeDisplay({
  localNome,
  qrCodeImageUrl,
  checkinUrl,
  onRegenerate,
}: QRCodeDisplayProps) {
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setRegenerating(true)
    try {
      await onRegenerate()
      toast.success("QR Code regenerado!")
    } catch (error) {
      toast.error("Erro ao regenerar QR Code")
    }
    setRegenerating(false)
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl)
      setCopied(true)
      toast.success("URL copiada!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Erro ao copiar URL")
    }
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = qrCodeImageUrl
    link.download = `qrcode-${localNome.toLowerCase().replace(/\s+/g, "-")}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={qrCodeImageUrl}
        alt={`QR Code para ${localNome}`}
        className="w-64 h-64 border rounded-lg"
      />

      <p className="text-xs text-muted-foreground text-center break-all max-w-[280px]">
        {checkinUrl}
      </p>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyUrl}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copiado!" : "Copiar URL"}
        </Button>

        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Baixar
        </Button>

        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerar
          </Button>
        )}
      </div>
    </div>
  )
}
