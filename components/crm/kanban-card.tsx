"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { KanbanLead } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarClock, Phone, MoreHorizontal, Flame, Snowflake, Sun } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  lead: KanbanLead;
  onClick?: () => void;
}

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
    data: {
      type: "Lead",
      lead,
    },
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
        className="opacity-30 bg-primary/10 h-[150px] rounded-xl border-2 border-dashed border-primary"
      />
    );
  }

  const getTemperatureIcon = (temp?: string) => {
    switch (temp) {
      case "hot":
        return <Flame className="h-3 w-3 text-orange-500" />;
      case "cold":
        return <Snowflake className="h-3 w-3 text-blue-400" />;
      case "warm":
        return <Sun className="h-3 w-3 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-card/80 backdrop-blur-sm border-border/50 group"
    >
      <CardHeader className="p-3 pb-0 space-y-0">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-background/50">
            #{lead.id.slice(0, 4)}
          </Badge>
          {lead.score !== undefined && lead.score > 0 && (
            <Badge
              variant="secondary"
              className={`text-[10px] h-5 px-1.5 ${
                lead.score > 80 ? "bg-green-500/10 text-green-600" : "bg-primary/10"
              }`}
            >
              {lead.score} pts
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm line-clamp-1" title={lead.name}>
            {lead.name}
          </div>
          {getTemperatureIcon(lead.temperature)}
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
           {lead.phone && <Phone className="h-3 w-3" />}
           <span className="truncate">{lead.phone || "Sem telefone"}</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {lead.last_interaction_at
              ? formatDistanceToNow(new Date(lead.last_interaction_at), { locale: ptBR, addSuffix: true })
              : "Sem atividade"}
          </div>
          <Avatar className="h-5 w-5">
             <AvatarFallback className="text-[9px]">JD</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}
