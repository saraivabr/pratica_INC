'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  QrCode,
  MessageSquare,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  LogOut,
} from 'lucide-react';

interface AdminInstance {
  user_id: string;
  user_name: string;
  user_phone?: string | null;
  user_role?: string | null;
  instance_name?: string | null;
  evolution_connected: boolean;
  connection_state: string | null;
  profile_name?: string | null;
  profile_phone?: string | null;
  profile_pic_url?: string | null;
}

interface FeedbackMessage {
  type: 'success' | 'error';
  message: string;
}

export default function WhatsAppManagementPage() {
  const [instances, setInstances] = useState<AdminInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(40);
  const [pendingActionUser, setPendingActionUser] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/instances');
      const data = await res.json();
      if (data.success) {
        setInstances(data.data || []);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao carregar instancias' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao carregar instancias' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // Auto-hide feedback
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(t);
  }, [feedback]);

  // QR Code countdown
  useEffect(() => {
    if (!showQRCode) return;
    setQrCountdown(40);
    const interval = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          setShowQRCode(null);
          setFeedback({ type: 'error', message: 'QR Code expirou. Gere um novo.' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showQRCode]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInstances();
  };

  const handleReconnect = async (userId: string) => {
    setPendingActionUser(userId);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reconnect' }),
      });
      const data = await res.json();
      if (data.success && data.qrCode) {
        setShowQRCode(data.qrCode);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Falha ao gerar QR Code' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao gerar QR Code' });
    } finally {
      setPendingActionUser(null);
    }
  };

  const handleLogout = async (userId: string) => {
    setPendingActionUser(userId);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/whatsapp/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'logout' }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Instancia desconectada' });
        await loadInstances();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao desconectar' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao desconectar' });
    } finally {
      setPendingActionUser(null);
    }
  };

  const statusBadge = (state?: string | null) => {
    switch (state) {
      case 'open':
        return <Badge className="bg-green-100 text-green-800">Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800">Conectando</Badge>;
      case 'close':
      case 'disconnected':
        return <Badge className="bg-red-100 text-red-800">Desconectado</Badge>;
      case 'missing':
        return <Badge className="bg-orange-100 text-orange-800">Instancia ausente</Badge>;
      case 'not_configured':
        return <Badge className="bg-gray-100 text-gray-700">Nao configurado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Desconhecido</Badge>;
    }
  };

  const getCountdownColor = () => {
    if (qrCountdown > 20) return 'text-green-600';
    if (qrCountdown > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AppShell title="WhatsApp">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold">WhatsApp - Corretores</h1>
              <p className="text-sm text-muted-foreground">Supervisao de instancias por usuario</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {feedback && (
          <div
            className={`rounded-xl border p-4 flex items-center gap-3 ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <p className="flex-1 text-sm">{feedback.message}</p>
            <button onClick={() => setFeedback(null)} className="p-1 rounded hover:bg-black/5">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instancias por corretor</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma instancia encontrada
              </div>
            ) : (
              <div className="divide-y">
                {instances.map((inst) => (
                  <div key={inst.user_id} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{inst.user_name}</p>
                        {statusBadge(inst.connection_state)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inst.user_phone || 'Sem telefone'}
                        {inst.instance_name ? ` · ${inst.instance_name}` : ''}
                        {inst.profile_phone ? ` · ${inst.profile_phone}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inst.instance_name && (
                        <a
                          href={`/admin/whatsapp/chat/${inst.instance_name}`}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Conversas
                        </a>
                      )}
                      {inst.instance_name && (
                        <Button
                          variant="outline"
                          onClick={() => handleReconnect(inst.user_id)}
                          disabled={pendingActionUser === inst.user_id}
                          className="gap-2"
                        >
                          {pendingActionUser === inst.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4" />
                          )}
                          QR
                        </Button>
                      )}
                      {inst.instance_name && (
                        <Button
                          variant="outline"
                          onClick={() => handleLogout(inst.user_id)}
                          disabled={pendingActionUser === inst.user_id}
                          className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Desconectar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showQRCode && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="text-center">
                <QrCode className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
                <h3 className="text-xl font-bold mb-1">Escaneie o QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Abra o WhatsApp e escaneie o codigo
                </p>
                <div className="bg-white p-3 rounded-lg border inline-block">
                  <img src={showQRCode} alt="QR Code" className="w-56 h-56" />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <RefreshCw className={`h-4 w-4 ${getCountdownColor()}`} />
                    <span className={`text-lg font-bold ${getCountdownColor()}`}>{qrCountdown}s</span>
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
                </div>
                <Button className="mt-4 w-full" variant="outline" onClick={() => setShowQRCode(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
