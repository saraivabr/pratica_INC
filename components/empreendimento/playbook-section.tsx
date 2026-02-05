"use client"

import {
  BookOpen,
  Target,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getPlaybook } from "@/lib/playbooks-data"

interface PlaybookSectionProps {
  empreendimentoId: string | number
}

export function PlaybookSection({ empreendimentoId }: PlaybookSectionProps) {
  const playbook = getPlaybook(empreendimentoId)

  if (!playbook) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 md:p-2 bg-amber-100 rounded-lg text-amber-700">
          <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
        </div>
        <h2 className="text-lg md:text-2xl font-bold text-gray-900">Playbook de Vendas</h2>
      </div>

      {/* Argumentos de Venda */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Argumentos de Venda</h3>
          </div>
          <ul className="space-y-2">
            {playbook.argumentosVenda.map((arg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </span>
                {arg}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Público-Alvo */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Público-Alvo</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Perfis</p>
              <ul className="space-y-1">
                {playbook.publicoAlvo.perfis.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700">• {p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Motivações</p>
              <div className="flex flex-wrap gap-2">
                {playbook.publicoAlvo.motivacoes.map((m, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objeções */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Objeções Comuns</h3>
          </div>
          <div className="space-y-3">
            {playbook.objecoes.map((item, i) => (
              <div key={i} className="border-l-2 border-orange-300 pl-3">
                <p className="font-medium text-gray-900 text-sm">"{item.objecao}"</p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="text-emerald-600 font-medium">R: </span>{item.resposta}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparativo */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Diferenciais Competitivos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {playbook.comparativo.map((item, i) => (
              <div key={i} className="bg-purple-50 p-3 rounded">
                <p className="text-xs font-medium text-purple-600 uppercase">{item.categoria}</p>
                <p className="text-sm text-gray-700">{item.vantagem}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scripts */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-gray-900">Scripts de Abordagem</h3>
          </div>
          <div className="space-y-3">
            {playbook.scripts.map((item, i) => (
              <div key={i} className="bg-gray-50 rounded overflow-hidden">
                <div className="bg-teal-600 text-white px-3 py-1.5 text-sm font-medium">
                  {item.situacao}
                </div>
                <p className="p-3 text-sm text-gray-700">{item.script}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
