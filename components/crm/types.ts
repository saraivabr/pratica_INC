import { UniqueIdentifier } from "@dnd-kit/core";

export type KanbanStage = {
  id: string;
  name: string;
  color: string;
  position: number;
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
};
