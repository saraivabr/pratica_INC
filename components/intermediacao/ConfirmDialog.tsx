"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  Loader2,
} from "lucide-react"

type DialogType = "danger" | "warning" | "info"

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  titulo: string
  mensagem: string
  tipo?: DialogType
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  confirmVariant?: "default" | "destructive"
}

const dialogConfig: Record<
  DialogType,
  {
    icon: typeof AlertTriangle
    iconBgColor: string
    iconColor: string
  }
> = {
  danger: {
    icon: Trash2,
    iconBgColor: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconBgColor: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    iconBgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  titulo,
  mensagem,
  tipo = "warning",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  confirmVariant,
}: ConfirmDialogProps) {
  const config = dialogConfig[tipo]
  const Icon = config.icon

  // Define variante do botao baseado no tipo
  const buttonVariant =
    confirmVariant || (tipo === "danger" ? "destructive" : "default")

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Icone */}
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                config.iconBgColor
              )}
            >
              <Icon className={cn("h-6 w-6", config.iconColor)} />
            </div>

            {/* Conteudo */}
            <div className="flex flex-col gap-1.5 pt-1">
              <DialogTitle>{titulo}</DialogTitle>
              <DialogDescription>{mensagem}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook para facilitar uso do ConfirmDialog
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean
    titulo: string
    mensagem: string
    tipo: DialogType
    onConfirm: () => void | Promise<void>
  }>({
    open: false,
    titulo: "",
    mensagem: "",
    tipo: "warning",
    onConfirm: () => {},
  })
  const [loading, setLoading] = useState(false)

  const confirm = async ({
    titulo,
    mensagem,
    tipo = "warning",
  }: {
    titulo: string
    mensagem: string
    tipo?: DialogType
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        titulo,
        mensagem,
        tipo,
        onConfirm: () => resolve(true),
      })
    })
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await state.onConfirm()
    } finally {
      setLoading(false)
      setState((prev) => ({ ...prev, open: false }))
    }
  }

  const handleCancel = () => {
    setState((prev) => ({ ...prev, open: false }))
  }

  const DialogComponent = () => (
    <ConfirmDialog
      open={state.open}
      titulo={state.titulo}
      mensagem={state.mensagem}
      tipo={state.tipo}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={loading}
    />
  )

  return { confirm, DialogComponent }
}

import { useState } from "react"
