'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  Tag,
  Workflow,
  Calendar,
  FileText,
  FolderOpen,
  Clock,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  Info,
  CheckCircle2,
  User,
  MapPin,
  Copy,
  ExternalLink,
  Star,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

interface LeadPanelProps {
  phone: string;
  userId: string;
  contactName?: string;
  onStageChange?: (newStage: string) => void;
  onAction?: (action: 'visit' | 'simulation' | 'docs') => void;
}

interface Lead {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  origem?: string;
  situacao?: {
    id?: number;
    nome?: string;
    cor?: string;
  };
  situacao_id?: number;
  corretor?: {
    id?: number;
    nome?: string;
  };
  corretor_id?: number;
  empreendimento?: {
    id?: number;
    nome?: string;
  };
  imobiliaria?: {
    id?: number;
    nome?: string;
  };
  score?: number;
  valor_negocio?: number;
  renda_familiar?: number;
  cidade?: string;
  estado?: string;
  bairro?: string;
  data_cadastro?: string;
  ultima_conversao?: string;
}

interface WhatsAppContact {
  id: number;
  phone_number: string;
  name?: string;
  profile_picture_url?: string;
  is_business?: boolean;
  is_group?: boolean;
  lead_id?: number;
  total_messages?: number;
  messages_received?: number;
  messages_sent?: number;
  last_message_at?: string;
  last_interaction_at?: string;
}

interface Interacao {
  id: string;
  cvcrm_id: number;
  tipo?: string;
  descricao?: string;
  data?: string;
  usuario?: string;
}

interface LeadDataResponse {
  source: 'cvcrm' | 'whatsapp' | 'both' | 'none';
  lead: Lead | null;
  whatsapp_contact: WhatsAppContact | null;
  pipeline_stage: string | null;
  interacoes: Interacao[];
  tags: string[];
}

// ============================================
// Pipeline Stages
// ============================================

const PIPELINE_STAGES = [
  { id: 'novo', name: 'Novo Lead', color: '#6366F1' },
  { id: 'contato_realizado', name: 'Contato Realizado', color: '#22C55E' },
  { id: 'qualificado', name: 'Qualificado', color: '#F59E0B' },
  { id: 'visita_agendada', name: 'Visita Agendada', color: '#3B82F6' },
  { id: 'proposta', name: 'Proposta Enviada', color: '#8B5CF6' },
  { id: 'negociacao', name: 'Em Negociacao', color: '#EC4899' },
  { id: 'fechado', name: 'Fechado', color: '#10B981' },
  { id: 'perdido', name: 'Perdido', color: '#EF4444' },
];

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTemperatureFromScore(score: number | null | undefined): 'hot' | 'warm' | 'cold' {
  if (!score) return 'cold';
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// ============================================
// Temperature Badge
// ============================================

function TemperatureBadge({
  temperature,
}: {
  temperature: 'hot' | 'warm' | 'cold';
}) {
  const config = {
    hot: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-200',
      Icon: Flame,
      label: 'Quente',
    },
    warm: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      Icon: Thermometer,
      label: 'Morno',
    },
    cold: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      Icon: Snowflake,
      label: 'Frio',
    },
  };

  const { bg, text, border, Icon, label } = config[temperature];

  return (
    <Badge
      variant="outline"
      className={cn(bg, text, border, 'gap-1 py-1 px-2.5')}
    >
      <Icon className="h-3 w-3" /> {label}
    </Badge>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function LeadPanelSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 space-y-5">
        {/* Profile Skeleton */}
        <div className="text-center">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-3" />
          <Skeleton className="h-5 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-24 mx-auto mb-3" />
          <div className="flex justify-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        <Separator />

        {/* Contact Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-44" />
          </div>
        </div>

        <Separator />

        {/* Pipeline Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>

        <Separator />

        {/* Actions Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function LeadPanelEmpty() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
        <div className="space-y-3">
          <div className="h-14 w-14 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Info className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Selecione uma conversa para ver os detalhes do lead.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadPanel({ phone, userId, contactName, onStageChange, onAction }: LeadPanelProps) {
  const [showStageSelect, setShowStageSelect] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');

  // Fetch lead data using React Query directly
  const { data, isLoading, error, refetch } = useQuery<LeadDataResponse>({
    queryKey: ['lead-data', phone],
    queryFn: async () => {
      const res = await fetch(`/api/leads/by-phone?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao buscar dados');
      }
      return res.json();
    },
    enabled: !!phone && phone.length >= 8,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  // No phone selected - show empty state
  if (!phone) {
    return <LeadPanelEmpty />;
  }

  // Loading state
  if (isLoading) {
    return <LeadPanelSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-3">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Erro ao carregar dados
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Extract data from response
  const lead = data?.lead;
  const whatsappContact = data?.whatsapp_contact;
  const source = data?.source || 'none';
  const interacoes = data?.interacoes || [];
  const tags = data?.tags || [];
  const pipelineStage = data?.pipeline_stage;

  // No data found
  if (!lead && !whatsappContact) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
          <div className="space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Novo contato
            </p>
            <p className="text-xs text-gray-400">{phone}</p>
          </div>
        </div>
      </div>
    );
  }

  // Derived data
  const name = lead?.nome || whatsappContact?.name || contactName || 'Contato';
  const email = lead?.email || null;
  const profilePicture = whatsappContact?.profile_picture_url;
  const initials = name.substring(0, 2).toUpperCase();
  const temperature = lead ? getTemperatureFromScore(lead.score) : 'cold';
  const currentStageId = pipelineStage || lead?.situacao?.nome || 'novo';
  const currentStage = PIPELINE_STAGES.find((s) =>
    s.name.toLowerCase() === currentStageId?.toLowerCase() || s.id === currentStageId
  ) || PIPELINE_STAGES[0];

  // Handle stage change
  const handleStageChange = (newStage: string) => {
    setSelectedStage(newStage);
    setShowStageSelect(false);
    onStageChange?.(newStage);
  };

  // Handle quick actions
  const handleAction = (action: 'visit' | 'simulation' | 'docs') => {
    onAction?.(action);
  };

  // Handle copy phone
  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phone);
    toast.success('Telefone copiado');
  };

  // Handle call
  const handleCall = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  // Format phone for display
  const formatPhone = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phoneNumber;
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* ========== Header / Profile Section ========== */}
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto ring-4 ring-emerald-100 dark:ring-emerald-900 mb-3 shadow-lg">
              {profilePicture && <AvatarImage src={profilePicture} alt={name} />}
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{name}</h3>

            {/* Source Badges */}
            <div className="flex justify-center gap-2 mt-2">
              {(source === 'cvcrm' || source === 'both') && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                  CV CRM
                </Badge>
              )}
              {(source === 'whatsapp' || source === 'both') && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                  WhatsApp
                </Badge>
              )}
            </div>

            {/* ========== Badges: Temperature & Score ========== */}
            {lead && (
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                <TemperatureBadge temperature={temperature} />
                {lead.score && (
                  <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                    <Star className="h-3 w-3 fill-amber-500" />
                    Score: {lead.score}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* ========== Contact Info ========== */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Informacoes de Contato
            </h4>
            <div className="space-y-2.5">
              {/* Phone */}
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                <button
                  className="hover:text-emerald-600 hover:underline transition-colors flex-1 text-left truncate"
                  onClick={handleCopyPhone}
                >
                  {formatPhone(phone)}
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCall}>
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Email */}
              {email && (
                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                  <a
                    href={`mailto:${email}`}
                    className="truncate hover:text-emerald-600 hover:underline transition-colors"
                  >
                    {email}
                  </a>
                </div>
              )}

              {/* Location */}
              {lead && (lead.cidade || lead.estado) && (
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{[lead.bairro, lead.cidade, lead.estado].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <Tag className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-[10px] px-2 font-normal bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== Pipeline Section (only if lead exists) ========== */}
          {lead && (
            <>
              <Separator className="bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Pipeline
                  </h4>
                  <Workflow className="h-4 w-4 text-emerald-600" />
                </div>
                <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <CardContent className="p-3">
                    {/* Stage */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Etapa</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: lead.situacao?.cor || currentStage.color }}
                        />
                        <span className="text-sm font-medium">{currentStage.name}</span>
                      </div>
                    </div>

                    {/* Empreendimento */}
                    {lead.empreendimento?.nome && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">Empreendimento</span>
                        <span className="text-sm font-medium text-emerald-700 truncate ml-2">
                          {lead.empreendimento.nome}
                        </span>
                      </div>
                    )}

                    {/* Valor */}
                    {lead.valor_negocio && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Valor</span>
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(lead.valor_negocio)}
                        </span>
                      </div>
                    )}

                    {/* Stage Change Button */}
                    <div className="mt-3">
                      {showStageSelect ? (
                        <Select
                          value={selectedStage || currentStage.id}
                          onValueChange={handleStageChange}
                        >
                          <SelectTrigger className="w-full h-8 text-[11px]">
                            <SelectValue placeholder="Selecione uma etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: stage.color }}
                                  />
                                  {stage.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => setShowStageSelect(true)}
                        >
                          Mover Etapa
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* ========== Quick Actions ========== */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Acoes Rapidas
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleCall}>
                <Phone className="h-3.5 w-3.5" />
                Ligar
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleCopyPhone}>
                <Copy className="h-3.5 w-3.5" />
                Copiar Tel.
              </Button>
            </div>
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 gap-2 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700"
                onClick={() => handleAction('visit')}
              >
                <Calendar className="h-4 w-4" />
                Agendar Visita
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 gap-2 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700"
                onClick={() => handleAction('simulation')}
              >
                <FileText className="h-4 w-4" />
                Enviar Simulacao
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9 gap-2 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700"
                onClick={() => handleAction('docs')}
              >
                <FolderOpen className="h-4 w-4" />
                Pedir Documentacao
              </Button>
            </div>
          </div>

          {/* ========== WhatsApp Stats ========== */}
          {whatsappContact && (
            <>
              <Separator className="bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Estatisticas WhatsApp
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-lg font-bold text-emerald-600">
                      {whatsappContact.messages_received || 0}
                    </p>
                    <p className="text-[10px] text-gray-500">Recebidas</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-lg font-bold text-blue-600">
                      {whatsappContact.messages_sent || 0}
                    </p>
                    <p className="text-[10px] text-gray-500">Enviadas</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-lg font-bold text-purple-600">
                      {whatsappContact.total_messages || 0}
                    </p>
                    <p className="text-[10px] text-gray-500">Total</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========== Activity History / Interacoes ========== */}
          {interacoes.length > 0 && (
            <>
              <Separator className="bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Historico de Interacoes
                </h4>
                <div className="space-y-3">
                  {interacoes.slice(0, 5).map((interacao) => (
                    <div key={interacao.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                          {interacao.descricao || interacao.tipo || 'Interacao'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(interacao.data)}</span>
                          {interacao.usuario && (
                            <>
                              <span>-</span>
                              <span>{interacao.usuario}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ========== Additional Info ========== */}
          {lead && (lead.origem || lead.corretor?.nome || lead.imobiliaria?.nome || lead.data_cadastro) && (
            <>
              <Separator className="bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Informacoes Adicionais
                </h4>
                <div className="space-y-2 text-sm">
                  {lead.origem && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Origem</span>
                      <span className="font-medium">{lead.origem}</span>
                    </div>
                  )}
                  {lead.corretor?.nome && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Corretor</span>
                      <span className="font-medium">{lead.corretor.nome}</span>
                    </div>
                  )}
                  {lead.imobiliaria?.nome && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Imobiliaria</span>
                      <span className="font-medium truncate ml-2">{lead.imobiliaria.nome}</span>
                    </div>
                  )}
                  {lead.data_cadastro && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cadastro</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(lead.data_cadastro), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                  {lead.renda_familiar && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Renda Familiar</span>
                      <span className="font-medium">{formatCurrency(lead.renda_familiar)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Spacer */}
          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  );
}

export default LeadPanel;
