"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanLead, JOURNEY_STEPS, getJourneyProgress } from "./types";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CalendarClock,
  DollarSign,
  Flame,
  Phone,
  Snowflake,
  Sun,
  User,
  FileCheck,
  BookmarkCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  lead: KanbanLead;
  onClick?: () => void;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function formatCompactCurrency(value: number): string {
  if (!value || !isFinite(value)) return "";
  if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}K`;
  return `R$${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

const temperatureConfig = {
  hot: {
    border: "border-l-orange-500",
    icon: <Flame className="h-3 w-3 text-orange-500" />,
    label: "Quente",
  },
  warm: {
    border: "border-l-amber-400",
    icon: <Sun className="h-3 w-3 text-amber-500" />,
    label: "Morno",
  },
  cold: {
    border: "border-l-blue-400",
    icon: <Snowflake className="h-3 w-3 text-blue-400" />,
    label: "Frio",
  },
} as const;

export function KanbanCard({ lead, onClick }: KanbanCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: "Lead", lead },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 bg-primary/5 h-[140px] rounded-lg border-2 border-dashed border-primary/40"
      />
    );
  }

  const temp = lead.temperature ? temperatureConfig[lead.temperature] : null;
  const journeyStep = getJourneyProgress(lead.stage_id);
  const totalSteps = JOURNEY_STEPS.length;
  const valorFormatted = formatCompactCurrency(lead.valor_negocio || 0);
  const hasSimulacao = (lead.simulacoes || 0) > 0;
  const hasReserva = (lead.reservas || 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group cursor-grab active:cursor-grabbing",
        "bg-card hover:bg-accent/50 dark:bg-card/90 dark:hover:bg-accent/30",
        "rounded-lg border border-border/60 hover:border-border",
        "border-l-[3px]",
        temp?.border || "border-l-border",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200 hover:-translate-y-0.5",
        "p-3 space-y-2"
      )}
    >
      {/* Row 1: Avatar + Name + Temp */}
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-primary">
            {getInitials(lead.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate" title={lead.name}>
            {lead.name}
          </p>
          {lead.corretor_nome && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <User className="h-2.5 w-2.5 shrink-0" />
              {lead.corretor_nome}
            </p>
          )}
        </div>
        {temp && (
          <div className="shrink-0 mt-0.5" title={temp.label}>
            {temp.icon}
          </div>
        )}
      </div>

      {/* Row 2: Empreendimento + Value */}
      <div className="flex items-center justify-between gap-2">
        {lead.empreendimento ? (
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Building2 className="h-3 w-3 text-emerald-500 shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">{lead.empreendimento}</span>
          </div>
        ) : (
          <div />
        )}
        {valorFormatted && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            {valorFormatted}
          </span>
        )}
      </div>

      {/* Row 3: Journey progress dots */}
      <div className="flex items-center gap-0.5">
        {JOURNEY_STEPS.map((step, i) => {
          const isCompleted = step.position <= journeyStep;
          const isCurrent = step.position === journeyStep;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-all",
                  isCompleted
                    ? isCurrent
                      ? "bg-primary"
                      : "bg-primary/50"
                    : "bg-muted/40"
                )}
                title={step.label}
              />
            </div>
          );
        })}
      </div>

      {/* Row 4: Bottom - badges + date */}
      <div className="flex items-center justify-between pt-0.5 border-t border-border/40">
        <div className="flex items-center gap-1">
          {hasSimulacao && (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
              title={`${lead.simulacoes} simulação(ões)`}
            >
              <FileCheck className="h-2.5 w-2.5" />
              Sim
            </span>
          )}
          {hasReserva && (
            <span
              className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
              title={`${lead.reservas} reserva(s)`}
            >
              <BookmarkCheck className="h-2.5 w-2.5" />
              Res
            </span>
          )}
          {lead.score !== undefined && lead.score > 0 && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] h-4 px-1 font-semibold",
                lead.score > 80
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : lead.score > 50
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {lead.score}pts
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <CalendarClock className="h-2.5 w-2.5" />
          {lead.last_interaction_at
            ? formatDistanceToNow(new Date(lead.last_interaction_at), {
                locale: ptBR,
                addSuffix: true,
              })
            : "Novo"}
        </div>
      </div>
    </div>
  );
}
