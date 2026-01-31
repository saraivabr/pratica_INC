'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Smartphone, QrCode, MessageSquare, Trash2, RefreshCw, Bot, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

interface WhatsAppInstance {
  instance_name: string;
  display_name: string;
  status: string;
  connection_state?: string;
  qr_code?: string;
  created_at: string;
  webhook_url: string;
  settings: {
    reject_call: boolean;
    groups_ignore: boolean;
    always_online: boolean;
    read_messages: boolean;
  };
}

interface FeedbackMessage {
  type: 'success' | 'error';
  message: string;
}

export default function WhatsAppManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(40);
  const [showNewInstanceForm, setShowNewInstanceForm] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Pegar workspace_id do usuário logado
  const workspaceId = user?.workspace_id || 1;

  // Auto-hide feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // QR Code countdown timer
  useEffect(() => {
    if (showQRCode) {
      setQrCountdown(40);
      const interval = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            setShowQRCode(null);
            setFeedback({
              type: 'error',
              message: 'QR Code expirou. Por favor, gere um novo.',
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showQRCode]);

  // Carregar instâncias
  const loadInstances = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const response = await fetch(`/api/tenants/${workspaceId}/whatsapp`);
      const data = await response.json();
      if (data.success) {
        setInstances(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (authLoading) return;
    loadInstances();
    // Atualizar a cada 10 segundos
    const interval = setInterval(loadInstances, 10000);
    return () => clearInterval(interval);
  }, [loadInstances, authLoading]);

  // Recriar QR Code para reconexão
  const handleRecreateQR = async (instanceName: string) => {
    setReconnecting(instanceName);
    setFeedback(null);
    try {
      const response = await fetch('/api/whatsapp/session/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName }),
      });

      const data = await response.json();
      if (data.success && data.qrCode) {
        setShowQRCode(data.qrCode);
      } else {
        setFeedback({
          type: 'error',
          message: 'Erro ao gerar QR Code: ' + (data.error || 'Tente novamente'),
        });
      }
    } catch (error) {
      console.error('Erro ao recriar QR Code:', error);
      setFeedback({
        type: 'error',
        message: 'Erro ao conectar com o servidor',
      });
    } finally {
      setReconnecting(null);
    }
  };

  // Criar nova instância
  const createInstance = async () => {
    if (!newInstanceName.trim()) {
      setFeedback({
        type: 'error',
        message: 'Digite um nome para a instância',
      });
      return;
    }

    setCreating(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/tenants/${workspaceId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newInstanceName,
          groups_ignore: true,
          reject_call: false,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowQRCode(data.data.qr_code);
        setShowNewInstanceForm(false);
        setNewInstanceName('');
        setFeedback({
          type: 'success',
          message: 'Instância criada com sucesso! Escaneie o QR Code para conectar.',
        });
        await loadInstances();
      } else {
        setFeedback({
          type: 'error',
          message: 'Erro ao criar instância: ' + data.error,
        });
      }
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      setFeedback({
        type: 'error',
        message: 'Erro ao criar instância',
      });
    } finally {
      setCreating(false);
    }
  };

  // Deletar instância
  const handleDeleteInstance = async (instanceName: string) => {
    setDeleting(instanceName);
    setShowDeleteConfirm(null);
    setFeedback(null);
    try {
      const response = await fetch(`/api/tenants/${workspaceId}/whatsapp?instanceName=${instanceName}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: 'Instância removida com sucesso',
        });
        await loadInstances();
      } else {
        setFeedback({
          type: 'error',
          message: 'Erro ao remover instância: ' + (data.error || 'Tente novamente'),
        });
      }
    } catch (error) {
      console.error('Erro ao deletar instância:', error);
      setFeedback({
        type: 'error',
        message: 'Erro ao conectar com o servidor',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (state?: string) => {
    switch (state) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusText = (state?: string) => {
    switch (state) {
      case 'open':
        return 'Conectado';
      case 'connecting':
        return 'Conectando';
      case 'close':
        return 'Desconectado';
      default:
        return 'Desconhecido';
    }
  };

  const getCountdownColor = () => {
    if (qrCountdown > 20) return 'text-green-600';
    if (qrCountdown > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Smartphone className="w-6 sm:w-8 h-6 sm:h-8 text-green-600" />
            WhatsApp Business
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Gerenciar suas instâncias WhatsApp e conversas
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link
            href="/admin/whatsapp/agent"
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-lg text-sm sm:text-base"
          >
            <Bot className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="hidden sm:inline">Configurar Agente</span>
            <span className="sm:hidden">Agente</span>
          </Link>
          <button
            onClick={() => setShowNewInstanceForm(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg text-sm sm:text-base"
          >
            <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
            Nova Instância
          </button>
        </div>
      </div>

      {/* Feedback Cards */}
      {feedback && (
        <div
          className={`mb-6 rounded-xl border-2 p-4 flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <p
            className={`flex-1 text-sm sm:text-base ${
              feedback.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {feedback.message}
          </p>
          <button
            onClick={() => setFeedback(null)}
            className={`p-1 rounded-full hover:bg-opacity-20 ${
              feedback.type === 'success' ? 'hover:bg-green-500' : 'hover:bg-red-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal QR Code */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <QrCode className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-3 sm:mb-4 text-green-600" />
              <h3 className="text-xl sm:text-2xl font-bold mb-2">Escaneie o QR Code</h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Abra o WhatsApp no seu celular e escaneie este código
              </p>
              <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img src={showQRCode} alt="QR Code" className="w-56 h-56 sm:w-64 sm:h-64" />
              </div>

              {/* Countdown Timer */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <RefreshCw className={`w-4 h-4 ${getCountdownColor()}`} />
                  <span className={`text-lg font-bold ${getCountdownColor()}`}>
                    {qrCountdown}s
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      qrCountdown > 20
                        ? 'bg-green-500'
                        : qrCountdown > 10
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${(qrCountdown / 40) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  O código expira automaticamente
                </p>
              </div>

              <button
                onClick={() => setShowQRCode(null)}
                className="mt-4 sm:mt-6 w-full bg-gray-100 text-gray-700 px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                Tem certeza que deseja remover a instância{' '}
                <span className="font-semibold">{showDeleteConfirm}</span>?
                <br />
                <span className="text-red-600 text-sm">
                  Esta ação não pode ser desfeita.
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteInstance(showDeleteConfirm)}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Instância */}
      {showNewInstanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Nova Instância WhatsApp</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Instância
                </label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="Ex: Comercial, Suporte, Vendas..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && createInstance()}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewInstanceForm(false);
                    setNewInstanceName('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  onClick={createInstance}
                  disabled={creating}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Instâncias */}
      {instances.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Smartphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma instância WhatsApp
          </h3>
          <p className="text-gray-600 mb-6">
            Crie sua primeira instância para começar a usar o WhatsApp Business
          </p>
          <button
            onClick={() => setShowNewInstanceForm(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Primeira Instância
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {instances.map((instance) => (
            <div
              key={instance.instance_name}
              className="bg-white rounded-xl border-2 border-gray-200 hover:border-green-300 transition-all p-4 sm:p-6 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 sm:w-6 h-5 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base sm:text-lg text-gray-900 truncate">
                      {instance.display_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {instance.instance_name}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                    instance.connection_state
                  )}`}
                >
                  {getStatusText(instance.connection_state)}
                </span>
              </div>

              <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Criado em:</span>
                  <span className="font-medium">
                    {new Date(instance.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Ignorar grupos:</span>
                  <span className="font-medium">
                    {instance.settings.groups_ignore ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/admin/whatsapp/chat/${instance.instance_name}`}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm"
                >
                  <MessageSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span>Conversas</span>
                </a>
                {instance.connection_state !== 'open' && (
                  <button
                    onClick={() => handleRecreateQR(instance.instance_name)}
                    disabled={reconnecting === instance.instance_name}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm flex-shrink-0 disabled:opacity-50"
                  >
                    {reconnecting === instance.instance_name ? (
                      <RefreshCw className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {reconnecting === instance.instance_name ? 'Gerando...' : 'QR Code'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(instance.instance_name)}
                  disabled={deleting === instance.instance_name}
                  className="flex items-center justify-center gap-1.5 bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm flex-shrink-0 disabled:opacity-50"
                >
                  {deleting === instance.instance_name ? (
                    <RefreshCw className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
