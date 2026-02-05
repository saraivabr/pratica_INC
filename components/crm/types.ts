import { UniqueIdentifier } from "@dnd-kit/core";

export type KanbanStage = {
  id: string;
  name: string;
  color: string;
  position: number;
  totalValor?: number;
};

export type KanbanLead = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  stage_id: string;
  score?: number;
  temperature?: "cold" | "warm" | "hot";
  last_interaction_at?: string;
  tags?: string[];
  user_id?: string;
  corretor_nome?: string;
  empreendimento?: string;
  origem?: string;
  valor_negocio?: number;
  renda_familiar?: number;
  simulacoes?: number;
  reservas?: number;
  possibilidade_venda?: number;
};

// Journey steps for real estate pipeline
export const JOURNEY_STEPS = [
  { id: "aguardando_atendimento", label: "Novo", short: "N", position: 1 },
  { id: "em_atendimento", label: "Atendimento", short: "A", position: 2 },
  { id: "visita_agendada", label: "Visita", short: "V", position: 3 },
  { id: "simulacao", label: "Simulação", short: "S", position: 4 },
  { id: "analise_credito", label: "Crédito", short: "C", position: 5 },
  { id: "com_reserva", label: "Reserva", short: "R", position: 6 },
  { id: "venda_realizada", label: "Venda", short: "$", position: 7 },
] as const;

export function getJourneyProgress(stageId: string): number {
  const stageMap: Record<string, number> = {
    aguardando_atendimento: 1,
    aguardando_corretor: 1,
    em_atendimento: 2,
    visita_agendada: 3,
    visita_realizada: 3,
    simulacao: 4,
    analise_credito: 5,
    montagem_pasta: 5,
    com_reserva: 6,
    venda_realizada: 7,
  };
  return stageMap[stageId] || 1;
}
