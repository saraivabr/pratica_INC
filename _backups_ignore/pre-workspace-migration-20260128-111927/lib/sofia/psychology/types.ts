/**
 * Tipos Psicológicos da Sofia
 *
 * Por que pessoas compram imóveis?
 * Não é sobre metros quadrados - é sobre VIDA.
 */

/**
 * Necessidades de Maslow aplicadas a imóveis
 */
export interface HumanMotivations {
  security: number;           // Proteção da família, estabilidade, lar seguro
  achievement: number;        // Status, sucesso, qualidade de vida
  belonging: number;          // Comunidade, família, vizinhança, legado
  autonomy: number;           // Independência, controle, liberdade
  selfActualization: number;  // Sonho realizado, propósito, identidade
}

/**
 * Estilo de comunicação do usuário
 */
export interface CommunicationStyle {
  pace: 'rápido' | 'moderado' | 'reflexivo';
  formality: 'casual' | 'equilibrado' | 'formal';
  emotionalExpression: 'reservado' | 'moderado' | 'expressivo';
  decisionMaking: 'emocional' | 'racional' | 'equilibrado';
}

/**
 * Psicologia de compra do usuário
 */
export interface BuyingPsychology {
  riskProfile: 'conservador' | 'moderado' | 'arrojado';
  commitmentSpeed: 'lento' | 'normal' | 'rápido';
  objectionPatterns: string[];  // Medos/preocupações recorrentes
  trustSignals: string[];       // O que constrói confiança
}

/**
 * Estado emocional atual do usuário
 */
export interface CurrentEmotionalState {
  energy: 'baixa' | 'neutra' | 'alta';
  openness: 'fechado' | 'neutro' | 'aberto';
  urgency: 'sem_pressa' | 'normal' | 'urgente';
  frustration: number; // 0-10
}

/**
 * Estado emocional para integração com o classificador de intenções
 */
export interface EmotionalState {
  current: string;      // Emoção atual (entusiasmo, interesse, frustração, ansiedade, etc)
  intensity: number;    // Intensidade 0-1
  trend: 'improving' | 'stable' | 'declining';  // Tendência
}

/**
 * Perfil psicológico completo do usuário
 */
export interface PsychologicalProfile {
  // Motivações primárias (0-100)
  motivations: HumanMotivations;

  // Como essa pessoa se comunica
  communicationStyle: CommunicationStyle;

  // Padrões comportamentais
  buyingPsychology: BuyingPsychology;

  // Estado emocional atual
  currentEmotionalState: CurrentEmotionalState;
}

/**
 * Fase da conversa
 */
export type ConversationPhase =
  | 'descoberta'      // Construir rapport, entender necessidades
  | 'exploracao'      // Apresentar opções, ativar desejo
  | 'consideracao'    // Resolver objeções, reduzir fricção
  | 'decisao'         // Guiar para compromisso
  | 'pos_venda';      // Encantar, criar advogado da marca

/**
 * Motivação primária detectada
 */
export type PrimaryMotivation =
  | 'security'           // "Quero segurança para minha família"
  | 'achievement'        // "Quero algo de qualidade, bem localizado"
  | 'belonging'          // "Quero um lar, uma comunidade"
  | 'autonomy'           // "Quero sair do aluguel, ter o meu"
  | 'self_actualization'; // "É o sonho da minha vida"

/**
 * Emoção subjacente (além da superfície)
 */
export type UnderlyingEmotion =
  | 'medo'           // Medo de perder, de errar, de se arrepender
  | 'esperanca'      // Esperança de uma vida melhor
  | 'frustração'     // Frustrado com situação atual
  | 'entusiasmo'     // Animado com possibilidade
  | 'ansiedade'      // Preocupado com decisão grande
  | 'confianca'      // Seguro do que quer
  | 'duvida';        // Incerto, precisa de orientação

/**
 * Estratégia de conexão emocional
 */
export type ConnectionStrategy =
  | 'validar_sentimentos'     // Precisa se sentir ouvido
  | 'oferecer_seguranca'      // Precisa de certezas
  | 'inspirar_possibilidades' // Precisa ver o sonho
  | 'ser_direto_pratico'      // Quer eficiência
  | 'construir_confianca'     // Precisa de provas
  | 'criar_urgencia_suave';   // Precisa de empurrão gentil

/**
 * Resultado da análise psicológica
 */
export interface PsychologicalAnalysis {
  // Motivação dominante detectada
  primaryMotivation: PrimaryMotivation;

  // Emoção subjacente
  underlyingEmotion: UnderlyingEmotion;

  // Necessidade não-dita
  unspokenNeed: string;

  // Como conectar emocionalmente
  connectionStrategy: ConnectionStrategy;

  // Nível de rapport atual (0-10)
  rapportLevel: number;

  // Próximo passo emocional (não comercial)
  nextEmotionalStep: string;

  // Raciocínio da análise
  reasoning: string;
}

/**
 * Tipo de objeção do cliente
 */
export type ObjectionType =
  | 'preco'
  | 'localizacao'
  | 'tamanho'
  | 'prazo'
  | 'incerteza'
  | 'financiamento'
  | 'concorrencia';

/**
 * Configuração de reframe de objeção
 */
export interface ObjectionReframe {
  underlyingFear: string;
  psychologicalNeed: PrimaryMotivation;
  approach: 'validate_then_reframe' | 'explore_values' | 'redefine_success' | 'give_control' | 'reduce_risk_perception';
  response: string;
}

/**
 * Template de validação emocional
 */
export interface EmotionalValidationTemplates {
  medo: string;
  frustração: string;
  esperanca: string;
  ansiedade: string;
  duvida: string;
  entusiasmo: string;
  confianca: string;
}

/**
 * Perfil psicológico padrão (valores iniciais)
 */
export function createDefaultPsychologicalProfile(): PsychologicalProfile {
  return {
    motivations: {
      security: 50,
      achievement: 50,
      belonging: 50,
      autonomy: 50,
      selfActualization: 50,
    },
    communicationStyle: {
      pace: 'moderado',
      formality: 'equilibrado',
      emotionalExpression: 'moderado',
      decisionMaking: 'equilibrado',
    },
    buyingPsychology: {
      riskProfile: 'moderado',
      commitmentSpeed: 'normal',
      objectionPatterns: [],
      trustSignals: [],
    },
    currentEmotionalState: {
      energy: 'neutra',
      openness: 'neutro',
      urgency: 'normal',
      frustration: 0,
    },
  };
}

/**
 * Análise psicológica padrão
 */
export function createDefaultPsychologicalAnalysis(): PsychologicalAnalysis {
  return {
    primaryMotivation: 'belonging',
    underlyingEmotion: 'esperanca',
    unspokenNeed: 'Quer encontrar o lugar certo para sua história',
    connectionStrategy: 'validar_sentimentos',
    rapportLevel: 5,
    nextEmotionalStep: 'Mostrar interesse genuíno pela história do cliente',
    reasoning: 'Análise padrão inicial - precisa de mais contexto',
  };
}
