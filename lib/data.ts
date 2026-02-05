export interface Empreendimento {
  id: string
  nome: string
  cidade?: string
  bairro?: string
  tipo?: string
  construtora?: string
  previsaoEntrega?: string
  descricao?: string
  diferenciais?: string[]
  imagemPrincipal?: string
  imagens?: string[]
  precoMinimo?: number
  precoMaximo?: number
  unidades?: Unidade[]
  condicoes?: CondicaoPagamento[]
  // Campos extras para exibicao
  unidadesDisponiveis?: number
  areaMin?: number
  areaMax?: number
  quartosMin?: number
  quartosMax?: number
}

export interface Unidade {
  id: string
  numero: string
  tipologia: string
  quartos: number
  area: number
  valor: number
  status: "disponivel" | "reservada" | "vendida"
  andar?: number
  vagas?: number
  posicao?: string
}

export interface CondicaoPagamento {
  id: string
  nome: string
  entrada: number
  parcelas: number
  valorParcela: number
  reforcos?: { mes: number; valor: number }[]
  financiamento?: number
}

export function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return ""
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function getStatusColor(status: Unidade["status"]): string {
  switch (status) {
    case "disponivel":
      return "bg-success text-success-foreground"
    case "reservada":
      return "bg-warning text-warning-foreground"
    case "vendida":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getStatusLabel(status: Unidade["status"]): string {
  switch (status) {
    case "disponivel":
      return "Disponível"
    case "reservada":
      return "Reservada"
    case "vendida":
      return "Vendida"
    default:
      return status
  }
}

export function getTipoLabel(tipo?: string): string {
  if (!tipo) return ""
  switch (tipo) {
    case "apartamento":
      return "Apartamento"
    case "casa":
      return "Casa"
    case "comercial":
      return "Comercial"
    default:
      return tipo
  }
}
