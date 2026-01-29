'use client'

import * as React from 'react'
import { Plus, Equal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  formatarMoeda,
  calcularDistribuicao,
  distribuirIgualmente,
} from '@/lib/intermediacao/formatters'
import { DistribuicaoItem } from './DistribuicaoItem'
import { DistribuicaoProgressBar } from './DistribuicaoProgressBar'
import { DistribuicaoValidacao } from './DistribuicaoValidacao'
import type { Beneficiario, Distribuicao } from '@/lib/intermediacao/types'

export interface DistribuicaoComissaoFormProps {
  comissaoTotal: number
  distribuicoes: Distribuicao[]
  onChange: (distribuicoes: Distribuicao[]) => void
  beneficiariosDisponiveis: Beneficiario[]
  className?: string
}

/**
 * Formulario de distribuicao de comissao
 *
 * Funcionalidades:
 * - Adicionar beneficiario (search select)
 * - Remover beneficiario
 * - Editar percentual (recalcula valor automaticamente)
 * - Barra de progresso visual
 * - Validacao: soma = 100%
 * - Botao "Distribuir Igualmente" divide entre os selecionados
 */
export function DistribuicaoComissaoForm({
  comissaoTotal,
  distribuicoes,
  onChange,
  beneficiariosDisponiveis,
  className,
}: DistribuicaoComissaoFormProps) {
  const [selectedBeneficiario, setSelectedBeneficiario] = React.useState<string>('')

  // Calcula o percentual total atual
  const percentualAtual = distribuicoes.reduce((acc, d) => acc + d.percentual, 0)

  // Filtra beneficiarios que ainda nao foram adicionados
  const beneficiariosNaoAdicionados = beneficiariosDisponiveis.filter(
    (b) => !distribuicoes.some((d) => d.beneficiarioId === b.id)
  )

  // Adiciona um novo beneficiario
  const handleAddBeneficiario = () => {
    if (!selectedBeneficiario) return

    const beneficiario = beneficiariosDisponiveis.find(
      (b) => b.id === selectedBeneficiario
    )
    if (!beneficiario) return

    // Percentual inicial: o restante para chegar a 100% ou 0 se ja passou
    const percentualRestante = Math.max(0, 100 - percentualAtual)
    const percentualInicial = percentualRestante > 0 ? percentualRestante : 0
    const valorInicial = calcularDistribuicao(comissaoTotal, percentualInicial)

    const novaDistribuicao: Distribuicao = {
      beneficiarioId: beneficiario.id,
      beneficiario,
      percentual: percentualInicial,
      valor: valorInicial,
    }

    onChange([...distribuicoes, novaDistribuicao])
    setSelectedBeneficiario('')
  }

  // Remove um beneficiario
  const handleRemoveBeneficiario = (beneficiarioId: string) => {
    onChange(distribuicoes.filter((d) => d.beneficiarioId !== beneficiarioId))
  }

  // Atualiza o percentual de um beneficiario
  const handlePercentualChange = (beneficiarioId: string, percentual: number) => {
    const valor = calcularDistribuicao(comissaoTotal, percentual)
    onChange(
      distribuicoes.map((d) =>
        d.beneficiarioId === beneficiarioId
          ? { ...d, percentual, valor }
          : d
      )
    )
  }

  // Distribui igualmente entre todos os beneficiarios
  const handleDistribuirIgualmente = () => {
    if (distribuicoes.length === 0) return

    const percentuais = distribuirIgualmente(distribuicoes.length)
    onChange(
      distribuicoes.map((d, index) => ({
        ...d,
        percentual: percentuais[index],
        valor: calcularDistribuicao(comissaoTotal, percentuais[index]),
      }))
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Distribuicao da Comissao</CardTitle>
          <span className="text-sm text-muted-foreground">
            Comissao Total:{' '}
            <span className="font-mono font-semibold text-foreground">
              {formatarMoeda(comissaoTotal)}
            </span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Lista de Beneficiarios */}
        <div className="space-y-4">
          <p className="text-sm font-medium">Beneficiarios:</p>

          {distribuicoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum beneficiario adicionado
            </div>
          ) : (
            <div className="space-y-3">
              {distribuicoes.map((dist) => (
                <DistribuicaoItem
                  key={dist.beneficiarioId}
                  beneficiario={dist.beneficiario}
                  percentual={dist.percentual}
                  valor={dist.valor}
                  onPercentualChange={(p) =>
                    handlePercentualChange(dist.beneficiarioId, p)
                  }
                  onRemove={() => handleRemoveBeneficiario(dist.beneficiarioId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Adicionar Beneficiario */}
        {beneficiariosNaoAdicionados.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground block mb-1.5">
                Adicionar Beneficiario
              </label>
              <Select
                value={selectedBeneficiario}
                onValueChange={setSelectedBeneficiario}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um beneficiario..." />
                </SelectTrigger>
                <SelectContent>
                  {beneficiariosNaoAdicionados.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nome} ({b.cargo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddBeneficiario}
              disabled={!selectedBeneficiario}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        )}

        <Separator />

        {/* Progresso e Validacao */}
        <DistribuicaoProgressBar
          percentualAtual={percentualAtual}
          percentualMeta={100}
        />

        <DistribuicaoValidacao
          percentualAtual={percentualAtual}
          percentualMeta={100}
        />

        <Separator />

        {/* Botao Distribuir Igualmente */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleDistribuirIgualmente}
          disabled={distribuicoes.length === 0}
          className="w-full"
        >
          <Equal className="h-4 w-4 mr-2" />
          Distribuir Igualmente
        </Button>
      </CardContent>
    </Card>
  )
}
