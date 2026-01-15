"use client"

import { useState } from "react"
import { User, Phone, Mail, FileText } from "lucide-react"
import { Cliente } from "@/types/pagamento"

interface ClienteFormProps {
  onSubmit: (cliente: Cliente) => void
  loading?: boolean
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11)
  if (numbers.length <= 3) return numbers
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
}

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, "").slice(0, 11)
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
}

function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, "")
  if (numbers.length !== 11) return false
  if (/^(\d)\1+$/.test(numbers)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(numbers[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(numbers[10])) return false

  return true
}

export function ClienteForm({ onSubmit, loading = false }: ClienteFormProps) {
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!nome.trim() || nome.trim().split(" ").length < 2) {
      newErrors.nome = "Digite o nome completo"
    }

    if (!validateCPF(cpf)) {
      newErrors.cpf = "CPF inválido"
    }

    const phoneNumbers = whatsapp.replace(/\D/g, "")
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      newErrors.whatsapp = "Telefone inválido"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      newErrors.email = "Email inválido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({
        nome: nome.trim(),
        cpf: cpf.replace(/\D/g, ""),
        whatsapp: whatsapp.replace(/\D/g, ""),
        email: email.trim().toLowerCase()
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f5f5f7]">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[#0071e3]" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Dados do Cliente</h3>
        </div>
        <p className="text-[13px] text-[#86868b] mt-1">
          Preencha os dados do comprador
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Nome */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f] mb-2">
            <User className="w-4 h-4 text-[#86868b]" />
            Nome Completo
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="João da Silva"
            className={`w-full h-12 px-4 bg-[#f5f5f7] border rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] ${
              errors.nome ? "border-[#ff3b30]" : "border-transparent"
            }`}
          />
          {errors.nome && (
            <p className="text-[12px] text-[#ff3b30] mt-1">{errors.nome}</p>
          )}
        </div>

        {/* CPF */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f] mb-2">
            <FileText className="w-4 h-4 text-[#86868b]" />
            CPF
          </label>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            className={`w-full h-12 px-4 bg-[#f5f5f7] border rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] ${
              errors.cpf ? "border-[#ff3b30]" : "border-transparent"
            }`}
          />
          {errors.cpf && (
            <p className="text-[12px] text-[#ff3b30] mt-1">{errors.cpf}</p>
          )}
        </div>

        {/* WhatsApp */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f] mb-2">
            <Phone className="w-4 h-4 text-[#86868b]" />
            WhatsApp
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            className={`w-full h-12 px-4 bg-[#f5f5f7] border rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] ${
              errors.whatsapp ? "border-[#ff3b30]" : "border-transparent"
            }`}
          />
          {errors.whatsapp && (
            <p className="text-[12px] text-[#ff3b30] mt-1">{errors.whatsapp}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f] mb-2">
            <Mail className="w-4 h-4 text-[#86868b]" />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="joao@email.com"
            className={`w-full h-12 px-4 bg-[#f5f5f7] border rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] ${
              errors.email ? "border-[#ff3b30]" : "border-transparent"
            }`}
          />
          {errors.email && (
            <p className="text-[12px] text-[#ff3b30] mt-1">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Confirmar Reserva"
          )}
        </button>
      </div>
    </form>
  )
}
