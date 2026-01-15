"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Smartphone, Loader2, ArrowRight, MessageSquare, XCircle, Sparkles } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const formatWhatsApp = (value: string) => {
    let numbers = value.replace(/\D/g, "")
    if (numbers.startsWith("55") && numbers.length > 2) {
      numbers = numbers.slice(2)
    }
    if (numbers.length === 0) return ""
    if (numbers.length <= 2) return `+55 (${numbers}`
    if (numbers.length <= 7) return `+55 (${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `+55 (${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const cleanWhatsApp = whatsapp.replace(/\D/g, "")
      const fullPhone = cleanWhatsApp.startsWith("55") ? cleanWhatsApp : "55" + cleanWhatsApp

      if (fullPhone.length < 13) {
        setError("Digite um número válido.")
        setLoading(false)
        return
      }

      // Login direto, sem código
      const result = await signIn("credentials", {
        whatsapp: fullPhone,
        codigo: "bypass", // Código dummy para passar na validação básica do NextAuth
        redirect: false,
      })

      if (result?.error) {
        setError("Acesso negado. Verifique se seu número está cadastrado.")
      } else {
        router.push("/catalogo")
        router.refresh()
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-[0_4px_40px_rgba(0,0,0,0.06)] border border-white p-8 md:p-10">
      <div className="text-center mb-8">
        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
          Bem-vindo
        </h2>
        <p className="text-[14px] text-[#86868b] mt-2 leading-relaxed">
          Digite seu WhatsApp para acessar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative group">
          <div className={`absolute left-4 transition-all duration-200 pointer-events-none flex items-center gap-2 ${
            focusedField === 'whatsapp' || whatsapp
              ? 'top-2 text-[11px] text-[#0071e3] font-semibold'
              : 'top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]'
          }`}>
            <Smartphone className="w-3.5 h-3.5" />
            WhatsApp
          </div>
          <input
            type="tel"
            value={whatsapp}
            placeholder="+55 (11) 99999-9999"
            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
            onFocus={() => {
              setFocusedField('whatsapp')
              if (!whatsapp) setWhatsapp("+55 (")
            }}
            onBlur={() => setFocusedField(null)}
            maxLength={19}
            required
            disabled={loading}
            className="w-full h-[64px] pt-5 pb-1 px-4 bg-[#f5f5f7] border-2 border-transparent rounded-2xl text-[17px] font-medium text-[#1d1d1f] transition-all duration-300 focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-8 focus:ring-[#0071e3]/5 disabled:opacity-70"
          />
        </div>

        {error && (
          <div className="flex items-start gap-3 py-4 px-4 bg-red-50 border border-red-100 rounded-2xl animate-[shake_0.5s_ease-in-out]">
            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <p className="text-[13px] text-red-700 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || whatsapp.length < 14}
          className="w-full h-[58px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[16px] font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-[#0071e3]/20 disabled:opacity-50 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Acessar Portal
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-10 pt-8 border-t border-[#f5f5f7] flex items-center justify-center gap-2">
         <MessageSquare className="w-4 h-4 text-[#25D366]" />
         <p className="text-[13px] text-[#86868b]">
           Problemas? <a href="#" className="text-[#0071e3] font-medium hover:underline">Fale com o Gestor</a>
         </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-b from-white via-[#fbfbfd] to-[#f5f5f7] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10 animate-[fadeIn_0.8s_ease-out]">
          <div className="w-20 h-20 mx-auto mb-6 rounded-[22%] bg-gradient-to-br from-[#1d1d1f] to-[#424245] flex items-center justify-center shadow-2xl shadow-black/10">
            <span className="text-white text-3xl font-semibold tracking-tight">P</span>
          </div>
          <h1 className="text-[32px] font-bold text-[#1d1d1f] tracking-tight mb-2">
            Prática
          </h1>
          <p className="text-[15px] text-[#86868b] font-medium uppercase tracking-widest">
            Portal do Corretor
          </p>
        </div>

        <div className="w-full max-w-[400px] animate-[fadeIn_0.8s_ease-out_0.1s_both]">
          <Suspense fallback={
            <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-[0_4px_40px_rgba(0,0,0,0.06)] border border-white p-8 md:p-10 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-10 h-10 text-[#0071e3] animate-spin" />
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <footer className="relative z-10 py-8 text-center bg-white/50 backdrop-blur-sm border-t border-[#f5f5f7]">
        <div className="flex items-center justify-center gap-6 text-[12px] text-[#86868b] font-medium mb-2">
          <span>Prática Construtora</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#d2d2d7]" />
          <span>Desde 2000</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#d2d2d7]" />
          <span>V 2.0</span>
        </div>
        <p className="text-[11px] text-[#d2d2d7] uppercase tracking-[0.2em]">
          Ambiente de Acesso Restrito e Monitorado
        </p>
      </footer>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
