export interface Tipologia {
  area_m2: number | string
  dormitorios?: number | string
  suites?: number
  vagas?: number
  descricao?: string
  preco_base?: number
  tipo?: string
}

export interface Localizacao {
  endereco?: string
  bairro: string
  zona: string
  proximidade_metro?: string
  showroom?: string
}

export interface Configuracao {
  torres: number
  pavimentos?: number
  apartamentos_por_andar?: number
  elevadores?: number
  unidades_totais?: number | string
  terreno_m2?: number
  subsolos?: number
  terreo?: number
  tipo?: string
}

export interface Empreendimento {
  id: string
  nome: string
  status: "em_construcao" | "lancamento" | "entregue"
  lançamento?: string
  entrega_prevista?: string
  entrega?: string
  padrao?: string
  localizacao: Localizacao
  configuracao?: Configuracao
  tipologias: Tipologia[]
  diferenciais?: string[]
  diferenciais_premium?: string[]
  lazer?: string[]
  arquitetura?: string
  preco_m2?: string
  financiamento?: string[]
  conceito?: string | string[]
  parceiros?: string[]
  segmento?: string
  imagemCapa?: string
  galeria?: string[]
}

export interface Empresa {
  nome: string
  cnpj: string
  fundacao: string
  tempo_atuacao_anos: number
  clientes_atendidos: string
  site: string
  contatos: {
    telefone: string
    whatsapp: string
    email: string
    instagram: string
    endereco: string
  }
}

export interface Database {
  empresa: Empresa
  empreendimentos: {
    em_construcao: Empreendimento[]
    em_lancamento: Empreendimento[]
    entregues: Empreendimento[]
  }
}
