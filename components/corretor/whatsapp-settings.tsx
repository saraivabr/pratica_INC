"use client"

import { useState, useEffect } from "react"
import {
  Smartphone,
  RefreshCcw,
  Unplug,
  Bot,
  Save,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface WhatsAppSettingsProps {
  instanceName: string
  userId: string
  pairedPhone?: string | null
  profileName?: string | null
  onReconnect?: () => void
  onDisconnect?: () => void
}

export function WhatsAppSettings({
  instanceName,
  userId,
  pairedPhone,
  profileName,
  onReconnect,
  onDisconnect,
}: WhatsAppSettingsProps) {
  const [disconnecting, setDisconnecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assistantName, setAssistantName] = useState("Luna")
  const [assistantInstructions, setAssistantInstructions] = useState("")
  const [successBanner, setSuccessBanner] = useState(false)

  // Fetch config on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/salva-leads/config")
        if (res.ok) {
          const data = await res.json()
          setAssistantName(data.assistantName || "Luna")
          setAssistantInstructions(data.assistantInstructions || "")
        }
      } catch {
        // Keep defaults on error
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/whatsapp/session/logout", { method: "POST" })
      if (res.ok) {
        onDisconnect?.()
      }
    } catch {
      // Keep current state on error
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/salva-leads/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantName: assistantName.trim() || "Luna",
          assistantInstructions: assistantInstructions.trim(),
        }),
      })
      if (res.ok) {
        setSuccessBanner(true)
        setTimeout(() => setSuccessBanner(false), 3000)
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Success Banner */}
      {successBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-green-600 text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          Configurações salvas com sucesso!
        </div>
      )}

      {/* Section 1: Connection Status */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">Conectado</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                Ativo
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pairedPhone || "WhatsApp"}{profileName ? ` - ${profileName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onReconnect && (
            <Button variant="outline" size="sm" onClick={onReconnect} className="gap-1.5">
              <RefreshCcw className="h-3.5 w-3.5" />
              Reconectar
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 dark:hover:border-red-700"
              >
                <Unplug className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  Suas conversas e automações serão pausadas. Você precisará reconectar escaneando o QR Code novamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {disconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : null}
                  Sim, desconectar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Section 2: Minha Assistente IA */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Minha Assistente IA</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Personalize a assistente que conversa com seus leads
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Nome da Assistente */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da Assistente
              </label>
              <input
                type="text"
                maxLength={30}
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="Luna"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Instruções Personalizadas */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Instruções Personalizadas
              </label>
              <textarea
                maxLength={500}
                value={assistantInstructions}
                onChange={(e) => setAssistantInstructions(e.target.value)}
                placeholder="Ex: Seja mais formal nas respostas..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {assistantInstructions.length}/500
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                Sua assistente se chama <strong>{assistantName.trim() || "Luna"}</strong> e vai seguir suas instruções ao conversar com leads.
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
