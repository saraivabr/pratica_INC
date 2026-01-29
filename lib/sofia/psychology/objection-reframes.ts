/**
 * Reframes Psicológicos de Objeções
 *
 * Princípio fundamental: Toda objeção é um medo disfarçado.
 * Não combatemos objeções - reformulamos medos.
 *
 * A pessoa não está dizendo "é caro demais"
 * Ela está dizendo "tenho medo de me arrepender financeiramente"
 */

import {
  ObjectionType,
  ObjectionReframe,
  PrimaryMotivation,
} from './types';

/**
 * Mapeamento de objeções para seus medos subjacentes e necessidades psicológicas
 */
export const PSYCHOLOGICAL_OBJECTION_REFRAMES: Record<ObjectionType, ObjectionReframe> = {
  /**
   * PREÇO
   * O que dizem: "É muito caro", "Não cabe no meu orçamento"
   * O que sentem: Medo de se arrepender financeiramente
   * O que precisam: Segurança de que é a decisão certa
   */
  preco: {
    underlyingFear: 'arrependimento_financeiro',
    psychologicalNeed: 'security',
    approach: 'validate_then_reframe',
    response: `Entendo completamente. É muito dinheiro e você quer ter certeza de que está fazendo a escolha certa para sua família.

Me conta: quando você imagina sua família nesse novo lar daqui a 5 anos, o que você vê?

Porque o que você está comprando não é só um apartamento - é esse futuro. E esse futuro, quando é o certo, não tem preço.`,
  },

  /**
   * LOCALIZAÇÃO
   * O que dizem: "É longe do trabalho", "Não conheço o bairro"
   * O que sentem: Medo de perder o conforto atual
   * O que precisam: Sentir que pertencem ao novo lugar
   */
  localizacao: {
    underlyingFear: 'perda_de_conforto',
    psychologicalNeed: 'belonging',
    approach: 'explore_values',
    response: `Faz todo sentido essa preocupação. Mudar de lugar é deixar para trás o que conhecemos.

Me ajuda a entender: o que faz um lugar se tornar "seu lugar"? O que você mais valoriza no dia a dia - a praticidade ou a qualidade de vida?

Às vezes a gente descobre que o que parecia longe na verdade é exatamente onde a gente deveria estar.`,
  },

  /**
   * TAMANHO
   * O que dizem: "É pequeno", "Precisava de mais um quarto"
   * O que sentem: Medo de não ser suficiente
   * O que precisam: Redefinir o que significa sucesso
   */
  tamanho: {
    underlyingFear: 'nao_ser_suficiente',
    psychologicalNeed: 'achievement',
    approach: 'redefine_success',
    response: `Entendo essa preocupação. A gente sempre quer dar o melhor para a família.

Deixa eu te perguntar: o que vocês realmente fazem juntos no dia a dia? Onde acontecem os momentos mais importantes?

Porque lar não se mede em metros quadrados - se mede em memórias. E às vezes um espaço menor é onde a família fica mais unida.`,
  },

  /**
   * PRAZO
   * O que dizem: "Preciso de mais tempo", "Não posso decidir agora"
   * O que sentem: Medo de perder o controle da situação
   * O que precisam: Sentir que têm autonomia na decisão
   */
  prazo: {
    underlyingFear: 'perda_de_controle',
    psychologicalNeed: 'autonomy',
    approach: 'give_control',
    response: `Claro, tempo é importante em uma decisão assim. E essa decisão é sua, no seu ritmo.

Me conta: o que te ajudaria a se sentir mais seguro para decidir? O que você ainda precisa saber ou ver?

Estou aqui para te ajudar a ter clareza, não para te pressionar. Quando você sentir que é o momento certo, você vai saber.`,
  },

  /**
   * INCERTEZA
   * O que dizem: "Não sei se é o momento", "Preciso pensar mais"
   * O que sentem: Medo de errar, de tomar a decisão errada
   * O que precisam: Reduzir a percepção de risco
   */
  incerteza: {
    underlyingFear: 'medo_de_errar',
    psychologicalNeed: 'security',
    approach: 'reduce_risk_perception',
    response: `É natural ter dúvidas em uma decisão tão importante. Mostra que você leva isso a sério.

O que te deixaria mais tranquilo? Às vezes ajuda pensar assim: daqui a um ano, olhando para trás, o que você se arrependeria mais - de ter tentado ou de não ter tentado?

Não existe decisão perfeita, mas existe a decisão certa para você neste momento.`,
  },

  /**
   * FINANCIAMENTO
   * O que dizem: "Não sei se consigo financiar", "Tenho medo de me endividar"
   * O que sentem: Medo de comprometer o futuro financeiro
   * O que precisam: Segurança de que conseguem assumir
   */
  financiamento: {
    underlyingFear: 'comprometer_futuro',
    psychologicalNeed: 'security',
    approach: 'validate_then_reframe',
    response: `Essa preocupação mostra responsabilidade. É importante entrar em algo assim com os pés no chão.

Me conta: você já fez as contas de quanto paga de aluguel por mês? E quanto disso volta para você no final?

Financiamento assusta, mas pense assim: cada parcela é um pedaço do seu futuro que você está construindo, não uma dívida - é um investimento em você mesmo.`,
  },

  /**
   * CONCORRÊNCIA
   * O que dizem: "Vou ver outras opções", "Tem um mais barato ali"
   * O que sentem: Medo de perder uma oportunidade melhor
   * O que precisam: Sentir que estão fazendo a melhor escolha
   */
  concorrencia: {
    underlyingFear: 'perder_oportunidade',
    psychologicalNeed: 'achievement',
    approach: 'validate_then_reframe',
    response: `Faz muito bem em pesquisar. Uma decisão assim merece ser bem pensada.

Só quero te deixar uma reflexão: quando você visitou outros lugares, o que sentiu? Aquela sensação de "é aqui" apareceu em algum momento?

Porque no final, não é sobre encontrar o mais barato ou o maior - é sobre encontrar o certo. E quando é o certo, a gente sente.`,
  },
};

/**
 * Palavras-chave para detecção de cada tipo de objeção
 */
const OBJECTION_KEYWORDS: Record<ObjectionType, string[]> = {
  preco: [
    'caro', 'preço', 'valor', 'custo', 'dinheiro', 'orçamento',
    'não tenho', 'não posso pagar', 'muito alto', 'investimento alto',
    'pesado', 'puxado', 'acima do meu', 'fora da minha realidade',
  ],
  localizacao: [
    'longe', 'distante', 'localização', 'bairro', 'região',
    'não conheço', 'zona', 'acesso', 'transporte', 'trânsito',
    'isolado', 'trabalho longe', 'escola longe',
  ],
  tamanho: [
    'pequeno', 'apertado', 'tamanho', 'metros', 'espaço',
    'quarto', 'cômodo', 'área', 'metragem', 'maior',
    'não cabe', 'família grande', 'precisava de mais',
  ],
  prazo: [
    'tempo', 'pressa', 'agora não', 'depois', 'pensar',
    'calma', 'devagar', 'momento', 'ainda não', 'esperar',
    'não estou pronto', 'preciso de mais tempo',
  ],
  incerteza: [
    'não sei', 'dúvida', 'incerto', 'talvez', 'será que',
    'não tenho certeza', 'preciso pensar', 'vou refletir',
    'não sei se', 'será o certo', 'medo de errar',
  ],
  financiamento: [
    'financ', 'parcela', 'entrada', 'banco', 'crédito',
    'aprovação', 'score', 'endividar', 'dívida', 'comprometer',
    'renda', 'comprovante', 'juros',
  ],
  concorrencia: [
    'outr', 'ver mais', 'pesquisar', 'comparar', 'concorr',
    'alternativa', 'opção', 'mais barato', 'melhor negócio',
    'lançamento', 'vizinho', 'ao lado',
  ],
};

/**
 * Detecta o tipo de objeção baseado no texto do usuário
 *
 * @param text - Texto da mensagem do usuário
 * @returns Tipo de objeção detectada ou null se não for uma objeção
 */
export function detectObjectionType(text: string): ObjectionType | null {
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Pontuação para cada tipo de objeção
  const scores: Record<ObjectionType, number> = {
    preco: 0,
    localizacao: 0,
    tamanho: 0,
    prazo: 0,
    incerteza: 0,
    financiamento: 0,
    concorrencia: 0,
  };

  // Calcula pontuação baseada em keywords encontradas
  for (const [objectionType, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedText.includes(normalizedKeyword)) {
        scores[objectionType as ObjectionType] += 1;
      }
    }
  }

  // Encontra o tipo com maior pontuação
  let maxScore = 0;
  let detectedType: ObjectionType | null = null;

  for (const [objectionType, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = objectionType as ObjectionType;
    }
  }

  // Retorna null se nenhuma keyword foi encontrada
  return maxScore > 0 ? detectedType : null;
}

/**
 * Obtém o reframe psicológico para uma objeção
 *
 * @param objectionType - Tipo de objeção (pode ser detectado ou passado diretamente)
 * @param text - Texto original da objeção (opcional, para detecção automática)
 * @returns Objeto com o reframe ou null se não encontrado
 */
export function getObjectionReframe(
  objectionType?: ObjectionType | null,
  text?: string
): ObjectionReframe | null {
  // Se não foi passado tipo, tenta detectar do texto
  const type = objectionType ?? (text ? detectObjectionType(text) : null);

  if (!type) {
    return null;
  }

  return PSYCHOLOGICAL_OBJECTION_REFRAMES[type] || null;
}

/**
 * Analisa uma objeção e retorna insights psicológicos
 *
 * @param text - Texto da objeção do usuário
 * @returns Análise completa da objeção ou null
 */
export function analyzeObjection(text: string): {
  type: ObjectionType;
  reframe: ObjectionReframe;
  insight: string;
} | null {
  const type = detectObjectionType(text);

  if (!type) {
    return null;
  }

  const reframe = PSYCHOLOGICAL_OBJECTION_REFRAMES[type];

  // Gera insight sobre o que realmente está acontecendo
  const insightMap: Record<ObjectionType, string> = {
    preco: 'O cliente não está questionando o valor - está buscando validação de que fará a escolha certa.',
    localizacao: 'O cliente tem medo de perder suas referências - precisa visualizar uma nova rotina.',
    tamanho: 'O cliente quer dar o melhor para a família - ajude-o a ver que "melhor" não é sempre "maior".',
    prazo: 'O cliente sente que está perdendo controle - devolva a autonomia a ele.',
    incerteza: 'O cliente tem medo de errar - reduza o risco percebido, não a dúvida.',
    financiamento: 'O cliente tem medo do compromisso financeiro - mostre que é investimento, não dívida.',
    concorrencia: 'O cliente tem FOMO (fear of missing out) - ajude-o a confiar na intuição.',
  };

  return {
    type,
    reframe,
    insight: insightMap[type],
  };
}

/**
 * Verifica se um texto contém sinais de objeção
 *
 * @param text - Texto a ser verificado
 * @returns true se contém sinais de objeção
 */
export function hasObjectionSignals(text: string): boolean {
  return detectObjectionType(text) !== null;
}

/**
 * Obtém a necessidade psicológica primária de uma objeção
 *
 * @param objectionType - Tipo de objeção
 * @returns Necessidade primária ou null
 */
export function getUnderlyingNeed(objectionType: ObjectionType): PrimaryMotivation | null {
  const reframe = PSYCHOLOGICAL_OBJECTION_REFRAMES[objectionType];
  return reframe?.psychologicalNeed ?? null;
}
