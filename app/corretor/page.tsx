'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { LeadDrawer } from '@/components/command-center/lead-drawer';
import {
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  MessageSquare,
  Search,
  Loader2,
} from 'lucide-react';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  status: string;
  origem: string;
  valorEstimado?: number;
  proximoContato?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  empreendimento?: {
    id: string;
    nome: string;
  };
  mensagensRecentes: number;
}

interface Conversa {
  telefone: string;
  nome: string;
  ultimaMensagem: string;
  ultimaInteracao: string;
  isFromMe: boolean;
  leadId?: string;
  leadStatus?: string;
}

interface Acao {
  leadId: string;
  nome: string;
  telefone: string;
  proximoContato: string;
  observacoes?: string;
  empreendimento?: string;
}

interface Stats {
  leadsAtivos: number;
  emNegociacao: number;
  novosSemana: number;
  vendasMes: number;
}

interface CommandCenterData {
  leads: Lead[];
  conversas: Conversa[];
  acoes: Acao[];
  stats: Stats;
}

const statusColors: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-800 border-blue-200',
  contato: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  qualificado: 'bg-purple-100 text-purple-800 border-purple-200',
  negociacao: 'bg-orange-100 text-orange-800 border-orange-200',
  ganho: 'bg-green-100 text-green-800 border-green-200',
  perdido: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  contato: 'Contato',
  qualificado: 'Qualificado',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export default function CommandCenterPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.cvcrm_id) {
      fetchData();
      // Atualizar a cada 30 segundos
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.cvcrm_id]);

  async function fetchData() {
    try {
      const res = await fetch(
        `/api/corretor/command-center?corretorId=${user?.cvcrm_id}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = data?.leads.filter((lead) =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone.includes(searchTerm)
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Erro ao carregar dados
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Command Center
        </h1>
        <p className="text-gray-600">
          Visão completa dos seus leads e conversas em tempo real
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.stats.leadsAtivos}
              </p>
              <p className="text-xs text-gray-600">Leads Ativos</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.stats.emNegociacao}
              </p>
              <p className="text-xs text-gray-600">Em Negociação</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.stats.novosSemana}
              </p>
              <p className="text-xs text-gray-600">Novos (7d)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.stats.vendasMes}
              </p>
              <p className="text-xs text-gray-600">Vendas (30d)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Ativos (coluna maior) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Leads Ativos</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  Nenhum lead encontrado
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate group-hover:text-blue-700">
                          {lead.nome}
                        </h3>
                        <p className="text-sm text-gray-500">{lead.telefone}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusLabels[lead.status] || lead.status}
                      </span>
                    </div>

                    {lead.empreendimento && (
                      <p className="text-sm text-purple-600 mb-1">
                        📍 {lead.empreendimento.nome}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {lead.mensagensRecentes > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {lead.mensagensRecentes} msgs
                        </span>
                      )}
                      {lead.proximoContato && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.proximoContato) <= new Date()
                            ? 'Atrasado!'
                            : new Date(lead.proximoContato).toLocaleDateString(
                                'pt-BR'
                              )}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Conversas + Ações */}
        <div className="space-y-6">
          {/* Próximas Ações */}
          {data.acoes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Próximas Ações
              </h2>
              <div className="space-y-3">
                {data.acoes.map((acao) => {
                  const isPast = new Date(acao.proximoContato) <= new Date();
                  return (
                    <div
                      key={acao.leadId}
                      className={`p-3 rounded-lg border ${
                        isPast
                          ? 'border-red-200 bg-red-50'
                          : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <p className="font-medium text-gray-800 text-sm">
                        {acao.nome}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(acao.proximoContato).toLocaleString('pt-BR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                        {isPast && ' ⚠️'}
                      </p>
                      {acao.empreendimento && (
                        <p className="text-xs text-purple-600 mt-1">
                          {acao.empreendimento}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversas Recentes */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Conversas Recentes
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.conversas.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhuma conversa recente
                </div>
              ) : (
                data.conversas.map((conversa, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm text-gray-800 truncate flex-1">
                        {conversa.nome}
                      </p>
                      {conversa.leadStatus && (
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                            statusColors[conversa.leadStatus] ||
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {statusLabels[conversa.leadStatus] ||
                            conversa.leadStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {conversa.isFromMe ? '→ ' : '← '}
                      {conversa.ultimaMensagem}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(conversa.ultimaInteracao).toLocaleString(
                        'pt-BR',
                        {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lead Drawer */}
      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
