"use client"

import React, { ReactNode } from "react"
import { MessageSquare, MapPin, Ruler, Building2, Home, ChevronRight } from "lucide-react"

// ─── Helpers ────────────────────────────────────────────────

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (!node) return ""
  if (Array.isArray(node)) return node.map(extractText).join("")
  if (React.isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    return extractText(props.children)
  }
  return ""
}

function extractTableData(children: ReactNode): { headers: string[]; rows: string[][] } {
  const headers: string[] = []
  const rows: string[][] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const tag = child.type as string
    const props = child.props as { children?: ReactNode }

    if (tag === "thead") {
      React.Children.forEach(props.children, (tr) => {
        if (!React.isValidElement(tr)) return
        const trProps = tr.props as { children?: ReactNode }
        React.Children.forEach(trProps.children, (th) => {
          headers.push(extractText(th).trim())
        })
      })
    } else if (tag === "tbody") {
      React.Children.forEach(props.children, (tr) => {
        if (!React.isValidElement(tr)) return
        const trProps = tr.props as { children?: ReactNode }
        const row: string[] = []
        React.Children.forEach(trProps.children, (td) => {
          row.push(extractText(td).trim())
        })
        rows.push(row)
      })
    }
  })

  return { headers, rows }
}

type TableType = "lead" | "metric" | "property" | "generic"

function detectTableType(headers: string[]): TableType {
  const h = headers.map((s) => s.toLowerCase())

  const hasNome = h.some((x) => x.includes("nome"))
  const hasTelefone = h.some((x) => x.includes("telefone") || x.includes("tel"))
  const hasSituacao = h.some((x) =>
    x.includes("situa") || x.includes("status") || x.includes("temperatura")
  )
  if (hasNome && (hasTelefone || hasSituacao)) return "lead"

  const hasProperty = h.some((x) =>
    x.includes("empreendimento") || x.includes("unidade") || x.includes("im")
  )
  const hasPropertyDetail = h.some((x) =>
    x.includes("dispon") || x.includes("situa") || x.includes("tipo") || x.includes("local") || x.includes("metra")
  )
  if (hasProperty && hasPropertyDetail) return "property"

  if (headers.length === 2) return "metric"

  return "generic"
}

// ─── Color Helpers ──────────────────────────────────────────

const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-teal-500 to-emerald-600",
]

function getGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-cyan-500",
    "bg-teal-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-pink-500", "bg-fuchsia-500",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getSituacaoBadge(situacao: string): { bg: string; text: string; dot: string } {
  const s = situacao.toLowerCase()
  if (s.includes("quente") || s.includes("hot"))
    return { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" }
  if (s.includes("morno") || s.includes("warm"))
    return { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" }
  if (s.includes("frio") || s.includes("cold"))
    return { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" }
  if (s.includes("convertid") || s.includes("vend") || s.includes("ganho"))
    return { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" }
  if (s.includes("perdid") || s.includes("descartad"))
    return { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" }
  return { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400" }
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

function formatPhone(phone: string): string {
  const digits = cleanPhone(phone)
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return phone
}

// ─── Property Cards (Carousel) ──────────────────────────────

function PropertyCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const h = headers.map((s) => s.toLowerCase())
  const nameIdx = h.findIndex((x) => x.includes("empreendimento") || x.includes("nome"))
  const locationIdx = h.findIndex((x) => x.includes("local"))
  const availableIdx = h.findIndex((x) => x.includes("dispon"))
  const metragIdx = h.findIndex((x) => x.includes("metra") || x.includes("area") || x.includes("m²"))
  const typeIdx = h.findIndex((x) => x.includes("tipo"))
  const priceIdx = h.findIndex((x) => x.includes("pre") || x.includes("valor") || x.includes("r$"))

  return (
    <div className="my-3 -mx-1">
      {/* Scroll hint */}
      {rows.length > 2 && (
        <div className="flex items-center justify-end gap-1 px-2 mb-1.5">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Deslize para ver mais
          </span>
          <ChevronRight className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
        </div>
      )}
      <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide">
        {rows.map((row, i) => {
          const name = nameIdx >= 0 ? row[nameIdx] : row[0] || "—"
          const location = locationIdx >= 0 ? row[locationIdx] : ""
          const available = availableIdx >= 0 ? row[availableIdx] : ""
          const metragem = metragIdx >= 0 ? row[metragIdx] : ""
          const tipo = typeIdx >= 0 ? row[typeIdx] : ""
          const preco = priceIdx >= 0 ? row[priceIdx] : ""
          const gradient = getGradient(name)

          return (
            <div
              key={i}
              className="chat-card snap-start shrink-0 w-[260px] rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 overflow-hidden"
            >
              {/* Gradient header */}
              <div className={`bg-gradient-to-r ${gradient} px-4 pt-4 pb-3 relative`}>
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <span className="text-[11px] font-bold text-white">
                    {available} {parseInt(available) === 1 ? "un." : "un."}
                  </span>
                </div>
                <Building2 className="h-5 w-5 text-white/60 mb-2" />
                <h3 className="font-bold text-white text-[15px] leading-tight pr-14">
                  {name}
                </h3>
                {location && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin className="h-3 w-3 text-white/70" />
                    <span className="text-[11px] text-white/80 truncate">{location}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="px-4 py-3 space-y-2">
                {metragem && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{metragem}</span>
                  </div>
                )}
                {tipo && (
                  <div className="flex items-center gap-2">
                    <Home className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-1">{tipo}</span>
                  </div>
                )}
                {preco && (
                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{preco}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Lead Cards ─────────────────────────────────────────────

function LeadCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const h = headers.map((s) => s.toLowerCase())
  const nameIdx = h.findIndex((x) => x.includes("nome"))
  const phoneIdx = h.findIndex((x) => x.includes("telefone") || x.includes("tel"))
  const situacaoIdx = h.findIndex((x) => x.includes("situa") || x.includes("status") || x.includes("temperatura"))
  const empreendimentoIdx = h.findIndex((x) => x.includes("empreendimento") || x.includes("im"))

  const specialIdxs = new Set([nameIdx, phoneIdx, situacaoIdx, empreendimentoIdx].filter((i) => i >= 0))
  const extraIdxs = headers.map((_, i) => i).filter((i) => !specialIdxs.has(i))

  return (
    <div className="space-y-2 my-2">
      {rows.map((row, i) => {
        const name = row[nameIdx] || "—"
        const phone = phoneIdx >= 0 ? row[phoneIdx] : ""
        const situacao = situacaoIdx >= 0 ? row[situacaoIdx] : ""
        const empreendimento = empreendimentoIdx >= 0 ? row[empreendimentoIdx] : ""
        const initial = name.charAt(0).toUpperCase()
        const badge = situacao ? getSituacaoBadge(situacao) : null
        const phoneDigits = phone ? cleanPhone(phone) : ""

        return (
          <div
            key={i}
            className="chat-card flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getAvatarColor(name)}`}
            >
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {name}
                </span>
                {badge && situacao && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {situacao}
                  </span>
                )}
              </div>
              {phone && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {formatPhone(phone)}
                </p>
              )}
              {empreendimento && (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                  {empreendimento}
                </p>
              )}
              {extraIdxs.map((idx) =>
                row[idx] ? (
                  <p key={idx} className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                    <span className="font-medium">{headers[idx]}:</span> {row[idx]}
                  </p>
                ) : null
              )}
            </div>

            {phoneDigits && (
              <a
                href={`https://wa.me/55${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-white text-xs font-medium shadow-sm shadow-green-500/20"
                title="WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Metric Cards ───────────────────────────────────────────

function MetricCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const metricColors = [
    "from-violet-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-fuchsia-500 to-purple-500",
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-2">
      {rows.map((row, i) => {
        const label = row[0] || ""
        const value = row[1] || ""
        const gradient = metricColors[i % metricColors.length]

        return (
          <div
            key={i}
            className="chat-card relative overflow-hidden p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60"
          >
            <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${gradient}`} />
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {value}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium uppercase tracking-wide">
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Generic Cards ──────────────────────────────────────────

function GenericCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="space-y-2 my-2">
      {rows.map((row, i) => (
        <div
          key={i}
          className="chat-card p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60"
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {headers.map((header, j) =>
              row[j] ? (
                <div key={j} className="min-w-0">
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
                    {header}
                  </div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{row[j]}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── SmartTable (entry point) ───────────────────────────────

export function SmartTable(props: React.TableHTMLAttributes<HTMLTableElement>) {
  const { children } = props
  const { headers, rows } = extractTableData(children)

  if (!headers.length || !rows.length) {
    return <table {...props} />
  }

  const type = detectTableType(headers)

  switch (type) {
    case "lead":
      return <LeadCards headers={headers} rows={rows} />
    case "metric":
      return <MetricCards headers={headers} rows={rows} />
    case "property":
      return <PropertyCards headers={headers} rows={rows} />
    default:
      return <GenericCards headers={headers} rows={rows} />
  }
}
