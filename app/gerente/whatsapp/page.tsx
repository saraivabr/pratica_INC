'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, Users, Wifi, WifiOff, RefreshCw, Loader2,
  CheckCircle2, Search, User, Phone, ChevronDown,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface CorretorStatus {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  connected: boolean;
  instanceName: string | null;
  lastLogin: string | null;
}

interface Stats {
  total: number;
  connected: number;
  disconnected: number;
  percentConnected: number;
}

export default function GerenteWhatsAppPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [corretores, setCorretores] = useState<CorretorStatus[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, connected: 0, disconnected: 0, percentConnected: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'connected' | 'disconnected'>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status', { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setCorretores(data.users || []);
        setStats(data.stats || { total: 0, connected: 0, disconnected: 0, percentConnected: 0 });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [authLoading, fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/whatsapp/sync-status', { method: 'POST', credentials: 'include' });
      await fetchData();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Filtrar corretores
  const filtered = corretores.filter(c => {
    if (filter === 'connected' && !c.connected) return false;
    if (filter === 'disconnected' && c.connected) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.nome?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.telefone?.includes(s));
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp da Equipe</h1>
              <p className="text-sm text-gray-500">Status de conexão dos corretores</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            Sincronizar
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border-2 border-gray-100 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-xl border-2 border-green-100 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.connected}</p>
            <p className="text-sm text-green-600">Conectados</p>
          </div>
          <div className="bg-red-50 rounded-xl border-2 border-red-100 p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{stats.disconnected}</p>
            <p className="text-sm text-red-500">Desconectados</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Taxa de Conexão</span>
            <span className="text-sm font-bold text-green-600">{stats.percentConnected}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${stats.percentConnected}%` }}
            />
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar corretor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todos</option>
            <option value="connected">Conectados</option>
            <option value="disconnected">Desconectados</option>
          </select>
        </div>

        {/* Corretor List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum corretor encontrado</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-4 p-4 bg-white rounded-xl border transition-all",
                  c.connected ? "border-green-100 hover:border-green-200" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  c.connected ? "bg-green-100" : "bg-gray-100"
                )}>
                  <User className={cn("w-5 h-5", c.connected ? "text-green-600" : "text-gray-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.nome || 'Sem nome'}</p>
                  <p className="text-xs text-gray-500 truncate">{c.telefone || c.email}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0",
                  c.connected 
                    ? "bg-green-100 text-green-700" 
                    : "bg-gray-100 text-gray-500"
                )}>
                  {c.connected ? (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      Conectado
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5" />
                      Desconectado
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
