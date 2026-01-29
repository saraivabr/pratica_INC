"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  Search,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Calendar,
  Building2,
  User,
  Flame,
  Thermometer,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  count: number;
  totalValor: number;
  isWonStage?: boolean;
  isLostStage?: boolean;
}

interface PipelineLead {
  id: string;
  stage_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  score: number;
  temperature: "cold" | "warm" | "hot";
  valor_negocio: number;
  created_at: string;
  last_interaction_at: string | null;
  situacao: string | null;
  corretor: string | null;
  corretor_id: number | null;
  empreendimento: string | null;
  tags: string[];
}

interface PipelineStats {
  totalLeads: number;
  totalValor: number;
  vendasRealizadas: number;
  perdidos: number;
  conversionRate: number;
  emAndamento: number;
}

const formatCurrency = (value: number) => {
  // Garantir que o valor é um número válido
  if (!value || !isFinite(value) || isNaN(value)) return "R$ 0";

  if (value >= 1000000000) return `R$ ${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

const TemperatureIcon = ({ temp }: { temp: "cold" | "warm" | "hot" }) => {
  if (temp === "hot") return <Flame className="h-3 w-3 text-red-500" />;
  if (temp === "warm") return <Thermometer className="h-3 w-3 text-orange-500" />;
  return <Snowflake className="h-3 w-3 text-blue-500" />;
};

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/pipeline-cvcrm?limit=1000");
      if (res.ok) {
        const data = await res.json();
        setStages(data.stages || []);
        setLeads(data.leads || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Error fetching pipeline:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  // Filtrar leads por busca
  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const searchLower = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(searchLower) ||
        l.email?.toLowerCase().includes(searchLower) ||
        l.phone?.includes(search) ||
        l.corretor?.toLowerCase().includes(searchLower) ||
        l.empreendimento?.toLowerCase().includes(searchLower)
    );
  }, [leads, search]);

  // Agrupar leads filtrados por stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, PipelineLead[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = filteredLeads.filter((l) => l.stage_id === stage.id);
    });
    return grouped;
  }, [filteredLeads, stages]);

  const handleScroll = (direction: "left" | "right") => {
    const container = document.getElementById("pipeline-container");
    if (container) {
      const scrollAmount = 350;
      const newPosition =
        direction === "left"
          ? Math.max(0, scrollPosition - scrollAmount)
          : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  // Filtrar stages para não mostrar os que não têm leads (opcional)
  const visibleStages = stages.filter((s) => !s.isLostStage); // Esconder "Perdido" do kanban principal
  const lostStage = stages.find((s) => s.isLostStage);

  return (
    <AppShell title="Pipeline de Vendas">
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Header com Stats */}
        <div className="px-4 sm:px-6 py-4 border-b bg-background/80 backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pipeline CV CRM</h1>
              <p className="text-sm text-muted-foreground">
                Funil de vendas em tempo real • {stats?.totalLeads || 0} leads
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lead, corretor..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchPipeline} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Total Leads</span>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{stats.totalLeads}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-xs text-muted-foreground">Valor Total</span>
                  </div>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(stats.totalValor)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">Vendas</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">{stats.vendasRealizadas}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Em Andamento</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600">{stats.emAndamento}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-muted-foreground">Perdidos</span>
                  </div>
                  <p className="text-xl font-bold text-red-600">{stats.perdidos}</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                    <span className="text-xs text-muted-foreground">Conversão</span>
                  </div>
                  <p className="text-xl font-bold text-teal-600">{stats.conversionRate}%</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Pipeline Board */}
        <div className="flex-1 relative overflow-hidden">
          {/* Scroll buttons */}
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            id="pipeline-container"
            className="h-full overflow-x-auto overflow-y-hidden p-4 sm:p-6"
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
          >
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex gap-4 h-full pb-4" style={{ minWidth: "max-content" }}>
                {visibleStages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex-shrink-0 w-[300px] flex flex-col bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                  >
                    {/* Stage Header */}
                    <div
                      className="p-3 rounded-t-xl border-b-2"
                      style={{ borderColor: stage.color }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate" style={{ color: stage.color }}>
                          {stage.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {leadsByStage[stage.id]?.length || 0}
                        </Badge>
                      </div>
                      {stage.totalValor > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(stage.totalValor)}
                        </p>
                      )}
                    </div>

                    {/* Leads */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {(leadsByStage[stage.id] || []).slice(0, 50).map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer group"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-sm truncate flex-1">{lead.name}</p>
                            <div className="flex items-center gap-1 ml-2">
                              <TemperatureIcon temp={lead.temperature} />
                              {lead.score > 0 && (
                                <span className="text-xs text-muted-foreground">{lead.score}</span>
                              )}
                            </div>
                          </div>

                          {lead.empreendimento && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">{lead.empreendimento}</span>
                            </div>
                          )}

                          {lead.corretor && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{lead.corretor}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(lead.created_at)}
                            </span>
                            {lead.valor_negocio > 0 && (
                              <span className="text-xs font-medium text-emerald-600">
                                {formatCurrency(lead.valor_negocio)}
                              </span>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver detalhes
                          </Button>
                        </div>
                      ))}

                      {(leadsByStage[stage.id]?.length || 0) > 50 && (
                        <p className="text-xs text-center text-muted-foreground py-2">
                          + {(leadsByStage[stage.id]?.length || 0) - 50} leads
                        </p>
                      )}

                      {(leadsByStage[stage.id]?.length || 0) === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">Nenhum lead</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Lost Stage (separado) */}
                {lostStage && (
                  <div className="flex-shrink-0 w-[300px] flex flex-col bg-red-50/50 dark:bg-red-950/20 rounded-xl opacity-75">
                    <div
                      className="p-3 rounded-t-xl border-b-2"
                      style={{ borderColor: lostStage.color }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm" style={{ color: lostStage.color }}>
                          {lostStage.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                          {leadsByStage[lostStage.id]?.length || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[300px]">
                      {(leadsByStage[lostStage.id] || []).slice(0, 20).map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-2 text-xs cursor-pointer hover:bg-white dark:hover:bg-gray-800"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <p className="font-medium truncate">{lead.name}</p>
                          <p className="text-muted-foreground truncate">{lead.corretor || "Sem corretor"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white font-bold">
                {selectedLead?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p>{selectedLead?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">{selectedLead?.situacao}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Temperatura</p>
                  <div className="flex items-center gap-2">
                    <TemperatureIcon temp={selectedLead.temperature} />
                    <span className="font-medium capitalize">{selectedLead.temperature === "hot" ? "Quente" : selectedLead.temperature === "warm" ? "Morno" : "Frio"}</span>
                    {selectedLead.score > 0 && (
                      <Badge variant="secondary">Score: {selectedLead.score}</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Valor do Negócio</p>
                  <p className="font-bold text-emerald-600 text-lg">
                    {selectedLead.valor_negocio > 0 ? formatCurrency(selectedLead.valor_negocio) : "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                {selectedLead.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedLead.phone}`} className="text-blue-600 hover:underline">
                      {selectedLead.phone}
                    </a>
                  </div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:underline truncate">
                      {selectedLead.email}
                    </a>
                  </div>
                )}
                {selectedLead.empreendimento && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.empreendimento}</span>
                  </div>
                )}
                {selectedLead.corretor && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.corretor}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Cadastro: {formatDate(selectedLead.created_at)}</span>
                </div>
                {selectedLead.last_interaction_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Última interação: {formatDate(selectedLead.last_interaction_at)}</span>
                  </div>
                )}
              </div>

              {selectedLead.source && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Origem</p>
                  <Badge variant="outline">{selectedLead.source}</Badge>
                </div>
              )}

              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`https://wa.me/55${selectedLead.phone?.replace(/\D/g, "")}`} target="_blank">
                    WhatsApp
                  </a>
                </Button>
                <Button variant="default" className="flex-1">
                  Ver no CV CRM
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
