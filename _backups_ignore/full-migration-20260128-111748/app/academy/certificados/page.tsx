"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Award,
  ChevronLeft,
  Loader2,
  BookOpen,
  Clock,
  ChevronRight,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { CertificateCard } from "@/components/academy/certificate-card"
import { Breadcrumb } from "@/components/academy/breadcrumb"
import { ProgressBar } from "@/components/academy/progress-bar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Certificate {
  id: number
  codigo: string
  emitido_em: string
  modulo_id: number
  modulo_nome: string
  modulo_slug: string
  categoria_id: number
  categoria_nome: string
  categoria_slug: string
  duracao_minutos?: number
  total_licoes?: number
  icone?: string
  cor?: string
}

interface AvailableModule {
  id: number
  nome: string
  slug: string
  duracao_minutos?: number
  categoria_nome: string
  categoria_slug: string
  total_licoes: number
  completed_licoes: number
  progresso: number
}

export default function CertificadosPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking("academy-certificados")

  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [availableModules, setAvailableModules] = useState<AvailableModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return

      setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/academy/certificates")
        if (!res.ok) {
          throw new Error("Erro ao carregar certificados")
        }
        const data = await res.json()
        setCertificates(data.data || [])
        setAvailableModules(data.available_modules || [])
      } catch (err) {
        console.error("Erro ao carregar certificados:", err)
        setError("Nao foi possivel carregar os certificados. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
        </div>
      </div>
    )
  }

  const inProgressModules = availableModules.filter((m) => m.progresso > 0)
  const notStartedModules = availableModules.filter((m) => m.progresso === 0)

  return (
    <AppShell title="Meus Certificados">
      <div className="min-h-screen space-y-6 animate-page-in">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "Certificados" }]} />

        {/* Header */}
        <section className="relative">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-6 md:p-8 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
              <Award className="w-full h-full" />
            </div>

            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Award className="h-8 w-8" />
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Meus Certificados
                </h1>
                <p className="text-amber-100">
                  Acompanhe suas conquistas e modulos disponiveis para certificacao
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-amber-100">
                  <span>{certificates.length} certificados conquistados</span>
                  <span>{availableModules.length} modulos disponiveis</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/academy" className="text-gray-600 dark:text-gray-400">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar para Academy
          </Link>
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {/* Earned Certificates */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Certificados Conquistados
                {certificates.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({certificates.length})
                  </span>
                )}
              </h2>

              {certificates.length === 0 ? (
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center">
                  <Award className="h-12 w-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Voce ainda nao conquistou nenhum certificado.
                  </p>
                  <Button asChild>
                    <Link href="/academy">Comecar a estudar</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <CertificateCard
                      key={cert.id}
                      id={cert.id.toString()}
                      code={cert.codigo}
                      moduleName={cert.modulo_nome}
                      categoryName={cert.categoria_nome}
                      earnedAt={cert.emitido_em}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* In Progress Modules */}
            {inProgressModules.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  Modulos em Progresso
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({inProgressModules.length})
                  </span>
                </h2>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
                  {inProgressModules.map((module) => (
                    <Link
                      key={module.id}
                      href={`/academy/${module.categoria_slug}/${module.slug}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
                    >
                      <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {module.nome}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {module.categoria_nome}
                        </p>
                        <div className="mt-2">
                          <ProgressBar
                            value={module.completed_licoes}
                            max={module.total_licoes}
                            size="sm"
                            showPercentage
                            percentagePosition="outside"
                          />
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Not Started Modules */}
            {notStartedModules.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  Modulos Disponiveis
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({notStartedModules.length})
                  </span>
                </h2>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
                  {notStartedModules.map((module) => (
                    <Link
                      key={module.id}
                      href={`/academy/${module.categoria_slug}/${module.slug}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
                    >
                      <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-gray-400 dark:text-zinc-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {module.nome}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {module.categoria_nome}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-zinc-500">
                          <span>{module.total_licoes} licoes</span>
                          {module.duracao_minutos && (
                            <span>{module.duracao_minutos} min</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
