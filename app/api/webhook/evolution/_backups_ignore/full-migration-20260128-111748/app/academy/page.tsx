"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  GraduationCap,
  BookOpen,
  Award,
  ChevronRight,
  Loader2,
  PlayCircle,
  Clock,
  TrendingUp,
  Code,
  Building2,
  Users,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { CategoryCard } from "@/components/academy/category-card"
import { ProgressBar } from "@/components/academy/progress-bar"
import { CertificateCard } from "@/components/academy/certificate-card"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Category {
  id: number
  slug: string
  nome: string
  descricao?: string
  icone?: string
  cor?: string
  total_modulos: number
  total_licoes: number
  licoes_completas: number
  progresso: number
}

interface ProgressStats {
  total_completas: number
  total_licoes: number
  total_certificados: number
  progresso_geral: number
}

interface LastLesson {
  id: number
  slug: string
  titulo: string
  modulo_slug: string
  modulo_nome: string
  categoria_slug: string
  categoria_nome: string
}

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
}

const iconMap: Record<string, LucideIcon> = {
  book: BookOpen,
  code: Code,
  building: Building2,
  users: Users,
  trending: TrendingUp,
  message: MessageSquare,
}

export default function AcademyPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking("academy")

  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [lastLesson, setLastLesson] = useState<LastLesson | null>(null)
  const [nextLesson, setNextLesson] = useState<LastLesson | null>(null)
  const [certificates, setCertificates] = useState<Certificate[]>([])
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
        const [categoriesRes, progressRes, certificatesRes] = await Promise.all([
          fetch("/api/academy/categories"),
          fetch("/api/academy/progress"),
          fetch("/api/academy/certificates"),
        ])

        if (!categoriesRes.ok || !progressRes.ok || !certificatesRes.ok) {
          throw new Error("Erro ao carregar dados")
        }

        const [categoriesData, progressData, certificatesData] = await Promise.all([
          categoriesRes.json(),
          progressRes.json(),
          certificatesRes.json(),
        ])

        setCategories(categoriesData.data || [])
        setStats(progressData.stats || null)
        setLastLesson(progressData.last_lesson || null)
        setNextLesson(progressData.next_lesson || null)
        setCertificates(certificatesData.data || [])
      } catch (err) {
        console.error("Erro ao carregar Academy:", err)
        setError("Nao foi possivel carregar os dados. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

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

  return (
    <AppShell title="CP Academy">
      <div className="min-h-screen space-y-6 animate-page-in">
        {/* Header */}
        <section className="relative">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold">CP Academy</h1>
                    <p className="text-blue-100 text-sm">
                      Aprenda e evolua com a gente
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall progress */}
              {stats && (
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-100">Seu progresso</span>
                    <span className="text-lg font-bold">{stats.progresso_geral}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${stats.progresso_geral}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-blue-100">
                    <span>{stats.total_completas} licoes completas</span>
                    <span>{stats.total_certificados} certificados</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Continue from where you left off */}
        {(lastLesson || nextLesson) && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-blue-500" />
              Continue de onde parou
            </h2>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
              {nextLesson ? (
                <Link
                  href={`/academy/${nextLesson.categoria_slug}/${nextLesson.modulo_slug}/${nextLesson.slug}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <PlayCircle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Proxima licao
                    </p>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {nextLesson.titulo}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {nextLesson.modulo_nome}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                </Link>
              ) : lastLesson ? (
                <Link
                  href={`/academy/${lastLesson.categoria_slug}/${lastLesson.modulo_slug}/${lastLesson.slug}`}
                  className="flex items-center gap-4 group"
                >
                  <div className="h-14 w-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <BookOpen className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Ultima licao concluida
                    </p>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {lastLesson.titulo}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {lastLesson.modulo_nome}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                </Link>
              ) : null}
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Categorias
            </h2>
          </div>

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
          ) : categories.length === 0 ? (
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma categoria disponivel no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const Icon = iconMap[category.icone || "book"] || BookOpen
                return (
                  <CategoryCard
                    key={category.id}
                    id={category.id.toString()}
                    name={category.nome}
                    description={category.descricao}
                    icon={Icon}
                    iconColor={category.cor ? `text-${category.cor}-500` : "text-primary"}
                    totalModules={category.total_modulos}
                    totalLessons={category.total_licoes}
                    completedLessons={category.licoes_completas}
                    href={`/academy/${category.slug}`}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* Certificates */}
        {certificates.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Seus Certificados
              </h2>
              <Link
                href="/academy/certificados"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.slice(0, 2).map((cert) => (
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
          </section>
        )}
      </div>
    </AppShell>
  )
}
