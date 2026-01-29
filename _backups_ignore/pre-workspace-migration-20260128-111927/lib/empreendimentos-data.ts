// Dados dos empreendimentos da Pratica Incorporadora
// Fonte: Sistema Orulo (atualizado em Janeiro/2026)

export interface Unidade {
  id: string
  numero: string
  tipologia: string
  quartos: number
  area: number
  valor: number
  status: 'disponivel' | 'reservada' | 'vendida'
  andar?: number
  vagas?: number
  posicao?: string
}

export interface CondicaoPagamento {
  nome: string
  percentual: number
  valor?: number
  parcelas?: number
  observacao?: string
}

export interface Empreendimento {
  id: number
  nome: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  entrega: string
  status: 'pronto' | 'em_obra' | 'lancamento'
  latitude: number
  longitude: number
  descricao: string
  imagem: string
  imagens: string[]
  diferenciais: string[]
  unidadesTotal: number
  unidadesDisponiveis: number
  areaMin: number
  areaMax: number
  valorMin: number
  valorMax: number
  dormitoriosMin: number
  dormitoriosMax: number
  unidades: Unidade[]
  condicoesPagamento: CondicaoPagamento[]
}

export const empreendimentos: Empreendimento[] = [
  // 1. Station Park
  {
    id: 1,
    nome: 'Station Park',
    endereco: 'Av. Vila Ema',
    numero: '1568',
    bairro: 'Vila Ema',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: 'Pronto',
    status: 'pronto',
    latitude: -23.581136,
    longitude: -46.56148,
    descricao: 'Uma combinacao de natureza e mobilidade juntos num empreendimento com lazer completo em frente ao parque Vila Ema e a 150m do metro Oratorio. Sao studios, apartamentos 1, 2, e 3 dormitorios, com vaga de garagem.',
    imagem: 'https://static.orulo.com.br/images/properties/large/967268.png?1654270670',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/967268.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967272.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967263.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967267.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967255.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967269.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967261.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967273.png?1654270670',
      'https://static.orulo.com.br/images/properties/large/967262.png?1654270670'
    ],
    diferenciais: [
      'Academia',
      'Brinquedoteca',
      'Churrasqueira condominial',
      'Coworking',
      'Elevador social',
      'Espaco gourmet',
      'Fire place',
      'Lounge',
      'Pet place',
      'Piscina adulto',
      'Playground',
      'Portaria',
      'Quadra poliesportiva',
      'Sala de jogos',
      'Salao de festas',
      'Sauna',
      'Seguranca',
      'Solarium'
    ],
    unidadesTotal: 189,
    unidadesDisponiveis: 23,
    areaMin: 22,
    areaMax: 60.34,
    valorMin: 217410.16,
    valorMax: 699547.98,
    dormitoriosMin: 1,
    dormitoriosMax: 3,
    unidades: [
      { id: 'SP1602', numero: '1602', tipologia: 'Apartamento 3 dorm', quartos: 3, area: 60.34, valor: 699547.98, status: 'disponivel', andar: 16, vagas: 1 },
      { id: 'SP1707', numero: '1707', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 34.54, valor: 357587.93, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SP1201', numero: '1201', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 49, valor: 555594.99, status: 'disponivel', andar: 12, vagas: 1 },
      { id: 'SP902', numero: '902', tipologia: 'Apartamento 3 dorm', quartos: 3, area: 60.34, valor: 649687.55, status: 'disponivel', andar: 9, vagas: 1 },
      { id: 'SP1102', numero: '1102', tipologia: 'Apartamento 3 dorm', quartos: 3, area: 60.34, valor: 681519.8, status: 'disponivel', andar: 11, vagas: 1 },
      { id: 'SP1804', numero: '1804', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 47.48, valor: 495281.04, status: 'disponivel', andar: 18, vagas: 1 },
      { id: 'SP1705', numero: '1705', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 34.54, valor: 357587.93, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SP1607', numero: '1607', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 34.54, valor: 357587.93, status: 'disponivel', andar: 16, vagas: 0 },
      { id: 'SP1605', numero: '1605', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 34.54, valor: 357587.93, status: 'disponivel', andar: 16, vagas: 0 },
      { id: 'SP407', numero: '407', tipologia: 'Garden 2 dorm', quartos: 2, area: 34.54, valor: 373120.83, status: 'disponivel', andar: 4, vagas: 0 },
      { id: 'SP1502', numero: '1502', tipologia: 'Apartamento 3 dorm', quartos: 3, area: 60.34, valor: 695872.67, status: 'disponivel', andar: 15, vagas: 1 },
      { id: 'SP1501', numero: '1501', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 49, valor: 565556.28, status: 'disponivel', andar: 15, vagas: 1 },
      { id: 'SP1404', numero: '1404', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 47.48, valor: 495281.04, status: 'disponivel', andar: 14, vagas: 1 },
      { id: 'SP1301', numero: '1301', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 49, valor: 559639.08, status: 'disponivel', andar: 13, vagas: 1 },
      { id: 'SP1101', numero: '1101', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 49, valor: 553861.88, status: 'disponivel', andar: 11, vagas: 1 },
      { id: 'SP1004', numero: '1004', tipologia: 'Apartamento 2 dorm', quartos: 2, area: 47.48, valor: 495281.04, status: 'disponivel', andar: 10, vagas: 1 },
      { id: 'SP1002', numero: '1002', tipologia: 'Apartamento 3 dorm', quartos: 3, area: 60.34, valor: 668806.13, status: 'disponivel', andar: 10, vagas: 1 },
      { id: 'SP408', numero: '408', tipologia: 'Garden 2 dorm', quartos: 2, area: 46.8, valor: 575533.78, status: 'disponivel', andar: 4, vagas: 1 },
      { id: 'SP215', numero: '215', tipologia: 'Studio', quartos: 1, area: 22, valor: 217410.16, status: 'disponivel', andar: 2, vagas: 0 },
      { id: 'SP210', numero: '210', tipologia: 'Studio', quartos: 1, area: 31.38, valor: 324872.88, status: 'disponivel', andar: 2, vagas: 0 },
      { id: 'SP310', numero: '310', tipologia: 'Studio', quartos: 1, area: 31.38, valor: 324872.88, status: 'disponivel', andar: 3, vagas: 0 },
      { id: 'SP114', numero: '114', tipologia: 'Studio', quartos: 1, area: 29.63, valor: 269751.65, status: 'disponivel', andar: 1, vagas: 0 },
      { id: 'SP201', numero: '201', tipologia: 'Studio', quartos: 1, area: 29.63, valor: 269751.65, status: 'disponivel', andar: 2, vagas: 0 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 10 },
      { nome: 'Mensais', percentual: 20, parcelas: 36 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 2. Station Garden
  {
    id: 2,
    nome: 'Station Garden',
    endereco: 'Rua Jarauara',
    numero: '470',
    bairro: 'Vila Re',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: 'Pronto',
    status: 'pronto',
    latitude: -23.528376,
    longitude: -46.496796,
    descricao: 'O Residencial Station Garden vai te surpreender. Sao apartamentos de 2 e 3 dormitorios localizados em regiao privilegiada da Zona Leste de Sao Paulo. COLADO NO METRO!',
    imagem: 'https://static.orulo.com.br/images/properties/large/1132911.jpg?1664313562',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/1132911.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1497347.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1132896.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1132914.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1132906.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1132912.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1132891.jpg?1664313562',
      'https://static.orulo.com.br/images/properties/large/1132905.jpg?1664313562'
    ],
    diferenciais: [
      'Brinquedoteca',
      'Churrasqueira condominial',
      'Coworking',
      'Elevador social',
      'Espaco gourmet',
      'Fire place',
      'Horta coletiva',
      'Jardim',
      'Lounge',
      'Pet place',
      'Piscina adulto',
      'Playground',
      'Portaria',
      'Quadra poliesportiva',
      'Sala de jogos',
      'Seguranca',
      'Solarium'
    ],
    unidadesTotal: 175,
    unidadesDisponiveis: 19,
    areaMin: 35.26,
    areaMax: 75.51,
    valorMin: 315955.9,
    valorMax: 649678.32,
    dormitoriosMin: 2,
    dormitoriosMax: 3,
    unidades: [
      { id: 'SGJ302', numero: '302', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 41.76, valor: 350962.12, status: 'disponivel', andar: 3, vagas: 0 },
      { id: 'SGJ503', numero: '503', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 41, valor: 350962.12, status: 'disponivel', andar: 5, vagas: 0 },
      { id: 'SGJ505', numero: '505', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 41, valor: 350829.69, status: 'disponivel', andar: 5, vagas: 0 },
      { id: 'SGJ201', numero: '201', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 42.07, valor: 345934.57, status: 'disponivel', andar: 2, vagas: 0 },
      { id: 'SGJ210', numero: '210', tipologia: 'Garden 2 dorms', quartos: 2, area: 75.51, valor: 503556.32, status: 'disponivel', andar: 2, vagas: 0 },
      { id: 'SGJ1405', numero: '1405', tipologia: 'Apartamento 3 dorms', quartos: 3, area: 60.29, valor: 504946.25, status: 'disponivel', andar: 14, vagas: 0 },
      { id: 'SGJ204', numero: '204', tipologia: 'Garden 2 dorms', quartos: 2, area: 49.04, valor: 345934.57, status: 'disponivel', andar: 2, vagas: 0 },
      { id: 'SGJ1601', numero: '1601', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 35.26, valor: 315955.9, status: 'disponivel', andar: 16, vagas: 0 },
      { id: 'SGJ1609', numero: '1609', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 35.26, valor: 315955.9, status: 'disponivel', andar: 16, vagas: 0 },
      { id: 'SGJ1701', numero: '1701', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 35.26, valor: 321718.03, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SGJ1703', numero: '1703', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 41.76, valor: 439841.36, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SGJ1704', numero: '1704', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 43.42, valor: 454126.56, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SGJ1705', numero: '1705', tipologia: 'Apartamento 3 dorms', quartos: 3, area: 60.29, valor: 637433.82, status: 'disponivel', andar: 17, vagas: 1 },
      { id: 'SGJ1706', numero: '1706', tipologia: 'Apartamento 3 dorms', quartos: 3, area: 54.83, valor: 534542.23, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SGJ1707', numero: '1707', tipologia: 'Apartamento 3 dorms', quartos: 3, area: 61.2, valor: 646677.24, status: 'disponivel', andar: 17, vagas: 1 },
      { id: 'SGJ1708', numero: '1708', tipologia: 'Apartamento 3 dorms', quartos: 3, area: 61.33, valor: 649678.32, status: 'disponivel', andar: 17, vagas: 1 },
      { id: 'SGJ1709', numero: '1709', tipologia: 'Apartamento 2 dorms', quartos: 2, area: 35.26, valor: 321718.03, status: 'disponivel', andar: 17, vagas: 0 },
      { id: 'SGJ1605', numero: '1605', tipologia: 'Apartamento 3 dorms', quartos: 3, area: 60.29, valor: 637433.82, status: 'disponivel', andar: 16, vagas: 1 },
      { id: 'SGJ1401', numero: '1401', tipologia: 'Garden 2 dorms', quartos: 2, area: 42.15, valor: 350441.64, status: 'disponivel', andar: 14, vagas: 0 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 30 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 3. Mirante da Vila
  {
    id: 3,
    nome: 'Mirante da Vila',
    endereco: 'Rua Itingucu',
    numero: '2780',
    bairro: 'Vila Re',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: 'Pronto',
    status: 'pronto',
    latitude: -23.534661,
    longitude: -46.491734,
    descricao: 'Proximo a Estacao Patriarca e toda a estrutura do bairro. Unidades de 02 dormitorios. Opcoes com Garden. Area de Lazer coberta e descoberta.',
    imagem: 'https://static.orulo.com.br/images/properties/large/1134912.jpg?1664485075',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/1134912.jpg?1664485075',
      'https://static.orulo.com.br/images/properties/large/1134926.jpg?1664485075',
      'https://static.orulo.com.br/images/properties/large/1134986.jpg?1664485075',
      'https://static.orulo.com.br/images/properties/large/1134928.jpg?1664485075',
      'https://static.orulo.com.br/images/properties/large/1134963.jpg?1664485075',
      'https://static.orulo.com.br/images/properties/large/1134913.jpg?1664485075'
    ],
    diferenciais: [
      'Academia',
      'Bicicletario',
      'Churrasqueira condominial',
      'Coworking',
      'Deck molhado',
      'Elevador social',
      'Espaco gourmet',
      'Playground',
      'Portaria',
      'Praca',
      'Salao de festas',
      'Seguranca',
      'Solarium',
      'Spa',
      'Terraco',
      'Vestiarios'
    ],
    unidadesTotal: 65,
    unidadesDisponiveis: 3,
    areaMin: 44.62,
    areaMax: 115.46,
    valorMin: 312186.6,
    valorMax: 646799.8,
    dormitoriosMin: 2,
    dormitoriosMax: 2,
    unidades: [
      { id: 'RMV14', numero: '14', tipologia: 'Garden', quartos: 2, area: 115.46, valor: 646799.8, status: 'disponivel', andar: 1, vagas: 0 },
      { id: 'RMV23', numero: '23', tipologia: 'Apartamento', quartos: 2, area: 45.84, valor: 312186.6, status: 'disponivel', andar: 2, vagas: 0 },
      { id: 'RMV124', numero: '124', tipologia: 'Apartamento', quartos: 2, area: 44.62, valor: 335432.8, status: 'disponivel', andar: 12, vagas: 0 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 30 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 4. Moment Metro Conceicao
  {
    id: 4,
    nome: 'Moment Metro Conceicao',
    endereco: 'Rua dos Cambuis',
    numero: '199',
    bairro: 'Vila Parque Jabaquara',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: 'Pronto',
    status: 'pronto',
    latitude: -23.639926,
    longitude: -46.644577,
    descricao: 'O Moment Metro Conceicao esta localizado a 600 metros do Metro Conceicao, em um bairro tradicional de Sao Paulo com toda infraestrutura, proximo ao aeroporto de Congonhas, terminal rodoviario do Jabaquara.',
    imagem: 'https://static.orulo.com.br/images/properties/large/1135536.jpg?1664547915',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/1135536.jpg?1664547915',
      'https://static.orulo.com.br/images/properties/large/1135537.jpg?1664547915',
      'https://static.orulo.com.br/images/properties/large/1135538.jpg?1664547915',
      'https://static.orulo.com.br/images/properties/large/1135539.jpg?1664547915',
      'https://static.orulo.com.br/images/properties/large/1135540.jpg?1664547915',
      'https://static.orulo.com.br/images/properties/large/1135541.jpg?1664547915'
    ],
    diferenciais: [
      'Academia',
      'Brinquedoteca',
      'Churrasqueira condominial',
      'Elevador social',
      'Lounge',
      'Piscina adulto',
      'Portaria',
      'Sala de jogos',
      'Salao de festas',
      'Seguranca',
      'Solarium',
      'Vestiarios'
    ],
    unidadesTotal: 73,
    unidadesDisponiveis: 1,
    areaMin: 61.87,
    areaMax: 61.87,
    valorMin: 498584.83,
    valorMax: 498584.83,
    dormitoriosMin: 2,
    dormitoriosMax: 2,
    unidades: [
      { id: 'RC112', numero: '112', tipologia: 'Garden', quartos: 2, area: 61.87, valor: 498584.83, status: 'disponivel', andar: 1, vagas: 1 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 30 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 5. Essencia da Vila
  {
    id: 5,
    nome: 'Essencia da Vila',
    endereco: 'Rua Xanquere',
    numero: '48',
    bairro: 'Vila Centenario',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: '04/2026',
    status: 'em_obra',
    latitude: -23.529491,
    longitude: -46.530769,
    descricao: 'Um empreendimento unico, onde cada detalhe foi concebido para ser distinto. Localizado no melhor da Zona Leste, a poucos passos da estacao de Metro Vila Matilde, em meio aos empreendimentos mais importantes ao longo da cidade.',
    imagem: 'https://static.orulo.com.br/images/properties/large/1656715.png?1705927980',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/1656715.png?1705927980',
      'https://static.orulo.com.br/images/properties/large/1206756.png',
      'https://static.orulo.com.br/images/properties/large/1206760.png',
      'https://static.orulo.com.br/images/properties/large/1206767.png',
      'https://static.orulo.com.br/images/properties/large/1206768.png',
      'https://static.orulo.com.br/images/properties/large/1206769.png'
    ],
    diferenciais: [
      'Academia',
      'Acessibilidade',
      'Beach tennis',
      'Bicicletario',
      'Brinquedoteca',
      'Churrasqueira condominial',
      'Coworking',
      'Deck molhado',
      'Delivery',
      'Elevador social',
      'Espaco gourmet',
      'Pet place',
      'Piscina adulto',
      'Piscina infantil',
      'Playground',
      'Portaria 24 horas',
      'Quadra poliesportiva',
      'Sala de jogos',
      'Salao de festas',
      'Sauna',
      'Seguranca',
      'Solarium',
      'Spa'
    ],
    unidadesTotal: 196,
    unidadesDisponiveis: 10,
    areaMin: 40.69,
    areaMax: 60.07,
    valorMin: 401349.75,
    valorMax: 793041.36,
    dormitoriosMin: 2,
    dormitoriosMax: 3,
    unidades: [
      { id: 'EV1101', numero: '1101', tipologia: '3 quartos', quartos: 3, area: 60.07, valor: 712628.13, status: 'disponivel', andar: 11, vagas: 1 },
      { id: 'EV2001', numero: '2001', tipologia: '3 quartos', quartos: 3, area: 60.07, valor: 725144.81, status: 'disponivel', andar: 20, vagas: 1 },
      { id: 'EV2101', numero: '2101', tipologia: '3 quartos', quartos: 3, area: 60.07, valor: 727580.56, status: 'disponivel', andar: 21, vagas: 1 },
      { id: 'EV2303', numero: '2303', tipologia: '2 quartos', quartos: 2, area: 40.69, valor: 401349.75, status: 'disponivel', andar: 23, vagas: 0 },
      { id: 'EV2401', numero: '2401', tipologia: '3 quartos', quartos: 3, area: 60.07, valor: 791968.24, status: 'disponivel', andar: 24, vagas: 2 },
      { id: 'EV2501', numero: '2501', tipologia: '3 quartos', quartos: 3, area: 60.07, valor: 793041.36, status: 'disponivel', andar: 25, vagas: 2 },
      { id: 'EV301', numero: '301', tipologia: '3 quartos', quartos: 3, area: 60.07, valor: 685728.59, status: 'disponivel', andar: 3, vagas: 1 },
      { id: 'EV307', numero: '307', tipologia: '2 quartos', quartos: 2, area: 49, valor: 501034.41, status: 'disponivel', andar: 3, vagas: 1 },
      { id: 'EV308', numero: '308', tipologia: '2 quartos', quartos: 2, area: 49, valor: 501034.41, status: 'disponivel', andar: 3, vagas: 1 },
      { id: 'EV407', numero: '407', tipologia: '2 quartos', quartos: 2, area: 49, valor: 501034.41, status: 'disponivel', andar: 4, vagas: 1 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 10 },
      { nome: 'Mensais', percentual: 20, parcelas: 24 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 6. Aura Guilhermina
  {
    id: 6,
    nome: 'Aura Guilhermina',
    endereco: 'Rua Astorga',
    numero: '1005',
    bairro: 'Vila Guilhermina',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: '08/2026',
    status: 'em_obra',
    latitude: -23.531469,
    longitude: -46.5189,
    descricao: 'Um empreendimento unico concebido para ser distinto com uma vista privilegiada, o melhor da zona leste. Em um dos destinos mais desejados da zona leste a poucos passos da estacao de metro.',
    imagem: 'https://static.orulo.com.br/images/properties/large/1655377.png?1705667856',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/1655377.png?1705667856',
      'https://static.orulo.com.br/images/properties/large/1448364.jpg',
      'https://static.orulo.com.br/images/properties/large/1448365.jpg',
      'https://static.orulo.com.br/images/properties/large/1448366.jpg',
      'https://static.orulo.com.br/images/properties/large/1448367.jpg',
      'https://static.orulo.com.br/images/properties/large/1448368.jpg'
    ],
    diferenciais: [
      'Academia',
      'Brinquedoteca',
      'Churrasqueira condominial',
      'Coworking',
      'Deck molhado',
      'Elevador social',
      'Espaco gourmet',
      'Pet place',
      'Piscina adulto',
      'Playground',
      'Portaria',
      'Quadra poliesportiva',
      'Sala de jogos',
      'Salao de festas',
      'Sauna',
      'Seguranca',
      'Solarium',
      'Spa'
    ],
    unidadesTotal: 148,
    unidadesDisponiveis: 15,
    areaMin: 44,
    areaMax: 81.75,
    valorMin: 375525.34,
    valorMax: 926011.37,
    dormitoriosMin: 2,
    dormitoriosMax: 2,
    unidades: [
      { id: 'AU408', numero: '408', tipologia: 'Apartamento', quartos: 2, area: 44, valor: 375525.34, status: 'disponivel', andar: 4, vagas: 1 },
      { id: 'AU501', numero: '501', tipologia: 'Apartamento', quartos: 2, area: 44, valor: 444890.99, status: 'disponivel', andar: 5, vagas: 1 },
      { id: 'AU1101', numero: '1101', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 495601.83, status: 'disponivel', andar: 11, vagas: 1 },
      { id: 'AU1401', numero: '1401', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 505679.03, status: 'disponivel', andar: 14, vagas: 1 },
      { id: 'AU1402', numero: '1402', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 505679.03, status: 'disponivel', andar: 14, vagas: 1 },
      { id: 'AU1801', numero: '1801', tipologia: 'Apartamento', quartos: 2, area: 45.5, valor: 517414.19, status: 'disponivel', andar: 18, vagas: 1 },
      { id: 'AU1802', numero: '1802', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 517414.19, status: 'disponivel', andar: 18, vagas: 1 },
      { id: 'AU1901', numero: '1901', tipologia: 'Apartamento', quartos: 2, area: 45.5, valor: 517414.19, status: 'disponivel', andar: 19, vagas: 1 },
      { id: 'AU1902', numero: '1902', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 517414.19, status: 'disponivel', andar: 19, vagas: 1 },
      { id: 'AU2001', numero: '2001', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 522748.35, status: 'disponivel', andar: 20, vagas: 1 },
      { id: 'AU2002', numero: '2002', tipologia: 'Apartamento', quartos: 2, area: 45.1, valor: 522748.35, status: 'disponivel', andar: 20, vagas: 1 },
      { id: 'AU2101', numero: '2101', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 522748.35, status: 'disponivel', andar: 21, vagas: 1 },
      { id: 'AU2102', numero: '2102', tipologia: 'Apartamento', quartos: 2, area: 45.9, valor: 522748.35, status: 'disponivel', andar: 21, vagas: 1 },
      { id: 'AU2202', numero: '2202', tipologia: 'Cobertura Horizontal', quartos: 2, area: 81.75, valor: 925538.58, status: 'disponivel', andar: 22, vagas: 1 },
      { id: 'AU2203', numero: '2203', tipologia: 'Cobertura Horizontal', quartos: 2, area: 81.75, valor: 926011.37, status: 'disponivel', andar: 22, vagas: 1 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 10 },
      { nome: 'Mensais', percentual: 20, parcelas: 30 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 7. Giardino Verticale
  {
    id: 7,
    nome: 'Giardino Verticale',
    endereco: 'Rua Madre de Deus',
    numero: '121',
    bairro: 'Mooca',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: '08/2026',
    status: 'em_obra',
    latitude: -23.558347,
    longitude: -46.599403,
    descricao: 'Um empreendimento concebido para ser uma semente vertical no melhor local do bairro! Ao chegar no seu retiro voce se conecta com a natureza resgatando sua essencia. Inspirado nos pequenos resorts luxuosos.',
    imagem: 'https://static.orulo.com.br/images/properties/large/1448313.jpg?1689084651',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/1448313.jpg?1689084651',
      'https://static.orulo.com.br/images/properties/large/1448312.jpg',
      'https://static.orulo.com.br/images/properties/large/1448314.jpg',
      'https://static.orulo.com.br/images/properties/large/1448315.jpg',
      'https://static.orulo.com.br/images/properties/large/1448316.jpg',
      'https://static.orulo.com.br/images/properties/large/1448317.jpg'
    ],
    diferenciais: [
      'Academia',
      'Brinquedoteca',
      'Coworking',
      'Elevador social',
      'Lounge',
      'Piscina adulto',
      'Playground',
      'Portaria',
      'Sala de jogos',
      'Salao de festas',
      'Sauna',
      'Seguranca',
      'Solarium',
      'Spa',
      'Vestiarios'
    ],
    unidadesTotal: 50,
    unidadesDisponiveis: 19,
    areaMin: 43.84,
    areaMax: 106.52,
    valorMin: 539329.43,
    valorMax: 1434959.13,
    dormitoriosMin: 2,
    dormitoriosMax: 3,
    unidades: [
      { id: 'GV1202', numero: '1202', tipologia: 'Apartamento', quartos: 2, area: 45.05, valor: 637548.6, status: 'disponivel', andar: 12, vagas: 0 },
      { id: 'GV1402', numero: '1402', tipologia: 'Cobertura Horizontal', quartos: 3, area: 106.52, valor: 1434959.13, status: 'disponivel', andar: 14, vagas: 0 },
      { id: 'GV1002', numero: '1002', tipologia: 'Apartamento', quartos: 2, area: 45.05, valor: 561672.17, status: 'disponivel', andar: 10, vagas: 0 },
      { id: 'GV1304', numero: '1304', tipologia: 'Apartamento', quartos: 2, area: 52.45, valor: 744537.22, status: 'disponivel', andar: 13, vagas: 0 },
      { id: 'GV1303', numero: '1303', tipologia: 'Apartamento', quartos: 2, area: 53.99, valor: 765947.79, status: 'disponivel', andar: 13, vagas: 0 },
      { id: 'GV1204', numero: '1204', tipologia: 'Apartamento', quartos: 2, area: 50.41, valor: 711579.92, status: 'disponivel', andar: 12, vagas: 0 },
      { id: 'GV1203', numero: '1203', tipologia: 'Apartamento', quartos: 2, area: 54.55, valor: 768760.77, status: 'disponivel', andar: 12, vagas: 0 },
      { id: 'GV1104', numero: '1104', tipologia: 'Apartamento', quartos: 2, area: 50.41, valor: 707014.76, status: 'disponivel', andar: 11, vagas: 0 },
      { id: 'GV1103', numero: '1103', tipologia: 'Apartamento', quartos: 2, area: 53.37, valor: 747629.62, status: 'disponivel', andar: 11, vagas: 0 },
      { id: 'GV1302', numero: '1302', tipologia: 'Apartamento', quartos: 2, area: 45.05, valor: 594924.35, status: 'disponivel', andar: 13, vagas: 0 },
      { id: 'GV604', numero: '604', tipologia: 'Apartamento', quartos: 2, area: 49.2, valor: 668540.18, status: 'disponivel', andar: 6, vagas: 0 },
      { id: 'GV1102', numero: '1102', tipologia: 'Apartamento', quartos: 2, area: 45.08, valor: 569508.27, status: 'disponivel', andar: 11, vagas: 0 },
      { id: 'GV1004', numero: '1004', tipologia: 'Apartamento', quartos: 2, area: 50.41, valor: 702479.53, status: 'disponivel', andar: 10, vagas: 0 },
      { id: 'GV1003', numero: '1003', tipologia: 'Apartamento', quartos: 2, area: 52.51, valor: 731105.23, status: 'disponivel', andar: 10, vagas: 0 },
      { id: 'GV1001', numero: '1001', tipologia: 'Apartamento', quartos: 2, area: 48.37, valor: 674671.74, status: 'disponivel', andar: 10, vagas: 0 },
      { id: 'GV904', numero: '904', tipologia: 'Apartamento', quartos: 2, area: 50.41, valor: 697974.05, status: 'disponivel', andar: 9, vagas: 0 },
      { id: 'GV903', numero: '903', tipologia: 'Apartamento', quartos: 2, area: 52.51, valor: 726412.07, status: 'disponivel', andar: 9, vagas: 0 },
      { id: 'GV902', numero: '902', tipologia: 'Apartamento', quartos: 2, area: 43.84, valor: 539329.43, status: 'disponivel', andar: 9, vagas: 0 },
      { id: 'GV803', numero: '803', tipologia: 'Apartamento', quartos: 2, area: 51.3, valor: 705471.4, status: 'disponivel', andar: 8, vagas: 0 }
    ],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 10 },
      { nome: 'Mensais', percentual: 20, parcelas: 30 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  },

  // 8. Alta Floresta
  {
    id: 8,
    nome: 'Alta Floresta',
    endereco: 'Rua Serra de Botucatu',
    numero: '1195',
    bairro: 'Tatuape',
    cidade: 'São Paulo',
    uf: 'SP',
    entrega: '08/2028',
    status: 'lancamento',
    latitude: -23.542249,
    longitude: -46.560449,
    descricao: 'Um empreendimento completo com toda seguranca, conforto e lazer que voce merece! Apartamentos de 3 dormitorios com 139m2 no Tatuape.',
    imagem: 'https://static.orulo.com.br/images/properties/large/2220505.png?1748631522',
    imagens: [
      'https://static.orulo.com.br/images/properties/large/2220505.png?1748631522',
      'https://static.orulo.com.br/images/properties/large/2220562.png?1748631522',
      'https://static.orulo.com.br/images/properties/large/2220553.png?1748631522',
      'https://static.orulo.com.br/images/properties/large/2220507.png?1748631522',
      'https://static.orulo.com.br/images/properties/large/2220508.png?1748631522',
      'https://static.orulo.com.br/images/properties/large/2220521.png?1748631522'
    ],
    diferenciais: [
      'Academia',
      'Bicicletario',
      'Brinquedoteca',
      'Coworking',
      'Elevador social',
      'Espaco gourmet',
      'Espaco zen',
      'Hidromassagem',
      'Lavanderia',
      'Lounge',
      'Pet care',
      'Piscina adulto',
      'Ponto para carro eletrico',
      'Portaria',
      'Quadra poliesportiva',
      'Sala de jogos',
      'Sala de reunioes',
      'Salao de festas',
      'Sauna',
      'Seguranca',
      'Spa'
    ],
    unidadesTotal: 158,
    unidadesDisponiveis: 158,
    areaMin: 138.77,
    areaMax: 138.77,
    valorMin: 0,
    valorMax: 0,
    dormitoriosMin: 3,
    dormitoriosMax: 3,
    unidades: [],
    condicoesPagamento: [
      { nome: 'ATO', percentual: 10 },
      { nome: 'Mensais', percentual: 20, parcelas: 48 },
      { nome: 'Financiamento', percentual: 70 }
    ]
  }
]

// Funcoes auxiliares
export function getEmpreendimentoById(id: number): Empreendimento | undefined {
  return empreendimentos.find(e => e.id === id)
}

export function getUnidadesByEmpreendimentoId(empreendimentoId: number): Unidade[] {
  const empreendimento = getEmpreendimentoById(empreendimentoId)
  return empreendimento?.unidades || []
}

export function getUnidadesDisponiveis(empreendimentoId: number): Unidade[] {
  return getUnidadesByEmpreendimentoId(empreendimentoId).filter(u => u.status === 'disponivel')
}

export function getAllUnidades(): (Unidade & { empreendimentoId: number; empreendimentoNome: string })[] {
  return empreendimentos.flatMap(e => e.unidades.map(u => ({
    ...u,
    empreendimentoId: e.id,
    empreendimentoNome: e.nome,
  })))
}
