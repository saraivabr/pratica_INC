'use client'

import * as React from 'react'
import { Award, Download, Share2, Calendar, Hash, FolderOpen, Copy, Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface CertificateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  code: string
  moduleName: string
  categoryName: string
  earnedAt: Date | string
  onDownload?: () => void
  onShare?: () => void
  downloadUrl?: string
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function CertificateCard({
  className,
  id,
  code,
  moduleName,
  categoryName,
  earnedAt,
  onDownload,
  onShare,
  downloadUrl,
  ...props
}: CertificateCardProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  const handleShare = async () => {
    if (onShare) {
      onShare()
      return
    }

    // Default share behavior using Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificado: ${moduleName}`,
          text: `Conquistei o certificado do modulo "${moduleName}" na CP Academy! Codigo: ${code}`,
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled or share failed
        console.log('Share cancelled or failed:', error)
      }
    } else {
      // Fallback: copy to clipboard
      const text = `Certificado: ${moduleName}\nCategoria: ${categoryName}\nCodigo: ${code}`
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <Card
      data-slot="certificate-card"
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1',
        'bg-gradient-to-br from-amber-50/50 to-amber-100/30',
        'dark:from-amber-950/20 dark:to-amber-900/10',
        'border-amber-200/50 dark:border-amber-800/30',
        className
      )}
      {...props}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-10">
        <Award className="w-full h-full text-amber-500" />
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              'bg-gradient-to-br from-amber-400 to-amber-600',
              'shadow-lg shadow-amber-500/20'
            )}
          >
            <Award className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                Certificado
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight line-clamp-2">
              {moduleName}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{categoryName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Conquistado em {formatDate(earnedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 shrink-0" />
            <code className="flex-1 px-1.5 py-0.5 rounded bg-muted text-xs font-mono truncate">
              {code}
            </code>
            <button
              onClick={handleCopyCode}
              className={cn(
                'p-1 rounded transition-colors shrink-0',
                copied
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              type="button"
              aria-label="Copiar codigo"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Baixar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Compartilhar
        </Button>
      </CardFooter>
    </Card>
  )
}

export { CertificateCard }
