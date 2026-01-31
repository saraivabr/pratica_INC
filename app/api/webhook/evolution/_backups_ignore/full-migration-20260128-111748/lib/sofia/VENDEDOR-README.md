# Sofia Vendedor - Sistema Agressivo de Venda de Imóvel via WhatsApp

## 📋 Visão Geral

Sofia agora funciona como uma **vendedora agressiva de imóveis** no WhatsApp. Detecta intenção de compra, busca imóveis em tempo real no CVCRM, oferece com urgência e cria leads automaticamente.

## 🎯 Objetivos

✅ Cliente: "Quero 2Q até 500k na Zona Sul"
Sofia: "Tenho 3 opções INCRÍVEIS pra você! 🔥 [Apt 1] - 450k - Rua tal - 80m² - Piscina. [Apt 2] - 480k - Rua tal2. Qual te interessa? Posso agendar visita HOJE!"

## 📁 Arquivos Criados

```
/Users/saraiva/_Projetos/appnovo_pratica/lib/sofia/
├── vendedor-imovel.ts          # Módulo principal (busca, filtros, lead)
├── vendedor-prompts.ts         # Prompts agressivos + templates
├── fluxo-vendedor.ts           # Orquestração do pipeline de venda
└── VENDEDOR-README.md          # Este arquivo
```

## 🔧 Como Funciona

### 1️⃣ Detectar Intenção de Compra

```typescript
import { detectarIntencaoCompra } from '@/lib/sofia/vendedor-imovel';

const resultado = detectarIntencaoCompra("Quero 2Q até 500k na Zona Sul");
// {
//   temIntencao: true,
//   filtros: { quartos: 2, precoMax: 500000, bairro: ['Zona Sul'] },
//   confidence: 0.95
// }
```

### 2️⃣ Buscar Imóveis em Tempo Real do CVCRM

```typescript
import { buscarImovelsCVCRM } from '@/lib/sofia/vendedor-imovel';

const imoveis = await buscarImovelsCVCRM({
  quartos: 2,
  precoMax: 500000,
  bairro: ['Zona Sul'],
});
// Retorna TOP 3 melhores matches com:
// - Nome, preço, localização
// - Metragem, amenidades
// - Disponibilidade em tempo real
```

### 3️⃣ Construir Oferta Agressiva

```typescript
import { construirOfertaAgressiva } from '@/lib/sofia/vendedor-imovel';

const oferta = construirOfertaAgressiva(imoveis, filtros);
// {
//   mensagemAbertura: "🔥 ACHEI 3 OPÇÕES INCRÍVEIS PRA VOCÊ! 🔥",
//   mensagensDetalhadas: [...],
//   botoes: [
//     { id: 'agendar_123', label: 'Agendar Visita - Apt 1' },
//     { id: 'detalhes_123', label: 'Mais Detalhes - Apt 1' },
//     ...
//   ]
// }
```

### 4️⃣ Enviar via WhatsApp

```typescript
import { enviarOfertaVenda } from '@/lib/sofia/vendedor-imovel';

await enviarOfertaVenda('5511999999999', oferta);
// Envia:
// 1. Abertura com urgência
// 2. Detalhes de cada imóvel (num, preço, localização, amenidades)
// 3. Botões de ação (Agendar/Detalhes)
// 4. Fechamento com CTA
```

### 5️⃣ Capturar Lead

```typescript
import { criarLeadVendedor, calcularScoreLead } from '@/lib/sofia/vendedor-imovel';

const lead = {
  nome: 'João Silva',
  whatsapp: '5511999999999',
  imovelInteressado: 'Apt Zona Sul',
  filtrosOriginais: { quartos: 2, precoMax: 500000 },
  score: calcularScoreLead(filtros),
  fonte: 'whatsapp_sofia',
};

const resultado = await criarLeadVendedor(lead, tenantId);
// Lead criado automaticamente no banco com score
```

## 🚀 Integração com Flows.ts Existente

No arquivo `flows.ts`, adicione esta lógica **antes** do fluxo normal:

```typescript
import { processarTextoVenda } from '@/lib/sofia/fluxo-vendedor';

export async function handleNewMessage(
  phone: string,
  text: string,
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<void> {
  // ... code existente ...

  // ⭐ NOVO: Tentar processar como VENDA DE IMÓVEL primeiro
  const vendaResult = await processarTextoVenda(
    text,
    user,
    context,
    user.nome,
    user.telefone,
    user.tenant_id || 0
  );

  if (vendaResult.isVendaFlow) {
    // É fluxo de venda! Usar respostas agressivas
    await sendSplitMessages(phone, vendaResult.messages);
    
    if (vendaResult.followUp) {
      await vendaResult.followUp(phone);
    }
    
    // Atualizar contexto
    context = vendaResult.context;
    return; // Sair do fluxo normal
  }

  // ... resto do código de fluxo normal ...
}
```

## 📊 Fluxo Completo da Venda

```
Cliente: "Quero 2Q até 500k"
       ↓
Sofia detecta intenção ✓
       ↓
Busca CVCRM em tempo real ✓
       ↓
Encontra 3 opções (300k-480k) ✓
       ↓
Sofia envia:
├── 🔥 Abertura agressiva
├── [1] Apt 1 - 450k - 80m² - Piscina
├── [2] Apt 2 - 480k - Moema - Academia
├── [3] Apt 3 - 380k - Bom Retiro - Novo
├── ⏰ "Esses valores são TODAY"
└── Botões: [Agendar] [Detalhes]
       ↓
Cliente clica [Agendar Apt 1]
       ↓
Sofia: "Qual dia? Hoje 14h ou amanhã 10h?"
       ↓
Cliente: "Hoje 14h"
       ↓
Sofia cria LEAD automaticamente:
├── Nome: João Silva
├── WhatsApp: 5511999999999
├── Imóvel: Apt 1 (450k)
├── Score: 85/100
└── Status: Novo Lead
       ↓
Corretor é notificado + segue up em 2h ✓
```

## 🎯 Fases da Venda

Sofia se adapta conforme a conversa avança:

### Fase 1: DESCOBERTA
- Cliente menciona que quer imóvel
- Sofia confirma critérios rapidinho
- Já busca opções

### Fase 2: APRESENTAÇÃO
- Sofia mostra 3 opções INCRÍVEIS
- Destaca benefícios, cria urgência
- Oferece botões de ação (Agendar/Detalhes)

### Fase 3: OBJEÇÃO (se houver)
- Cliente faz dúvida (preço, localização, etc)
- Sofia valida + reframe rapidinho
- Oferece alternativa ou simula

### Fase 4: FECHAMENTO
- Cliente manifesta interesse forte
- Sofia pede confirmação + dados
- Cria lead e confirma agendamento

### Fase 5: AGENDAMENTO
- Sofia confirma data/hora
- Envia endereço + próximos passos
- Lead criado e pronto pra follow-up

## 💡 Técnicas Agressivas Implementadas

### 1. URGÊNCIA
```
"🔥 Tá saindo RÁPIDO"
"Tenho só 3 em mãos"
"Semana que vem pode não ter"
"ESSES VALORES SÃO HOJE"
```

### 2. FOMO (Fear of Missing Out)
```
"Os melhores saem rápido"
"Deixei os 3 melhores pra você"
"Se não fechar hoje, próxima semana tá tudo vendido"
```

### 3. EMOJIS ESTRATÉGICOS
```
🔥 = Urgência/Hottest
💰 = Preço/Valor
📍 = Localização
✨ = Destaque/Premium
🎯 = Foco/Objetivo
📅 = Agendamento
🚀 = Ação rápida
```

### 4. BOTÕES DE AÇÃO
- "Agendar Visita" → Leva direto para data/hora
- "Mais Detalhes" → Abre ficha técnica/fotos
- "Simular" → Calcula parcela em tempo real

### 5. FECHAR COM AÇÃO
```
❌ "Você gostaria de agendar?" (fraco)
✅ "Qual dia bate melhor: hoje ou amanhã?" (ação)

❌ "Qual sua opinião?" (indefinido)
✅ "Qual te interessa mais: Apt 1 ou 2?" (decisão)
```

## 🔍 Detecção de Critérios

Sofia extrai automaticamente:

```
"Quero 2Q"           → quartos: 2
"até 500k"           → precoMax: 500000
"na Zona Sul"        → bairro: ['Zona Sul']
"com piscina"        → amenidades: ['piscina']
"com 80m² no mínimo" → metrogenMin: 80
```

## 📱 Dados Capturados no Lead

```javascript
{
  nome: "João Silva",
  whatsapp: "5511999999999",
  imovelInteressado: "Apt Zona Sul",
  filtrosOriginais: {
    quartos: 2,
    precoMax: 500000,
    bairro: ['Zona Sul'],
    amenidades: ['piscina'],
  },
  score: 85, // Automático: mais filtros = melhor lead
  fonte: "whatsapp_sofia",
  dataAgendamento: "2024-01-15 14:00",
  statusAgendamento: "confirmado",
}
```

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# CVCRM
CVCRM_API_KEY=xxxxx
CVCRM_BASE_URL=https://...

# WhatsApp
ZAPI_TOKEN=xxxxx
ZAPI_INSTANCE_ID=xxxxx

# Database
DATABASE_URL=postgresql://...
```

### Ajustar Urgência

Em `vendedor-prompts.ts`, ajuste:

```typescript
// Menos agressivo
urgencia: (dias: number = 7) => // Antes era 3
  `Imóvel interessante sai em ${dias} dias.`

// Mais agressivo
urgencia: (dias: number = 1) =>
  `🔥 ATENÇÃO: Sai HOJE! 🔥`
```

### Filtros CVCRM

Em `vendedor-imovel.ts`, ajuste a query SQL:

```typescript
// Adicionar novos filtros
export async function buscarImovelsCVCRM(filtros: FiltrosImovel) {
  // Exemplo: adicionar filtro de data de entrega
  if (filtros.dataEntregaMax) {
    conditions.push(`data_entrega <= $${paramIndex}`);
    params.push(filtros.dataEntregaMax);
  }
}
```

## 🧪 Testando

### Test 1: Detectar Intenção
```bash
cd /Users/saraiva/_Projetos/appnovo_pratica
npm test -- __tests__/sofia/vendedor-imovel.test.ts
```

### Test 2: Buscar Imóveis
```bash
# Verificar se CVCRM está respondendo
curl https://api-cvcrm.example.com/empreendimentos \
  -H "Authorization: Bearer YOUR_KEY"
```

### Test 3: Envio Real via WhatsApp
```
1. Enviar para número teste
2. Escrever: "Quero 2Q até 500k na Zona Sul"
3. Verificar se Sofia responde com oferta
```

## 🐛 Troubleshooting

### "Não encontrei imóveis"
- ✓ Verificar CVCRM está synced
- ✓ Verificar filtros não são muito restritivos
- ✓ Expandir busca (remover bairro específico)

### "Erro ao criar lead"
- ✓ Verificar tenant_id está correto
- ✓ Verificar permissões no banco
- ✓ Check logs: `[Sofia Vendedor] Erro ao criar lead`

### "Botões não aparecem"
- ✓ Verificar versão WhatsApp do cliente (precisa de updated)
- ✓ Verificar limite de botões (max 3 por vez)
- ✓ Usar `sendQuickButtons` ao invés de `sendActionButtons`

## 📈 Métricas para Acompanhar

```sql
-- Intenções detectadas por dia
SELECT DATE(created_at), COUNT(*) 
FROM cvcrm_leads 
WHERE origem = 'WhatsApp Sofia Vendedor'
GROUP BY DATE(created_at);

-- Taxa de conversão (intenção → agendamento)
SELECT COUNT(CASE WHEN data_agendamento IS NOT NULL THEN 1 END) * 100 / COUNT(*) as tx_conversao
FROM cvcrm_leads
WHERE origem = 'WhatsApp Sofia Vendedor';

-- Score médio dos leads
SELECT AVG(score), MIN(score), MAX(score)
FROM cvcrm_leads
WHERE origem = 'WhatsApp Sofia Vendedor';
```

## 🎓 Exemplo Completo

```typescript
// 1. Cliente manda mensagem
const texto = "Ô, quero um apto 3 quartos, até 600k, em Moema ou Vila Mariana, com piscina";
const nomeCliente = "Maria Silva";
const telefonCliente = "5511987654321";
const tenantId = 123;

// 2. Sofia processa
const resultado = await iniciarFluxoVendaImovel(
  texto,
  nomeCliente,
  telefonCliente,
  tenantId,
  context
);

// Resultado:
// {
//   temVenda: true,
//   messages: [
//     "🔥 ACHEI 3 OPÇÕES INCRÍVEIS PRA VOCÊ! 🔥",
//     "[1] Apt Vila Mariana - 550k - 85m² - Piscina + Academia",
//     "[2] Moema - 580k - 95m² - Piscina + Lazer",
//     "[3] Vila Mariana - 600k - 100m² - Piscina + Quadra",
//     "⏰ ESSES VALORES SÃO HOJE",
//     "Qual te interessa? Posso agendar HOJE!"
//   ],
//   botoesAcao: [
//     { id: 'agendar_123', label: '📅 Agendar Visita - Apt 1' },
//     { id: 'detalhes_123', label: '📋 Mais Detalhes - Apt 1' },
//     { id: 'agendar_456', label: '📅 Agendar Visita - Apt 2' },
//   ]
// }

// 3. Sofia envia mensagens + botões
await sendSplitMessages(phone, resultado.messages);
await delay(1000);
for (const botao of resultado.botoesAcao) {
  await sendQuickButtons(phone, botao.label, [
    { id: botao.id, text: botao.label }
  ]);
  await delay(300);
}

// 4. Cliente clica "Agendar Visita - Apt 1"
// → Sofia pergunta: "Qual dia? Hoje 14h ou amanhã 10h?"

// 5. Cliente responde: "Hoje 14h"
// → Sofia cria LEAD + confirma agendamento

// Lead criado:
// {
//   id: "lead_abc123",
//   nome: "Maria Silva",
//   whatsapp: "5511987654321",
//   origem: "WhatsApp Sofia Vendedor",
//   empreendimentos: ["Apt Vila Mariana 550k"],
//   score: 90,
//   data_agendamento: "2024-01-15 14:00",
//   status: "Novo Lead - Interesse Confirmado"
// }
```

## 🚀 Próximos Passos

1. **Integrar com flows.ts** - Adicionar lógica de venda aos flows existentes
2. **Testar com dados reais** - Verificar CVCRM está retornando dados corretos
3. **Treinar Sofia** - Adicionar mais variações de linguagem agressiva
4. **Analytics** - Acompanhar taxa de conversão por origem de clientes
5. **Escalabilidade** - Otimizar queries CVCRM para mil+ imóveis

## 📞 Suporte

Dúvidas? Consulte:
- `vendedor-imovel.ts` - Funções principais
- `vendedor-prompts.ts` - Prompts e templates
- `fluxo-vendedor.ts` - Orquestração
- Database: `cvcrm_leads`, `cvcrm_empreendimentos`, `cvcrm_unidades`

---

**Sofia Vendedor** ✨ - Transformando conversas em vendas desde 2024
