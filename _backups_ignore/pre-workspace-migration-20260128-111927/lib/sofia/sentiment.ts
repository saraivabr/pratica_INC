/**
 * Sistema de Análise de Sentimento da Sofia
 *
 * Detecta emoções e adapta respostas
 */

// ============================================
// TIPOS
// ============================================

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

export type EmotionalContext =
  | 'frustrado_com_sistema'
  | 'frustrado_com_cliente'
  | 'animado_com_venda'
  | 'desmotivado'
  | 'estressado'
  | null;

export interface SentimentAnalysis {
  sentiment: Sentiment;
  confidence: number; // 0-1
  triggers: string[];
  frustrationLevel: number; // 0-10
  recommendations: SentimentRecommendations;
}

export interface SentimentRecommendations {
  useEmoji: boolean;
  maxEmojis: number;
  showEmpathy: boolean;
  beDirective: boolean;
  offerEscalation: boolean;
}

// ============================================
// PADRÕES DE SENTIMENTO
// ============================================

interface SentimentPattern {
  sentiment: Sentiment;
  patterns: RegExp[];
  weight: number; // peso para o cálculo
  frustrationDelta: number; // quanto adiciona à frustração
}

const SENTIMENT_PATTERNS: SentimentPattern[] = [
  // ============ POSITIVO ============
  {
    sentiment: 'positive',
    patterns: [
      /obrigad[ao]/i,
      /valeu/i,
      /top/i,
      /perfeito/i,
      /maravilha/i,
      /show/i,
      /massa/i,
      /legal/i,
      /bom/i,
      /[oó]timo/i,
      /excelente/i,
      /adorei/i,
      /amei/i,
      /muito\s*bom/i,
      /era\s*(isso|esse)/i,
      /isso\s*(mesmo|a[ií])/i,
      /gostei/i,
      /que\s*bom/i,
      /😊|👍|🎉|😍|❤️|🙏|👏|💪/,
    ],
    weight: 1.0,
    frustrationDelta: -2,
  },

  // ============ NEGATIVO ============
  {
    sentiment: 'negative',
    patterns: [
      /n[aã]o\s*(era|[eé])\s*(isso)?/i,
      /errad[ao]/i,
      /incorreto/i,
      /ruim/i,
      /p[eé]ssim[ao]/i,
      /horrível/i,
      /n[aã]o\s*gostei/i,
      /n[aã]o\s*quero/i,
      /n[aã]o\s*preciso/i,
      /n[aã]o\s*era\s*isso/i,
      /n[aã]o\s*entend/i,
      /confuso/i,
      /difícil/i,
      /complicado/i,
      /chato/i,
      /😞|😔|😢|😤|😡|👎|💔/,
    ],
    weight: 1.2,
    frustrationDelta: 2,
  },

  // ============ URGENTE ============
  {
    sentiment: 'urgent',
    patterns: [
      /urgente/i,
      /agora/i,
      /hoje/i,
      /r[aá]pido/i,
      /pressa/i,
      /cliente\s*(esperando|aguardando)/i,
      /preciso\s*j[aá]/i,
      /imediato/i,
      /asap/i,
      /logo/i,
      /correndo/i,
      /⚡|🚨|‼️|❗/,
    ],
    weight: 1.5,
    frustrationDelta: 1,
  },

  // ============ FRUSTRAÇÃO ============
  {
    sentiment: 'negative',
    patterns: [
      /de\s*novo/i,
      /j[aá]\s*falei/i,
      /t[oô]\s*falando/i,
      /n[aã]o\s*funciona/i,
      /ainda\s*n[aã]o/i,
      /toda\s*(hora|vez)/i,
      /cans(ad|ei)/i,
      /saco/i,
      /pqp|puta|cacete|merda|droga/i,
    ],
    weight: 1.5,
    frustrationDelta: 3,
  },
];

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export function analyzeSentiment(
  text: string,
  previousFrustration = 0
): SentimentAnalysis {
  const triggers: string[] = [];
  let positiveScore = 0;
  let negativeScore = 0;
  let urgentScore = 0;
  let frustrationLevel = previousFrustration;

  // Analisar cada padrão
  for (const pattern of SENTIMENT_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = text.match(regex);
      if (match) {
        triggers.push(match[0]);

        switch (pattern.sentiment) {
          case 'positive':
            positiveScore += pattern.weight;
            break;
          case 'negative':
            negativeScore += pattern.weight;
            break;
          case 'urgent':
            urgentScore += pattern.weight;
            break;
        }

        frustrationLevel += pattern.frustrationDelta;
      }
    }
  }

  // Normalizar frustração (0-10)
  frustrationLevel = Math.max(0, Math.min(10, frustrationLevel));

  // Determinar sentimento principal
  let sentiment: Sentiment = 'neutral';
  let maxScore = 0;

  // Urgente tem prioridade se score alto
  if (urgentScore >= 1.5) {
    sentiment = 'urgent';
    maxScore = urgentScore;
  } else if (negativeScore > positiveScore && negativeScore > 0.5) {
    sentiment = 'negative';
    maxScore = negativeScore;
  } else if (positiveScore > 0.5) {
    sentiment = 'positive';
    maxScore = positiveScore;
  }

  // Calcular confiança
  const totalScore = positiveScore + negativeScore + urgentScore;
  const confidence =
    totalScore > 0 ? Math.min(maxScore / totalScore + 0.3, 0.95) : 0.5;

  // Gerar recomendações
  const recommendations = getRecommendations(sentiment, frustrationLevel);

  return {
    sentiment,
    confidence,
    triggers,
    frustrationLevel,
    recommendations,
  };
}

// ============================================
// RECOMENDAÇÕES
// ============================================

function getRecommendations(
  sentiment: Sentiment,
  frustrationLevel: number
): SentimentRecommendations {
  switch (sentiment) {
    case 'urgent':
      return {
        useEmoji: false,
        maxEmojis: 0,
        showEmpathy: false,
        beDirective: true,
        offerEscalation: false,
      };

    case 'negative':
      return {
        useEmoji: true,
        maxEmojis: 1,
        showEmpathy: true,
        beDirective: false,
        offerEscalation: frustrationLevel >= 7,
      };

    case 'positive':
      return {
        useEmoji: true,
        maxEmojis: 2,
        showEmpathy: false,
        beDirective: false,
        offerEscalation: false,
      };

    default: // neutral
      return {
        useEmoji: true,
        maxEmojis: 1,
        showEmpathy: false,
        beDirective: false,
        offerEscalation: frustrationLevel >= 8,
      };
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Verifica se deve oferecer escalação para humano
 */
export function shouldEscalate(
  sentimentHistory: Sentiment[],
  frustrationLevel: number
): boolean {
  // Escalar se frustração muito alta
  if (frustrationLevel >= 7) {
    return true;
  }

  // Escalar se 3+ sentimentos negativos seguidos
  const lastThree = sentimentHistory.slice(-3);
  if (
    lastThree.length >= 3 &&
    lastThree.every((s) => s === 'negative')
  ) {
    return true;
  }

  return false;
}

/**
 * Atualiza nível de frustração baseado no tempo desde última mensagem
 */
export function decayFrustration(
  currentLevel: number,
  minutesSinceLastMessage: number
): number {
  // Frustração decai 1 ponto a cada 10 minutos
  const decay = Math.floor(minutesSinceLastMessage / 10);
  return Math.max(0, currentLevel - decay);
}

/**
 * Retorna emoji apropriado para o sentimento
 */
export function getSentimentEmoji(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'positive':
      return '😊';
    case 'negative':
      return '😔';
    case 'urgent':
      return '⚡';
    default:
      return '';
  }
}

/**
 * Formata mensagem de empatia baseada no sentimento
 */
export function getEmpathyMessage(sentiment: Sentiment): string | null {
  switch (sentiment) {
    case 'negative':
      return 'Desculpa, deixa eu entender melhor o que você precisa.';
    case 'urgent':
      return 'Entendi, vou resolver agora.';
    default:
      return null;
  }
}

// ============================================
// CONTEXTO EMOCIONAL
// ============================================

interface EmotionalContextPattern {
  context: EmotionalContext;
  patterns: RegExp[];
}

const EMOTIONAL_CONTEXT_PATTERNS: EmotionalContextPattern[] = [
  {
    context: 'frustrado_com_sistema',
    patterns: [
      /n[aã]o\s*funciona/i,
      /travou/i,
      /trava(ndo)?/i,
      /erro/i,
      /bug/i,
      /sistema\s*(travou|parou|caiu)/i,
      /app\s*(travou|parou|caiu)/i,
      /deu\s*pau/i,
      /n[aã]o\s*carrega/i,
      /n[aã]o\s*abre/i,
      /n[aã]o\s*salva/i,
      /bugado/i,
      /com\s*defeito/i,
      /essa\s*droga/i,
      /essa\s*porcaria/i,
    ],
  },
  {
    context: 'frustrado_com_cliente',
    patterns: [
      /cliente\s*chato/i,
      /n[aã]o\s*responde/i,
      /sumiu/i,
      /cliente\s*sumiu/i,
      /cliente\s*dif[ií]cil/i,
      /cliente\s*n[aã]o\s*responde/i,
      /n[aã]o\s*retorna/i,
      /ignorando/i,
      /me\s*ignorando/i,
      /visualizou\s*e\s*n[aã]o/i,
      /deixou\s*no\s*v[aá]cuo/i,
      /cliente\s*enrolando/i,
      /cliente\s*desapareceu/i,
    ],
  },
  {
    context: 'animado_com_venda',
    patterns: [
      /fechei/i,
      /vendi/i,
      /consegui/i,
      /fechou/i,
      /vendeu/i,
      /assinaram/i,
      /assinou/i,
      /deu\s*certo/i,
      /conseguimos/i,
      /fechamos/i,
      /vendemos/i,
      /comiss[aã]o/i,
      /bati\s*(a\s*)?meta/i,
      /meta\s*batida/i,
      /negócio\s*fechado/i,
      /contrato\s*assinado/i,
    ],
  },
  {
    context: 'desmotivado',
    patterns: [
      /dif[ií]cil/i,
      /n[aã]o\s*consigo/i,
      /desisto/i,
      /vou\s*desistir/i,
      /cansado/i,
      /cansada/i,
      /exausto/i,
      /exausta/i,
      /sem\s*energia/i,
      /n[aã]o\s*d[aá]/i,
      /n[aã]o\s*vai\s*dar/i,
      /imposs[ií]vel/i,
      /n[aã]o\s*tenho\s*mais/i,
      /sem\s*esperan[cç]a/i,
      /n[aã]o\s*aguento/i,
      /t[oô]\s*de\s*saco\s*cheio/i,
      /desanimad[ao]/i,
    ],
  },
  {
    context: 'estressado',
    patterns: [
      /urgente/i,
      /press[aã]o/i,
      /prazo/i,
      /estressad[ao]/i,
      /estresse/i,
      /stress/i,
      /deadline/i,
      /cobrando/i,
      /me\s*cobrando/i,
      /t[aã]o\s*me\s*cobrando/i,
      /chefe\s*cobrando/i,
      /gerente\s*cobrando/i,
      /muita\s*coisa/i,
      /sobrecarregad[ao]/i,
      /n[aã]o\s*tenho\s*tempo/i,
      /sem\s*tempo/i,
      /correria/i,
      /loucura/i,
      /enlouquecendo/i,
    ],
  },
];

/**
 * Detecta o contexto emocional da mensagem
 */
export function getEmotionalContext(message: string): EmotionalContext {
  for (const pattern of EMOTIONAL_CONTEXT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        return pattern.context;
      }
    }
  }
  return null;
}

// ============================================
// RESPOSTAS EMPÁTICAS
// ============================================

export const EMPATHIC_RESPONSES: Record<NonNullable<EmotionalContext>, string[]> = {
  frustrado_com_sistema: [
    'Entendo sua frustração com o sistema. Vou te ajudar a resolver isso.',
    'Que chato isso ter acontecido. Me conta mais pra eu ver como posso ajudar.',
    'Problemas técnicos são realmente irritantes. Vamos resolver juntos.',
    'Sei como é frustrante quando a tecnologia não coopera. Estou aqui pra ajudar.',
  ],
  frustrado_com_cliente: [
    'Lidar com clientes difíceis faz parte, mas sei que não é fácil. Como posso ajudar?',
    'Entendo, alguns clientes realmente testam nossa paciência. Vamos pensar numa estratégia.',
    'Já passei por isso também. Quer que eu sugira uma abordagem diferente?',
    'Cliente que some é complicado mesmo. Posso te ajudar a criar uma mensagem de follow-up.',
  ],
  animado_com_venda: [
    'Parabéns! Isso é ótimo! Conta mais sobre como foi!',
    'Que notícia boa! Você merece! Celebra essa conquista!',
    'Maravilha! Sucesso assim motiva demais! Continue arrasando!',
    'Show! Nada melhor que fechar uma venda! Muito bem!',
  ],
  desmotivado: [
    'Ei, dias difíceis acontecem. O importante é não desistir.',
    'Entendo como você se sente. Quer conversar sobre o que está te desanimando?',
    'Todo corretor passa por fases assim. Posso te ajudar com alguma estratégia?',
    'Calma, uma coisa de cada vez. Me diz no que posso te ajudar agora.',
  ],
  estressado: [
    'Respira fundo. Vamos resolver uma coisa de cada vez.',
    'Entendo a pressão. Me diz o que é mais urgente que te ajudo.',
    'Sei que tem muita coisa, mas vamos priorizar juntos.',
    'Calma, estou aqui pra te ajudar. Qual é a prioridade número 1?',
  ],
};

/**
 * Retorna uma resposta empática aleatória para o contexto emocional
 */
export function getEmpathicResponse(context: EmotionalContext): string | null {
  if (!context) return null;

  const responses = EMPATHIC_RESPONSES[context];
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}
