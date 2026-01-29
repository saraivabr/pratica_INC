/**
 * Tipos do modulo de eventos
 */

export interface Evento {
  id: string;
  tenant_id: number;
  nome: string;
  descricao?: string;
  data_hora: Date | string;
  local: string;
  lembrete_horas: number; // 1, 6, 12, 24, 48
  status: 'rascunho' | 'ativo' | 'finalizado' | 'cancelado';
  com_sofia: boolean; // Se true, Sofia responde automaticamente
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EventoConvidado {
  id: string;
  evento_id: string;
  tenant_id: number;
  nome: string;
  celular: string;
  origem: 'cvcrm' | 'importado';
  cvcrm_id?: number;
  status: ConvidadoStatus;
  convite_enviado_at?: Date | string;
  lembrete_enviado_at?: Date | string;
  confirmado_at?: Date | string;
  created_at: Date | string;
}

export type ConvidadoStatus = 'pendente' | 'confirmado' | 'recusado' | 'talvez';

/**
 * Contexto do evento passado para Sofia quando convidado responde
 */
export interface EventoContext {
  evento: Evento;
  convidado: EventoConvidado;
  isEventGuest: true;
}

/**
 * Resultado da deteccao de intencao de confirmacao
 */
export interface ConfirmacaoIntentResult {
  status: ConvidadoStatus | null;
  confidence: number;
  triggers: string[];
  needsFollowUp: boolean; // Se precisa perguntar algo mais
}

/**
 * Opcoes para geracao de mensagem
 */
export interface MessageGeneratorOptions {
  evento: Evento;
  convidadoNome: string;
  /** Seed para variacao deterministica (opcional, para testes) */
  seed?: number;
}

/**
 * Variacoes disponiveis para anti-spam
 */
export interface MessageVariations {
  saudacao: string;
  formatoData: string;
  formatoHora: string;
  estrutura: 'direta' | 'casual' | 'animada';
  usarEmojis: boolean;
  emojiAbertura?: string;
  emojiFechamento?: string;
}
