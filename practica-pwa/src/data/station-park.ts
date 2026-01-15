// Station Park Apartamentos - Tabela Janeiro 26
// Dados extraídos do PDF oficial

export interface UnidadeStationPark {
  id: string
  unidade: string
  area: number
  dormitorios: number
  tipologia: string
  status: "disponivel" | "reservado" | "vendido"
  valorTotal: number
  plano: {
    ato: { valor: number; vencimento: string }
    mensais: { quantidade: number; valor: number; primeiroVencimento: string }
    financiamento: { valor: number; vencimento: string }
  }
}

export const stationParkUnidades: UnidadeStationPark[] = [
  {
    id: "SP407",
    unidade: "407",
    area: 40.26,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 373120.83,
    plano: {
      ato: { valor: 37312.09, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 24874.72, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 261184.58, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP408",
    unidade: "408",
    area: 58.62,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 575533.78,
    plano: {
      ato: { valor: 57553.37, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 38368.92, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 402873.65, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP902",
    unidade: "902",
    area: 60.34,
    dormitorios: 3,
    tipologia: "3 Dormitórios",
    status: "disponivel",
    valorTotal: 649687.55,
    plano: {
      ato: { valor: 64968.76, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 43312.50, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 454781.29, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1002",
    unidade: "1002",
    area: 60.34,
    dormitorios: 3,
    tipologia: "3 Dormitórios",
    status: "disponivel",
    valorTotal: 668806.13,
    plano: {
      ato: { valor: 66880.60, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 44587.08, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 468164.29, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1004",
    unidade: "1004",
    area: 47.84,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 495281.04,
    plano: {
      ato: { valor: 49528.09, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 33018.74, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 346696.73, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1101",
    unidade: "1101",
    area: 49,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 553861.88,
    plano: {
      ato: { valor: 55386.17, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 36924.13, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 387703.32, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1102",
    unidade: "1102",
    area: 60.34,
    dormitorios: 3,
    tipologia: "3 Dormitórios",
    status: "disponivel",
    valorTotal: 681519.80,
    plano: {
      ato: { valor: 68151.99, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 45434.65, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 477063.86, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1201",
    unidade: "1201",
    area: 49,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 555594.99,
    plano: {
      ato: { valor: 55559.49, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 37039.67, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 388916.49, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1301",
    unidade: "1301",
    area: 49,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 559639.08,
    plano: {
      ato: { valor: 55963.91, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 37309.27, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 391747.36, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1404",
    unidade: "1404",
    area: 47.84,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 495281.04,
    plano: {
      ato: { valor: 49528.09, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 33018.74, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 346696.73, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1501",
    unidade: "1501",
    area: 49,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 565556.28,
    plano: {
      ato: { valor: 56555.63, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 37703.75, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 395889.40, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1502",
    unidade: "1502",
    area: 60.34,
    dormitorios: 3,
    tipologia: "3 Dormitórios",
    status: "disponivel",
    valorTotal: 695872.67,
    plano: {
      ato: { valor: 69587.27, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 46391.51, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 487110.87, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1602",
    unidade: "1602",
    area: 60.34,
    dormitorios: 3,
    tipologia: "3 Dormitórios",
    status: "disponivel",
    valorTotal: 699547.98,
    plano: {
      ato: { valor: 69954.80, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 46636.53, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 489683.59, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1605",
    unidade: "1605",
    area: 34.54,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 357587.93,
    plano: {
      ato: { valor: 35758.78, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 250311.55, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1607",
    unidade: "1607",
    area: 34.54,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 357587.93,
    plano: {
      ato: { valor: 35758.78, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 250311.55, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1705",
    unidade: "1705",
    area: 34.54,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 357587.93,
    plano: {
      ato: { valor: 35758.78, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 250311.55, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1707",
    unidade: "1707",
    area: 34.54,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 357587.93,
    plano: {
      ato: { valor: 35758.78, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 250311.55, vencimento: "2025-10-25" }
    }
  },
  {
    id: "SP1804",
    unidade: "1804",
    area: 47.84,
    dormitorios: 2,
    tipologia: "2 Dormitórios",
    status: "disponivel",
    valorTotal: 495281.04,
    plano: {
      ato: { valor: 49528.09, vencimento: "2025-02-25" },
      mensais: { quantidade: 3, valor: 33018.74, primeiroVencimento: "2025-03-25" },
      financiamento: { valor: 346696.73, vencimento: "2025-10-25" }
    }
  }
]

// Função para converter dados do Station Park para o formato de PlanoPagamento
export function criarPlanoFromUnidade(unidade: UnidadeStationPark) {
  const mensais = []
  for (let i = 0; i < unidade.plano.mensais.quantidade; i++) {
    const data = new Date(unidade.plano.mensais.primeiroVencimento)
    data.setMonth(data.getMonth() + i)
    mensais.push({
      tipo: "mensal" as const,
      numero: i + 1,
      valor: unidade.plano.mensais.valor,
      vencimento: data.toISOString().split("T")[0],
      status: "pendente" as const
    })
  }

  return {
    valorTotal: unidade.valorTotal,
    percentualAto: Math.round((unidade.plano.ato.valor / unidade.valorTotal) * 100),
    percentualMensais: Math.round((unidade.plano.mensais.valor * unidade.plano.mensais.quantidade / unidade.valorTotal) * 100),
    percentualFinanciamento: Math.round((unidade.plano.financiamento.valor / unidade.valorTotal) * 100),
    quantidadeMensais: unidade.plano.mensais.quantidade,
    ato: {
      tipo: "ato" as const,
      numero: 1,
      valor: unidade.plano.ato.valor,
      vencimento: unidade.plano.ato.vencimento,
      status: "pendente" as const
    },
    mensais,
    financiamento: {
      tipo: "financiamento" as const,
      numero: 1,
      valor: unidade.plano.financiamento.valor,
      vencimento: unidade.plano.financiamento.vencimento,
      status: "pendente" as const
    }
  }
}

// Informações do empreendimento
export const stationParkInfo = {
  id: "station-park",
  nome: "Station Park Apartamentos",
  endereco: "São Paulo - SP",
  totalAndares: 18,
  unidadesPorAndar: 8,
  tabelaVigente: "TABELA JANEIRO 26"
}
