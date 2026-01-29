/**
 * Sistema de Segurança da Sofia
 *
 * Filtros de segurança para bloquear:
 * - Prompt injection
 * - Solicitações de dados confidenciais
 * - Atividades ilegais
 * - Assédio
 * - Conteúdo fora do escopo
 */

// ============================================
// TIPOS
// ============================================

export type SecurityBlockReason =
  | 'prompt_injection'
  | 'confidential_data'
  | 'illegal_activity'
  | 'harassment'
  | 'off_topic_sensitive'
  | 'sql_injection'
  | 'xss_attempt'
  | 'spam'
  | null;

export interface SecurityCheckResult {
  blocked: boolean;
  reason: SecurityBlockReason;
  confidence: number;
  response: string | null;
  shouldEscalate: boolean;
  triggers: string[];
}

// ============================================
// PADRÕES DE SEGURANÇA
// ============================================

interface SecurityPattern {
  reason: SecurityBlockReason;
  patterns: RegExp[];
  response: string;
  escalate: boolean;
  priority: number;
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // ============ PROMPT INJECTION ============
  {
    reason: 'prompt_injection',
    patterns: [
      /ignor(e|a|ar?)\s*(as?)?\s*(instru[çc][oõ]es|comandos|regras)/i,
      /esqueç(a|e)\s*(tudo|as?\s*regras|o\s*que)/i,
      /finja\s*(que|ser)/i,
      /aja\s*como\s*(se|outro)/i,
      /mude\s*(seu|o)\s*(papel|comportamento|personalidade)/i,
      /repita\s*(ap[oó]s\s*mim|depois\s*de\s*mim)/i,
      /diga\s*(que\s*voc[eê]|isso)/i,
      /voc[eê]\s*agora\s*[eé]/i,
      /novo\s*modo/i,
      /modo\s*(desenvolvedor|admin|debug)/i,
      /desativa(r?)\s*(filtros?|seguran[çc]a)/i,
      /system\s*prompt/i,
      /jailbreak/i,
      /DAN\s*mode/i,
    ],
    response: 'Não posso seguir esse tipo de instrução. Posso ajudar com informações sobre imóveis, simulações ou suporte. Como posso te ajudar?',
    escalate: false,
    priority: 100,
  },

  // ============ SQL/CODE INJECTION ============
  {
    reason: 'sql_injection',
    patterns: [
      /SELECT\s+\*/i,
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+.*SET/i,
      /UNION\s+SELECT/i,
      /;\s*--/,
      /'\s*OR\s*'1'\s*=\s*'1/i,
      /\$\{.*\}/,
      /eval\s*\(/i,
      /exec\s*\(/i,
    ],
    response: 'Não entendi sua mensagem. Posso ajudar com informações sobre imóveis, simulações ou suporte.',
    escalate: false,
    priority: 95,
  },

  // ============ XSS ============
  {
    reason: 'xss_attempt',
    patterns: [
      /<script/i,
      /<\/script/i,
      /javascript:/i,
      /on(click|load|error|mouseover)=/i,
      /<iframe/i,
      /<img\s+.*onerror/i,
    ],
    response: 'Não entendi sua mensagem. Posso ajudar com informações sobre imóveis, simulações ou suporte.',
    escalate: false,
    priority: 95,
  },

  // ============ DADOS CONFIDENCIAIS ============
  {
    reason: 'confidential_data',
    patterns: [
      /qual\s*(sua?\s*)?(senha|password)/i,
      /(me\s*)?(d[aá]|passa|envia)\s*(o|a)?\s*cpf/i,
      /cpf\s*(do|da|de)\s*(gerente|corretor|dono|funcion[aá]rio)/i,
      /lista\s*(todos?\s*os?|as?)\s*(clientes?|leads?|corretores?)/i,
      /export(a|e)\s*(a|os?)?\s*(base|banco|dados|lista)/i,
      /dados?\s*(pessoais?|banc[aá]rios?)\s*(do|da|de)/i,
      /onde\s*(mora|vive)\s*(o|a)?\s*(dono|gerente|chefe)/i,
      /endere[çc]o\s*(pessoal|residencial)\s*(do|da)/i,
      /quanto\s*(ganha|recebe)\s*(o|a)?\s*(corretor|gerente|funcion[aá]rio)/i,
      /sal[aá]rio\s*(do|da)/i,
      /segredo\s*(da|do)?\s*(empresa|construtora)/i,
      /me\s*conta\s*um\s*segredo/i,
      /informa[çc][oõ]es?\s*confidenciais?/i,
    ],
    response: 'Não posso compartilhar informações confidenciais de terceiros. Posso ajudar com informações sobre imóveis disponíveis ou tirar dúvidas gerais.',
    escalate: true,
    priority: 90,
  },

  // ============ ATIVIDADES ILEGAIS ============
  {
    reason: 'illegal_activity',
    patterns: [
      /lavar?\s*(dinheiro|grana)/i,
      /lavagem\s*(de)?\s*(dinheiro|capitais?)/i,
      /sonegar?\s*(imposto|ir|tributo)/i,
      /evas[aã]o\s*(fiscal|de\s*impostos?)/i,
      /(em\s*)?nome\s*(de)?\s*laranja/i,
      /empresa\s*fantasma/i,
      /caixa\s*dois/i,
      /nota\s*fria/i,
      /documentos?\s*falsos?/i,
      /falsificar?/i,
      /suborn(o|ar)/i,
      /propina/i,
      /vend(e|o|er?)\s*(armas?|drogas?)/i,
      /tr[aá]fico/i,
      /rou[bv](o|ar)/i,
      /fraude/i,
      /golpe/i,
      /estelionato/i,
    ],
    response: 'Não posso auxiliar com esse tipo de solicitação. Se precisar de ajuda com imóveis de forma legal, estou à disposição.',
    escalate: true,
    priority: 85,
  },

  // ============ ASSÉDIO ============
  {
    reason: 'harassment',
    patterns: [
      /manda?\s*(um)?\s*nude/i,
      /foto\s*(sua|nua|sem\s*roupa)/i,
      /quer\s*(transar|ficar|sair)\s*comigo/i,
      /voc[eê]\s*[eé]\s*(gostosa|linda|gata)/i,
      /te\s*(amo|quero|desejo)/i,
      /casa\s*comigo/i,
      /seu\s*(whatsapp|telefone|n[uú]mero)\s*pessoal/i,
      /onde\s*voc[eê]\s*mora/i,
      /vou\s*te\s*(pegar|encontrar|achar)/i,
      /amea[çc](a|o|ar)/i,
    ],
    response: 'Prefiro manter nossa conversa profissional. Posso ajudar com informações sobre imóveis, simulações ou suporte.',
    escalate: true,
    priority: 80,
  },

  // ============ TEMAS SENSÍVEIS ============
  {
    reason: 'off_topic_sensitive',
    patterns: [
      /(em\s*quem|qual\s*candidato)\s*(voc[eê])?\s*(votou|vota)/i,
      /o\s*que\s*(acha|pensa)\s*(do|da|sobre)\s*(lula|bolsonaro|pt|psl|mbl)/i,
      /(voc[eê]\s*)?[eé]\s*(de\s*)?(direita|esquerda|comunista|fascista)/i,
      /seu\s*partido/i,
      /pol[ií]tica/i,
      /(voc[eê]\s*)?(acredita|cr[eê])\s*em\s*deus/i,
      /qual\s*(sua)?\s*relig(i[aã]o|ioso)/i,
      /(voc[eê]\s*)?[eé]\s*(ateu|cat[oó]lico|evang[eé]lico|espírita)/i,
    ],
    response: 'Prefiro não opinar sobre temas pessoais ou políticos. Meu foco é ajudar você com imóveis! Em que posso ajudar?',
    escalate: false,
    priority: 70,
  },

  // ============ SPAM ============
  {
    reason: 'spam',
    patterns: [
      /(.)\1{15,}/, // 15+ caracteres repetidos
      /^[^\w\s]{10,}$/, // 10+ símbolos sem letras
      /^[\u{1F300}-\u{1F9FF}]{10,}$/u, // 10+ emojis
    ],
    response: 'Não entendi sua mensagem. Pode reformular?',
    escalate: false,
    priority: 50,
  },
];

// ============================================
// PADRÕES DE FRUSTRAÇÃO ADICIONAL
// ============================================

export const FRUSTRATION_PATTERNS: RegExp[] = [
  // Palavrões e expressões fortes
  /pqp|puta|caralho|cacete|merda|droga|fod[aei]|vsf|vtnc|fdp|arrombad/i,
  /vai\s*(se\s*)?(f\*+|fu+der|tomar)/i,
  /incompetentes?/i,
  /incapa(z|zes)/i,
  /id?iotas?/i,
  /burros?/i,
  /inúteis?|in[uú]til/i,
  /p[eé]ssim[oa]s?/i,

  // Acusações
  /vocês?\s*(mentiram?|enganaram?|roubaram?)/i,
  /propaganda\s*enganosa/i,
  /isso\s*[eé]\s*golpe/i,
  /me\s*sinto\s*(enganad[ao]|lesad[ao]|roubad[ao])/i,
  /estelionato/i,
  /vocês?\s*s[aã]o\s*(p[eé]ssim|horrível|terr[ií]vel)/i,
  /pior\s*(atendimento|servi[çc]o|empresa)/i,
  /nunca\s*mais/i,
  /ningu[eé]m\s*(apareceu|veio|respondeu)/i,

  // Ameaças legais
  /vou\s*(processar|acionar|denunciar)/i,
  /procon/i,
  /reclame\s*aqui/i,
  /advogad[ao]/i,
  /justi[çc]a/i,
  /tribunal/i,

  // Desistência/Cancelamento
  /quero\s*(meu)?\s*dinheiro\s*(de\s*)?volta/i,
  /cancela\s*tudo/i,
  /vou\s*desistir/i,
  /distrato/i,
  /n[aã]o\s*quero\s*mais/i,
  /desist(o|ir|ência)/i,

  // Indignação
  /absurdo/i,
  /inadmiss[ií]vel/i,
  /inaceit[aá]vel/i,
  /ultraj(e|ante)/i,
  /revoltad[ao]/i,
  /indignada?/i,

  // Demora e espera
  /faz\s*\d+\s*(dias?|horas?|semanas?)\s*(que|e)\s*(espero|aguardo)/i,
  /j[aá]\s*mandei\s*\d+\s*mensagens?/i,
  /cad[eê]\s*(minha?|o|a)/i,
  /ningu[eé]m\s*(responde|retorna)/i,
  /esperando\s*(h[aá]|faz)\s*(muito|tempo)/i,

  // Pedidos de escalação
  /passa\s*(pro?|para\s*o?)\s*(supervisor|gerente|chefe)/i,
  /quero\s*falar\s*com\s*(gerente|supervisor|chefe|respons[aá]vel)/i,
];

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

/**
 * Verifica se a mensagem deve ser bloqueada por segurança
 */
export function checkSecurity(message: string): SecurityCheckResult {
  const normalizedMessage = message.trim();

  // Verificar mensagem vazia ou muito longa
  if (!normalizedMessage || normalizedMessage.length === 0) {
    return {
      blocked: false,
      reason: null,
      confidence: 0,
      response: null,
      shouldEscalate: false,
      triggers: [],
    };
  }

  if (normalizedMessage.length > 2000) {
    return {
      blocked: true,
      reason: 'spam',
      confidence: 0.9,
      response: 'Sua mensagem é muito longa. Pode resumir?',
      shouldEscalate: false,
      triggers: ['message_too_long'],
    };
  }

  // Verificar padrões de segurança
  for (const pattern of SECURITY_PATTERNS.sort((a, b) => b.priority - a.priority)) {
    for (const regex of pattern.patterns) {
      const match = normalizedMessage.match(regex);
      if (match) {
        return {
          blocked: true,
          reason: pattern.reason,
          confidence: 0.9,
          response: pattern.response,
          shouldEscalate: pattern.escalate,
          triggers: [match[0]],
        };
      }
    }
  }

  return {
    blocked: false,
    reason: null,
    confidence: 0,
    response: null,
    shouldEscalate: false,
    triggers: [],
  };
}

/**
 * Verifica se mensagem indica frustração alta
 * Complementa analyzeSentiment() com padrões adicionais
 */
export function checkHighFrustration(message: string): {
  isHighFrustration: boolean;
  triggers: string[];
} {
  const triggers: string[] = [];

  for (const pattern of FRUSTRATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      triggers.push(match[0]);
    }
  }

  return {
    isHighFrustration: triggers.length > 0,
    triggers,
  };
}

/**
 * Sanitiza mensagem removendo caracteres perigosos
 */
export function sanitizeMessage(message: string): string {
  return message
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .trim()
    .substring(0, 2000); // Limit length
}

/**
 * Verifica se é uma mensagem de teste/debug
 */
export function isTestMessage(message: string): boolean {
  const testPatterns = [
    /^test(e|ing)?$/i,
    /^debug$/i,
    /^ping$/i,
    /^hello\s*world$/i,
    /^asdf/i,
    /^qwerty/i,
    /^123456/,
  ];

  return testPatterns.some((p) => p.test(message.trim()));
}
