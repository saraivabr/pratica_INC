'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Search,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  CheckCheck,
  X,
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

type Step = 'scan' | 'select' | 'confirm' | 'sending' | 'done';

export default function CataVendasV2Page() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('scan');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [sendResults, setSendResults] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  const selectedCount = opportunities.filter((o) => o.selected).length;

  useEffect(() => {
    if (step === 'select' && selectedCount > 0) {
      // Auto-avançar para confirm se já tem selecionados
    }
  }, [selectedCount, step]);

  async function handleScan() {
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
          selected: false,
          loadingIntent: false,
        }));
        setOpportunities(opps);
        
        if (opps.length > 0) {
          setStep('select');
          // Analisar primeiros 5
          opps.slice(0, 5).forEach((opp: Opportunity) => {
            analyzeIntent(opp.id, opp.phone);
          });
        }
      }
    } catch (error) {
      console.error('Erro ao escanear:', error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeIntent(id: number, phone: string) {
    setOpportunities((prev) =>
      prev.map((opp) =>
        opp.id === id ? { ...opp, loadingIntent: true } : opp
      )
    );

    try {
      const res = await fetch('/api/catavendas/analyze-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, workspaceId: user?.workspace_id }),
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

  function handleNext() {
    if (step === 'select' && selectedCount > 0) {
      setStep('confirm');
    }
  }

  async function handleSend() {
    const selected = opportunities.filter((o) => o.selected);
    if (selected.length === 0) return;

    setStep('sending');
    setSendingProgress({ current: 0, total: selected.length });

    const results: Array<{ success: boolean }> = [];

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
            workspaceId: user?.workspace_id,
            instanceName: user?.evolution_instance_name,
          }),
        });

        const data = await res.json();
        results.push({ success: data.success && data.results?.[0]?.success });
        setSendingProgress({ current: i + 1, total: selected.length });
      } catch (error) {
        results.push({ success: false });
      }
    }

    setSendResults({
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
    setStep('done');
  }

  function handleReset() {
    setStep('scan');
    setOpportunities([]);
    setSendResults(null);
    setSendingProgress(null);
  }

  const intentEmoji: Record<string, string> = {
    interessado: '✅',
    negociando: '💰',
    duvidas: '❓',
    sem_interesse: '❌',
    perdeu_contato: '💤',
    preco_alto: '💸',
    comparando: '🔍',
  };

  const intentColors: Record<string, string> = {
    interessado: 'bg-green-50 border-green-200 text-green-800',
    negociando: 'bg-blue-50 border-blue-200 text-blue-800',
    perdeu_contato: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  // SCAN STEP
  if (step === 'scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">CataVendas</h1>
          <p className="text-gray-600 mb-8">
            Escaneie suas conversas do WhatsApp para encontrar leads que podem ser recuperados
          </p>
          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Escaneando...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Escanear WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // SELECT STEP
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header fixo */}
        <div className="sticky top-0 bg-white border-b shadow-sm z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-gray-800">
                {opportunities.length} oportunidades encontradas
              </h1>
              <button
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Selecione os leads que deseja recuperar
            </p>
          </div>

          {selectedCount > 0 && (
            <div className="bg-blue-50 border-t border-blue-100 p-4 flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
              </span>
              <button
                onClick={handleNext}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="p-4 space-y-3 pb-24">
          {opportunities.map((opp) => (
            <button
              key={opp.id}
              onClick={() => toggleSelect(opp.id)}
              className={`w-full text-left bg-white rounded-xl p-4 border-2 transition-all ${
                opp.selected
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox grande */}
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                    opp.selected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {opp.selected && <CheckCheck className="w-4 h-4 text-white" />}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {opp.contactName}
                  </h3>

                  {/* Intent badge */}
                  {opp.loadingIntent && (
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span className="text-xs text-gray-500">Analisando...</span>
                    </div>
                  )}

                  {opp.intent && !opp.loadingIntent && (
                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                          intentColors[opp.intent.category] ||
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {intentEmoji[opp.intent.category]}
                        {opp.intent.summary}
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {opp.lastMessage}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {opp.daysWithoutResponse} dias sem resposta
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // CONFIRM STEP
  if (step === 'confirm') {
    const selected = opportunities.filter((o) => o.selected);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Confirmar envio
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Vamos enviar mensagens personalizadas para {selected.length} lead
            {selected.length > 1 ? 's' : ''}
          </p>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3 text-sm text-blue-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                Cada mensagem será gerada automaticamente com base no histórico
                da conversa. Haverá um intervalo de 2 segundos entre cada envio.
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {selected.slice(0, 3).map((opp) => (
              <div
                key={opp.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">
                  {opp.contactName}
                </span>
              </div>
            ))}
            {selected.length > 3 && (
              <p className="text-sm text-gray-500 text-center">
                +{selected.length - 3} mais...
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('select')}
              className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleSend}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Enviar agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SENDING STEP
  if (step === 'sending' && sendingProgress) {
    const progress = (sendingProgress.current / sendingProgress.total) * 100;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Enviando mensagens...
          </h2>
          <p className="text-gray-600 mb-6">
            {sendingProgress.current} de {sendingProgress.total}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // DONE STEP
  if (step === 'done' && sendResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Mensagens enviadas!
          </h2>
          <p className="text-gray-600 mb-8">
            Suas mensagens personalizadas foram entregues
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {sendResults.sent}
              </div>
              <div className="text-sm text-green-700">Enviadas</div>
            </div>
            {sendResults.failed > 0 && (
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {sendResults.failed}
                </div>
                <div className="text-sm text-red-700">Falhas</div>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Escanear novamente
          </button>
        </div>
      </div>
    );
  }

  return null;
}
