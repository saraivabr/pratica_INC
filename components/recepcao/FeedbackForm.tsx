"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const feedbackOptions = [
  { value: "interessado", label: "Interessado", color: "text-emerald-600" },
  { value: "agendou_visita", label: "Agendou Visita", color: "text-blue-600" },
  { value: "fechou_negocio", label: "Fechou Negocio", color: "text-purple-600" },
  { value: "sem_interesse", label: "Sem Interesse", color: "text-zinc-600" },
  { value: "nao_compareceu", label: "Nao Compareceu", color: "text-amber-600" },
  { value: "outro", label: "Outro", color: "text-zinc-500" },
] as const

export type FeedbackStatus = typeof feedbackOptions[number]["value"]

interface FeedbackFormProps {
  onSubmit: (data: { feedback_status: string; feedback_observacoes: string }) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export function FeedbackForm({ onSubmit, onCancel, loading = false }: FeedbackFormProps) {
  const [feedbackStatus, setFeedbackStatus] = useState<string>("")
  const [feedbackObservacoes, setFeedbackObservacoes] = useState("")

  const handleSubmit = async () => {
    if (!feedbackStatus) return
    await onSubmit({
      feedback_status: feedbackStatus,
      feedback_observacoes: feedbackObservacoes,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Resultado do Atendimento *</Label>
        <Select value={feedbackStatus} onValueChange={setFeedbackStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o resultado" />
          </SelectTrigger>
          <SelectContent>
            {feedbackOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className={opt.color}>{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Observacoes (opcional)</Label>
        <Textarea
          placeholder="Detalhes do atendimento..."
          value={feedbackObservacoes}
          onChange={(e) => setFeedbackObservacoes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading || !feedbackStatus}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Enviar Feedback
        </Button>
      </div>
    </div>
  )
}

export function getFeedbackLabel(status: string): string {
  const option = feedbackOptions.find((o) => o.value === status)
  return option?.label || status
}

export function getFeedbackColor(status: string): string {
  const option = feedbackOptions.find((o) => o.value === status)
  return option?.color || "text-zinc-500"
}
