"use client";

import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { KanbanStage, KanbanLead } from "./types";
import { KanbanCard } from "./kanban-card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
  stage: KanbanStage;
  leads: KanbanLead[];
  onCardClick?: (lead: KanbanLead) => void;
}

export function KanbanColumn({ stage, leads, onCardClick }: KanbanColumnProps) {
  const leadsIds = useMemo(() => leads.map((l) => l.id), [leads]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
    data: {
      type: "Column",
      stage,
    },
    disabled: true, // Disable dragging columns for now, focus on cards
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col h-full w-[280px] min-w-[280px] bg-muted/30 rounded-xl border border-border/50"
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: stage.color || "#2563EB" }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {leads.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 p-2 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-border">
        <SortableContext items={leadsIds}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onClick={() => onCardClick?.(lead)} />
          ))}
        </SortableContext>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-xs text-muted-foreground hover:text-primary gap-2 h-8">
            <Plus className="h-3 w-3" />
            Adicionar Lead
        </Button>
      </div>
    </div>
  );
}
