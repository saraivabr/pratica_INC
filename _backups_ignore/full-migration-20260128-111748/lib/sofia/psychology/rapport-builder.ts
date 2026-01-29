/**
 * Rapport Builder - Técnicas para Construir Conexões Humanas Genuínas
 *
 * A confiança é a moeda mais valiosa em vendas de imóveis.
 * Este módulo fornece ferramentas para criar conexões autênticas.
 */

import {
  PsychologicalAnalysis,
  CommunicationStyle,
  UnderlyingEmotion,
  EmotionalValidationTemplates,
  PrimaryMotivation,
} from './types';

// =============================================================================
// TEMPLATES DE VALIDAÇÃO EMOCIONAL
// =============================================================================

/**
 * Templates de validação para cada tipo de emoção
 * Cada resposta reconhece o sentimento antes de oferecer apoio
 */
export const EMOTIONAL_VALIDATION_TEMPLATES: EmotionalValidationTemplates = {
  medo: 'Entendo sua preocupação. É uma decisão importante e faz todo sentido querer ter certeza.',
  frustração: 'Percebo que essa situação está sendo difícil. Vamos resolver isso juntos.',
  esperanca: 'Que emocionante! Esse é um momento especial na sua vida.',
  ansiedade: 'Comprar um imóvel é uma grande decisão. Estou aqui para ajudar você a ter clareza.',
  duvida: 'Suas dúvidas são muito válidas. Vamos explorar isso juntos.',
  entusiasmo: 'Adoro ver essa energia! É muito bom quando encontramos algo que nos empolga.',
  confianca: 'Fico feliz que você tenha clareza sobre o que quer. Isso facilita muito encontrar o imóvel perfeito.',
};

// =============================================================================
// LINGUAGEM DE PERTENCIMENTO
// =============================================================================

/**
 * Constantes para criar senso de equipe e parceria
 * Usar "nós" em vez de "eu/você" cria conexão subliminar
 */
export const BELONGING_LANGUAGE = {
  /**
   * Frases que usam "nós" para criar senso de equipe
   */
  useWe: [
    'Vamos encontrar juntos o imóvel ideal para você',
    'Podemos explorar algumas opções que combinam com o que você busca',
    'Estamos no caminho certo para encontrar seu novo lar',
    'Vamos analisar isso com calma',
    'Juntos vamos descobrir o que faz mais sentido para sua família',
    'Podemos avaliar cada detalhe com tranquilidade',
    'Estamos construindo algo importante aqui',
    'Vamos dar esse passo juntos',
  ],

  /**
   * Frases para criar objetivos compartilhados
   */
  createSharedGoal: [
    'Nosso objetivo é encontrar um lugar onde você se sinta em casa',
    'O que importa é você tomar a melhor decisão para sua vida',
    'Meu papel é ajudar você a ter todas as informações necessárias',
    'Quero que você tenha certeza absoluta da sua escolha',
    'O mais importante é sua tranquilidade nessa decisão',
    'Estou aqui para que você não tenha nenhuma dúvida',
    'Vamos garantir que cada detalhe esteja alinhado com suas expectativas',
  ],

  /**
   * Frases para construir senso de equipe
   */
  buildTeam: [
    'Conte comigo nessa jornada',
    'Estou do seu lado nessa decisão',
    'Você não está sozinho nesse processo',
    'Pode contar com meu apoio em cada etapa',
    'Estamos juntos até encontrar o imóvel perfeito',
    'Sua satisfação é minha prioridade',
    'Vamos fazer isso acontecer juntos',
    'Sou sua parceira nessa busca',
  ],
} as const;

// =============================================================================
// FUNÇÕES DE CONSTRUÇÃO DE RAPPORT
// =============================================================================

/**
 * Constrói uma abertura empática baseada na análise psicológica
 *
 * @param analysis - Análise psicológica do usuário
 * @param userName - Nome do usuário (opcional)
 * @returns Mensagem de abertura empática
 */
export function buildEmpatheticOpening(
  analysis: PsychologicalAnalysis,
  userName?: string
): string {
  const greeting = userName ? `${userName}, ` : '';
  const emotionalValidation = EMOTIONAL_VALIDATION_TEMPLATES[analysis.underlyingEmotion];

  // Seleciona frase de pertencimento baseada na estratégia de conexão
  let belongingPhrase: string;

  switch (analysis.connectionStrategy) {
    case 'validar_sentimentos':
      belongingPhrase = BELONGING_LANGUAGE.buildTeam[
        Math.floor(Math.random() * BELONGING_LANGUAGE.buildTeam.length)
      ];
      break;
    case 'oferecer_seguranca':
      belongingPhrase = BELONGING_LANGUAGE.createSharedGoal[
        Math.floor(Math.random() * BELONGING_LANGUAGE.createSharedGoal.length)
      ];
      break;
    case 'inspirar_possibilidades':
      belongingPhrase = BELONGING_LANGUAGE.useWe[
        Math.floor(Math.random() * BELONGING_LANGUAGE.useWe.length)
      ];
      break;
    case 'ser_direto_pratico':
      belongingPhrase = 'Vou direto ao ponto para otimizar seu tempo';
      break;
    case 'construir_confianca':
      belongingPhrase = BELONGING_LANGUAGE.createSharedGoal[
        Math.floor(Math.random() * BELONGING_LANGUAGE.createSharedGoal.length)
      ];
      break;
    case 'criar_urgencia_suave':
      belongingPhrase = 'Vamos aproveitar esse momento para avançar';
      break;
    default:
      belongingPhrase = BELONGING_LANGUAGE.useWe[0];
  }

  // Monta a mensagem completa
  return `${greeting}${emotionalValidation} ${belongingPhrase}.`;
}

/**
 * Adapta a resposta baseada no estilo de comunicação do usuário
 *
 * @param response - Resposta original
 * @param style - Estilo de comunicação do usuário
 * @returns Resposta adaptada ao estilo
 */
export function adaptResponseToStyle(
  response: string,
  style: CommunicationStyle
): string {
  let adapted = response;

  // Adapta ao ritmo
  if (style.pace === 'rápido') {
    // Remove redundâncias e vai direto ao ponto
    adapted = adapted
      .replace(/Na verdade,?\s*/gi, '')
      .replace(/Basicamente,?\s*/gi, '')
      .replace(/Para ser honesto,?\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else if (style.pace === 'reflexivo') {
    // Adiciona pausas e espaço para reflexão
    if (!adapted.endsWith('?') && !adapted.includes('O que você acha')) {
      adapted += ' O que você acha?';
    }
  }

  // Adapta à formalidade
  if (style.formality === 'casual') {
    adapted = adapted
      .replace(/Prezado\(a\)/gi, 'Oi')
      .replace(/Cordialmente/gi, '')
      .replace(/Atenciosamente/gi, '')
      .replace(/gostaríamos/gi, 'queremos')
      .replace(/poderíamos/gi, 'podemos')
      .replace(/Senhor\(a\)/gi, 'você');
  } else if (style.formality === 'formal') {
    adapted = adapted
      .replace(/\boi\b/gi, 'Olá')
      .replace(/\bpra\b/gi, 'para')
      .replace(/\btá\b/gi, 'está')
      .replace(/\bvc\b/gi, 'você')
      .replace(/\bblz\b/gi, 'tudo bem');
  }

  // Adapta à expressão emocional
  if (style.emotionalExpression === 'expressivo') {
    // Adiciona mais calor emocional
    if (!adapted.includes('!')) {
      adapted = adapted.replace(/\.$/, '!');
    }
  } else if (style.emotionalExpression === 'reservado') {
    // Remove excesso de exclamações
    adapted = adapted.replace(/!+/g, '.');
  }

  // Adapta ao estilo de decisão
  if (style.decisionMaking === 'racional') {
    // Enfatiza dados e lógica
    if (!adapted.includes('dados') && !adapted.includes('informações')) {
      adapted += ' Posso compartilhar mais detalhes se precisar.';
    }
  } else if (style.decisionMaking === 'emocional') {
    // Enfatiza sentimentos e experiências
    adapted = adapted
      .replace(/características/gi, 'o que torna especial')
      .replace(/especificações/gi, 'detalhes que fazem a diferença');
  }

  return adapted.trim();
}

/**
 * Gera resposta que endereça necessidades não-ditas
 *
 * @param analysis - Análise psicológica com a necessidade não-dita
 * @returns Resposta que endereça a necessidade subliminar
 */
export function generateNeedResponse(analysis: PsychologicalAnalysis): string {
  const { unspokenNeed, primaryMotivation, underlyingEmotion, rapportLevel } = analysis;

  // Base da resposta - validação emocional
  const validation = EMOTIONAL_VALIDATION_TEMPLATES[underlyingEmotion];

  // Resposta específica baseada na motivação primária
  const motivationResponses: Record<PrimaryMotivation, string[]> = {
    security: [
      'A segurança da sua família é o que mais importa.',
      'Entendo que você quer um lugar onde possa relaxar com tranquilidade.',
      'Um lar seguro é a base de tudo.',
      'Proteção e estabilidade são fundamentais.',
    ],
    achievement: [
      'Você merece um lugar que reflita suas conquistas.',
      'É importante ter um imóvel à altura do que você construiu.',
      'Qualidade de vida é um investimento que vale a pena.',
      'Seu esforço merece ser recompensado com um lar especial.',
    ],
    belonging: [
      'Um lar é onde criamos nossas melhores memórias.',
      'Ter um lugar para chamar de seu é fundamental.',
      'A sensação de pertencer a um lugar é transformadora.',
      'Cada família merece um espaço para construir sua história.',
    ],
    autonomy: [
      'A liberdade de ter seu próprio espaço não tem preço.',
      'Sair do aluguel é conquistar independência.',
      'Ter o controle sobre seu lar é uma grande conquista.',
      'Seu espaço, suas regras.',
    ],
    self_actualization: [
      'Realizar o sonho da casa própria é transformador.',
      'Esse momento representa muito mais que uma compra.',
      'É a realização de anos de trabalho e dedicação.',
      'Você está prestes a realizar um dos maiores sonhos.',
    ],
  };

  const motivationResponse = motivationResponses[primaryMotivation][
    Math.floor(Math.random() * motivationResponses[primaryMotivation].length)
  ];

  // Ajusta profundidade baseada no nível de rapport
  if (rapportLevel < 3) {
    // Rapport baixo - ser mais sutil
    return `${validation}`;
  } else if (rapportLevel < 6) {
    // Rapport médio - pode ser um pouco mais direto
    return `${validation} ${motivationResponse}`;
  } else {
    // Rapport alto - pode abordar a necessidade não-dita diretamente
    return `${validation} ${motivationResponse} Percebo que ${unspokenNeed.toLowerCase()}, e quero ajudar você a encontrar exatamente isso.`;
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES DE RAPPORT
// =============================================================================

/**
 * Seleciona frase de pertencimento aleatória de uma categoria
 */
export function getRandomBelongingPhrase(
  category: keyof typeof BELONGING_LANGUAGE
): string {
  const phrases = BELONGING_LANGUAGE[category];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Gera mensagem de transição empática entre tópicos
 */
export function generateEmpatheticTransition(
  fromTopic: string,
  toTopic: string,
  emotion: UnderlyingEmotion
): string {
  const transitionPhrases: Record<UnderlyingEmotion, string> = {
    medo: 'Entendo sua preocupação. Antes de seguirmos',
    frustração: 'Ouço você. Mudando um pouco de assunto',
    esperanca: 'Que bom! Aproveitando esse momento',
    ansiedade: 'Com calma, vamos ver',
    duvida: 'Boa pergunta. Sobre isso',
    entusiasmo: 'Adoro essa energia! E falando em',
    confianca: 'Perfeito. Então vamos falar sobre',
  };

  return `${transitionPhrases[emotion]}, gostaria de entender mais sobre ${toTopic}.`;
}

/**
 * Verifica se a mensagem demonstra escuta ativa
 */
export function includesActiveListening(message: string): boolean {
  const activeListeningIndicators = [
    'entendo',
    'percebo',
    'compreendo',
    'ouço você',
    'faz sentido',
    'você mencionou',
    'pelo que você disse',
    'se entendi bem',
    'o que você quer dizer',
    'me conta mais',
  ];

  const lowerMessage = message.toLowerCase();
  return activeListeningIndicators.some((indicator) =>
    lowerMessage.includes(indicator)
  );
}

/**
 * Adiciona elemento de escuta ativa a uma mensagem
 */
export function addActiveListening(
  message: string,
  userContext: string
): string {
  if (includesActiveListening(message)) {
    return message;
  }

  const activeListeningPrefixes = [
    `Pelo que você mencionou sobre ${userContext}, `,
    `Entendo que ${userContext} é importante para você. `,
    `Percebo que você valoriza ${userContext}. `,
  ];

  const prefix = activeListeningPrefixes[
    Math.floor(Math.random() * activeListeningPrefixes.length)
  ];

  return prefix + message;
}

/**
 * Gera pergunta de aprofundamento empática
 */
export function generateDeepingQuestion(
  topic: string,
  emotion: UnderlyingEmotion
): string {
  const questionTemplates: Record<UnderlyingEmotion, string[]> = {
    medo: [
      `O que te deixaria mais tranquilo em relação a ${topic}?`,
      `Que garantias seriam importantes para você sobre ${topic}?`,
    ],
    frustração: [
      `O que não funcionou nas suas experiências anteriores com ${topic}?`,
      `Como podemos fazer diferente dessa vez em relação a ${topic}?`,
    ],
    esperanca: [
      `Como você imagina ${topic} no seu novo lar?`,
      `O que seria perfeito para você em termos de ${topic}?`,
    ],
    ansiedade: [
      `Vamos com calma sobre ${topic}. O que é mais importante para você?`,
      `Posso explicar melhor sobre ${topic}. Qual sua maior dúvida?`,
    ],
    duvida: [
      `Que informações você precisa sobre ${topic} para se sentir seguro?`,
      `O que te ajudaria a ter mais clareza sobre ${topic}?`,
    ],
    entusiasmo: [
      `O que mais te anima sobre ${topic}?`,
      `Conte mais sobre o que você imagina para ${topic}!`,
    ],
    confianca: [
      `Você já tem uma visão clara sobre ${topic}. Quer me contar mais?`,
      `Pelo que entendi, ${topic} está claro para você. Posso ajudar em algo específico?`,
    ],
  };

  const questions = questionTemplates[emotion];
  return questions[Math.floor(Math.random() * questions.length)];
}
