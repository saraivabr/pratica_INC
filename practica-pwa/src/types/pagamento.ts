export interface Cliente {
  nome: string
  cpf: string
  whatsapp: string
  email: string
  endereco?: string
}

export interface Parcela {
  tipo: "ato" | "mensal" | "financiamento"
  numero: number
  valor: number
  vencimento: string
  status: "pendente" | "pago" | "vencido"
  dataPagamento?: string
}

export interface PlanoPagamento {
  valorTotal: number
  percentualAto: number
  percentualMensais: number
  percentualFinanciamento: number
  quantidadeMensais: number
  ato: Parcela
  mensais: Parcela[]
  financiamento: Parcela
}

export interface PreReserva {
  id: string
  corretorId: string
  corretorNome: string
  empreendimentoId: string
  empreendimentoNome: string
  unidade: string
  tipologia: {
    area_m2: number
    dormitorios: number
    descricao?: string
  }
  cliente: Cliente
  plano: PlanoPagamento
  status: "pendente" | "ativa" | "cancelada" | "concluida"
  createdAt: string
  updatedAt: string
}

// Alias para compatibilidade
export type Reserva = PreReserva

export interface SimuladorInput {
  valorTotal: number
  percentualAto: number
  quantidadeMensais: number
  dataAto: string
}

export interface SimuladorOutput {
  plano: PlanoPagamento
}
