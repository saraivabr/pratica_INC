"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Typewriter } from "@/components/ui/typewriter"

const frasesManha = [
  "Hoje é um ótimo dia para fechar negócios.",
  "O mercado não espera — e você também não.",
  "Cada manhã é uma nova chance de surpreender um cliente.",
  "Comece o dia com foco. O resultado vem.",
  "O primeiro contato do dia pode ser a venda do mês.",
  "Bora transformar café em comissão?",
  "Quem chega cedo, fecha primeiro.",
]

const frasesTarde = [
  "A tarde é o melhor horário pra follow-up.",
  "Metade do dia já passou — faça a outra metade contar.",
  "Seu próximo cliente está esperando por você.",
  "Cada lead é uma oportunidade. Vá com tudo.",
  "Continue firme. Os melhores fechamentos vêm à tarde.",
  "Não desacelere agora — a venda pode estar na próxima ligação.",
  "Persistência é o que separa o bom do extraordinário.",
]

const frasesNoite = [
  "Dia intenso? Amanhã tem mais. Descanse e volte forte.",
  "Quem trabalha com propósito, descansa com tranquilidade.",
  "Revise seus leads de hoje e planeje o amanhã.",
  "Grandes corretores sabem a hora de pausar.",
  "Um dia de cada vez. Você está construindo algo grande.",
  "Feche o dia com a certeza de que fez o seu melhor.",
  "Descanse a mente — amanhã o mercado continua.",
]

function getSaudacao() {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

function getFraseAleatoria() {
  const hour = new Date().getHours()
  const frases = hour < 12 ? frasesManha : hour < 18 ? frasesTarde : frasesNoite
  return frases[Math.floor(Math.random() * frases.length)]
}

function getDestino(role?: string) {
  if (role === "admin" || role === "gerente") return "/admin"
  return "/corretor"
}

export default function SplashPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const [saudacao] = useState(getSaudacao)
  const [frase] = useState(getFraseAleatoria)
  const [showFrase, setShowFrase] = useState(false)
  const [showTap, setShowTap] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  const primeiroNome = user?.nome?.split(" ")[0] || "Corretor"
  const textoSaudacao = `${saudacao}, ${primeiroNome}.`

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isLoading, isAuthenticated, router])

  // If already seen splash this session, skip
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const seen = sessionStorage.getItem("splash_seen")
      if (seen) {
        router.replace(getDestino(user?.role))
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  // Show motivational phrase after greeting typewriter finishes (~2.5s)
  useEffect(() => {
    const timer = setTimeout(() => setShowFrase(true), textoSaudacao.length * 50 + 600)
    return () => clearTimeout(timer)
  }, [textoSaudacao])

  // Show "toque para continuar" after phrase starts
  useEffect(() => {
    if (showFrase) {
      const timer = setTimeout(() => setShowTap(true), frase.length * 40 + 800)
      return () => clearTimeout(timer)
    }
  }, [showFrase, frase])

  const handleContinue = useCallback(() => {
    if (fadeOut) return
    setFadeOut(true)
    sessionStorage.setItem("splash_seen", "1")
    setTimeout(() => {
      router.replace(getDestino(user?.role))
    }, 500)
  }, [fadeOut, router, user])

  // Handle click/tap anywhere
  useEffect(() => {
    if (!showTap) return
    const handler = () => handleContinue()
    window.addEventListener("click", handler)
    window.addEventListener("touchstart", handler)
    return () => {
      window.removeEventListener("click", handler)
      window.removeEventListener("touchstart", handler)
    }
  }, [showTap, handleContinue])

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-white" />
  }

  return (
    <div
      className={`min-h-screen bg-white flex flex-col items-center justify-center px-8 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Greeting */}
      <div className="max-w-lg w-full">
        <Typewriter
          text={textoSaudacao}
          speed={50}
          loop={false}
          showCursor={!showFrase}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-black leading-tight"
          cursorChar="|"
        />

        {/* Motivational phrase */}
        <div
          className={`mt-4 transition-opacity duration-700 ${
            showFrase ? "opacity-100" : "opacity-0"
          }`}
        >
          {showFrase && (
            <Typewriter
              text={frase}
              speed={35}
              loop={false}
              showCursor={true}
              className="text-lg sm:text-xl md:text-2xl text-gray-500 leading-relaxed"
              cursorChar="|"
              cursorClassName="ml-0.5 text-gray-400"
            />
          )}
        </div>
      </div>

      {/* Tap to continue */}
      <div
        className={`absolute bottom-12 transition-opacity duration-1000 ${
          showTap ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-sm text-gray-400 animate-pulse">
          Toque para continuar
        </p>
      </div>
    </div>
  )
}
