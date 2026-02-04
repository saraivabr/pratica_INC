"use client";

import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { KanbanStage, KanbanLead } from "./types";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LeadDetailModal } from "@/components/lead";

interface KanbanBoardProps {
  initialStages: KanbanStage[];
  initialLeads: KanbanLead[];
  onRefresh?: () => void;
}

export function KanbanBoard({ initialStages, initialLeads, onRefresh }: KanbanBoardProps) {
  const [stages, setStages] = useState<KanbanStage[]>(initialStages);
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
  const [activeLead, setActiveLead] = useState<KanbanLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<KanbanLead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // 10px movement to start drag
      },
    })
  );

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Lead") {
      setActiveLead(event.active.data.current.lead);
    }
  };

  const handleCardClick = (lead: KanbanLead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveALead = active.data.current?.type === "Lead";
    const isOverALead = over.data.current?.type === "Lead";
    const isOverAColumn = over.data.current?.type === "Column";

    if (!isActiveALead) return;

    // Dragging a lead over another lead
    if (isActiveALead && isOverALead) {
      setLeads((prevLeads) => {
        const activeIndex = prevLeads.findIndex((l) => l.id === activeId);
        const overIndex = prevLeads.findIndex((l) => l.id === overId);

        // If in different stages, update stage immediately for visual feedback
        if (prevLeads[activeIndex].stage_id !== prevLeads[overIndex].stage_id) {
            // Create immutable update - never mutate state directly
            const updatedLeads = prevLeads.map((lead, idx) =>
              idx === activeIndex
                ? { ...lead, stage_id: prevLeads[overIndex].stage_id }
                : lead
            );
            return arrayMove(updatedLeads, activeIndex, overIndex - 1);
        }

        return arrayMove(prevLeads, activeIndex, overIndex);
      });
    }

    // Dragging a lead over a column
    if (isActiveALead && isOverAColumn) {
      setLeads((prevLeads) => {
        const activeIndex = prevLeads.findIndex((l) => l.id === activeId);
        if (prevLeads[activeIndex].stage_id !== overId) {
            // Create immutable update - never mutate state directly
            const updatedLeads = prevLeads.map((lead, idx) =>
              idx === activeIndex
                ? { ...lead, stage_id: String(overId) }
                : lead
            );
            return arrayMove(updatedLeads, activeIndex, activeIndex); // Force re-render
        }
        return prevLeads;
      });
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isActiveALead = active.data.current?.type === "Lead";
    const isOverAColumn = over.data.current?.type === "Column";
    const isOverALead = over.data.current?.type === "Lead";

    if (isActiveALead) {
        const lead = leads.find(l => l.id === activeId);
        let newStageId = lead?.stage_id;

        if (isOverAColumn) {
            newStageId = String(overId);
        } else if (isOverALead) {
             const overLead = leads.find(l => l.id === overId);
             newStageId = overLead?.stage_id;
        }

        if (newStageId && lead && lead.stage_id !== newStageId) {
            // Optimistic update already happened in DragOver, but ensure consistency
             setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage_id: newStageId! } : l));
             
             // Persist to API
             try {
                 await fetch('/api/crm/pipeline/move', {
                     method: 'POST',
                     body: JSON.stringify({ leadId: lead.id, stageId: newStageId })
                 });
                 toast.success("Lead movido com sucesso");
             } catch (error) {
                 toast.error("Erro ao mover lead");
                 // Revert would go here
             }
        }
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leads.filter((l) => l.stage_id === stage.id)}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead && <KanbanCard lead={activeLead} />}
        </DragOverlay>,
        document.body
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onUpdate={onRefresh}
        />
      )}
    </DndContext>
  );
}
