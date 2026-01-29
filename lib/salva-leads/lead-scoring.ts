/**
 * Sistema de Scoring de Leads
 * 
 * Calcula automaticamente o score de qualificação de um lead
 * baseado em filtros, comportamento e dados
 */

export interface FiltrosParaScoreLead {
  quartos?: number;
  preco?: number;
  precoMin?: number;
  precoMax?: number;
  bairro?: string[];
  metragem?: number;
  amenidades?: string[];
  [key: string]: unknown;
}

/**
 * Calcula score do lead (0-10)
 * 
 * Score >= 7: Lead qualificado (hot lead)
 * Score 4-6: Lead morno
 * Score < 4: Lead frio
 */
export function calcularScoreLead(dados: {
  filtros: FiltrosParaScoreLead;
  nome?: string;
  whatsapp?: string;
  imovelPreco?: number;
  historico?: { mensagensEnviadas: number; visualizacoes: number };
}): number {
  let score = 0;

  // 1. Critério: Filtros bem definidos (máx 3 pontos)
  // Lead com critérios específicos é mais qualificado
  const criterios = Object.keys(dados.filtros).filter(
    (key) =>
      dados.filtros[key as keyof FiltrosParaScoreLead] !== undefined &&
      dados.filtros[key as keyof FiltrosParaScoreLead] !== null &&
      dados.filtros[key as keyof FiltrosParaScoreLead] !== ''
  ).length;

  if (criterios >= 4) score += 3;
  else if (criterios >= 2) score += 2;
  else if (criterios >= 1) score += 1;

  // 2. Critério: Preço específico (máx 2 pontos)
  const { preco, precoMax, precoMin } = dados.filtros;
  if (preco && dados.imovelPreco) {
    // Se especificou preço exato ou faixa
    if (Math.abs(dados.imovelPreco - preco) < dados.imovelPreco * 0.2) {
      score += 2; // Preço bate exatamente
    } else {
      score += 1; // Preço próximo
    }
  } else if ((precoMax || precoMin) && dados.imovelPreco) {
    // Se especificou faixa de preço
    const emFaixa =
      (!precoMin || dados.imovelPreco >= precoMin) &&
      (!precoMax || dados.imovelPreco <= precoMax);
    score += emFaixa ? 2 : 0;
  }

  // 3. Critério: Quartos definido (máx 1.5 pontos)
  if (dados.filtros.quartos) {
    score += 1.5;
  }

  // 4. Critério: Contato (máx 1.5 pontos)
  if (dados.whatsapp) {
    // WhatsApp válido é bom sinal
    const apenasNumeros = dados.whatsapp.replace(/\D/g, '');
    if (apenasNumeros.length === 11 || apenasNumeros.length === 12) {
      score += 1.5;
    } else {
      score += 0.5;
    }
  }

  if (dados.nome && dados.nome.trim().length > 2) {
    score += 0.5; // Nome bem preenchido
  }

  // 5. Critério: Histórico de engajamento (máx 1 ponto)
  if (dados.historico) {
    const { mensagensEnviadas = 0, visualizacoes = 0 } = dados.historico;
    const engajamento = mensagensEnviadas + visualizacoes;
    if (engajamento >= 5) {
      score += 1;
    } else if (engajamento >= 2) {
      score += 0.5;
    }
  }

  // Normalizar para 10 pontos
  const scoreNormalizado = Math.min(10, Math.max(0, score));

  return parseFloat(scoreNormalizado.toFixed(1));
}

/**
 * Verifica se lead é qualificado (score >= 7)
 */
export function calcularLeadQualificado(score: number): boolean {
  return score >= 7;
}

/**
 * Classifica lead por tier
 */
export function classificarLeadTier(score: number): 'quente' | 'morno' | 'frio' {
  if (score >= 7) return 'quente';
  if (score >= 4) return 'morno';
  return 'frio';
}

/**
 * Retorna ação recomendada baseada no score
 */
export function getAcaoRecomendada(
  score: number
): 'contatar_hoje' | 'contatar_semana' | 'nurture' {
  if (score >= 8) return 'contatar_hoje';
  if (score >= 6) return 'contatar_semana';
  return 'nurture';
}
