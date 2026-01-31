/**
 * Motor de Motivações Humanas
 *
 * Analisa e categoriza as motivações por trás de cada interação
 */

import type {
  HumanMotivations,
  PrimaryMotivation,
  PsychologicalProfile,
} from './types';

/**
 * Palavras-chave associadas a cada motivação
 */
const MOTIVATION_KEYWORDS: Record<PrimaryMotivation, string[]> = {
  security: [
    'seguro', 'segurança', 'família', 'filhos', 'proteção', 'estável',
    'estabilidade', 'tranquilo', 'condomínio', 'portaria', 'câmera',
    'fechado', 'bairro bom', 'região tranquila', 'medo', 'violência',
    'assalto', 'roubo', 'garantia', 'confiança', 'certeza',
  ],
  achievement: [
    'qualidade', 'luxo', 'premium', 'alto padrão', 'status', 'sucesso',
    'melhor', 'top', 'vista', 'varanda', 'gourmet', 'lazer', 'academia',
    'piscina', 'conquista', 'mérito', 'trabalho duro', 'investimento',
    'valorização', 'localização nobre', 'bairro valorizado',
  ],
  belonging: [
    'lar', 'casa', 'família', 'filhos', 'esposa', 'marido', 'pais',
    'avós', 'vizinhança', 'comunidade', 'amigos', 'pertencer', 'raízes',
    'memórias', 'crescer', 'criar', 'educar', 'história', 'legado',
    'herança', 'próximo de', 'perto da família',
  ],
  autonomy: [
    'meu', 'próprio', 'aluguel', 'sair do aluguel', 'independência',
    'liberdade', 'dono', 'minha casa', 'meu cantinho', 'decisão',
    'controle', 'regras', 'reformar', 'mudar', 'personalizar',
    'não depender', 'cansado de', 'chega de', 'finalmente',
  ],
  self_actualization: [
    'sonho', 'sempre quis', 'vida toda', 'meta', 'objetivo', 'realização',
    'conquista', 'momento', 'chegou a hora', 'mereci', 'trabalhei',
    'batalhei', 'suei', 'finalmente', 'destino', 'propósito', 'ideal',
    'perfeito', 'tudo que eu queria', 'como sempre sonhei',
  ],
};

/**
 * Descrições das motivações para o prompt
 */
export const MOTIVATION_DESCRIPTIONS: Record<PrimaryMotivation, string> = {
  security: 'Busca proteção, estabilidade e segurança para a família',
  achievement: 'Busca status, qualidade de vida e reconhecimento',
  belonging: 'Busca criar um lar, pertencer a uma comunidade, deixar legado',
  autonomy: 'Busca independência, controle sobre seu espaço, sair do aluguel',
  self_actualization: 'Busca realizar um sonho de vida, atingir um objetivo pessoal',
};

/**
 * Detecta a motivação primária baseado no texto
 */
export function detectPrimaryMotivation(text: string): PrimaryMotivation {
  const normalizedText = text.toLowerCase();
  const scores: Record<PrimaryMotivation, number> = {
    security: 0,
    achievement: 0,
    belonging: 0,
    autonomy: 0,
    self_actualization: 0,
  };

  // Conta matches para cada motivação
  for (const [motivation, keywords] of Object.entries(MOTIVATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        scores[motivation as PrimaryMotivation] += 1;
      }
    }
  }

  // Encontra a motivação com maior score
  let maxMotivation: PrimaryMotivation = 'belonging'; // default
  let maxScore = 0;

  for (const [motivation, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxMotivation = motivation as PrimaryMotivation;
    }
  }

  return maxMotivation;
}

/**
 * Atualiza o perfil de motivações baseado na análise
 */
export function updateMotivations(
  current: HumanMotivations,
  primaryMotivation: PrimaryMotivation,
  intensity: number = 10
): HumanMotivations {
  const updated = { ...current };

  // Aumenta a motivação detectada
  switch (primaryMotivation) {
    case 'security':
      updated.security = Math.min(100, updated.security + intensity);
      break;
    case 'achievement':
      updated.achievement = Math.min(100, updated.achievement + intensity);
      break;
    case 'belonging':
      updated.belonging = Math.min(100, updated.belonging + intensity);
      break;
    case 'autonomy':
      updated.autonomy = Math.min(100, updated.autonomy + intensity);
      break;
    case 'self_actualization':
      updated.selfActualization = Math.min(100, updated.selfActualization + intensity);
      break;
  }

  return updated;
}

/**
 * Obtém a motivação dominante do perfil
 */
export function getDominantMotivation(motivations: HumanMotivations): PrimaryMotivation {
  const entries: [PrimaryMotivation, number][] = [
    ['security', motivations.security],
    ['achievement', motivations.achievement],
    ['belonging', motivations.belonging],
    ['autonomy', motivations.autonomy],
    ['self_actualization', motivations.selfActualization],
  ];

  let max: [PrimaryMotivation, number] = entries[0];
  for (const entry of entries) {
    if (entry[1] > max[1]) {
      max = entry;
    }
  }

  return max[0];
}

/**
 * Gera insights baseados nas motivações
 */
export function getMotivationInsights(profile: PsychologicalProfile): string[] {
  const insights: string[] = [];
  const { motivations } = profile;

  if (motivations.security > 70) {
    insights.push('Priorize aspectos de segurança: condomínio fechado, portaria 24h, câmeras');
  }

  if (motivations.achievement > 70) {
    insights.push('Destaque diferenciais de qualidade: acabamento, localização, lazer completo');
  }

  if (motivations.belonging > 70) {
    insights.push('Foque no conceito de lar e comunidade: vizinhança, áreas comuns, convívio');
  }

  if (motivations.autonomy > 70) {
    insights.push('Enfatize a conquista da independência: liberdade de reformar, não pagar aluguel');
  }

  if (motivations.selfActualization > 70) {
    insights.push('Conecte com o sonho de vida: momento especial, conquista merecida');
  }

  return insights;
}

/**
 * Gera uma abertura empática baseada na motivação
 */
export function getMotivationBasedOpening(motivation: PrimaryMotivation): string {
  const openings: Record<PrimaryMotivation, string> = {
    security: 'Entendo a importância de ter um lugar seguro para sua família. Vamos encontrar exatamente isso.',
    achievement: 'Você merece algo à altura de tudo que conquistou. Vamos ver opções que fazem jus a isso.',
    belonging: 'Criar um lar é uma das decisões mais importantes. Vou te ajudar a encontrar o lugar certo para a história da sua família.',
    autonomy: 'Ter o seu próprio espaço muda tudo, não é? Vamos encontrar o lugar que vai ser só seu.',
    self_actualization: 'Que momento especial! Realizar esse sonho é o resultado de muito trabalho. Vou te ajudar a chegar lá.',
  };

  return openings[motivation];
}
