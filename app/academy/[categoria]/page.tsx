"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookOpen,
  ChevronLeft,
  Loader2,
  Code,
  Building2,
  Users,
  TrendingUp,
  MessageSquare,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { ModuleCard } from "@/components/academy/module-card"
import { Breadcrumb } from "@/components/academy/breadcrumb"
import { ProgressBar } from "@/components/academy/progress-bar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface Module {
  id: number
  slug: string
  nome: string
  descricao?: string
  imagem_url?: string
  duracao_minutos: number
  ordem: number
  categoria_id: number
  categoria_slug: string
  categoria_nome: string
  total_licoes: number
  licoes_completas: number
  progresso: number
  concluido: boolean
  certificado?: { codigo: string; emitido_em: string } | null
}

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

interface PageProps {
  params: Promise<{ categoria: string }>
}

const iconMap: Record<string, React.ElementType> = {
  book: BookOpen,
  code: Code,
  building: Building2,
  users: Users,
  trending: TrendingUp,
  message: MessageSquare,
}

const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-600 to-teal-600",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-600 to-cyan-600",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-600 to-violet-600",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-600 to-orange-600",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    gradient: "from-rose-600 to-pink-600",
  },
}

export default function CategoriaPage({ params }: PageProps) {
  const { categoria: categoriaSlug } = use(params)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  usePageTracking(`academy-categoria-${categoriaSlug}`)

  const [modules, setModules] = useState<Module[]>([])
  const [category, setCategory] = useState<Category | null>(null)
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
        // Fetch modules for this category
        const modulesRes = await fetch(`/api/academy/modules?categoria=${categoriaSlug}`)
        if (!modulesRes.ok) {
          throw new Error("Erro ao carregar modulos")
        }
        const modulesData = await modulesRes.json()
        setModules(modulesData.data || [])

        // Fetch category details
        const categoriesRes = await fetch("/api/academy/categories")
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          const cat = categoriesData.data?.find((c: Category) => c.slug === categoriaSlug)
          setCategory(cat || null)
        }
      } catch (err) {
        console.error("Erro ao carregar categoria:", err)
        setError("Nao foi possivel carregar os modulos. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated, categoriaSlug])

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

  const Icon = iconMap[category?.icone || "book"] || BookOpen
  const colors = colorMap[category?.cor || "blue"] || colorMap.blue

  return (
    <AppShell title={category?.nome || "Categoria"}>
      <div className="min-h-screen space-y-6 animate-page-in">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[{ label: category?.nome || categoriaSlug }]}
        />

        {/* Category Header */}
        <section className="relative">
          <div
            className={cn(
              "bg-gradient-to-br rounded-2xl p-6 md:p-8 text-white overflow-hidden",
              colors.gradient
            )}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative flex flex-col md:flex-row md:items-start gap-6">
              {/* Back button */}
              <Link
                href="/academy"
                className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors mb-2 md:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Link>

              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Icon className="h-8 w-8" />
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {category?.nome || "Carregando..."}
                </h1>
                {category?.descricao && (
                  <p className="text-white/80 max-w-2xl">{category.descricao}</p>
                )}

                {/* Stats */}
                {category && (
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-white/80">
                    <span>{category.total_modulos} modulos</span>
                    <span>{category.total_licoes} licoes</span>
                    <span>{category.licoes_completas} completas</span>
                  </div>
                )}

                {/* Progress */}
                {category && category.progresso > 0 && (
                  <div className="mt-4 max-w-xs">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-white/80">Progresso</span>
                      <span className="font-medium">{category.progresso}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${category.progresso}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Back button desktop */}
        <div className="hidden md:block">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/academy" className="text-gray-600 dark:text-gray-400">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar para Academy
            </Link>
          </Button>
        </div>

        {/* Modules */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Modulos
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
          ) : modules.length === 0 ? (
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum modulo disponivel nesta categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  id={module.id.toString()}
                  title={module.nome}
                  description={module.descricao}
                  imageUrl={module.imagem_url}
                  durationMinutes={module.duracao_minutos}
                  totalLessons={module.total_licoes}
                  completedLessons={module.licoes_completas}
                  hasCertificate={true}
                  certificateEarned={!!module.certificado}
                  href={`/academy/${categoriaSlug}/${module.slug}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
