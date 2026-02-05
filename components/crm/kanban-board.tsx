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
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { KanbanStage, KanbanLead } from "./types";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { AddLeadDialog } from "./add-lead-dialog";
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
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

    if (isActiveALead && isOverALead) {
      setLeads((prevLeads) => {
        const activeIndex = prevLeads.findIndex((l) => l.id === activeId);
        const overIndex = prevLeads.findIndex((l) => l.id === overId);

        if (prevLeads[activeIndex].stage_id !== prevLeads[overIndex].stage_id) {
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

    if (isActiveALead && isOverAColumn) {
      setLeads((prevLeads) => {
        const activeIndex = prevLeads.findIndex((l) => l.id === activeId);
        if (prevLeads[activeIndex].stage_id !== overId) {
            const updatedLeads = prevLeads.map((lead, idx) =>
              idx === activeIndex
                ? { ...lead, stage_id: String(overId) }
                : lead
            );
            return arrayMove(updatedLeads, activeIndex, activeIndex);
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
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage_id: newStageId! } : l));

             try {
                 await fetch('/api/crm/pipeline/move', {
                     method: 'POST',
                     body: JSON.stringify({ leadId: lead.id, stageId: newStageId })
                 });
                 toast.success("Lead movido com sucesso");
             } catch (error) {
                 toast.error("Erro ao mover lead");
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
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full gap-3 overflow-x-auto pb-4 items-start">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leads.filter((l) => l.stage_id === stage.id)}
              onCardClick={handleCardClick}
              onAddLead={() => setIsAddDialogOpen(true)}
            />
          ))}
        </div>

        {typeof document !== "undefined" && createPortal(
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

      <AddLeadDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onLeadCreated={onRefresh}
      />
    </>
  );
}
