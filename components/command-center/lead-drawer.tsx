'use client';

import { X, Phone, Mail, MessageSquare, Calendar, Building2, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

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

interface Message {
  id: number;
  messageText: string;
  timestamp: string;
  isFromMe: boolean;
  contactName?: string;
}

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-800',
  contato: 'bg-yellow-100 text-yellow-800',
  qualificado: 'bg-purple-100 text-purple-800',
  negociacao: 'bg-orange-100 text-orange-800',
  ganho: 'bg-green-100 text-green-800',
  perdido: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  contato: 'Em Contato',
  qualificado: 'Qualificado',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
};

export function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead?.telefone) {
      fetchMessages(lead.telefone);
    }
  }, [lead?.telefone]);

  async function fetchMessages(phone: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/messages?phone=${phone}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!lead) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{lead.nome}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusLabels[lead.status] || lead.status}
              </span>
              {lead.mensagensRecentes > 0 && (
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                  {lead.mensagensRecentes} msgs recentes
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Contato */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Contato
            </h3>
            <div className="space-y-2">
              {lead.telefone && (
                <a
                  href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">{lead.telefone}</span>
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">{lead.email}</span>
                </a>
              )}
            </div>
          </div>

          {/* Empreendimento */}
          {lead.empreendimento && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Interesse
              </h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-gray-700 font-medium">
                  {lead.empreendimento.nome}
                </span>
              </div>
            </div>
          )}

          {/* Valor Estimado */}
          {lead.valorEstimado && lead.valorEstimado > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Valor Estimado
              </h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xl font-bold text-green-700">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(lead.valorEstimado)}
                </span>
              </div>
            </div>
          )}

          {/* Próximo Contato */}
          {lead.proximoContato && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Próximo Contato
              </h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-gray-700">
                  {new Date(lead.proximoContato).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          {lead.observacoes && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Observações
              </h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {lead.observacoes}
              </p>
            </div>
          )}

          {/* Mensagens Recentes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensagens Recentes
            </h3>
            {loading ? (
              <div className="text-center py-8 text-gray-400">
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.isFromMe
                        ? 'bg-blue-50 ml-8'
                        : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <p className="text-sm text-gray-700">{msg.messageText}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.timestamp).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadados */}
          <div className="pt-6 border-t text-xs text-gray-400 space-y-1">
            <p>Origem: {lead.origem}</p>
            <p>
              Criado em:{' '}
              {new Date(lead.createdAt).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
            <p>
              Atualizado:{' '}
              {new Date(lead.updatedAt).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
