# Sistema de Score Automático de Leads - Guia de Uso

## 🚀 Início Rápido

### Para Desenvolvedores

#### 1. Importar Componentes

```typescript
import {
  LeadScoreBadge,
  LeadScoreCard,
} from "@/components/lead"
import {
  calculateLeadScore,
  getTemperatureConfig,
} from "@/utils/leadScore"
import type { Lead } from "@/types/lead"
import type { LeadScore } from "@/types/leadScore"
```

#### 2. Calcular Score de um Lead

```typescript
const lead: Lead = {
  id: "123",
  nome: "João Silva",
  email: "joao@email.com",
  telefone: "(11) 99999-9999",
  empreendimento: {
    id: 1,
    nome: "Apartamento Premium",
    valor: 450000,
    tipo: "apartamento"
  },
  interacoes: [
    {
      id: 1,
      descricao: "Cliente interessado",
      data_cad: "2024-01-15T10:00:00Z",
      tipo: "whatsapp"
    },
    {
      id: 2,
      descricao: "Agendada reunião",
      data_cad: "2024-01-15T14:30:00Z",
      tipo: "reuniao"
    }
  ],
  corretor: "Maria Oliveira",
  data_cad: "2024-01-10T08:00:00Z"
}

// Calcular score
const leadScore = calculateLeadScore({ lead })

console.log(leadScore)
// {
//   leadId: "123",
//   score: 85,
//   temperature: "Quente",
//   priority: 9,
//   actionCategory: "atacar_agora",
//   actionMessage: "Lead muito ativo! Momento ideal...",
//   mainReason: "Múltiplas interações recentes...",
//   factors: {
//     tempoSemResposta: 25,
//     interacaoRecente: 24,
//     tipoImovel: 16,
//     acoesCliente: 14,
//     historicoCorretor: 6
//   },
//   ...
// }
```

#### 3. Usar Componentes Visuais

##### Badge Simples

```tsx
<LeadScoreBadge
  temperature={leadScore.temperature}
  score={leadScore.score}
  showScore={true}
/>
```

##### Card Detalhado

```tsx
<LeadScoreCard
  leadScore={leadScore}
  showBreakdown={true}
  variant="detailed"
/>
```

##### Card Compacto

```tsx
<LeadScoreCard
  leadScore={leadScore}
  variant="compact"
/>
```

### Para Corretores (Uso no Sistema)

#### 1. Visualizar Leads Ordenados por Prioridade

Acesse `/leads` para ver todos os leads ordenados automaticamente:
- Leads em **Risco** aparecem primeiro (requerem ação urgente)
- Depois **Quentes** (alta prioridade)
- Depois **Mornos** (média prioridade)
- Por último **Frios** (baixa prioridade)

#### 2. Identificar Leads Prioritários

Cada lead mostra um badge colorido:
- 🔥 **Verde** = Quente → Atacar agora!
- 🌤️ **Amarelo** = Morno → Acompanhar de perto
- ❄️ **Cinza** = Frio → Manter no radar
- ⚠️ **Vermelho** = Risco → Ação urgente!

#### 3. Entender o Score

Click em um lead para ver:
- **Score total** (0-100)
- **Breakdown** dos fatores que compõem o score
- **Recomendação** de ação específica
- **Motivo principal** do score

#### 4. Tomar Ação

Use os botões no card do lead:
- **Simular**: Ver mensagem sem enviar
- **Enviar**: Enviar mensagem de contato

## 📖 Exemplos de Uso

### Exemplo 1: Lead Quente com Alto Engajamento

```typescript
const leadQuente: Lead = {
  id: "001",
  nome: "Carlos Mendes",
  celular: "(11) 98888-7777",
  empreendimento: {
    id: 5,
    nome: "Cobertura Jardim Europa",
    valor: 1200000,
    tipo: "cobertura"
  },
  interacoes: [
    {
      descricao: "Primeiro contato via site",
      data_cad: "2024-01-10T09:00:00Z",
      tipo: "cadastro"
    },
    {
      descricao: "Ligação - cliente muito interessado",
      data_cad: "2024-01-11T10:30:00Z",
      tipo: "ligacao"
    },
    {
      descricao: "WhatsApp - solicitou mais fotos",
      data_cad: "2024-01-12T14:00:00Z",
      tipo: "whatsapp"
    },
    {
      descricao: "Visita agendada para amanhã",
      data_cad: "2024-01-14T16:00:00Z",
      tipo: "reuniao"
    }
  ],
  corretor: { nome: "Ana Paula" },
  data_cad: "2024-01-10T09:00:00Z"
}

const score = calculateLeadScore({ lead: leadQuente })
// Score esperado: ~90
// Temperatura: Quente
// Ação: atacar_agora
// Mensagem: "Lead muito ativo! Momento ideal para fechar negócio"
```

### Exemplo 2: Lead em Risco (Sem Contato)

```typescript
const leadRisco: Lead = {
  id: "002",
  nome: "Fernanda Costa",
  telefone: "(21) 97777-6666",
  empreendimento: {
    id: 3,
    nome: "Casa Condomínio Alphaville",
    valor: 850000,
    tipo: "casa"
  },
  interacoes: [
    {
      descricao: "Cadastro inicial via landing page",
      data_cad: "2024-01-01T08:00:00Z",
      tipo: "cadastro"
    },
    {
      descricao: "Primeira ligação - não atendeu",
      data_cad: "2024-01-02T10:00:00Z",
      tipo: "ligacao"
    }
  ],
  data_cad: "2024-01-01T08:00:00Z"
}

const score = calculateLeadScore({ lead: leadRisco })
// Score esperado: ~20
// Temperatura: Risco
// Ação: recuperar
// Mensagem: "Lead em risco de perda. Contato urgente necessário..."
// Motivo: "Sem interação há mais de 14 dias"
```

### Exemplo 3: Lead Morno em Andamento

```typescript
const leadMorno: Lead = {
  id: "003",
  nome: "Roberto Alves",
  celular: "(11) 96666-5555",
  email: "roberto@email.com",
  empreendimento: {
    id: 7,
    nome: "Apartamento Vila Madalena",
    valor: 680000,
    tipo: "apartamento"
  },
  interacoes: [
    {
      descricao: "Primeiro contato",
      data_cad: "2024-01-08T09:00:00Z",
      tipo: "whatsapp"
    },
    {
      descricao: "Enviou documentação",
      data_cad: "2024-01-09T11:00:00Z",
      tipo: "email"
    },
    {
      descricao: "Reunião de análise",
      data_cad: "2024-01-10T15:00:00Z",
      tipo: "reuniao"
    },
    {
      descricao: "Aguardando aprovação de crédito",
      data_cad: "2024-01-12T10:00:00Z",
      tipo: "nota"
    }
  ],
  corretor: { nome: "Pedro Santos" },
  data_cad: "2024-01-08T09:00:00Z"
}

const score = calculateLeadScore({ lead: leadMorno })
// Score esperado: ~65
// Temperatura: Morno
// Ação: acompanhar
// Mensagem: "Lead em andamento. Manter acompanhamento regular..."
```

## 🔧 Uso da API

### Calcular Score de um Lead Específico

```bash
GET /api/leads/score/123
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "leadId": "123",
    "leadName": "João Silva",
    "leadScore": {
      "score": 85,
      "temperature": "Quente",
      "priority": 9,
      "actionCategory": "atacar_agora",
      "actionMessage": "Lead muito ativo! Momento ideal...",
      "mainReason": "Múltiplas interações recentes...",
      "factors": {
        "tempoSemResposta": 25,
        "interacaoRecente": 24,
        "tipoImovel": 16,
        "acoesCliente": 14,
        "historicoCorretor": 6
      },
      "factorDetails": [...]
    }
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Calcular Scores em Batch

```bash
POST /api/leads/score/stats
Content-Type: application/json

{
  "leadIds": ["123", "456", "789"]
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalLeads": 3,
    "scores": [
      {
        "leadId": "123",
        "leadName": "João Silva",
        "score": 85,
        "temperature": "Quente",
        "priority": 9,
        ...
      },
      ...
    ]
  }
}
```

### Obter Estatísticas Gerais

```bash
GET /api/leads/score/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalLeads": 142,
    "averageScore": 58,
    "distribution": {
      "Quente": 28,
      "Morno": 46,
      "Frio": 53,
      "Risco": 15
    },
    "actionCategories": {
      "atacar_agora": 35,
      "acompanhar": 52,
      "recuperar": 18,
      "manter_contato": 24,
      "revisar": 13
    },
    "topPriorityLeads": [
      {
        "leadId": "001",
        "nome": "Maria Silva",
        "score": 95,
        "temperature": "Quente"
      },
      ...
    ]
  }
}
```

## 🎯 Casos de Uso

### 1. Dashboard de Corretores

```tsx
function DashboardCorretor() {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    fetch('/api/leads/score/stats')
      .then(res => res.json())
      .then(data => setStats(data.data))
  }, [])
  
  return (
    <div>
      <h2>Seus Leads Prioritários</h2>
      {stats?.topPriorityLeads.map(lead => (
        <LeadCard key={lead.leadId} lead={lead} />
      ))}
      
      <h3>Distribuição</h3>
      <DistributionChart data={stats?.distribution} />
    </div>
  )
}
```

### 2. Lista de Leads com Filtro

```tsx
function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [filter, setFilter] = useState<LeadTemperature | 'all'>('all')
  
  const leadsWithScore = leads.map(lead => ({
    ...lead,
    score: calculateLeadScore({ lead })
  }))
  
  const filteredLeads = filter === 'all'
    ? leadsWithScore
    : leadsWithScore.filter(l => l.score.temperature === filter)
  
  const sortedLeads = filteredLeads.sort((a, b) => 
    b.score.priority - a.score.priority
  )
  
  return (
    <div>
      <FilterButtons value={filter} onChange={setFilter} />
      {sortedLeads.map(lead => (
        <LeadCardWithScore key={lead.id} lead={lead} />
      ))}
    </div>
  )
}
```

### 3. Notificações de Leads em Risco

```tsx
function LeadRiskNotifications() {
  const [riskLeads, setRiskLeads] = useState([])
  
  useEffect(() => {
    const checkRiskLeads = async () => {
      const res = await fetch('/api/leads/score/stats', {
        method: 'POST',
        body: JSON.stringify({})
      })
      const data = await res.json()
      
      const risks = data.data.scores
        .filter(s => s.temperature === 'Risco')
        .slice(0, 5)
      
      setRiskLeads(risks)
    }
    
    checkRiskLeads()
    const interval = setInterval(checkRiskLeads, 3600000) // A cada hora
    
    return () => clearInterval(interval)
  }, [])
  
  if (riskLeads.length === 0) return null
  
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Atenção: {riskLeads.length} leads em risco!</AlertTitle>
      <AlertDescription>
        {riskLeads.map(lead => (
          <div key={lead.leadId}>
            {lead.leadName} - {lead.mainReason}
          </div>
        ))}
      </AlertDescription>
    </Alert>
  )
}
```

## 💡 Dicas e Melhores Práticas

### Para Desenvolvedores

1. **Cache de Scores**: Considere cachear scores por alguns minutos para evitar recálculos constantes
2. **Lazy Loading**: Calcule scores apenas para leads visíveis na tela
3. **Batch Processing**: Use a API de batch quando processar múltiplos leads
4. **Paginação**: Combine ordenação por score com paginação para performance

### Para Corretores

1. **Rotina Matinal**: Comece o dia pelos leads em Risco
2. **Priorização**: Ataque leads Quentes antes que esfriem
3. **Nutrição**: Mantenha contato regular com leads Mornos
4. **Revisão**: Avalie periodicamente se vale continuar com leads Frios
5. **Documentação**: Registre todas as interações para melhorar o score

## 🔍 Troubleshooting

### Score Sempre Baixo

**Problema**: Todos os leads têm score baixo

**Soluções**:
- Verifique se as interações estão sendo registradas corretamente
- Confirme que as datas estão no formato correto (ISO 8601)
- Valide se os empreendimentos têm informações completas

### Badge Não Aparece

**Problema**: Badge de temperatura não é exibido

**Soluções**:
- Verifique se o score foi calculado (`lead.leadScore` existe)
- Confirme importação do componente: `import { LeadScoreBadge } from "@/components/lead"`
- Verifique se há erros no console do navegador

### API Retorna Erro 500

**Problema**: Endpoint de score retorna erro

**Soluções**:
- Verifique se o lead existe no sistema
- Confirme estrutura de dados do lead
- Veja logs do servidor para detalhes do erro

## 📚 Referências

- [Documentação Completa de Regras](./LEAD_SCORING.md)
- [Guia Visual da Interface](./LEAD_SCORING_UI.md)
- [Tipos TypeScript](../types/leadScore.ts)
- [Utilitários de Cálculo](../utils/leadScore.ts)
- [Componentes Visuais](../components/lead/)

---

**Desenvolvido para maximizar conversões e eficiência** 🚀
