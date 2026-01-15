"use client"

import { useState } from "react"
import { Share2, MessageCircle, FileText, Loader2, Check } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Empreendimento } from "@/types/empreendimento"
import { formatarTelefone } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ShareSheetProps {
  empreendimento: Empreendimento
}

export function ShareSheet({ empreendimento }: ShareSheetProps) {
  const { data: session } = useSession()
  const [mensagem, setMensagem] = useState("")
  const [tipo, setTipo] = useState<"resumido" | "completo">("resumido")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [open, setOpen] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    setSuccess(false)

    try {
      const res = await fetch("/api/whatsapp/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empreendimento,
          tipo,
          mensagemPersonalizada: mensagem || undefined,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setMensagem("")
        }, 1500)
      } else {
        const error = await res.json()
        alert(error.error || "Erro ao enviar")
      }
    } catch (error) {
      alert("Erro ao enviar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-24 right-4 rounded-full w-14 h-14 shadow-lg z-40"
          size="icon"
        >
          <Share2 className="w-6 h-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Enviar para seu WhatsApp</SheetTitle>
          <p className="text-sm text-gray-500">
            Receba no seu celular para encaminhar ao cliente
          </p>
        </SheetHeader>

        <div className="space-y-5 mt-6 px-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTipo("resumido")}
              className={cn(
                "flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all",
                tipo === "resumido"
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <MessageCircle
                className={cn(
                  "w-7 h-7 mb-2",
                  tipo === "resumido" ? "text-emerald-600" : "text-gray-500"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  tipo === "resumido" ? "text-emerald-600" : "text-gray-700"
                )}
              >
                Resumido
              </span>
            </button>

            <button
              onClick={() => setTipo("completo")}
              className={cn(
                "flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all",
                tipo === "completo"
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <FileText
                className={cn(
                  "w-7 h-7 mb-2",
                  tipo === "completo" ? "text-emerald-600" : "text-gray-500"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  tipo === "completo" ? "text-emerald-600" : "text-gray-700"
                )}
              >
                Completo
              </span>
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Mensagem personalizada (opcional)
            </label>
            <Textarea
              placeholder="Ola! Segue info do imovel que conversamos..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Sera enviado para:
            </p>
            <p className="text-emerald-600 font-medium">
              📱 {session?.user?.whatsapp ? formatarTelefone(session.user.whatsapp) : "..."}
            </p>
          </div>

          <Button
            className="w-full h-14 text-base"
            onClick={handleShare}
            disabled={loading || success}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : success ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Enviado!
              </>
            ) : (
              "Enviar para meu WhatsApp"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
