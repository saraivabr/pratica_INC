"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth-context";
import { AnimatedBackground } from "@/components/animated-background";

export default function CorretorAgendaPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { activities, loading, createActivity, completeActivity, deleteActivity } = useActivities();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("follow_up");
  const [priority, setPriority] = useState("medium");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Redirect non-authenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

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
    if (actionLoading) return;
    setActionLoading(id + "-complete");
    try {
      await completeActivity(id);
      toast.success("Atividade concluída!");
    } catch (error) {
      toast.error("Erro ao concluir atividade");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(id + "-delete");
    try {
      await deleteActivity(id);
      toast.success("Atividade removida!");
    } catch (error) {
      toast.error("Erro ao remover atividade");
    } finally {
      setActionLoading(null);
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
      case "high": return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "medium": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      default: return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AppShell title="Agenda">
      <div className="relative min-h-full">
        <AnimatedBackground />

        <div className="relative z-10 space-y-6 animate-fadeInUp">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Minha Agenda
              </h1>
              <p className="text-muted-foreground">
                Gerencie suas visitas e compromissos
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25">
                  <Plus className="h-4 w-4" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
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
                      className="bg-white/80 dark:bg-zinc-800/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      placeholder="Detalhes da atividade..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-white/80 dark:bg-zinc-800/80"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={activityType} onValueChange={setActivityType}>
                        <SelectTrigger className="bg-white/80 dark:bg-zinc-800/80">
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
                        <SelectTrigger className="bg-white/80 dark:bg-zinc-800/80">
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
                        className="bg-white/80 dark:bg-zinc-800/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horário *</Label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="bg-white/80 dark:bg-zinc-800/80"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-gradient-to-r from-emerald-500 to-green-500"
                  >
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
              <Card className="border-none shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl">
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
                            isSelected ? "bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg scale-110 z-10" : "hover:bg-accent",
                            isToday && !isSelected && "border border-emerald-500/30"
                          )}
                        >
                          <span className="text-xs">{format(date, "d")}</span>
                          {hasActivity && !isSelected && (
                            <div className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white shadow-lg">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Compromissos Hoje</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {activities.filter(a => isSameDay(new Date(a.scheduled_at), startOfToday())).length}
                      </p>
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
                  <Badge variant="outline" className="ml-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    {filteredActivities.length}
                  </Badge>
                </h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl bg-white/50 dark:bg-zinc-900/50">
                  <CalendarIcon className="h-12 w-12 mb-3 opacity-20" />
                  <p>Nenhum compromisso para este dia.</p>
                  <Button variant="link" className="text-emerald-600 dark:text-emerald-400 mt-2" onClick={() => setIsDialogOpen(true)}>
                    Agendar agora
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map((activity) => (
                    <Card key={activity.id} className="group border-none shadow-lg hover:shadow-xl transition-all overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
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
                            <div className="h-10 w-px bg-border" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(activity.activity_type)}
                                <h3 className={cn("font-bold", activity.status === 'completed' && "line-through text-muted-foreground")}>{activity.title}</h3>
                                {activity.status === 'completed' && (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-none h-5 text-[10px]">Concluído</Badge>
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
                                  {activity.priority === 'high' ? 'Alta' : activity.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activity.status !== 'completed' && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                                onClick={() => handleComplete(activity.id)}
                                disabled={actionLoading === activity.id + "-complete"}
                              >
                                {actionLoading === activity.id + "-complete" ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition"
                              onClick={() => handleDelete(activity.id)}
                              disabled={actionLoading === activity.id + "-delete"}
                            >
                              {actionLoading === activity.id + "-delete" ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
                            <Button variant="secondary" size="sm" className="h-8 text-[10px] gap-2 bg-green-500/10 text-green-600 hover:bg-green-500/20">
                              <MessageSquare className="h-3 w-3" /> WhatsApp
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
      </div>
    </AppShell>
  );
}
