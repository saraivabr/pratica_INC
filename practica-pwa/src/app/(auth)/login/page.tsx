"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const [codigo, setCodigo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const cleanWhatsApp = whatsapp.replace(/\D/g, "")
      const result = await signIn("credentials", {
        whatsapp: cleanWhatsApp,
        codigo,
        redirect: false,
      })

      if (result?.error) {
        setError("Credenciais inválidas. Verifique seus dados.")
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
    <div className="min-h-screen bg-[#fbfbfd] flex flex-col">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-white via-[#fbfbfd] to-[#f5f5f7] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Logo Section */}
        <div className="text-center mb-12 animate-[fadeIn_0.8s_ease-out]">
          {/* Minimal logo mark */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#1d1d1f] to-[#424245] flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-semibold tracking-tight">P</span>
          </div>

          <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight mb-2">
            Prática
          </h1>
          <p className="text-[15px] text-[#86868b] font-normal">
            Portal do Corretor
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[380px] animate-[fadeIn_0.8s_ease-out_0.1s_both]">
          <div className="bg-white rounded-2xl shadow-[0_2px_40px_rgba(0,0,0,0.04)] border border-[#e8e8ed] p-8">

            {/* Card Header */}
            <div className="text-center mb-8">
              <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">
                Entrar
              </h2>
              <p className="text-[13px] text-[#86868b] mt-1">
                Use suas credenciais de corretor
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* WhatsApp Field */}
              <div className="relative">
                <label
                  className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    focusedField === 'whatsapp' || whatsapp
                      ? 'top-2 text-[11px] text-[#86868b] font-medium'
                      : 'top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]'
                  }`}
                >
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                  onFocus={() => setFocusedField('whatsapp')}
                  onBlur={() => setFocusedField(null)}
                  maxLength={16}
                  required
                  disabled={loading}
                  className="w-full h-[56px] pt-5 pb-2 px-4 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] placeholder-transparent focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 transition-all duration-200 disabled:opacity-50"
                />
              </div>

              {/* Código Field */}
              <div className="relative">
                <label
                  className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    focusedField === 'codigo' || codigo
                      ? 'top-2 text-[11px] text-[#86868b] font-medium'
                      : 'top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]'
                  }`}
                >
                  Código de Acesso
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('codigo')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={loading}
                  className="w-full h-[56px] pt-5 pb-2 px-4 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] placeholder-transparent focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 transition-all duration-200 disabled:opacity-50 uppercase tracking-wider"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 py-3 px-4 bg-[#fff5f5] border border-[#fecaca] rounded-xl animate-[fadeIn_0.2s_ease-out]">
                  <svg className="w-4 h-4 text-[#dc2626] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[13px] text-[#dc2626]">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  "Continuar"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e8e8ed]" />
              </div>
            </div>

            {/* Help Link */}
            <p className="text-center text-[13px] text-[#86868b]">
              Precisa de ajuda?{" "}
              <a href="#" className="text-[#0071e3] hover:underline">
                Fale conosco
              </a>
            </p>
          </div>

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] text-[#86868b]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Conexão segura
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <div className="flex items-center justify-center gap-4 text-[12px] text-[#86868b]">
          <span>Prática Construtora</span>
          <span className="w-1 h-1 rounded-full bg-[#d2d2d7]" />
          <span>25 Anos</span>
        </div>
        <p className="text-[11px] text-[#d2d2d7] mt-2">
          Acesso exclusivo para corretores autorizados
        </p>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
