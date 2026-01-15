"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const [codigo, setCodigo] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
        setError("Credenciais invalidas")
      } else {
        router.push("/catalogo")
        router.refresh()
      }
    } catch {
      setError("Erro ao conectar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B4332]/95 via-[#1B4332]/85 to-[#2D6A4F]/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 py-12">

        {/* Header */}
        <div className="text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 text-[#C9A962] text-sm font-medium tracking-[0.2em] uppercase mb-4">
            <span className="w-8 h-px bg-[#C9A962]" />
            Exclusivo
            <span className="w-8 h-px bg-[#C9A962]" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="text-center mb-12 animate-fade-up stagger-1">
            <h1 className="font-display text-5xl md:text-6xl font-semibold text-white mb-2 tracking-tight">
              Pratica
            </h1>
            <p className="text-white/70 text-lg tracking-wide">
              Catalogo Premium
            </p>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-sm animate-fade-up stagger-2">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h2 className="font-display text-2xl text-white text-center mb-8">
                Area do Corretor
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-white/60 text-xs font-medium tracking-wider uppercase mb-2">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                    maxLength={16}
                    required
                    disabled={loading}
                    className="w-full h-14 px-5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#C9A962] focus:bg-white/15 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-xs font-medium tracking-wider uppercase mb-2">
                    Codigo de Acesso
                  </label>
                  <input
                    type="text"
                    placeholder="PRT2024XX"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    required
                    disabled={loading}
                    className="w-full h-14 px-5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#C9A962] focus:bg-white/15 transition-all duration-300 uppercase tracking-wider"
                  />
                </div>

                {error && (
                  <div className="text-red-300 text-sm text-center py-2 animate-fade-in">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-[#C9A962] hover:bg-[#D4B978] text-[#1B4332] font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-8 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Acessar Catalogo"
                  )}
                </button>
              </form>
            </div>

            <p className="text-white/40 text-xs text-center mt-6">
              Acesso exclusivo para corretores autorizados
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center animate-fade-up stagger-3">
          <p className="text-white/30 text-xs tracking-wider">
            PRATICA CONSTRUTORA &bull; 25 ANOS
          </p>
        </div>
      </div>
    </div>
  )
}
