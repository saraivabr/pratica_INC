/**
 * Estratégias de Reativação de Leads
 *
 * Abordagens personalizadas baseadas no perfil psicológico
 * e motivo de inatividade do lead.
 */

import type { PsychologicalAnalysis, PrimaryMotivation, UnderlyingEmotion } from '../sofia/psychology/types';
import { analyzePsychology } from '../sofia/langchain/psychology-analyzer';

// ============================================================================
// TIPOS
// ============================================================================

export type InactivityReason =
  | 'no_response'        // Simplesmente parou de responder
  | 'said_later'         // Disse que ia pensar/ver depois
  | 'too_expensive'      // Achou caro
  | 'wrong_location'     // Localização não agradou
  | 'wrong_size'         // Tamanho não adequado
  | 'competitor'         // Foi ver concorrência
  | 'not_ready'          // Não está no momento de comprar
  | 'bad_experience'     // Teve experiência ruim no atendimento
  | 'unknown';           // Motivo desconhecido

export interface LeadReactivationProfile {
  leadId: string;
  leadNome: string;
  telefone: string;
  corretorNome: string;
  diasInativo: number;
  inactivityReason: InactivityReason;
  lastInteraction: string;
  interesse: {
    tipoImovel?: string;
    bairro?: string;
    cidade?: string;
    valorMax?: number;
    quartos?: number;
  };
  psychology?: PsychologicalAnalysis;
  previousAttempts: number;
}

export interface ReactivationStrategy {
  approach: string;
  openingMessage: string;
  followUpIfNoResponse: string;
  objectionHandlers: Record<string, string>;
  toneGuidelines: string[];
}

// ============================================================================
// ESTRATÉGIAS POR MOTIVO DE INATIVIDADE
// ============================================================================

const STRATEGIES_BY_REASON: Record<InactivityReason, (profile: LeadReactivationProfile) => ReactivationStrategy> = {
  no_response: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'casual_check_in',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Aqui é a Luna, assistente do ${profile.corretorNome}. Sumiu! Tudo bem por aí? Ainda procurando${profile.interesse.bairro ? ` algo no ${profile.interesse.bairro}` : ' imóvel'}?`,
      followUpIfNoResponse: `${nome ? `${nome}, ` : ''}sem pressão! Só queria avisar que apareceram opções novas. Se tiver interesse, me chama!`,
      objectionHandlers: {
        busy: 'Entendo! Quando tiver um tempinho, me chama que eu te atualizo rapidinho.',
        not_interested: 'Tranquilo! Se mudar de ideia, tô por aqui. Boa sorte na busca!',
      },
      toneGuidelines: [
        'Seja leve e casual',
        'Não pressione',
        'Mostre que lembrou genuinamente',
      ],
    };
  },

  said_later: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'gentle_reminder',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Lembra que você ia dar uma pensada${profile.interesse.bairro ? ` naquele imóvel no ${profile.interesse.bairro}` : ''}? Passou um tempinho e queria saber se posso te ajudar em algo!`,
      followUpIfNoResponse: `Tô por aqui se precisar! Sem pressa 😊`,
      objectionHandlers: {
        still_thinking: 'Claro! Alguma dúvida que eu possa esclarecer pra te ajudar a decidir?',
        changed_mind: 'Entendo! O que mudou? Talvez eu consiga encontrar algo mais adequado.',
      },
      toneGuidelines: [
        'Respeite o tempo do cliente',
        'Ofereça ajuda, não pressão',
        'Mostre-se disponível',
      ],
    };
  },

  too_expensive: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'new_opportunity',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Lembrei de você - apareceu uma condição especial que pode fazer mais sentido pro seu orçamento${profile.interesse.bairro ? ` no ${profile.interesse.bairro}` : ''}. Quer dar uma olhada?`,
      followUpIfNoResponse: `${nome ? `${nome}, ` : ''}essa condição é por tempo limitado. Se tiver interesse, me avisa!`,
      objectionHandlers: {
        still_expensive: 'Entendo! Me conta qual faixa funcionaria pra você que eu procuro opções.',
        not_now: 'Sem problema! Posso te avisar quando aparecer algo ainda melhor?',
      },
      toneGuidelines: [
        'Foque na oportunidade, não no preço anterior',
        'Mostre que encontrou solução',
        'Não faça o cliente se sentir "pobre"',
      ],
    };
  },

  wrong_location: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'expanded_search',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Sei que a localização era importante pra você. Descobri algumas opções em bairros próximos que podem te surpreender. Quer conhecer?`,
      followUpIfNoResponse: `Me conta qual região seria ideal que eu faço uma busca mais direcionada!`,
      objectionHandlers: {
        specific_location: 'Entendi! Vou ficar de olho e te aviso assim que aparecer algo nessa região específica.',
        gave_up: 'Poxa! Se mudar de ideia, me chama. Às vezes o bairro perfeito aparece quando menos esperamos.',
      },
      toneGuidelines: [
        'Mostre que ouviu a objeção anterior',
        'Ofereça alternativas, não insista no mesmo',
        'Seja consultivo',
      ],
    };
  },

  wrong_size: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    const quartos = profile.interesse.quartos;
    return {
      approach: 'better_fit',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Lembrei que você precisava de ${quartos ? `${quartos} quartos` : 'mais espaço'}. Achei algumas opções que podem se encaixar melhor. Posso mandar?`,
      followUpIfNoResponse: `Me conta exatamente o que você precisa em termos de espaço que eu refino a busca!`,
      objectionHandlers: {
        specific_need: 'Perfeito! Vou procurar exatamente isso e te aviso.',
        flexible: 'Ótimo! Então vou te mandar algumas opções variadas pra você comparar.',
      },
      toneGuidelines: [
        'Demonstre que entendeu a necessidade',
        'Foque em encontrar o encaixe perfeito',
        'Pergunte para refinar',
      ],
    };
  },

  competitor: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'differentiation',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Tudo bem? Sei que você estava olhando outras opções. Sem problema! Só queria te mostrar uma condição exclusiva que temos${profile.interesse.bairro ? ` pro ${profile.interesse.bairro}` : ''}. Vale a pena comparar!`,
      followUpIfNoResponse: `Fechou com alguém? Se não, ainda posso te ajudar!`,
      objectionHandlers: {
        chose_competitor: 'Parabéns pela conquista! Se precisar de algo no futuro, me chama!',
        still_looking: 'Ótimo! Posso te ajudar a comparar. O que você viu de interessante por aí?',
      },
      toneGuidelines: [
        'Não fale mal da concorrência',
        'Foque nos diferenciais',
        'Seja parceiro, não vendedor',
      ],
    };
  },

  not_ready: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'nurturing',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Sei que não era o momento certo antes. Só passando pra avisar que tô por aqui quando você estiver pronto. Mudou alguma coisa?`,
      followUpIfNoResponse: `Vou guardando seu perfil aqui. Quando for a hora, me chama!`,
      objectionHandlers: {
        still_not_ready: 'Sem problema! Posso te avisar quando aparecer algo especial?',
        ready_now: 'Opa! Que ótimo! Me conta o que mudou e vamos encontrar o lugar perfeito!',
      },
      toneGuidelines: [
        'Zero pressão',
        'Mostre paciência',
        'Mantenha a porta aberta',
      ],
    };
  },

  bad_experience: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'fresh_start',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Aqui é a Luna, nova assistente do ${profile.corretorNome}. Sei que talvez a experiência anterior não tenha sido ideal. Queria te oferecer um atendimento diferente. Posso tentar de novo?`,
      followUpIfNoResponse: `Entendo se não quiser. Mas se der uma chance, prometo que vai ser diferente!`,
      objectionHandlers: {
        frustrated: 'Sinto muito pela experiência anterior. Me conta o que aconteceu que eu vou garantir que não se repita.',
        willing_to_try: 'Obrigada pela chance! Vou fazer valer a pena. Me conta o que você procura!',
      },
      toneGuidelines: [
        'Reconheça o problema sem se desculpar demais',
        'Foque no futuro, não no passado',
        'Mostre mudança real',
      ],
    };
  },

  unknown: (profile) => {
    const nome = profile.leadNome?.split(' ')[0] || '';
    return {
      approach: 'open_ended',
      openingMessage: `Oi${nome ? ` ${nome}` : ''}! Aqui é a Luna, assistente do ${profile.corretorNome}. Faz um tempinho que a gente conversou. Tudo bem por aí? Ainda posso te ajudar com alguma coisa?`,
      followUpIfNoResponse: `Tô por aqui se precisar! 😊`,
      objectionHandlers: {
        any: 'Entendi! Me conta mais que eu vejo como posso ajudar.',
      },
      toneGuidelines: [
        'Seja genuinamente curioso',
        'Deixe o lead guiar',
        'Não assuma nada',
      ],
    };
  },
};

// ============================================================================
// ESTRATÉGIAS POR PERFIL PSICOLÓGICO
// ============================================================================

function adjustStrategyByPsychology(
  baseStrategy: ReactivationStrategy,
  psychology: PsychologicalAnalysis,
  profile: LeadReactivationProfile
): ReactivationStrategy {
  const nome = profile.leadNome?.split(' ')[0] || '';

  // Adjust based on primary motivation
  if (psychology.primaryMotivation === 'security') {
    baseStrategy.toneGuidelines.push('Enfatize segurança e estabilidade');
    baseStrategy.toneGuidelines.push('Mencione garantias e confiabilidade');
  } else if (psychology.primaryMotivation === 'achievement') {
    baseStrategy.toneGuidelines.push('Destaque qualidade e exclusividade');
    baseStrategy.toneGuidelines.push('Fale sobre valorização e investimento');
  } else if (psychology.primaryMotivation === 'belonging') {
    baseStrategy.toneGuidelines.push('Foque no conceito de lar e família');
    baseStrategy.toneGuidelines.push('Mencione comunidade e vizinhança');
  } else if (psychology.primaryMotivation === 'autonomy') {
    baseStrategy.toneGuidelines.push('Enfatize independência e liberdade');
    baseStrategy.toneGuidelines.push('Fale sobre sair do aluguel');
  } else if (psychology.primaryMotivation === 'self_actualization') {
    baseStrategy.toneGuidelines.push('Conecte com o sonho de vida');
    baseStrategy.toneGuidelines.push('Fale sobre realização e conquista');
  }

  // Adjust based on underlying emotion
  if (psychology.underlyingEmotion === 'medo') {
    baseStrategy.toneGuidelines.push('Ofereça segurança e certezas');
    baseStrategy.toneGuidelines.push('Não pressione - dê espaço');
  } else if (psychology.underlyingEmotion === 'frustração') {
    baseStrategy.toneGuidelines.push('Valide a frustração primeiro');
    baseStrategy.toneGuidelines.push('Mostre que entendeu o problema');
  } else if (psychology.underlyingEmotion === 'esperanca') {
    baseStrategy.toneGuidelines.push('Alimente a esperança com possibilidades');
    baseStrategy.toneGuidelines.push('Seja entusiasta mas realista');
  } else if (psychology.underlyingEmotion === 'ansiedade') {
    baseStrategy.toneGuidelines.push('Seja calmo e tranquilizador');
    baseStrategy.toneGuidelines.push('Simplifique as escolhas');
  }

  return baseStrategy;
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Get reactivation strategy for a lead profile
 */
export function getReactivationStrategy(profile: LeadReactivationProfile): ReactivationStrategy {
  const baseStrategy = STRATEGIES_BY_REASON[profile.inactivityReason](profile);

  if (profile.psychology) {
    return adjustStrategyByPsychology(baseStrategy, profile.psychology, profile);
  }

  return baseStrategy;
}

/**
 * Analyze lead's last messages to detect inactivity reason
 */
export function detectInactivityReason(lastMessages: string[]): InactivityReason {
  const combined = lastMessages.join(' ').toLowerCase();

  if (combined.includes('caro') || combined.includes('preço') || combined.includes('orçamento') || combined.includes('pagar')) {
    return 'too_expensive';
  }
  if (combined.includes('localização') || combined.includes('bairro') || combined.includes('longe') || combined.includes('região')) {
    return 'wrong_location';
  }
  if (combined.includes('pequeno') || combined.includes('grande') || combined.includes('espaço') || combined.includes('quarto')) {
    return 'wrong_size';
  }
  if (combined.includes('pensar') || combined.includes('depois') || combined.includes('ainda não') || combined.includes('momento')) {
    return 'said_later';
  }
  if (combined.includes('outro') || combined.includes('concorr') || combined.includes('vendo outra') || combined.includes('comparar')) {
    return 'competitor';
  }
  if (combined.includes('não estou') || combined.includes('ainda não') || combined.includes('ano que vem') || combined.includes('futuro')) {
    return 'not_ready';
  }
  if (combined.includes('ruim') || combined.includes('péssimo') || combined.includes('horrível') || combined.includes('demor')) {
    return 'bad_experience';
  }

  return 'unknown';
}

/**
 * Generate complete reactivation plan for a lead
 */
export async function generateReactivationPlan(
  profile: LeadReactivationProfile
): Promise<{
  strategy: ReactivationStrategy;
  psychology?: PsychologicalAnalysis;
  recommendedTiming: string;
  expectedResponses: string[];
}> {
  // Analyze psychology if we have last interaction
  let psychology: PsychologicalAnalysis | undefined;
  if (profile.lastInteraction) {
    try {
      psychology = await analyzePsychology(profile.lastInteraction);
      profile.psychology = psychology;
    } catch (error) {
      console.warn('[Reactivation] Could not analyze psychology:', error);
    }
  }

  const strategy = getReactivationStrategy(profile);

  // Determine best timing
  let recommendedTiming = 'manhã (9-11h)';
  if (psychology?.underlyingEmotion === 'ansiedade') {
    recommendedTiming = 'tarde (14-16h) - quando está mais calmo';
  } else if (psychology?.primaryMotivation === 'achievement') {
    recommendedTiming = 'fim do dia (18-19h) - após expediente';
  }

  // Expected responses based on profile
  const expectedResponses = [
    'Positiva: "Oi! Sim, ainda estou procurando"',
    'Neutra: "Opa, tudo bem"',
    'Negativa: "Não tenho interesse"',
    'Objeção: específica ao motivo de inatividade',
  ];

  return {
    strategy,
    psychology,
    recommendedTiming,
    expectedResponses,
  };
}

/**
 * Batch analyze leads for reactivation priority
 */
export function prioritizeLeadsForReactivation(
  leads: LeadReactivationProfile[]
): LeadReactivationProfile[] {
  return leads.sort((a, b) => {
    // Priority 1: Leads que disseram "depois" (higher chance of conversion)
    if (a.inactivityReason === 'said_later' && b.inactivityReason !== 'said_later') return -1;
    if (b.inactivityReason === 'said_later' && a.inactivityReason !== 'said_later') return 1;

    // Priority 2: Less previous attempts
    if (a.previousAttempts !== b.previousAttempts) {
      return a.previousAttempts - b.previousAttempts;
    }

    // Priority 3: More recent inactivity (still warm)
    return a.diasInativo - b.diasInativo;
  });
}
