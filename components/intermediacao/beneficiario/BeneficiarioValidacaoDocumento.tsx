"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Check, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatarCNPJ, formatarCPF, validarCNPJ, validarCPF } from "./utils"

interface BeneficiarioValidacaoDocumentoProps {
  value: string
  onChange: (value: string) => void
  onValidationChange?: (isValid: boolean, tipo: "CPF" | "CNPJ" | null) => void
  checkDuplicate?: (documento: string) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
  className?: string
}

type ValidationStatus = "idle" | "validating" | "valid" | "invalid" | "duplicate"

export function BeneficiarioValidacaoDocumento({
  value,
  onChange,
  onValidationChange,
  checkDuplicate,
  disabled = false,
  placeholder = "Digite CPF ou CNPJ",
  className,
}: BeneficiarioValidacaoDocumentoProps) {
  const [status, setStatus] = useState<ValidationStatus>("idle")
  const [tipo, setTipo] = useState<"CPF" | "CNPJ" | null>(null)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const validateDocument = useCallback(
    async (doc: string) => {
      const docLimpo = doc.replace(/\D/g, "")

      // Se vazio, reset
      if (!docLimpo) {
        setStatus("idle")
        setTipo(null)
        onValidationChange?.(false, null)
        return
      }

      // Detecta tipo pelo tamanho
      if (docLimpo.length === 11) {
        // CPF
        const isValid = validarCPF(doc)
        setTipo("CPF")

        if (!isValid) {
          setStatus("invalid")
          onValidationChange?.(false, "CPF")
          return
        }

        // Verifica duplicidade
        if (checkDuplicate) {
          setStatus("validating")
          try {
            const isDuplicate = await checkDuplicate(docLimpo)
            setStatus(isDuplicate ? "duplicate" : "valid")
            onValidationChange?.(!isDuplicate, "CPF")
          } catch {
            setStatus("valid")
            onValidationChange?.(true, "CPF")
          }
        } else {
          setStatus("valid")
          onValidationChange?.(true, "CPF")
        }
      } else if (docLimpo.length === 14) {
        // CNPJ
        const isValid = validarCNPJ(doc)
        setTipo("CNPJ")

        if (!isValid) {
          setStatus("invalid")
          onValidationChange?.(false, "CNPJ")
          return
        }

        // Verifica duplicidade
        if (checkDuplicate) {
          setStatus("validating")
          try {
            const isDuplicate = await checkDuplicate(docLimpo)
            setStatus(isDuplicate ? "duplicate" : "valid")
            onValidationChange?.(!isDuplicate, "CNPJ")
          } catch {
            setStatus("valid")
            onValidationChange?.(true, "CNPJ")
          }
        } else {
          setStatus("valid")
          onValidationChange?.(true, "CNPJ")
        }
      } else if (docLimpo.length > 11) {
        // Em processo de digitar CNPJ
        setTipo("CNPJ")
        setStatus("idle")
        onValidationChange?.(false, "CNPJ")
      } else {
        // Em processo de digitar CPF
        setTipo("CPF")
        setStatus("idle")
        onValidationChange?.(false, "CPF")
      }
    },
    [checkDuplicate, onValidationChange]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const docLimpo = rawValue.replace(/\D/g, "")

    // Formata automaticamente
    let formatted: string
    if (docLimpo.length <= 11) {
      formatted = formatarCPF(rawValue)
    } else {
      formatted = formatarCNPJ(rawValue)
    }

    onChange(formatted)

    // Debounce para validacao
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      validateDocument(formatted)
    }, 500)

    setDebounceTimer(timer)
  }

  // Valida ao montar se ja tiver valor
  useEffect(() => {
    if (value) {
      validateDocument(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup do timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  const getStatusIcon = () => {
    switch (status) {
      case "validating":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      case "valid":
        return <Check className="h-4 w-4 text-emerald-500" />
      case "invalid":
        return <X className="h-4 w-4 text-destructive" />
      case "duplicate":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "validating":
        return "Verificando..."
      case "valid":
        return `${tipo} valido`
      case "invalid":
        return `${tipo} invalido`
      case "duplicate":
        return `${tipo} ja cadastrado`
      default:
        return null
    }
  }

  const statusMessage = getStatusMessage()

  return (
    <div className={cn("relative space-y-1", className)}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={18} // CNPJ formatado: 00.000.000/0000-00
          className={cn(
            "pr-10 font-mono",
            status === "valid" && "border-emerald-500 focus-visible:ring-emerald-500/50",
            status === "invalid" && "border-destructive focus-visible:ring-destructive/50",
            status === "duplicate" && "border-amber-500 focus-visible:ring-amber-500/50"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>

      {statusMessage && (
        <p
          className={cn(
            "text-xs",
            status === "valid" && "text-emerald-600",
            status === "invalid" && "text-destructive",
            status === "duplicate" && "text-amber-600",
            status === "validating" && "text-muted-foreground"
          )}
        >
          {statusMessage}
        </p>
      )}
    </div>
  )
}
