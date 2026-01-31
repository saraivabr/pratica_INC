/**
 * Sofia - Base de Conhecimento
 *
 * Políticas comerciais, argumentos de venda e diferenciais da Pratica Incorporadora
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface PoliticaReserva {
  valorMinimo: number;
  valorMinimoFormatado: string;
  prazoMaximoDias: number;
  documentosObrigatorios: string[];
  observacoes: string[];
}

export interface PoliticaComissao {
  percentualPadrao: number;
  percentualMaximo: number;
  prazoPagamentoDias: number;
  condicoesPagamento: string[];
  observacoes: string[];
}

export interface PoliticaDesconto {
  percentualMaximoAutorizado: number;
  percentualGerenteAte: number;
  percentualDiretoriaAte: number;
  condicoesEspeciais: string[];
  observacoes: string[];
}

export interface Politicas {
  reserva: PoliticaReserva;
  comissao: PoliticaComissao;
  desconto: PoliticaDesconto;
}

export interface ArgumentoVenda {
  objecao: string;
  gatilhos: string[];
  argumentos: string[];
  perguntasQualificacao: string[];
  frasesChave: string[];
}

export interface ArgumentosVenda {
  caro: ArgumentoVenda;
  longe: ArgumentoVenda;
  pequeno: ArgumentoVenda;
  inseguranca: ArgumentoVenda;
  concorrencia: ArgumentoVenda;
}

export interface Diferencial {
  titulo: string;
  descricao: string;
  beneficioCliente: string;
  comoUsar: string;
}

export interface DiferenciaisPratica {
  entrega: Diferencial;
  qualidade: Diferencial;
  localizacao: Diferencial;
  financiamento: Diferencial;
  atendimento: Diferencial;
  valorizacao: Diferencial;
}

export interface Knowledge {
  POLITICAS: Politicas;
  ARGUMENTOS_VENDA: ArgumentosVenda;
  DIFERENCIAIS_PRATICA: DiferenciaisPratica;
}

// ============================================================================
// POLÍTICAS COMERCIAIS
// ============================================================================

const POLITICAS: Politicas = {
  reserva: {
    valorMinimo: 5000,
    valorMinimoFormatado: 'R$ 5.000,00',
    prazoMaximoDias: 7,
    documentosObrigatorios: [
      'RG ou CNH do comprador',
      'CPF do comprador',
      'Comprovante de residência atualizado (últimos 90 dias)',
      'Comprovante de renda (últimos 3 meses)',
      'Certidão de estado civil',
    ],
    observacoes: [
      'Reserva pode ser estendida mediante aprovação da gerência',
      'Valor da reserva é abatido do sinal na assinatura do contrato',
      'Em caso de desistência, valor pode ser devolvido em até 30 dias',
      'Reserva não garante preço em caso de reajuste de tabela',
    ],
  },

  comissao: {
    percentualPadrao: 5,
    percentualMaximo: 6,
    prazoPagamentoDias: 30,
    condicoesPagamento: [
      '50% na assinatura do contrato',
      '50% na entrega das chaves',
    ],
    observacoes: [
      'Comissão calculada sobre valor total da venda',
      'Pagamento condicionado à quitação do sinal pelo cliente',
      'Campanhas especiais podem ter bonificações adicionais',
      'Comissão de gerente/coordenador é separada',
    ],
  },

  desconto: {
    percentualMaximoAutorizado: 3,
    percentualGerenteAte: 5,
    percentualDiretoriaAte: 10,
    condicoesEspeciais: [
      'Pagamento à vista: até 5% adicional',
      'Unidades em estoque há mais de 6 meses: negociável',
      'Indicação de cliente que fechou: até 2% adicional',
      'Compra de mais de uma unidade: condições especiais',
    ],
    observacoes: [
      'Descontos acima de 3% precisam de aprovação da gerência',
      'Descontos acima de 5% precisam de aprovação da diretoria',
      'Não acumula com outras promoções vigentes',
      'Desconto não se aplica sobre taxa de corretagem',
    ],
  },
};

// ============================================================================
// ARGUMENTOS DE VENDA POR OBJEÇÃO
// ============================================================================

const ARGUMENTOS_VENDA: ArgumentosVenda = {
  caro: {
    objecao: 'O imóvel está caro / Não cabe no orçamento',
    gatilhos: [
      'caro', 'muito caro', 'preço alto', 'não cabe', 'orçamento',
      'não tenho', 'fora da realidade', 'absurdo', 'exagerado',
    ],
    argumentos: [
      'Vamos analisar o custo por m² da região? A Pratica está competitiva e entrega qualidade superior.',
      'O valor contempla acabamentos de alto padrão que você não encontra em outros empreendimentos dessa faixa.',
      'Considerando a valorização média de 15% ao ano na região, o investimento se paga.',
      'Temos condições de pagamento que podem adequar ao seu fluxo. Posso simular?',
      'Compare o que está incluso: infraestrutura completa, lazer equipado, acabamentos de primeira.',
    ],
    perguntasQualificacao: [
      'Qual seria o valor ideal para você?',
      'O que você considera justo para um imóvel nessa localização?',
      'Você já comparou com outros empreendimentos da região?',
    ],
    frasesChave: [
      'Investimento, não gasto',
      'Custo-benefício a longo prazo',
      'Valorização garantida',
      'Padrão Pratica de qualidade',
    ],
  },

  longe: {
    objecao: 'A localização é longe / Não é onde eu queria',
    gatilhos: [
      'longe', 'distante', 'localização', 'bairro', 'região',
      'queria mais perto', 'não conheço', 'afastado',
    ],
    argumentos: [
      'A região está em plena expansão, com novos comércios e serviços chegando.',
      'O acesso melhorou muito com as novas vias. Você pode chegar ao centro em X minutos.',
      'Morar um pouco mais afastado significa mais qualidade de vida: menos barulho, mais segurança.',
      'O custo de vida na região é menor, sobrando mais para investir no seu patrimônio.',
      'Grandes bairros valorizados hoje eram considerados longe há 10 anos.',
    ],
    perguntasQualificacao: [
      'Qual é o trajeto principal que você faz no dia a dia?',
      'O que você precisa ter perto de casa?',
      'Você conhece a região pessoalmente? Posso te levar para conhecer.',
    ],
    frasesChave: [
      'Região em crescimento',
      'Potencial de valorização',
      'Qualidade de vida',
      'Novo polo de desenvolvimento',
    ],
  },

  pequeno: {
    objecao: 'O apartamento é pequeno / Queria mais espaço',
    gatilhos: [
      'pequeno', 'apertado', 'pouco espaço', 'queria maior',
      'não cabe', 'família crescendo', 'metragem',
    ],
    argumentos: [
      'A planta foi otimizada para aproveitar cada metro quadrado. Você já viu o decorado?',
      'As áreas comuns complementam o apartamento: salão de festas, churrasqueira, espaço gourmet.',
      'Apartamentos compactos são tendência mundial: menos manutenção, mais praticidade.',
      'O importante é a funcionalidade. Essa planta atende bem famílias de até X pessoas.',
      'Temos opções com plantas diferentes. Posso te mostrar o de 2 ou 3 quartos?',
    ],
    perguntasQualificacao: [
      'Quantas pessoas vão morar no apartamento?',
      'Você trabalha em casa e precisa de escritório?',
      'O que é essencial ter dentro do apartamento para você?',
    ],
    frasesChave: [
      'Espaço inteligente',
      'Planta funcional',
      'Menos é mais',
      'Áreas comuns como extensão do lar',
    ],
  },

  inseguranca: {
    objecao: 'Tenho medo de não conseguir pagar / E se algo der errado?',
    gatilhos: [
      'medo', 'inseguro', 'e se', 'não conseguir', 'perder emprego',
      'instabilidade', 'risco', 'dívida', 'compromisso',
    ],
    argumentos: [
      'Entendo sua preocupação. A Pratica tem histórico de zero atraso em entregas.',
      'Você pode usar o FGTS para reduzir as parcelas e ter mais segurança.',
      'O financiamento é feito com parcelas que cabem no seu bolso. Fazemos uma análise juntos.',
      'Imóvel próprio é segurança: você para de pagar aluguel e constrói patrimônio.',
      'Em caso de dificuldade, existem opções como pausa ou renegociação. Você não fica desamparado.',
    ],
    perguntasQualificacao: [
      'Você tem alguma reserva de emergência?',
      'Sua renda é fixa ou variável?',
      'Você já financiou algo antes?',
    ],
    frasesChave: [
      'Segurança patrimonial',
      'Parcelas que cabem no bolso',
      'Construir patrimônio',
      'Sair do aluguel',
    ],
  },

  concorrencia: {
    objecao: 'Vi opções melhores / A concorrência está mais em conta',
    gatilhos: [
      'concorrência', 'outro', 'outra construtora', 'vi melhor',
      'mais barato', 'prefiro', 'comparando', 'MRV', 'Tenda',
    ],
    argumentos: [
      'Ótimo que você está pesquisando! Compare os acabamentos: a Pratica usa materiais superiores.',
      'Verifique o histórico de entregas. A Pratica nunca atrasou um empreendimento.',
      'Compare o que está incluso: nossa área de lazer vem equipada e pronta para uso.',
      'O barato pode sair caro. Veja avaliações de moradores de outros empreendimentos.',
      'Posso te mostrar o comparativo detalhado? Tenho certeza que vai se surpreender.',
    ],
    perguntasQualificacao: [
      'O que mais te chamou atenção no outro empreendimento?',
      'Você já visitou pessoalmente o concorrente?',
      'Além do preço, o que é mais importante para você?',
    ],
    frasesChave: [
      'Qualidade comprovada',
      'Histórico de entregas',
      'Compare os detalhes',
      'O barato sai caro',
    ],
  },
};

// ============================================================================
// DIFERENCIAIS DA PRATICA INCORPORADORA
// ============================================================================

const DIFERENCIAIS_PRATICA: DiferenciaisPratica = {
  entrega: {
    titulo: 'Compromisso com Prazos',
    descricao: 'Zero atrasos em todas as entregas realizadas pela Pratica.',
    beneficioCliente: 'Planejamento seguro da mudança sem surpresas.',
    comoUsar: 'Mencione quando o cliente demonstrar insegurança sobre prazos ou comparar com concorrentes que atrasam.',
  },

  qualidade: {
    titulo: 'Padrão de Acabamento Superior',
    descricao: 'Acabamentos de alto padrão em todas as unidades: porcelanato, louças e metais de marca, pintura premium.',
    beneficioCliente: 'Imóvel pronto para morar, sem necessidade de reformas.',
    comoUsar: 'Destaque ao comparar com concorrentes de mesmo preço ou quando cliente questionar valor.',
  },

  localizacao: {
    titulo: 'Escolha Estratégica de Terrenos',
    descricao: 'Empreendimentos em regiões com potencial de valorização comprovado.',
    beneficioCliente: 'Investimento que valoriza acima da média do mercado.',
    comoUsar: 'Use dados de valorização histórica da região para embasar o argumento.',
  },

  financiamento: {
    titulo: 'Facilitação no Financiamento',
    descricao: 'Equipe especializada que acompanha todo processo de financiamento.',
    beneficioCliente: 'Menos burocracia e maior chance de aprovação.',
    comoUsar: 'Ofereça simulação personalizada e destaque o suporte completo.',
  },

  atendimento: {
    titulo: 'Atendimento Humanizado',
    descricao: 'Equipe comercial treinada para entender necessidades, não apenas vender.',
    beneficioCliente: 'Compra consultiva, encontrando o imóvel ideal para cada perfil.',
    comoUsar: 'Demonstre interesse genuíno nas necessidades do cliente antes de oferecer opções.',
  },

  valorizacao: {
    titulo: 'Histórico de Valorização',
    descricao: 'Empreendimentos da Pratica valorizam em média 15-20% ao ano.',
    beneficioCliente: 'Patrimônio que cresce, não apenas um lugar para morar.',
    comoUsar: 'Apresente casos reais de valorização de empreendimentos anteriores.',
  },
};

// ============================================================================
// EXPORTAÇÃO PRINCIPAL
// ============================================================================

export const KNOWLEDGE: Knowledge = {
  POLITICAS,
  ARGUMENTOS_VENDA,
  DIFERENCIAIS_PRATICA,
};

// Exportações individuais para conveniência
export { POLITICAS, ARGUMENTOS_VENDA, DIFERENCIAIS_PRATICA };
