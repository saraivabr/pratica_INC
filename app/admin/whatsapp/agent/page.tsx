'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  MessageSquare,
  Settings,
  Sparkles,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  ArrowLeft,
  Smartphone,
  Power,
  Volume2,
  Send,
  TestTube,
  Brain,
  Timer,
  Heart,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, usePageTracking } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface AgentConfig {
  id?: string;
  isActive: boolean;
  agentName: string;
  agentRole: string;
  personality: 'amigavel' | 'profissional' | 'direto';
  autoReply: boolean;
  greetingMessage: string;
  fallbackMessage: string;
  escalationMessage: string;
  outOfHoursMessage: string;
  businessHours: { enabled: boolean; start: string; end: string; days: number[] };
  escalationKeywords: string[];
  escalationFrustrationThreshold: number;
  typingDelayMs: number;
  maxMessageLength: number;
  traits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  usePsychologicalAnalysis: boolean;
  useProactiveMessages: boolean;
}

interface WhatsAppInstance {
  instance_name: string;
  display_name: string;
  status: string;
  connection_state?: string;
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  analysis?: {
    intentDetected: string;
    intentConfidence: number;
    sentiment: string;
    frustrationLevel: number;
    responseTimeMs: number;
  };
}

const QUICK_TEST_MESSAGES = [
  { label: 'Saudação', message: 'Olá, boa tarde!' },
  { label: 'Preço', message: 'Quanto custa o apartamento?' },
  { label: 'Visita', message: 'Quero agendar uma visita' },
  { label: 'Reclamação', message: 'Estou muito insatisfeito com o atendimento' },
  { label: 'Gerente', message: 'Quero falar com o gerente' },
  { label: 'Financiamento', message: 'Vocês trabalham com financiamento?' },
];

const PERSONALITY_OPTIONS = [
  {
    value: 'amigavel',
    label: 'Amigável',
    description: 'Tom leve e acolhedor, usa emojis moderados',
    icon: Sparkles,
    color: 'text-pink-500',
  },
  {
    value: 'profissional',
    label: 'Profissional',
    description: 'Tom formal e objetivo, foco em resultados',
    icon: Shield,
    color: 'text-blue-500',
  },
  {
    value: 'direto',
    label: 'Direto',
    description: 'Respostas curtas e práticas, sem rodeios',
    icon: Zap,
    color: 'text-amber-500',
  },
];

const TRAIT_LABELS: Record<string, { label: string; description: string }> = {
  openness: { label: 'Abertura', description: 'Curiosidade e criatividade' },
  conscientiousness: { label: 'Organização', description: 'Segue processos e é metódica' },
  extraversion: { label: 'Extroversão', description: 'Sociabilidade e proatividade' },
  agreeableness: { label: 'Empatia', description: 'Acolhimento e compreensão' },
  neuroticism: { label: 'Calma', description: 'Resiliência a situações difíceis (menor = mais calmo)' },
};

export default function SofiaAgentOnboarding() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  usePageTracking('admin-sofia-agent');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    isActive: false,
    agentName: 'Sofia',
    agentRole: 'Assistente de vendas e suporte',
    personality: 'amigavel',
    autoReply: true,
    greetingMessage: 'Olá! Sou a Sofia, assistente virtual da Pratica Incorporadora. Como posso ajudá-lo hoje?',
    fallbackMessage: 'Desculpe, não entendi bem. Pode reformular sua pergunta?',
    escalationMessage: 'Vou transferir você para um atendente humano que poderá ajudá-lo melhor.',
    outOfHoursMessage: 'Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Deixe sua mensagem!',
    businessHours: { enabled: false, start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] },
    escalationKeywords: ['gerente', 'reclamação', 'problema grave'],
    escalationFrustrationThreshold: 7,
    typingDelayMs: 1500,
    maxMessageLength: 500,
    traits: {
      openness: 80,
      conscientiousness: 90,
      extraversion: 70,
      agreeableness: 90,
      neuroticism: 20,
    },
    usePsychologicalAnalysis: false,
    useProactiveMessages: false,
  });

  // Test chat state
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const hasAccess = user && (user.role === 'admin' || user.role === 'gerente');
  const workspaceId = (user as any)?.workspace_id || 1;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load config and instances
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load WhatsApp instances
        const instancesRes = await fetch(`/api/tenants/${workspaceId}/whatsapp`);
        const instancesData = await instancesRes.json();
        if (instancesData.success) {
          setInstances(instancesData.data || []);
          if (instancesData.data?.length > 0) {
            const firstInstance = instancesData.data[0].instance_name;
            setSelectedInstance(firstInstance);

            // Load agent config for the first instance
            await loadAgentConfig(firstInstance);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    if (hasAccess) {
      loadData();
    }
  }, [hasAccess]);

  // Load agent config when instance changes
  const loadAgentConfig = async (instanceName: string) => {
    try {
      const configRes = await fetch(`/api/agents/${encodeURIComponent(instanceName)}?tenantId=${workspaceId}`);
      const configData = await configRes.json();
      if (configData.success && configData.data) {
        // Merge with defaults preserving structure
        setConfig(prev => ({
          ...prev,
          ...configData.data,
          businessHours: {
            ...prev.businessHours,
            ...(configData.data.businessHours || {}),
          },
          traits: {
            ...prev.traits,
            ...(configData.data.traits || {}),
          },
        }));
      } else {
        // Reset to defaults for new instance
        setConfig(prev => ({
          ...prev,
          id: undefined,
          isActive: false,
        }));
      }
    } catch (err) {
      console.error('Error loading agent config:', err);
    }
  };

  // Reload config when instance changes
  useEffect(() => {
    if (selectedInstance) {
      loadAgentConfig(selectedInstance);
    }
  }, [selectedInstance]);

  const handleSave = async () => {
    if (!selectedInstance) {
      setError('Selecione uma instância WhatsApp');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: workspaceId,
          instanceName: selectedInstance,
          isActive: config.isActive,
          agentName: config.agentName,
          agentRole: config.agentRole,
          personality: config.personality,
          traits: config.traits,
          greetingMessage: config.greetingMessage,
          fallbackMessage: config.fallbackMessage,
          escalationMessage: config.escalationMessage,
          outOfHoursMessage: config.outOfHoursMessage,
          autoReply: config.autoReply,
          typingDelayMs: config.typingDelayMs,
          maxMessageLength: config.maxMessageLength,
          businessHours: config.businessHours,
          escalationKeywords: config.escalationKeywords,
          escalationFrustrationThreshold: config.escalationFrustrationThreshold,
          usePsychologicalAnalysis: config.usePsychologicalAnalysis,
          useProactiveMessages: config.useProactiveMessages,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Configurações salvas com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateTrait = (trait: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      traits: {
        ...prev.traits,
        [trait]: value,
      },
    }));
  };

  const sendTestMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    setTestMessages(prev => [...prev, { role: 'user', content: message }]);
    setTestInput('');
    setTestLoading(true);

    try {
      const res = await fetch('/api/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          tenantId: workspaceId,
          instanceName: selectedInstance,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            analysis: data.analysis,
          },
        ]);
      } else {
        setTestMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Erro ao processar mensagem: ' + (data.error || 'Erro desconhecido'),
          },
        ]);
      }
    } catch (err) {
      setTestMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Erro de conexão com o servidor',
        },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  const clearTestChat = () => {
    setTestMessages([]);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      case 'urgent':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊';
      case 'negative':
        return '😟';
      case 'urgent':
        return '⚡';
      default:
        return '😐';
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    const labels: Record<string, string> = {
      positive: 'positivo',
      negative: 'negativo',
      neutral: 'neutro',
      urgent: 'urgente',
    };
    return labels[sentiment] || sentiment;
  };

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!hasAccess) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores e gerentes podem acessar esta página.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/whatsapp')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Bot className="w-8 h-8 text-purple-600" />
                Onboarding do Agente Sofia
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure a IA que vai atender pelo WhatsApp
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-green-600">{success}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Switch */}
        <Card className={cn(
          'border-2 transition-colors',
          config.isActive ? 'border-green-500 bg-green-50/50' : 'border-gray-200'
        )}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-full',
                  config.isActive ? 'bg-green-500' : 'bg-gray-300'
                )}>
                  <Power className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Agente Sofia</h3>
                  <p className="text-muted-foreground">
                    {config.isActive ? 'Ativo e respondendo mensagens' : 'Desativado'}
                  </p>
                </div>
              </div>
              <Switch
                checked={config.isActive}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Instance Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Instância WhatsApp
            </CardTitle>
            <CardDescription>
              Selecione qual número o agente vai usar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {instances.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma instância WhatsApp configurada</p>
                <Button variant="outline" onClick={() => router.push('/admin/whatsapp')}>
                  Configurar WhatsApp
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {instances.map((instance) => (
                  <div
                    key={instance.instance_name}
                    onClick={() => setSelectedInstance(instance.instance_name)}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all',
                      selectedInstance === instance.instance_name
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        instance.connection_state === 'open' ? 'bg-green-500' : 'bg-red-500'
                      )} />
                      <div>
                        <p className="font-medium">{instance.display_name}</p>
                        <p className="text-sm text-muted-foreground">{instance.instance_name}</p>
                      </div>
                    </div>
                    {selectedInstance === instance.instance_name && (
                      <CheckCircle2 className="w-5 h-5 text-purple-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="personality" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="personality">Personalidade</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-1">
              <TestTube className="w-4 h-4" />
              Teste
            </TabsTrigger>
          </TabsList>

          {/* Personality Tab */}
          <TabsContent value="personality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tom de Comunicação</CardTitle>
                <CardDescription>Como a Sofia deve se comunicar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {PERSONALITY_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => setConfig(prev => ({ ...prev, personality: option.value as any }))}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        config.personality === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <option.icon className={cn('w-6 h-6', option.color)} />
                      <div className="flex-1">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {config.personality === option.value && (
                        <CheckCircle2 className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traços de Personalidade</CardTitle>
                <CardDescription>Ajuste fino do comportamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(config.traits).map(([trait, value]) => (
                  <div key={trait} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{TRAIT_LABELS[trait]?.label || trait}</Label>
                        <p className="text-xs text-muted-foreground">
                          {TRAIT_LABELS[trait]?.description}
                        </p>
                      </div>
                      <Badge variant="outline">{value}%</Badge>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={([newValue]) => updateTrait(trait, newValue)}
                      max={100}
                      step={5}
                      className="cursor-pointer"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Mensagem de Boas-vindas
                </CardTitle>
                <CardDescription>Primeira mensagem enviada a novos contatos</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={config.greetingMessage}
                  onChange={(e) => setConfig(prev => ({ ...prev, greetingMessage: e.target.value }))}
                  placeholder="Digite a mensagem de boas-vindas..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Use {'{nome}'} para incluir o nome do contato
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resposta Automática</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Responder automaticamente</Label>
                    <p className="text-sm text-muted-foreground">Sofia responde todas as mensagens</p>
                  </div>
                  <Switch
                    checked={config.autoReply}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoReply: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Apenas horário comercial</Label>
                    <p className="text-sm text-muted-foreground">Sofia só responde no horário definido</p>
                  </div>
                  <Switch
                    checked={config.businessHours.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      businessHours: { ...prev.businessHours, enabled: checked }
                    }))}
                  />
                </div>

                {config.businessHours.enabled && (
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <Label>Início</Label>
                      <Input
                        type="time"
                        value={config.businessHours.start}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          businessHours: { ...prev.businessHours, start: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label>Fim</Label>
                      <Input
                        type="time"
                        value={config.businessHours.end}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          businessHours: { ...prev.businessHours, end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Palavras de Escalação
                </CardTitle>
                <CardDescription>
                  Quando detectar essas palavras, transfere para um humano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {config.escalationKeywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          escalationKeywords: prev.escalationKeywords.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar palavra..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          setConfig(prev => ({
                            ...prev,
                            escalationKeywords: [...prev.escalationKeywords, input.value.trim()]
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      Chat de Teste
                    </CardTitle>
                    <CardDescription>
                      Teste como a Sofia responderá às mensagens
                    </CardDescription>
                  </div>
                  {testMessages.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearTestChat}>
                      Limpar Chat
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Test Buttons */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEST_MESSAGES.map((item, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => sendTestMessage(item.message)}
                      disabled={testLoading}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                {/* Chat Messages */}
                <div className="border rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-4 bg-gray-50">
                  {testMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Envie uma mensagem para testar o agente</p>
                      <p className="text-sm mt-1">Use os botões rápidos acima ou digite abaixo</p>
                    </div>
                  ) : (
                    testMessages.map((msg, index) => (
                      <div key={index} className={cn(
                        'flex flex-col',
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      )}>
                        <div className={cn(
                          'max-w-[80%] rounded-lg px-4 py-2',
                          msg.role === 'user'
                            ? 'bg-purple-500 text-white'
                            : 'bg-white border shadow-sm'
                        )}>
                          <p className="text-sm">{msg.content}</p>
                        </div>

                        {/* Analysis Card for Assistant Messages */}
                        {msg.role === 'assistant' && msg.analysis && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              {msg.analysis.intentDetected}
                              <span className="opacity-60">
                                ({Math.round(msg.analysis.intentConfidence * 100)}%)
                              </span>
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn('flex items-center gap-1', getSentimentColor(msg.analysis.sentiment))}
                            >
                              <span>{getSentimentIcon(msg.analysis.sentiment)}</span>
                              {getSentimentLabel(msg.analysis.sentiment)}
                            </Badge>
                            {msg.analysis.frustrationLevel > 5 && (
                              <Badge variant="outline" className="text-orange-500 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Frustração: {msg.analysis.frustrationLevel}/10
                              </Badge>
                            )}
                            <Badge variant="outline" className="flex items-center gap-1 text-gray-500">
                              <Timer className="w-3 h-3" />
                              {msg.analysis.responseTimeMs}ms
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {testLoading && (
                    <div className="flex items-start">
                      <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                          <span className="text-sm text-muted-foreground">Sofia está digitando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Digite uma mensagem de teste..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !testLoading) {
                        sendTestMessage(testInput);
                      }
                    }}
                    disabled={testLoading}
                  />
                  <Button
                    onClick={() => sendTestMessage(testInput)}
                    disabled={testLoading || !testInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Legenda da Análise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span className="text-muted-foreground">Intenção detectada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span className="text-muted-foreground">Sentimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-muted-foreground">Nível de frustração</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-gray-500" />
                    <span className="text-muted-foreground">Tempo de resposta</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button (Mobile) */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
