'use client';

import { useState } from 'react';
import {
  Bot,
  Search,
  Calculator,
  Calendar,
  X,
  Send,
  Loader2,
  Sparkles,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AgentToolbarProps {
  phoneNumber: string;
  instanceName: string;
  onSend: (message: string) => void;
}

interface AgentResult {
  action: string;
  title: string;
  content: string;
  formattedMessage?: string;
}

const AGENTS = [
  {
    id: 'activate_luna',
    label: 'Luna',
    icon: Bot,
    color: 'text-violet-600',
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
    description: 'Ativar follow-up automatico',
    needsInput: false,
  },
  {
    id: 'search_imoveis',
    label: 'Imoveis',
    icon: Home,
    color: 'text-blue-600',
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    description: 'Buscar imoveis no CRM',
    needsInput: true,
    placeholder: 'Ex: 2 quartos zona sul ate 300mil',
  },
  {
    id: 'simulate',
    label: 'Simular',
    icon: Calculator,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    description: 'Simular financiamento',
    needsInput: true,
    placeholder: 'Ex: 280000 entrada 50000 taxa 0.99 prazo 360',
  },
  {
    id: 'schedule_visit',
    label: 'Visita',
    icon: Calendar,
    color: 'text-orange-600',
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    description: 'Agendar visita',
    needsInput: true,
    placeholder: 'Ex: Residencial Aurora amanha 14h',
  },
] as const;

export function AgentToolbar({ phoneNumber, instanceName, onSend }: AgentToolbarProps) {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);

  const handleActivate = async (agentId: string) => {
    if (activeAgent === agentId) {
      setActiveAgent(null);
      setResult(null);
      setInputValue('');
      return;
    }

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    setActiveAgent(agentId);
    setResult(null);
    setInputValue('');

    // If agent doesn't need input, execute immediately
    if (!agent.needsInput) {
      await executeAgent(agentId, '');
    }
  };

  const executeAgent = async (agentId: string, params: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/whatsapp/agent-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: agentId,
          phoneNumber,
          instanceName,
          params,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.result);
        if (agentId === 'activate_luna') {
          toast.success('Luna ativada para esta conversa!');
          setActiveAgent(null);
        }
      } else {
        toast.error(json.error || 'Erro ao executar agente');
      }
    } catch {
      toast.error('Erro ao executar agente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInput = () => {
    if (!inputValue.trim() || !activeAgent) return;
    executeAgent(activeAgent, inputValue.trim());
  };

  const handleSendResult = () => {
    if (result?.formattedMessage) {
      onSend(result.formattedMessage);
      setResult(null);
      setActiveAgent(null);
      setInputValue('');
      toast.success('Enviado ao lead!');
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setActiveAgent(null);
    setInputValue('');
  };

  const agent = AGENTS.find(a => a.id === activeAgent);

  return (
    <div className="px-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
      {/* Agent buttons */}
      <div className="flex items-center gap-1.5 py-2">
        <Sparkles className="w-3 h-3 text-gray-400 shrink-0" />
        {AGENTS.map((a) => {
          const Icon = a.icon;
          const isActive = activeAgent === a.id;
          return (
            <button
              key={a.id}
              onClick={() => handleActivate(a.id)}
              title={a.description}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all',
                isActive
                  ? `${a.bg} ${a.color} ring-1 ring-offset-1`
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Agent input panel */}
      {activeAgent && agent?.needsInput && !result && (
        <div className="pb-2 flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
            placeholder={agent.placeholder}
            className="flex-1 h-8 text-xs"
            disabled={loading}
            autoFocus
          />
          <Button
            size="sm"
            onClick={handleSubmitInput}
            disabled={loading || !inputValue.trim()}
            className="h-8 px-3 text-xs"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              'Buscar'
            )}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && !agent?.needsInput && (
        <div className="pb-2 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Executando {agent?.label}...
        </div>
      )}

      {/* Agent result card */}
      {result && (
        <div className="pb-2">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                {agent && <agent.icon className={cn('w-3.5 h-3.5', agent.color)} />}
                {result.title}
              </h4>
              <button onClick={handleDiscard} className="text-gray-400 hover:text-gray-600 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-2">
              {result.content}
            </div>
            {result.formattedMessage && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSendResult}
                  className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="w-3 h-3" />
                  Enviar ao Lead
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDiscard}
                  className="h-7 text-[11px]"
                >
                  Descartar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
