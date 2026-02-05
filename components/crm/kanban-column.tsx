"use client";

import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { KanbanStage, KanbanLead } from "./types";
import { KanbanCard } from "./kanban-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Inbox, Plus } from "lucide-react";

interface KanbanColumnProps {
  stage: KanbanStage;
  leads: KanbanLead[];
  onCardClick?: (lead: KanbanLead) => void;
  onAddLead?: () => void;
}

function formatCompactValue(value: number): string {
  if (!value || !isFinite(value)) return "";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function KanbanColumn({ stage, leads, onCardClick, onAddLead }: KanbanColumnProps) {
  const leadsIds = useMemo(() => leads.map((l) => l.id), [leads]);

  const totalValor = useMemo(() => {
    return leads.reduce((sum, l) => {
      const val = l.valor_negocio || 0;
      return sum + (isFinite(val) ? val : 0);
    }, 0);
  }, [leads]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({
    id: stage.id,
    data: { type: "Column", stage },
    disabled: true,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const valorFormatted = formatCompactValue(totalValor);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col h-full w-[310px] min-w-[310px] bg-muted/20 dark:bg-muted/10 rounded-xl border border-border/40 overflow-hidden"
    >
      {/* Colored top bar */}
      <div
        className="h-1 w-full shrink-0"
        style={{ backgroundColor: stage.color || "#2563EB" }}
      />

      {/* Header */}
      <div className="px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background"
              style={{
                backgroundColor: stage.color || "#2563EB",
                boxShadow: `0 0 8px ${stage.color || "#2563EB"}40`,
              }}
            />
            <h3 className="font-semibold text-xs tracking-tight truncate max-w-[140px]" title={stage.name}>
              {stage.name}
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] h-5 min-w-[22px] px-1.5 font-bold tabular-nums"
            >
              {leads.length}
            </Badge>
          </div>
        </div>
        {/* Pipeline value */}
        {valorFormatted && (
          <div className="flex items-center gap-1 mt-1 ml-[18px]">
            <DollarSign className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              R$ {valorFormatted}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-2 pb-2 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-border/50">
        <SortableContext items={leadsIds}>
          {leads.length > 0 ? (
            leads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick?.(lead)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-xs font-medium">Nenhum lead</p>
            </div>
          )}
        </SortableContext>
      </div>

      {/* Footer */}
      {onAddLead && (
        <div className="px-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground hover:text-primary gap-1.5 h-8"
            onClick={onAddLead}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Lead
          </Button>
        </div>
      )}
    </div>
  );
}
