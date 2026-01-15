"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Check, Send, Smartphone, ShieldCheck, Loader2, ArrowRight, MessageSquare } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const [codigo, setCodigo] = useState("")
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState("")
  const [timer, setTimer] = useState(0)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }

  const handleSendCode = async () => {
    if (whatsapp.length < 14) {
      setError("Por favor, insira um número de WhatsApp válido.")
      return
    }

    setSendingCode(true)
    setError("")

    try {
      const cleanWhatsApp = whatsapp.replace(/\D/g, "")
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: cleanWhatsApp }),
      })

      const data = await response.json()

      if (response.ok) {
        setCodeSent(true)
        setTimer(60)
        setError("")
      } else {
        setError(data.error || "Erro ao enviar código. Verifique se você é um corretor autorizado.")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeSent) {
      handleSendCode()
      return
    }

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
        setError("Código inválido ou expirado.")
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
      <div className="fixed inset-0 bg-gradient-to-b from-white via-[#fbfbfd] to-[#f5f5f7] pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo Section */}
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

        {/* Login Card */}
        <div className="w-full max-w-[400px] animate-[fadeIn_0.8s_ease-out_0.1s_both]">
          <div className="bg-white/80 backdrop-blur-xl rounded-[30px] shadow-[0_4px_40px_rgba(0,0,0,0.06)] border border-white p-8 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight">
                {codeSent ? "Verifique seu WhatsApp" : "Seja bem-vindo"}
              </h2>
              <p className="text-[14px] text-[#86868b] mt-2 leading-relaxed">
                {codeSent 
                  ? `Enviamos um código de acesso para ${whatsapp}` 
                  : "Acesse sua conta usando seu número de WhatsApp cadastrado"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* WhatsApp Field */}
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
                  onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                  onFocus={() => setFocusedField('whatsapp')}
                  onBlur={() => setFocusedField(null)}
                  maxLength={16}
                  required
                  disabled={loading || sendingCode || codeSent}
                  className="w-full h-[64px] pt-5 pb-1 px-4 bg-[#f5f5f7] border-2 border-transparent rounded-2xl text-[17px] font-medium text-[#1d1d1f] transition-all duration-300 focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-8 focus:ring-[#0071e3]/5 disabled:opacity-70"
                />
                {codeSent && !loading && (
                  <button 
                    type="button"
                    onClick={() => setCodeSent(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#0071e3] font-medium hover:underline"
                  >
                    Alterar
                  </button>
                )}
              </div>

              {/* Código Field (Only shown if codeSent) */}
              {codeSent && (
                <div className="relative animate-[fadeIn_0.4s_ease-out]">
                  <div className={`absolute left-4 transition-all duration-200 pointer-events-none flex items-center gap-2 ${
                    focusedField === 'codigo' || codigo
                      ? 'top-2 text-[11px] text-[#0071e3] font-semibold'
                      : 'top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Código de Acesso
                  </div>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onFocus={() => setFocusedField('codigo')}
                    onBlur={() => setFocusedField(null)}
                    maxLength={6}
                    required
                    disabled={loading}
                    autoFocus
                    placeholder="000000"
                    className="w-full h-[64px] pt-5 pb-1 px-4 bg-[#f5f5f7] border-2 border-transparent rounded-2xl text-[24px] font-bold text-[#1d1d1f] tracking-[0.5em] text-center placeholder:opacity-20 focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-8 focus:ring-[#0071e3]/5"
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 py-4 px-4 bg-red-50 border border-red-100 rounded-2xl animate-[shake_0.5s_ease-in-out]">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <p className="text-[13px] text-red-700 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              {/* Submit / Send Button */}
              {!codeSent ? (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || whatsapp.length < 14}
                  className="w-full h-[58px] bg-[#1d1d1f] hover:bg-[#2d2d2f] text-white text-[16px] font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-black/10 disabled:opacity-50 active:scale-95"
                >
                  {sendingCode ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Enviar Código via WhatsApp
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={loading || codigo.length < 6}
                    className="w-full h-[58px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[16px] font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-[#0071e3]/20 disabled:opacity-50 active:scale-95"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Verificar e Entrar
                        <Check className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-[12px] text-[#86868b]">
                        Reenviar código em <span className="font-semibold text-[#1d1d1f]">{timer}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendCode}
                        className="text-[13px] text-[#0071e3] font-semibold hover:underline"
                      >
                        Não recebeu? Reenviar código
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>

            <div className="mt-10 pt-8 border-t border-[#f5f5f7] flex items-center justify-center gap-2">
               <MessageSquare className="w-4 h-4 text-[#25D366]" />
               <p className="text-[13px] text-[#86868b]">
                 Problemas no acesso? <a href="#" className="text-[#0071e3] font-medium hover:underline">Fale com o Gestor</a>
               </p>
            </div>
          </div>
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

function XCircle(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
