"use client"

import React, { ReactNode } from "react"
import { MessageSquare } from "lucide-react"

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
      // Find tr > th elements
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

  // Lead: has "nome" + ("telefone" or "situação"/"situacao"/"status")
  const hasNome = h.some((x) => x.includes("nome"))
  const hasTelefone = h.some((x) => x.includes("telefone") || x.includes("tel"))
  const hasSituacao = h.some((x) =>
    x.includes("situa") || x.includes("status") || x.includes("temperatura")
  )
  if (hasNome && (hasTelefone || hasSituacao)) return "lead"

  // Property: has "empreendimento"/"unidade" + "disponíve"/"situação"/"tipo"
  const hasProperty = h.some((x) =>
    x.includes("empreendimento") || x.includes("unidade") || x.includes("im")
  )
  const hasPropertyDetail = h.some((x) =>
    x.includes("dispon") || x.includes("situa") || x.includes("tipo") || x.includes("local")
  )
  if (hasProperty && hasPropertyDetail) return "property"

  // Metric: exactly 2 columns, second column has numbers/percentages
  if (headers.length === 2) return "metric"

  return "generic"
}

// ─── Color Helpers ──────────────────────────────────────────

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
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

// ─── Card Components ────────────────────────────────────────

function LeadCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const h = headers.map((s) => s.toLowerCase())
  const nameIdx = h.findIndex((x) => x.includes("nome"))
  const phoneIdx = h.findIndex((x) => x.includes("telefone") || x.includes("tel"))
  const situacaoIdx = h.findIndex((x) => x.includes("situa") || x.includes("status") || x.includes("temperatura"))
  const empreendimentoIdx = h.findIndex((x) => x.includes("empreendimento") || x.includes("im"))

  // Remaining columns (not mapped to special fields)
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
            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getAvatarColor(name)}`}
            >
              {initial}
            </div>

            {/* Info */}
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
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                  {empreendimento}
                </p>
              )}
              {/* Extra fields */}
              {extraIdxs.map((idx) =>
                row[idx] ? (
                  <p key={idx} className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                    <span className="text-zinc-400 dark:text-zinc-500">{headers[idx]}:</span> {row[idx]}
                  </p>
                ) : null
              )}
            </div>

            {/* WhatsApp button */}
            {phoneDigits && (
              <a
                href={`https://wa.me/55${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                title="WhatsApp"
              >
                <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MetricCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="flex flex-wrap gap-2 my-2">
      {rows.map((row, i) => {
        const label = row[0] || ""
        const value = row[1] || ""
        return (
          <div
            key={i}
            className="chat-card flex-1 min-w-[100px] p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 text-center"
          >
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{label}</div>
          </div>
        )
      })}
    </div>
  )
}

function PropertyCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const h = headers.map((s) => s.toLowerCase())
  const nameIdx = h.findIndex((x) =>
    x.includes("empreendimento") || x.includes("nome") || x.includes("unidade")
  )

  const specialIdxs = new Set([nameIdx].filter((i) => i >= 0))
  const detailIdxs = headers.map((_, i) => i).filter((i) => !specialIdxs.has(i))

  return (
    <div className="space-y-2 my-2">
      {rows.map((row, i) => {
        const name = nameIdx >= 0 ? row[nameIdx] : row[0]
        const details = detailIdxs.map((idx) => row[idx]).filter(Boolean)

        return (
          <div
            key={i}
            className="chat-card flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-base">🏢</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{name}</p>
              {details.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {details.join(" · ")}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GenericCards({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="space-y-2 my-2">
      {rows.map((row, i) => (
        <div
          key={i}
          className="chat-card p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60"
        >
          <div className="space-y-1">
            {headers.map((header, j) =>
              row[j] ? (
                <div key={j} className="flex items-baseline gap-2">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide shrink-0">
                    {header}
                  </span>
                  <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{row[j]}</span>
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

  // If extraction failed, fall back to default table
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
