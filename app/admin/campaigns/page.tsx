"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  Plus, 
  Send, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Campaign = {
  id: string;
  name: string;
  message_template: string;
  status: "draft" | "scheduled" | "processing" | "completed";
  stats: { total: number; sent: number; replied: number };
  created_at: string;
};

type Stage = {
  id: string;
  name: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [targetStage, setTargetStage] = useState("");

  const fetchData = async () => {
    try {
      const [campRes, pipelineRes] = await Promise.all([
        fetch("/api/crm/campaigns"),
        fetch("/api/crm/pipeline"),
      ]);
      
      const campData = await campRes.json();
      const pipelineData = await pipelineRes.json();

      setCampaigns(campData);
      setStages(pipelineData.stages || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!name || !message || !targetStage) {
      toast.error("Preencha todos os campos");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message_template: message,
          segmentation_config: { stage_id: targetStage },
          scheduled_at: new Date().toISOString(), // Immediate
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Campanha criada com sucesso!");
      setIsDialogOpen(false);
      setName("");
      setMessage("");
      setTargetStage("");
      fetchData();
    } catch (error) {
      toast.error("Erro ao criar campanha");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">Concluída</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none">Enviando</Badge>;
      case "scheduled":
        return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-none">Agendada</Badge>;
      default:
        return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  return (
    <AppShell title="Campanhas">
      <div className="container px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campanhas de Disparo</h1>
            <p className="text-muted-foreground">
              Envie mensagens em massa para seus leads segmentados
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Campanha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input 
                    placeholder="Ex: Reativação Leads Frios" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Público Alvo (Etapa do Funil)</Label>
                  <Select value={targetStage} onValueChange={setTargetStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea 
                    placeholder="Olá {nome}, tudo bem? Tenho uma novidade..." 
                    className="h-32"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{nome}"} para personalizar com o nome do lead.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agendar Disparo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-semibold text-lg">Nenhuma campanha criada</h3>
            <p className="text-muted-foreground mb-4">Crie sua primeira campanha para engajar seus leads.</p>
            <Button onClick={() => setIsDialogOpen(true)}>Criar Campanha</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp) => (
              <Card key={camp.id} className="hover:shadow-md transition">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium line-clamp-1" title={camp.name}>
                    {camp.name}
                  </CardTitle>
                  {getStatusBadge(camp.status)}
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-4">
                    {camp.created_at && format(new Date(camp.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" /> Público
                      </span>
                      <span className="font-semibold">{camp.stats?.total || 0} leads</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Send className="h-4 w-4" /> Enviados
                      </span>
                      <span className="font-semibold">{camp.stats?.sent || 0}</span>
                    </div>
                    
                    <div className="pt-2">
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${((camp.stats?.sent || 0) / (camp.stats?.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
