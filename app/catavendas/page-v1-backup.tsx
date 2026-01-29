'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Search,
  Loader2,
  MessageSquare,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Opportunity {
  id: number;
  phone: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  daysWithoutResponse: number;
  potential: 'alto' | 'medio' | 'baixo';
  suggestedMessage?: string;
  selected: boolean;
  intent?: {
    category: string;
    summary: string;
    confidence: number;
    suggestedAction?: string;
  };
  loadingIntent?: boolean;
}

export default function CataVendasSimplePage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveringProgress, setRecoveringProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchOpportunities();
    }
  }, [user?.workspace_id]);

  async function fetchOpportunities() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/whatsapp/sync/opportunities?workspaceId=${user?.workspace_id}&t=${Date.now()}`
      );
      if (res.ok) {
        const data = await res.json();
        const opps = (data.data || []).map((opp: any) => ({
          id: opp.id,
          phone: opp.phone_number,
          contactName: opp.contact_name || opp.phone_number,
          lastMessage: opp.last_message_text || '',
          lastMessageTime: opp.last_message_at,
          daysWithoutResponse: opp.days_without_response || 0,
          potential: opp.recovery_potential || 'baixo',
          suggestedMessage: opp.suggested_message,
          selected: false,
          loadingIntent: false,
        }));
        setOpportunities(opps);
        
        // Buscar análise de intenção para cada lead (máximo 10 primeiros)
        opps.slice(0, 10).forEach((opp: Opportunity) => {
          analyzeLeadIntent(opp.id, opp.phone);
        });
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeLeadIntent(id: number, phone: string) {
    // Marcar como carregando
    setOpportunities((prev) =>
      prev.map((opp) =>
        opp.id === id ? { ...opp, loadingIntent: true } : opp
      )
    );

    try {
      const res = await fetch('/api/catavendas/analyze-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          workspaceId: user?.workspace_id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOpportunities((prev) =>
          prev.map((opp) =>
            opp.id === id
              ? { ...opp, intent: data.intent, loadingIntent: false }
              : opp
          )
        );
      }
    } catch (error) {
      console.error('Erro ao analisar intenção:', error);
      setOpportunities((prev) =>
        prev.map((opp) =>
          opp.id === id ? { ...opp, loadingIntent: false } : opp
        )
      );
    }
  }

  function toggleSelect(id: number) {
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === id ? { ...opp, selected: !opp.selected } : opp))
    );
  }

  function toggleSelectAll() {
    const allSelected = opportunities.every((opp) => opp.selected);
    setOpportunities((prev) =>
      prev.map((opp) => ({ ...opp, selected: !allSelected }))
    );
  }

  async function handleRecover() {
    const selected = opportunities.filter((opp) => opp.selected);
    if (selected.length === 0) {
      alert('Selecione pelo menos um lead para recuperar');
      return;
    }

    if (!user?.evolution_instance_name) {
      alert('Conecte seu WhatsApp primeiro em Configurações > WhatsApp');
      return;
    }

    const confirmed = confirm(
      `Enviar mensagem de recuperação para ${selected.length} lead${
        selected.length > 1 ? 's' : ''
      }?\n\nAs mensagens serão enviadas com intervalo de 2 segundos entre cada uma.`
    );
    if (!confirmed) return;

    setRecovering(true);
    setRecoveringProgress({ current: 0, total: selected.length });

    const results: Array<{ phone: string; success: boolean }> = [];

    try {
      // Enviar um por vez para mostrar progresso
      for (let i = 0; i < selected.length; i++) {
        const lead = selected[i];
        
        try {
          const res = await fetch('/api/catavendas/recover-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leads: [
                {
                  phone: lead.phone,
                  contactName: lead.contactName,
                  lastMessage: lead.lastMessage,
                  intent: lead.intent,
                },
              ],
              workspaceId: user.workspace_id,
              instanceName: user.evolution_instance_name,
            }),
          });

          const data = await res.json();
          const success = data.success && data.results?.[0]?.success;
          
          results.push({ phone: lead.phone, success });
          setRecoveringProgress({ current: i + 1, total: selected.length });
        } catch (error) {
          console.error(`Erro ao enviar para ${lead.phone}:`, error);
          results.push({ phone: lead.phone, success: false });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      alert(
        `Recuperação concluída!\n\n` +
          `✅ Enviadas: ${successCount}\n` +
          `❌ Falhas: ${failCount}\n\n` +
          `As mensagens personalizadas foram enviadas.`
      );

      // Desmarcar leads enviados com sucesso
      setOpportunities((prev) =>
        prev.map((opp) => {
          const result = results.find((r) => r.phone === opp.phone);
          return result?.success ? { ...opp, selected: false } : opp;
        })
      );
    } catch (error: any) {
      console.error('Erro ao recuperar:', error);
      alert('Erro ao enviar mensagens. Tente novamente.');
    } finally {
      setRecovering(false);
      setRecoveringProgress(null);
    }
  }

  const selectedCount = opportunities.filter((opp) => opp.selected).length;

  const potentialColors = {
    alto: 'bg-red-100 text-red-800 border-red-200',
    medio: 'bg-orange-100 text-orange-800 border-orange-200',
    baixo: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const potentialLabels = {
    alto: 'Alto',
    medio: 'Médio',
    baixo: 'Baixo',
  };

  const intentLabels: Record<string, string> = {
    interessado: '✅ Interessado',
    negociando: '💰 Negociando',
    duvidas: '❓ Com Dúvidas',
    sem_interesse: '❌ Sem Interesse',
    perdeu_contato: '💤 Perdeu Contato',
    preco_alto: '💸 Preço Alto',
    comparando: '🔍 Comparando',
    sem_historico: '📭 Sem Histórico',
  };

  const intentColors: Record<string, string> = {
    interessado: 'bg-green-100 text-green-800',
    negociando: 'bg-blue-100 text-blue-800',
    duvidas: 'bg-yellow-100 text-yellow-800',
    sem_interesse: 'bg-red-100 text-red-800',
    perdeu_contato: 'bg-gray-100 text-gray-800',
    preco_alto: 'bg-orange-100 text-orange-800',
    comparando: 'bg-purple-100 text-purple-800',
    sem_historico: 'bg-gray-100 text-gray-600',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">CataVendas</h1>
        </div>
        <p className="text-gray-600">
          Escavando oportunidades no seu WhatsApp
        </p>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={fetchOpportunities}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Escanear
          </button>

          {opportunities.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              {opportunities.every((opp) => opp.selected)
                ? 'Desmarcar Todos'
                : 'Selecionar Todos'}
            </button>
          )}
        </div>

        {selectedCount > 0 && (
          <button
            onClick={handleRecover}
            disabled={recovering}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors font-medium"
          >
            {recovering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {recoveringProgress && (
                  <span className="text-sm">
                    {recoveringProgress.current}/{recoveringProgress.total}
                  </span>
                )}
              </>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {recovering
              ? 'Enviando...'
              : `Recuperar ${selectedCount} lead${selectedCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {/* Stats */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">
              {opportunities.length}
            </p>
            <p className="text-sm text-gray-600">Oportunidades</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {opportunities.filter((o) => o.potential === 'alto').length}
            </p>
            <p className="text-sm text-gray-600">Alto Potencial</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{selectedCount}</p>
            <p className="text-sm text-gray-600">Selecionados</p>
          </div>
        </div>
      )}

      {/* List */}
      {opportunities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">Nenhuma oportunidade encontrada</p>
          <p className="text-gray-400 text-sm">
            Clique em "Escanear" para buscar leads esfriados
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <button
              key={opp.id}
              onClick={() => toggleSelect(opp.id)}
              className={`w-full text-left bg-white rounded-xl shadow-sm p-4 border-2 transition-all ${
                opp.selected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-transparent hover:border-blue-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                    opp.selected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {opp.selected && <CheckCircle className="w-4 h-4 text-white" />}
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {opp.contactName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {opp.contactName}
                      </h3>
                      <p className="text-sm text-gray-500">{opp.phone}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
                        potentialColors[opp.potential]
                      }`}
                    >
                      {potentialLabels[opp.potential]}
                    </span>
                  </div>

                  {/* Intent Analysis */}
                  {opp.loadingIntent && (
                    <div className="bg-blue-50 rounded-lg p-2 mb-2 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-xs text-blue-700">
                        Analisando intenção...
                      </span>
                    </div>
                  )}
                  
                  {opp.intent && !opp.loadingIntent && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            intentColors[opp.intent.category] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {intentLabels[opp.intent.category] || opp.intent.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(opp.intent.confidence * 100)}% confiança
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {opp.intent.summary}
                      </p>
                      {opp.intent.suggestedAction && (
                        <p className="text-xs text-blue-600">
                          💡 {opp.intent.suggestedAction}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Last Message */}
                  <div className="bg-gray-50 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>Última mensagem</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {opp.lastMessage}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {opp.daysWithoutResponse} dias sem resposta
                    </span>
                    {opp.lastMessageTime && (
                      <span>
                        {new Date(opp.lastMessageTime).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
