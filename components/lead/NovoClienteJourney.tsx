"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Phone,
  Building2,
  MessageSquare,
  Plus,
  Sparkles,
  X,
  Loader2,
} from "lucide-react"

interface Empreendimento {
  id: number
  nome: string
  cidade: string
  tipo: string
  unidades_disponiveis: number
}

interface NovoClienteJourneyProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  nome: string
  telefone: string
  empreendimento: Empreendimento | null
  observacoes: string
}

const STEPS = [
  { id: 1, title: "Nome", description: "Como ele se chama?" },
  { id: 2, title: "WhatsApp", description: "Qual o WhatsApp dele?" },
  { id: 3, title: "Interesse", description: "Interesse em qual empreendimento?" },
  { id: 4, title: "Observações", description: "Alguma observação?" },
  { id: 5, title: "Confirmar", description: "Confirme os dados" },
]

// Máscara de telefone
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "")
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
}

export function NovoClienteJourney({ open, onClose, onSuccess }: NovoClienteJourneyProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    telefone: "",
    empreendimento: null,
    observacoes: "",
  })
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Buscar empreendimentos
  useEffect(() => {
    const fetchEmpreendimentos = async () => {
      try {
        const response = await fetch("/api/empreendimentos")
        const data = await response.json()
        if (data.success) {
          setEmpreendimentos(data.data || [])
        }
      } catch (error) {
        console.error("Erro ao buscar empreendimentos:", error)
      }
    }
    if (open) {
      fetchEmpreendimentos()
    }
  }, [open])

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      setFormData({
        nome: "",
        telefone: "",
        empreendimento: null,
        observacoes: "",
      })
      setSuccess(false)
    }
  }, [open])

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.nome.trim().length >= 2
      case 2:
        return formData.telefone.replace(/\D/g, "").length >= 10
      case 3:
        return formData.empreendimento !== null
      case 4:
        return true // Observações são opcionais
      case 5:
        return isStepValid(1) && isStepValid(2) && isStepValid(3)
      default:
        return false
    }
  }

  const handleNext = () => {
    if (isStepValid(currentStep) && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          telefone: formData.telefone.replace(/\D/g, ""),
          empreendimento_id: formData.empreendimento?.id,
          empreendimento_nome: formData.empreendimento?.nome,
          observacoes: formData.observacoes.trim(),
          origem: "manual",
          midia_principal: "Cadastro manual",
        }),
      })

      const data = await response.json()
      if (data.success || response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
        console.error("Erro ao salvar lead:", data)
        alert("Erro ao salvar cliente. Tente novamente.")
      }
    } catch (error) {
      console.error("Erro ao salvar lead:", error)
      alert("Erro ao salvar cliente. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleAddAnother = () => {
    setCurrentStep(1)
    setFormData({
      nome: "",
      telefone: "",
      empreendimento: null,
      observacoes: "",
    })
    setSuccess(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Background Effects */}
        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
        
        <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-zinc-700/60 overflow-hidden">
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-500" />
                  Novo Cliente
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {STEPS[currentStep - 1]?.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Progress */}
                <div className="flex items-center gap-1">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className={cn(
                        "h-2 w-8 rounded-full transition-all duration-300",
                        index + 1 <= currentStep
                          ? "bg-gradient-to-r from-green-400 to-emerald-500"
                          : "bg-gray-200 dark:bg-zinc-700"
                      )}
                    />
                  ))}
                </div>
                <Badge variant="outline" className="text-xs">
                  {currentStep} de {STEPS.length}
                </Badge>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-12 space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="relative w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Cliente adicionado com sucesso!
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {formData.nome} foi cadastrado e está pronto para atendimento.
                </p>
                <div className="flex gap-2 justify-center pt-4">
                  <Button variant="outline" onClick={handleAddAnother}>
                    Adicionar outro
                  </Button>
                  <Button onClick={onClose} className="bg-green-500 hover:bg-green-600">
                    Voltar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Step 1: Nome */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-fadeInUp">
                    <div className="text-center mb-6">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Como ele se chama?
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Digite o nome completo do cliente
                      </p>
                    </div>
                    <Input
                      placeholder="Ex: João Silva Santos"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="text-lg h-14 text-center bg-white/80 dark:bg-zinc-800/80 border-2 focus:border-green-400"
                      autoFocus
                    />
                  </div>
                )}

                {/* Step 2: Telefone */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-fadeInUp">
                    <div className="text-center mb-6">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Qual o WhatsApp dele?
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Digite o número com DDD
                      </p>
                    </div>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formatPhone(formData.telefone)}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="text-lg h-14 text-center bg-white/80 dark:bg-zinc-800/80 border-2 focus:border-green-400"
                      autoFocus
                    />
                  </div>
                )}

                {/* Step 3: Empreendimento */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-fadeInUp">
                    <div className="text-center mb-6">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Interesse em qual empreendimento?
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Selecione o empreendimento de interesse
                      </p>
                    </div>
                    <div className="grid gap-3 max-h-80 overflow-y-auto">
                      {empreendimentos.map((emp) => (
                        <Card
                          key={emp.id}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-lg",
                            formData.empreendimento?.id === emp.id
                              ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 hover:border-green-300"
                          )}
                          onClick={() => setFormData({ ...formData, empreendimento: emp })}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {emp.nome}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {emp.cidade} • {emp.tipo}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  {emp.unidades_disponiveis} unidades disponíveis
                                </p>
                              </div>
                              {formData.empreendimento?.id === emp.id && (
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Observações */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-fadeInUp">
                    <div className="text-center mb-6">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Alguma observação?
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Informações extras sobre o cliente (opcional)
                      </p>
                    </div>
                    <Textarea
                      placeholder="Ex: Cliente muito interessado, tem urgência para mudança, orçamento flexível..."
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="min-h-24 bg-white/80 dark:bg-zinc-800/80 border-2 focus:border-green-400 resize-none"
                      autoFocus
                    />
                  </div>
                )}

                {/* Step 5: Confirmar */}
                {currentStep === 5 && (
                  <div className="space-y-6 animate-fadeInUp">
                    <div className="text-center mb-6">
                      <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Confirme os dados
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Revise as informações antes de salvar
                      </p>
                    </div>
                    
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nome</label>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formData.nome}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">WhatsApp</label>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatPhone(formData.telefone)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Empreendimento</label>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{formData.empreendimento?.nome}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formData.empreendimento?.cidade}</p>
                        </div>
                        {formData.observacoes && (
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Observações</label>
                            <p className="text-gray-700 dark:text-gray-300">{formData.observacoes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-zinc-800">
                  <Button
                    variant="ghost"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Anterior
                  </Button>

                  {currentStep === STEPS.length ? (
                    <Button
                      onClick={handleSave}
                      disabled={!isStepValid(currentStep) || saving}
                      className="gap-2 bg-green-500 hover:bg-green-600"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Salvar Cliente
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!isStepValid(currentStep)}
                      className="gap-2 bg-green-500 hover:bg-green-600"
                    >
                      Próximo
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}