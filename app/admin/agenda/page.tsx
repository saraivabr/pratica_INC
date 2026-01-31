"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  Plus,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Video,
  User,
  MessageSquare,
  Trash2
} from "lucide-react";
import { format, isSameDay, startOfToday, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActivities } from "@/lib/hooks";

export default function AgendaPage() {
  const { activities, loading, createActivity, completeActivity, deleteActivity, refetch } = useActivities();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("follow_up");
  const [priority, setPriority] = useState("medium");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const filteredActivities = activities.filter((a) =>
    isSameDay(new Date(a.scheduled_at), selectedDate)
  );

  const handleCreate = async () => {
    if (!title || !scheduledDate || !scheduledTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setCreating(true);
    try {
      const scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      await createActivity({
        title,
        description,
        activity_type: activityType,
        priority,
        scheduled_at
      });
      toast.success("Atividade criada com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erro ao criar atividade");
    } finally {
      setCreating(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeActivity(id);
      toast.success("Atividade concluída!");
    } catch (error) {
      toast.error("Erro ao concluir atividade");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteActivity(id);
      toast.success("Atividade removida!");
    } catch (error) {
      toast.error("Erro ao remover atividade");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setActivityType("follow_up");
    setPriority("medium");
    setScheduledDate("");
    setScheduledTime("");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "visita": return <MapPin className="h-4 w-4 text-emerald-500" />;
      case "reuniao": return <Video className="h-4 w-4 text-blue-500" />;
      case "ligacao": return <Phone className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-600";
      case "medium": return "bg-orange-500/10 text-orange-600";
      default: return "bg-blue-500/10 text-blue-600";
    }
  };

  return (
    <AppShell title="Agenda Inteligente">
      <div className="container px-4 py-6 space-y-6 animate-page-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie suas visitas e compromissos comerciais
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Atividade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Ex: Visita ao apartamento 301"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Detalhes da atividade..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visita">Visita</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Horário *</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Picker Strip */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{format(selectedDate, "MMMM yyyy", { locale: ptBR })}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(subDays(selectedDate, 7))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = addDays(subDays(selectedDate, 3), i);
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, startOfToday());
                    const hasActivity = activities.some(a => isSameDay(new Date(a.scheduled_at), date));

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-xl transition relative",
                          isSelected ? "bg-primary text-primary-foreground shadow-lg scale-110 z-10" : "hover:bg-accent",
                          isToday && !isSelected && "border border-primary/30"
                        )}
                      >
                        <span className="text-xs">{format(date, "d")}</span>
                        {hasActivity && !isSelected && (
                          <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Compromissos Hoje</p>
                    <p className="text-xl font-bold">{activities.filter(a => isSameDay(new Date(a.scheduled_at), startOfToday())).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                {isSameDay(selectedDate, startOfToday()) ? "Hoje" : format(selectedDate, "PPPP", { locale: ptBR })}
                <Badge variant="outline" className="ml-2">{filteredActivities.length}</Badge>
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl">
                <CalendarIcon className="h-12 w-12 mb-3 opacity-20" />
                <p>Nenhum compromisso para este dia.</p>
                <Button variant="link" className="text-primary mt-2" onClick={() => setIsDialogOpen(true)}>Agendar agora</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <Card key={activity.id} className="group border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-card/80 backdrop-blur">
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1.5",
                      activity.priority === 'high' ? "bg-red-500" : activity.priority === 'medium' ? "bg-orange-500" : "bg-blue-500",
                      activity.status === 'completed' && "bg-green-500"
                    )} />
                    <CardContent className="p-4 pl-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="text-center min-w-[50px]">
                            <p className="text-lg font-bold leading-none">{format(new Date(activity.scheduled_at), "HH:mm")}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Horário</p>
                          </div>
                          <Separator orientation="vertical" className="h-10" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(activity.activity_type)}
                              <h3 className={cn("font-bold", activity.status === 'completed' && "line-through text-muted-foreground")}>{activity.title}</h3>
                              {activity.status === 'completed' && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none h-5 text-[10px]">Concluído</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {activity.lead_name && (
                                <>
                                  <User className="h-3.5 w-3.5" />
                                  <span>{activity.lead_name}</span>
                                </>
                              )}
                              <Badge variant="secondary" className={cn("text-[10px] h-4 px-1 border-none", getPriorityColor(activity.priority))}>
                                {activity.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {activity.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition"
                              onClick={() => handleComplete(activity.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition"
                            onClick={() => handleDelete(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {activity.description && (
                        <div className="mt-3 p-2 bg-secondary/30 rounded-lg text-xs text-muted-foreground italic">
                          &quot;{activity.description}&quot;
                        </div>
                      )}

                      {activity.lead_phone && (
                        <div className="mt-4 flex items-center gap-3">
                          <Button variant="secondary" size="sm" className="h-8 text-[10px] gap-2">
                            <Phone className="h-3 w-3" /> Ligar
                          </Button>
                          <Button variant="secondary" size="sm" className="h-8 text-[10px] gap-2">
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </Button>
                          <div className="flex-1" />
                          <Button variant="ghost" size="sm" className="h-8 text-[10px] text-primary hover:bg-primary/5">
                            Ver Detalhes do Lead <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) {
  return (
    <div className={cn(
      "bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )} />
  );
}
