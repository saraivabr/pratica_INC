"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookOpen,
  ChevronLeft,
  Loader2,
  Clock,
  CheckCircle2,
  Award,
  PlayCircle,
  Circle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Breadcrumb } from "@/components/academy/breadcrumb"
import { ProgressBar } from "@/components/academy/progress-bar"
import { LessonItem } from "@/components/academy/lesson-item"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Lesson {
  id: number
  slug: string
  titulo: string
  resumo?: string
  duracao_minutos: number
  ordem: number
  modulo_id: number
  modulo_slug: string
  modulo_nome: string
  categoria_id: number
  categoria_slug: string
  categoria_nome: string
  completed: boolean
  completed_at?: string
}

interface ModuleInfo {
  id: number
  slug: string
  nome: string
  categoria_id: number
  categoria_slug: string
  categoria_nome: string
}

interface Certificate {
  codigo: string
  emitido_em: string
}

interface PageProps {
  params: Promise<{ categoria: string; modulo: string }>
}

export default function ModuloPage({ params }: PageProps) {
  const { categoria: categoriaSlug, modulo: moduloSlug } = use(params)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking(`academy-modulo-${moduloSlug}`)

  const [lessons, setLessons] = useState<Lesson[]>([])
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null)
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
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
        // Fetch lessons for this module
        const lessonsRes = await fetch(`/api/academy/lessons?modulo=${moduloSlug}`)
        if (!lessonsRes.ok) {
          throw new Error("Erro ao carregar licoes")
        }
        const lessonsData = await lessonsRes.json()

        setLessons(lessonsData.data || [])
        setModuleInfo(lessonsData.module || null)
        setTotalLessons(lessonsData.total || 0)
        setCompletedLessons(lessonsData.completed || 0)

        // Check for certificate
        const modulesRes = await fetch(`/api/academy/modules?categoria=${categoriaSlug}`)
        if (modulesRes.ok) {
          const modulesData = await modulesRes.json()
          const currentModule = modulesData.data?.find((m: any) => m.slug === moduloSlug)
          if (currentModule?.certificado) {
            setCertificate(currentModule.certificado)
          }
        }
      } catch (err) {
        console.error("Erro ao carregar modulo:", err)
        setError("Nao foi possivel carregar as licoes. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated, moduloSlug, categoriaSlug])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
        </div>
      </div>
    )
  }

  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const isComplete = completedLessons >= totalLessons && totalLessons > 0

  // Find the next lesson to continue
  const nextLessonIndex = lessons.findIndex((l) => !l.completed)

  return (
    <AppShell title={moduleInfo?.nome || "Modulo"}>
      <div className="min-h-screen space-y-6 animate-page-in">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            {
              label: moduleInfo?.categoria_nome || categoriaSlug,
              href: `/academy/${categoriaSlug}`,
            },
            { label: moduleInfo?.nome || moduloSlug },
          ]}
        />

        {/* Module Header */}
        <section className="relative">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Icon */}
              <div
                className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0",
                  isComplete
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {moduleInfo?.nome || "Carregando..."}
                </h1>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {totalLessons} licoes
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {lessons.reduce((acc, l) => acc + l.duracao_minutos, 0)} min total
                  </span>
                  {isComplete && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Concluido
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="max-w-md">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {completedLessons} de {totalLessons} licoes completas
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        isComplete
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-blue-600 dark:text-blue-400"
                      )}
                    >
                      {progress}%
                    </span>
                  </div>
                  <ProgressBar
                    value={completedLessons}
                    max={totalLessons}
                    variant={isComplete ? "success" : "default"}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={`/academy/${categoriaSlug}`}
            className="text-gray-600 dark:text-gray-400"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar para {moduleInfo?.categoria_nome || "categoria"}
          </Link>
        </Button>

        {/* Certificate Section */}
        {certificate && (
          <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <Award className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Certificado conquistado!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Codigo: <code className="font-mono text-amber-600 dark:text-amber-400">{certificate.codigo}</code>
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/academy/certificados">Ver certificados</Link>
              </Button>
            </div>
          </section>
        )}

        {/* Lessons List */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Licoes
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
          ) : lessons.length === 0 ? (
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma licao disponivel neste modulo.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
              {lessons.map((lesson, index) => (
                <LessonItem
                  key={lesson.id}
                  slug={lesson.slug}
                  titulo={lesson.titulo}
                  resumo={lesson.resumo}
                  duracao_minutos={lesson.duracao_minutos}
                  ordem={lesson.ordem}
                  completed={lesson.completed}
                  categoriaSlug={categoriaSlug}
                  moduloSlug={moduloSlug}
                  isNext={index === nextLessonIndex}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
