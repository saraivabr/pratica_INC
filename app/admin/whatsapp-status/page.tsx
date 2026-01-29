'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, Users, Wifi, WifiOff, RefreshCw, Loader2,
  Search, User, BarChart3, Download, Filter, ChevronDown,
  CheckCircle2, XCircle, ArrowUpDown, Phone,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CorretorStatus {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: string;
  connected: boolean;
  instanceName: string | null;
  gerenteId: string | null;
  gerenteNome: string | null;
  imobiliariaId: number | null;
  lastLogin: string | null;
}

interface Stats {
  total: number;
  connected: number;
  disconnected: number;
  withInstance: number;
  percentConnected: number;
}

type SortField = 'nome' | 'connected' | 'lastLogin';
type SortDir = 'asc' | 'desc';

export default function AdminWhatsAppStatusPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [corretores, setCorretores] = useState<CorretorStatus[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, connected: 0, disconnected: 0, withInstance: 0, percentConnected: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'connected' | 'disconnected' | 'no-instance'>('all');
  const [sortField, setSortField] = useState<SortField>('connected');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchData = useCallback(async (sync = false) => {
    try {
      const url = sync ? '/api/whatsapp/status?sync=true' : '/api/whatsapp/status';
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setCorretores(data.users || []);
        setStats(data.stats || { total: 0, connected: 0, disconnected: 0, withInstance: 0, percentConnected: 0 });
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
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [authLoading, fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/whatsapp/sync-status', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setSyncResult(`Sync completo: ${data.connected} conectados, ${data.disconnected} desconectados, ${data.updated} atualizados`);
        await fetchData();
      } else {
        setSyncResult(`Erro: ${data.error}`);
      }
    } catch (err: any) {
      setSyncResult(`Erro: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 8000);
    }
  };

  // Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filter & Search
  const filtered = corretores
    .filter(c => {
      if (filter === 'connected' && !c.connected) return false;
      if (filter === 'disconnected' && c.connected) return false;
      if (filter === 'no-instance' && c.instanceName) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          c.nome?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.telefone?.includes(s) ||
          c.gerenteNome?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'nome') return dir * (a.nome || '').localeCompare(b.nome || '');
      if (sortField === 'connected') return dir * (Number(a.connected) - Number(b.connected));
      if (sortField === 'lastLogin') return dir * ((a.lastLogin || '').localeCompare(b.lastLogin || ''));
      return 0;
    });

  // Agrupar por gerente
  const gerenteGroups = new Map<string, { nome: string; total: number; connected: number }>();
  corretores.forEach(c => {
    const key = c.gerenteNome || 'Sem gerente';
    const group = gerenteGroups.get(key) || { nome: key, total: 0, connected: 0 };
    group.total++;
    if (c.connected) group.connected++;
    gerenteGroups.set(key, group);
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp — Visão Geral</h1>
            <p className="text-sm text-gray-500">Status de conexão de todos os corretores</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/whatsapp"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            Instâncias
          </Link>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? 'Sincronizando...' : 'Sync Evolution'}
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className={cn(
          "p-3 rounded-lg text-sm border",
          syncResult.startsWith('Erro') ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
        )}>
          {syncResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard label="Total Corretores" value={stats.total} color="gray" />
        <StatsCard label="Conectados" value={stats.connected} color="green" icon={<Wifi className="w-5 h-5" />} />
        <StatsCard label="Desconectados" value={stats.disconnected} color="red" icon={<WifiOff className="w-5 h-5" />} />
        <StatsCard label="Com Instância" value={stats.withInstance} color="blue" icon={<Smartphone className="w-5 h-5" />} />
        <StatsCard label="% Conectados" value={`${stats.percentConnected}%`} color="emerald" icon={<CheckCircle2 className="w-5 h-5" />} />
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Taxa de Conexão Global</span>
          <span className="text-lg font-bold text-green-600">{stats.percentConnected}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 flex items-center justify-end pr-2"
            style={{ width: `${Math.max(stats.percentConnected, 2)}%` }}
          >
            {stats.percentConnected > 10 && (
              <span className="text-[10px] font-bold text-white">{stats.connected}/{stats.total}</span>
            )}
          </div>
        </div>
      </div>

      {/* Gerente Breakdown */}
      {gerenteGroups.size > 1 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            Por Gerente
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from(gerenteGroups.entries()).map(([key, g]) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800 truncate">{g.nome}</p>
                <p className="text-xs text-gray-500">
                  <span className="text-green-600 font-medium">{g.connected}</span>/{g.total} conectados
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone ou gerente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Todos ({stats.total})</option>
          <option value="connected">Conectados ({stats.connected})</option>
          <option value="disconnected">Desconectados ({stats.disconnected})</option>
          <option value="no-instance">Sem Instância ({stats.total - stats.withInstance})</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => handleSort('nome')} className="flex items-center gap-1 hover:text-gray-900">
                    Corretor <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Gerente</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  <button onClick={() => handleSort('connected')} className="flex items-center gap-1 hover:text-gray-900 mx-auto">
                    Status <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Instância</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        c.connected ? "bg-green-100" : "bg-gray-100"
                      )}>
                        <User className={cn("w-4 h-4", c.connected ? "text-green-600" : "text-gray-400")} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.nome || 'Sem nome'}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {c.telefone || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell truncate max-w-[150px]">
                    {c.gerenteNome || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                      c.connected
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}>
                      {c.connected ? (
                        <><CheckCircle2 className="w-3 h-3" /> Conectado</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> Offline</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono hidden xl:table-cell truncate max-w-[200px]">
                    {c.instanceName || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Nenhum corretor encontrado</p>
          </div>
        )}
        <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
          Mostrando {filtered.length} de {stats.total} corretores
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon?: React.ReactNode }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-100 text-gray-900',
    green: 'bg-green-50 border-green-100 text-green-700',
    red: 'bg-red-50 border-red-100 text-red-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  };

  return (
    <div className={cn("rounded-xl border-2 p-4", colors[color] || colors.gray)}>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold">{value}</p>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}
