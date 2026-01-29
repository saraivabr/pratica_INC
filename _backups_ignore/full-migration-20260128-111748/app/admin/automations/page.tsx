"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Plus,
  Clock,
  ArrowRight,
  Loader2,
  MessageSquare,
  Bell,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useAutomations, usePipeline } from "@/lib/hooks";

export default function AutomationsPage() {
  const { automations, loading, createAutomation, toggleAutomation, deleteAutomation } = useAutomations();
  const { stages } = usePipeline();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("new_lead");
  const [actionType, setActionType] = useState("notify_user");
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    if (!name) {
      toast.error("Preencha o nome da regra");
      return;
    }

    setCreating(true);
    try {
      await createAutomation({
        name,
        trigger_type: triggerType,
        trigger_config: {},
        action_type: actionType,
        action_config: { message }
      });

      toast.success("Automação criada!");
      setIsDialogOpen(false);
      setName("");
      setMessage("");
    } catch (error) {
      toast.error("Erro ao criar automação");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleAutomation(id, !currentActive);
      toast.success(currentActive ? "Automação pausada" : "Automação ativada");
    } catch (error) {
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAutomation(id);
      toast.success("Automação removida!");
    } catch (error) {
      toast.error("Erro ao remover automação");
    }
  };

  const getTriggerIcon = (type: string) => {
    switch(type) {
      case "idle_in_stage": return <Clock className="h-4 w-4 text-orange-500" />;
      case "new_lead": return <Zap className="h-4 w-4 text-yellow-500" />;
      default: return <ArrowRight className="h-4 w-4 text-blue-500" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch(type) {
      case "send_whatsapp": return <MessageSquare className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-purple-500" />;
    }
  };

  const getTriggerLabel = (type: string) => {
    switch(type) {
      case "idle_in_stage": return "Lead parado";
      case "new_lead": return "Novo lead";
      case "stage_changed": return "Mudou de etapa";
      default: return type;
    }
  };

  const getActionLabel = (type: string) => {
    switch(type) {
      case "send_whatsapp": return "Enviar WhatsApp";
      case "notify_user": return "Notificar corretor";
      case "move_stage": return "Mover etapa";
      default: return type;
    }
  };

  return (
    <AppShell title="Automações">
      <div className="container px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
            <p className="text-muted-foreground">
              Configure regras para rodar seu comercial no piloto automático
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Automação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Regra</Label>
                  <Input
                    placeholder="Ex: Boas-vindas Lead Novo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Quando...</Label>
                     <Select value={triggerType} onValueChange={setTriggerType}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="new_lead">Novo Lead Entrar</SelectItem>
                         <SelectItem value="idle_in_stage">Lead ficar parado</SelectItem>
                         <SelectItem value="stage_changed">Mudar de Etapa</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Então...</Label>
                     <Select value={actionType} onValueChange={setActionType}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="notify_user">Notificar Corretor</SelectItem>
                         <SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem / Configuração</Label>
                  <Input
                    placeholder="Mensagem ou configuração..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-semibold text-lg">Nenhuma automação criada</h3>
            <p className="text-muted-foreground mb-4">Crie regras para automatizar seu fluxo comercial.</p>
            <Button onClick={() => setIsDialogOpen(true)}>Criar Automação</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {automations.map((auto) => (
              <Card key={auto.id} className="flex items-center p-4 group">
                <div className="mr-4 p-3 bg-secondary rounded-full">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{auto.name}</h3>
                      {auto.is_active ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none h-5 text-[10px]">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground h-5 text-[10px]">Pausado</Badge>
                      )}
                   </div>
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded text-xs">
                         {getTriggerIcon(auto.trigger_type)}
                         {getTriggerLabel(auto.trigger_type)}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded text-xs">
                         {getActionIcon(auto.action_type)}
                         {getActionLabel(auto.action_type)}
                      </span>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleDelete(auto.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={auto.is_active}
                    onCheckedChange={() => handleToggle(auto.id, auto.is_active)}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
