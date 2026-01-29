"use client"

import { Award, X, Download, Share2, Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  certificate: {
    codigo: string
    modulo_nome: string
    emitido_em?: string
    is_new?: boolean
  }
  userName?: string
}

export function CertificateModal({
  isOpen,
  onClose,
  certificate,
  userName,
}: CertificateModalProps) {
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen && certificate.is_new) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, certificate.is_new])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(certificate.codigo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  const formattedDate = certificate.emitido_em
    ? new Date(certificate.emitido_em).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ["#f59e0b", "#10b981", "#3b82f6", "#ec4899"][
                  Math.floor(Math.random() * 4)
                ],
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-modalIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors z-10"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Certificate header */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-4">
            <Award className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold">Parabens!</h2>
          <p className="text-amber-100 mt-1">Voce conquistou um certificado</p>
        </div>

        {/* Certificate content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Certificado de Conclusao
            </p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {certificate.modulo_nome}
            </h3>
            {userName && (
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Conferido a <span className="font-semibold">{userName}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              em {formattedDate}
            </p>
          </div>

          {/* Certificate code */}
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
              Codigo de verificacao
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                {certificate.codigo}
              </code>
              <button
                onClick={handleCopy}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  copied
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600"
                    : "hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500"
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Fechar
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                // In a real app, this would share the certificate
                const shareText = `Acabei de conquistar o certificado "${certificate.modulo_nome}" no CP Academy! Codigo: ${certificate.codigo}`
                if (navigator.share) {
                  navigator.share({ text: shareText })
                } else {
                  navigator.clipboard.writeText(shareText)
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
          border-radius: 2px;
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modalIn {
          animation: modalIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
