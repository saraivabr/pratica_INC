"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { useAuth, usePageTracking } from "@/lib/auth-context"
import { Breadcrumb } from "@/components/academy/breadcrumb"
import { CertificateModal } from "@/components/academy/certificate-modal"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavigationLesson {
  id: number
  slug: string
  titulo: string
  ordem: number
}

interface Lesson {
  id: number
  slug: string
  titulo: string
  conteudo: string
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
  prev_lesson?: NavigationLesson | null
  next_lesson?: NavigationLesson | null
}

interface Certificate {
  codigo: string
  modulo_nome: string
  emitido_em?: string
  is_new?: boolean
}

interface PageProps {
  params: Promise<{ categoria: string; modulo: string; licao: string }>
}

// Simple markdown-to-HTML converter (basic support)
function renderMarkdown(content: string): string {
  if (!content) return ""

  let html = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-zinc-800 rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm">$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Unordered lists
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4 mb-1">$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.*)$/gim, '<li class="ml-4 mb-1 list-decimal">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>')
    // Blockquotes
    .replace(/^>\s+(.*)$/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-950/30 rounded-r-lg text-gray-700 dark:text-gray-300">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-6 border-gray-200 dark:border-zinc-700" />')
    // Paragraphs (lines not starting with special characters)
    .replace(/^(?!<[hpblu]|<code|<pre|<hr|<li)(.+)$/gim, '<p class="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">$1</p>')

  // Wrap consecutive li elements in ul
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
    return `<ul class="list-disc mb-4">${match}</ul>`
  })

  return html
}

export default function LicaoPage({ params }: PageProps) {
  const { categoria: categoriaSlug, modulo: moduloSlug, licao: licaoSlug } = use(params)
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  usePageTracking(`academy-licao-${licaoSlug}`)

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [earnedCertificate, setEarnedCertificate] = useState<Certificate | null>(null)

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
        const res = await fetch(
          `/api/academy/lessons?modulo=${moduloSlug}&licao=${licaoSlug}`
        )
        if (!res.ok) {
          throw new Error("Erro ao carregar licao")
        }
        const data = await res.json()
        setLesson(data.data || null)
      } catch (err) {
        console.error("Erro ao carregar licao:", err)
        setError("Nao foi possivel carregar a licao. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated, moduloSlug, licaoSlug])

  const handleComplete = async () => {
    if (!lesson || completing) return

    setCompleting(true)

    try {
      const res = await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lesson.id }),
      })

      if (!res.ok) {
        throw new Error("Erro ao marcar como completa")
      }

      const data = await res.json()

      // Update lesson state
      setLesson((prev) =>
        prev ? { ...prev, completed: true, completed_at: new Date().toISOString() } : prev
      )

      // Check if earned certificate
      if (data.module_completed && data.certificate?.is_new) {
        setEarnedCertificate(data.certificate)
        setShowCertificateModal(true)
      } else if (lesson.next_lesson) {
        // Navigate to next lesson
        router.push(
          `/academy/${categoriaSlug}/${moduloSlug}/${lesson.next_lesson.slug}`
        )
      }
    } catch (err) {
      console.error("Erro ao completar licao:", err)
      setError("Nao foi possivel marcar a licao como completa. Tente novamente.")
    } finally {
      setCompleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <AppShell title="Licao">
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 text-center max-w-md">
            <BookOpen className="h-12 w-12 text-red-300 dark:text-red-600 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error || "Licao nao encontrada"}
            </p>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={lesson.titulo}>
      <div className="min-h-screen animate-page-in">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            {
              label: lesson.categoria_nome,
              href: `/academy/${categoriaSlug}`,
            },
            {
              label: lesson.modulo_nome,
              href: `/academy/${categoriaSlug}/${moduloSlug}`,
            },
            { label: lesson.titulo },
          ]}
        />

        <div className="max-w-3xl mx-auto mt-6">
          {/* Lesson Header */}
          <section className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Licao {lesson.ordem}
              </span>
              <span>-</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {lesson.duracao_minutos} min de leitura
              </span>
              {lesson.completed && (
                <>
                  <span>-</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Completa
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {lesson.titulo}
            </h1>

            {lesson.resumo && (
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {lesson.resumo}
              </p>
            )}
          </section>

          {/* Lesson Content */}
          <article className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 md:p-8 mb-8">
            <div
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.conteudo) }}
            />
          </article>

          {/* Complete Button */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 mb-8">
            {lesson.completed ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <span className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
                  Licao concluida!
                </span>
              </div>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completing}
                className="w-full py-6 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {completing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Marcando como completa...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Marcar como concluida
                  </>
                )}
              </Button>
            )}
          </section>

          {/* Navigation */}
          <section className="flex items-center justify-between gap-4 mb-8">
            {lesson.prev_lesson ? (
              <Link
                href={`/academy/${categoriaSlug}/${moduloSlug}/${lesson.prev_lesson.slug}`}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex-1 max-w-[45%]"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Anterior</p>
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {lesson.prev_lesson.titulo}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {lesson.next_lesson ? (
              <Link
                href={`/academy/${categoriaSlug}/${moduloSlug}/${lesson.next_lesson.slug}`}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex-1 max-w-[45%] text-right justify-end"
              >
                <div className="min-w-0">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Proxima</p>
                  <p className="font-medium text-blue-700 dark:text-blue-300 truncate">
                    {lesson.next_lesson.titulo}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-500 shrink-0" />
              </Link>
            ) : (
              <Link
                href={`/academy/${categoriaSlug}/${moduloSlug}`}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Fim do modulo</p>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300">
                    Voltar ao modulo
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-500" />
              </Link>
            )}
          </section>

          {/* Back link */}
          <div className="text-center pb-8">
            <Button variant="ghost" asChild>
              <Link
                href={`/academy/${categoriaSlug}/${moduloSlug}`}
                className="text-gray-600 dark:text-gray-400"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Ver todas as licoes do modulo
              </Link>
            </Button>
          </div>
        </div>

        {/* Certificate Modal */}
        {earnedCertificate && (
          <CertificateModal
            isOpen={showCertificateModal}
            onClose={() => {
              setShowCertificateModal(false)
              if (lesson.next_lesson) {
                router.push(
                  `/academy/${categoriaSlug}/${moduloSlug}/${lesson.next_lesson.slug}`
                )
              } else {
                router.push(`/academy/${categoriaSlug}/${moduloSlug}`)
              }
            }}
            certificate={earnedCertificate}
            userName={user?.nome}
          />
        )}
      </div>
    </AppShell>
  )
}
