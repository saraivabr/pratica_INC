'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone, QrCode, Wifi, WifiOff, RefreshCw, LogOut, Loader2,
  CheckCircle2, AlertTriangle, Copy, Check, Phone, User, Shield,
  ArrowRight, Zap, MessageSquare,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr' | 'pairing' | 'ready' | 'error';

interface StatusData {
  status: ConnectionStatus;
  instanceName?: string;
  pairedPhone?: string;
  profileName?: string;
  profilePicUrl?: string;
  lastQr?: string;
  pairingCode?: string;
  error?: string;
}

export default function CorretorWhatsAppPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [statusData, setStatusData] = useState<StatusData>({ status: 'disconnected' });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Buscar status atual
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/session/status', { credentials: 'include' });
      const data = await res.json();
      
      setStatusData({
        status: data.status || 'disconnected',
        instanceName: data.instanceName,
        pairedPhone: data.pairedPhone,
        profileName: data.profileName,
        profilePicUrl: data.profilePicUrl,
        lastQr: data.lastQr,
        pairingCode: data.pairingCode,
        error: data.error,
      });
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling de status
  useEffect(() => {
    if (authLoading) return;
    fetchStatus();
    
    pollRef.current = setInterval(fetchStatus, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authLoading, fetchStatus]);

  // Conectar WhatsApp
  const handleConnect = async (fresh = false) => {
    setConnecting(true);
    setQrImage(null);
    try {
      const res = await fetch('/api/whatsapp/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ freshConnection: fresh }),
      });
      const data = await res.json();

      if (data.status === 'ready') {
        setStatusData(prev => ({ ...prev, status: 'ready', pairedPhone: data.pairedPhone }));
      } else {
        setStatusData(prev => ({
          ...prev,
          status: data.pairingCode ? 'pairing' : data.qr ? 'qr' : 'connecting',
          pairingCode: data.pairingCode,
          lastQr: data.qr,
          instanceName: data.instanceName,
        }));

        // Gerar QR code como imagem se temos o código
        if (data.qr && data.qr.startsWith('data:image')) {
          setQrImage(data.qr);
        } else if (data.qr) {
          // QR code é texto, precisamos renderizar
          try {
            const QRCode = (await import('qrcode')).default;
            const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 280, margin: 2 });
            setQrImage(qrDataUrl);
          } catch {
            setQrImage(null);
          }
        }
      }
    } catch (err) {
      console.error('Error connecting:', err);
      setStatusData(prev => ({ ...prev, status: 'error', error: 'Erro ao conectar. Tente novamente.' }));
    } finally {
      setConnecting(false);
    }
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar seu WhatsApp?')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/whatsapp/session/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setStatusData({ status: 'disconnected' });
      setQrImage(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  // Copiar pairing code
  const handleCopyCode = () => {
    if (statusData.pairingCode) {
      navigator.clipboard.writeText(statusData.pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConnected = statusData.status === 'ready';
  const isConnecting = statusData.status === 'connecting' || statusData.status === 'qr' || statusData.status === 'pairing';

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Carregando status do WhatsApp...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isConnected ? "bg-green-100" : "bg-gray-100"
          )}>
            <Smartphone className={cn("w-6 h-6", isConnected ? "text-green-600" : "text-gray-400")} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
            <p className="text-sm text-gray-500">Gerencie sua conexão WhatsApp</p>
          </div>
        </div>

        {/* Status Card */}
        <div className={cn(
          "rounded-2xl border-2 p-6 transition-all",
          isConnected 
            ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50" 
            : "border-gray-200 bg-white"
        )}>
          {/* Status Indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-4 h-4 rounded-full animate-pulse",
                isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-red-400"
              )} />
              <span className={cn(
                "text-lg font-semibold",
                isConnected ? "text-green-700" : isConnecting ? "text-yellow-700" : "text-gray-700"
              )}>
                {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
              </span>
            </div>
            {isConnected && (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            )}
          </div>

          {/* Connected State */}
          {isConnected && (
            <div className="space-y-4">
              {/* Profile Info */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-green-100">
                {statusData.profilePicUrl ? (
                  <img src={statusData.profilePicUrl} alt="Profile" className="w-14 h-14 rounded-full border-2 border-green-200" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="w-7 h-7 text-green-600" />
                  </div>
                )}
                <div>
                  {statusData.profileName && (
                    <p className="font-semibold text-gray-900">{statusData.profileName}</p>
                  )}
                  {statusData.pairedPhone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {statusData.pairedPhone}
                    </p>
                  )}
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ✓ WhatsApp ativo
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/corretor/salva-leads"
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700"
                >
                  <Zap className="w-4 h-4 text-orange-500" />
                  CataVendas
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
                </Link>
                <Link
                  href="/corretor/chat"
                  className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700"
                >
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Ver Conversas
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
                </Link>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all text-sm font-medium disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
              </button>
            </div>
          )}

          {/* Disconnected State */}
          {!isConnected && !isConnecting && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <WifiOff className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-1">Seu WhatsApp não está conectado</p>
                <p className="text-sm text-gray-400">Conecte para usar CataVendas, enviar mensagens e mais</p>
              </div>

              {statusData.error && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{statusData.error}</span>
                </div>
              )}

              <button
                onClick={() => handleConnect(true)}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-green-200"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Preparando conexão...
                  </>
                ) : (
                  <>
                    <Wifi className="w-5 h-5" />
                    Conectar WhatsApp
                  </>
                )}
              </button>
            </div>
          )}

          {/* Connecting State - Pairing Code */}
          {isConnecting && statusData.pairingCode && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Digite este código no seu WhatsApp para conectar:
                </p>
                
                {/* Pairing Code Display */}
                <div className="relative inline-block">
                  <div className="flex items-center gap-1.5 justify-center bg-white border-2 border-green-300 rounded-2xl px-6 py-4 shadow-sm">
                    {statusData.pairingCode.split('').map((digit, i) => (
                      <span key={i} className={cn(
                        "text-3xl font-mono font-bold text-gray-900",
                        i === 3 && "ml-3" // Space in middle
                      )}>
                        {digit}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="absolute -right-3 -top-3 p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50 transition-all"
                    title="Copiar código"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-xl text-left text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-700">Como conectar:</p>
                  <p>1. Abra o WhatsApp no celular</p>
                  <p>2. Vá em <strong>Configurações → Dispositivos conectados</strong></p>
                  <p>3. Toque em <strong>&quot;Conectar um dispositivo&quot;</strong></p>
                  <p>4. Escolha <strong>&quot;Conectar com número de telefone&quot;</strong></p>
                  <p>5. Digite o código acima</p>
                </div>
              </div>

              {/* Also show QR Code as fallback */}
              {qrImage && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    <QrCode className="w-4 h-4" />
                    Ou escaneie o QR Code
                  </summary>
                  <div className="mt-3 flex justify-center">
                    <div className="p-3 bg-white rounded-xl border-2 border-gray-200">
                      <img src={qrImage} alt="QR Code" className="w-56 h-56" />
                    </div>
                  </div>
                </details>
              )}

              <button
                onClick={() => handleConnect(true)}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all text-sm"
              >
                <RefreshCw className={cn("w-4 h-4", connecting && "animate-spin")} />
                Gerar novo código
              </button>
            </div>
          )}

          {/* Connecting State - QR Only */}
          {isConnecting && !statusData.pairingCode && (
            <div className="space-y-4">
              {qrImage ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Escaneie o QR Code com seu WhatsApp:
                  </p>
                  <div className="inline-block p-4 bg-white rounded-xl border-2 border-gray-200">
                    <img src={qrImage} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    WhatsApp → Configurações → Dispositivos conectados → Conectar
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-green-500" />
                  <p className="text-gray-600">Gerando código de conexão...</p>
                </div>
              )}

              <button
                onClick={() => handleConnect(true)}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all text-sm"
              >
                <RefreshCw className={cn("w-4 h-4", connecting && "animate-spin")} />
                Gerar novo QR Code
              </button>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Seguro</span>
            </div>
            <p className="text-xs text-blue-600">
              Sua conexão é criptografada. Apenas você tem acesso às suas mensagens.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Automático</span>
            </div>
            <p className="text-xs text-purple-600">
              Com WhatsApp conectado, o CataVendas responde seus clientes automaticamente.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
