# Guia de Integração - Sofia Vendedor ao Fluxo Existente

Este arquivo mostra **exatamente onde** adicionar o código para integrar Sofia Vendedor ao `flows.ts` existente.

## 📍 Localização do Código Atual

```
/Users/saraiva/_Projetos/appnovo_pratica/lib/sofia/flows.ts
```

Linhas aproximadas onde você vai adicionar a lógica:
- **Imports**: Line 1-50
- **Main Handler**: Procure por `export async function handleNewMessage` ou similar
- **Switch/If para detectar flow**: Procure por `detectIntent(text)` ou similar

## 🔧 PASSO 1: Adicionar Imports

**NO TOPO do `flows.ts`, adicione:**

```typescript
// ============================================
// IMPORTS - SOFIA VENDEDOR
// ============================================
import { 
  processarTextoVenda,
  iniciarFluxoVendaImovel,
  processarSelecaoImovel,
  confirmarAgendamento,
  ofertaAlternativa,
  type EstadoFluxoVenda,
} from './fluxo-vendedor';
```

## 🔧 PASSO 2: Integrar no Main Handler

Procure pela função principal que processa mensagens (algo como):

```typescript
export async function handleNewMessage(
  phone: string,
  text: string,
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<void> {
  // ... código existente ...
```

**ADICIONE ISTO NO INÍCIO DA FUNÇÃO (antes de qualquer outro processamento):**

```typescript
export async function handleNewMessage(
  phone: string,
  text: string,
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<void> {
  
  // ============================================
  // ⭐ NOVO: SOFIA VENDEDOR - VENDA DE IMÓVEL
  // ============================================
  
  // Tentar processar como fluxo de venda de imóvel PRIMEIRO
  const vendaResult = await processarTextoVenda(
    text,
    user,
    context,
    user.nome,
    user.telefone,
    user.tenant_id || 0
  );

  if (vendaResult.isVendaFlow) {
    // É uma conversa de venda de imóvel! ✓
    console.log('[Sofia] Fluxo de venda detectado');

    // Enviar mensagens agressivas
    await sendSplitMessages(phone, vendaResult.messages);

    // Se tem ação follow-up (enviar botões, etc)
    if (vendaResult.followUp) {
      await vendaResult.followUp(phone);
    }

    // Atualizar contexto da conversa
    context = vendaResult.context;

    // ⚠️ IMPORTANTE: Sair da função normal (não processar com AI)
    return;
  }

  // ============================================
  // FIM SOFIA VENDEDOR
  // ============================================

  // ... resto do código existente continua aqui ...
  // (detectIntent, fluxos normais, etc)
```

## 🔧 PASSO 3: Exportar Função Helper (Opcional)

Se você quiser usar Sofia Vendedor em outros lugares, adicione isto no final do `flows.ts`:

```typescript
// ============================================
// EXPORTS - SOFIA VENDEDOR
// ============================================

export {
  processarTextoVenda,
  iniciarFluxoVendaImovel,
  processarSelecaoImovel,
  confirmarAgendamento,
  ofertaAlternativa,
} from './fluxo-vendedor';
```

## 🎯 ESTRUTURA COMPLETA DO flows.ts (overview)

```typescript
// 1. IMPORTS (adicione Sofia Vendedor aqui)
import { procesarTextoVenda } from './fluxo-vendedor';

// 2. TIPOS
interface User { ... }
interface FlowResult { ... }

// 3. HANDLERS PRINCIPAIS
export async function handleNewMessage(
  phone: string,
  text: string,
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<void> {
  
  // ⭐ SOFIA VENDEDOR AQUI (ver PASSO 2)
  const vendaResult = await processarTextoVenda(...);
  if (vendaResult.isVendaFlow) {
    // ... processar venda ...
    return;
  }

  // ... resto dos flows (saudação, busca, simulação, etc) ...
}

// 4. FLOWS ESPECÍFICOS
async function handleGreeting(...) { ... }
async function handleSearchFlow(...) { ... }
async function handleSimulationFlow(...) { ... }
// ... outros flows existentes ...

// 5. EXPORTS
export { handleNewMessage, ... };
```

## 📝 EXEMPLO PRÁTICO COMPLETO

Aqui está como fica a integração na prática:

```typescript
/**
 * flows.ts - COM Sofia Vendedor Integrado
 */

import OpenAI from 'openai';
import { dbQuery } from '@/lib/db';
import {
  sendTextMessage,
  sendQuickButtons,
  // ... outros imports existentes
} from '@/lib/zapi';

// ⭐ NOVO: Sofia Vendedor
import { 
  processarTextoVenda,
  iniciarFluxoVendaImovel,
} from './fluxo-vendedor';

// ... outros imports ...

// ============================================
// HANDLERS
// ============================================

export async function handleNewMessage(
  phone: string,
  text: string,
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<void> {
  
  // Validações básicas
  if (!text || !user) return;

  // ⭐ PASSO 1: Verificar se é venda de imóvel
  const vendaResult = await processarTextoVenda(
    text,
    user,
    context,
    user.nome,
    user.telefone,
    user.tenant_id || 0
  );

  if (vendaResult.isVendaFlow) {
    // É venda de imóvel! Processar com Sofia Vendedor
    console.log('[Sofia Vendedor]', phone, '- Intenção detectada');

    // Enviar mensagens
    for (let i = 0; i < vendaResult.messages.length; i++) {
      const msg = vendaResult.messages[i];
      const typingSeconds = Math.min(15, Math.max(1, Math.round(msg.length / 50)));
      
      await sendTextMessage(phone, msg, { delayTyping: typingSeconds });
      
      if (i < vendaResult.messages.length - 1) {
        await delay(800);
      }
    }

    // Follow-up (enviar botões, etc)
    if (vendaResult.followUp) {
      await vendaResult.followUp(phone);
    }

    // Contexto atualizado
    context = vendaResult.context;

    // 🛑 IMPORTANTE: Não processar com IA, venda é manual
    return;
  }

  // ============================================
  // FLUXOS NORMAIS (código existente)
  // ============================================

  // Se chegou aqui, NÃO é venda de imóvel
  // Continuar com fluxos normais...

  // Detectar intent
  const intent = detectIntent(text);
  const greeting = isSimpleGreeting(text);

  // Fluxo de saudação
  if (greeting && context.topics_discussed.length === 0) {
    const result = await handleGreeting(user, context, agentConfig);
    // ... enviar saudação ...
    return;
  }

  // Fluxo de busca
  if (intent.action === 'buscar' || text.toLowerCase().includes('buscar')) {
    const result = await handleSearchFlow(user, text, context);
    // ... enviar resultados de busca ...
    return;
  }

  // ... outros fluxos existentes ...
}

// ============================================
// FLUXOS EXISTENTES (mantém igual)
// ============================================

async function handleGreeting(
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<FlowResult> {
  // ... código existente ...
}

async function handleSearchFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  // ... código existente ...
}

// ... outros fluxos ...
```

## 🧪 TESTE RÁPIDO

1. **Adicione o import:**
```typescript
import { processarTextoVenda } from './fluxo-vendedor';
```

2. **Teste em development:**
```bash
npm run dev
```

3. **Envie mensagem no WhatsApp:**
```
"Quero 2Q até 500k na Zona Sul"
```

4. **Verifique se Sofia responde com:**
```
🔥 ACHEI 3 OPÇÕES INCRÍVEIS PRA VOCÊ! 🔥
[1] Apt 1 - ...
[2] Apt 2 - ...
...
```

Se vir isso, integração funcionou! ✅

## 🐛 CHECKLIST DE INTEGRAÇÃO

- [ ] Adicionado import do `fluxo-vendedor`
- [ ] Adicionado check `processarTextoVenda` no início de `handleNewMessage`
- [ ] Adicionado `if (vendaResult.isVendaFlow)` com return
- [ ] Testado com mensagem de venda
- [ ] Verificado se Sofia responde com oferta agressiva
- [ ] Testado fluxo normal (busca, simulação) ainda funciona
- [ ] Verificado logs `[Sofia Vendedor]` no console
- [ ] Testado envio de botões WhatsApp

## ⚠️ PONTOS IMPORTANTES

### 1. ORDER MATTERS (Ordem importa)
O check de `processarTextoVenda` DEVE estar **antes** de outros fluxos:
```
✅ CERTO:
1. Check venda
2. Check saudação
3. Check busca

❌ ERRADO:
1. Check saudação (e "Quero apto" já foi processado como saudação!)
2. Check venda (nunca chega aqui)
```

### 2. Return é OBRIGATÓRIO
```typescript
if (vendaResult.isVendaFlow) {
  // ... enviar mensagens ...
  return; // 🔥 OBRIGATÓRIO! Sem isso, IA também responde
}
```

### 3. Contexto é atualizado
```typescript
context = vendaResult.context;
// Agora context.current_flow === 'venda_imovel'
// E context.awaiting_response === 'selecao_imovel'
// (na próxima mensagem do cliente, fluxo continua)
```

### 4. Tenant ID é necessário
```typescript
// Certifique-se que user.tenant_id existe
// Se não existir, usar default:
user.tenant_id || 0
```

## 🔄 FLUXO DA CONVERSA (Com Integração)

```
Cliente: "Quero 2Q até 500k na Zona Sul"
  ↓
handleNewMessage() chamado
  ↓
processarTextoVenda() detecta intenção ✓
  ↓
vendaResult.isVendaFlow === true
  ↓
Envia 3 imóveis + botões (return aqui!)
  ↓
Não chama IA (só respostas pré-configuradas)
  ↓
Contexto atualizado com flow: 'venda_imovel'

Cliente: "Agendar visita"
  ↓
handleNewMessage() chamado
  ↓
processarTextoVenda() reconhece fluxo contínuo
  ↓
Processa agendamento (dentro de vendaResult)
  ↓
Cria lead + confirma
  ↓
(ou: clica botão → webhook chama handler diferente)
```

## 📚 RECURSOS ADICIONAIS

- `vendedor-imovel.ts` - Funções core (detectar, buscar, oferecer)
- `vendedor-prompts.ts` - Prompts e templates por fase
- `fluxo-vendedor.ts` - Orquestração do pipeline
- `VENDEDOR-README.md` - Documentação completa

## 🎓 FAQ Integração

**P: E se o cliente estiver em um flow diferente (simulação)?**
A: O check de venda acontece PRIMEIRO, então prevalece. Se quiser mudar, ajuste a ordem.

**P: Sofia ainda vai responder com IA?**
A: Não! O `return` impede isso. Só respostas agressivas pré-configuradas.

**P: E se CVCRM não tiver imóveis?**
A: Sofia retorna mensagem informando que não encontrou, pede refinar critérios.

**P: Como testar sem cliente real?**
A: Use Postman/curl para POST `/api/sofia/message` com telefone de teste.

**P: Precisa mudar banco de dados?**
A: Não! Usa tabelas existentes: `cvcrm_leads`, `cvcrm_empreendimentos`, etc.

---

**Status**: ✅ Pronto para integração
**Tempo estimado**: 5-10 minutos
**Risco**: Baixo (código isolado, apenas adiciona fluxo novo)
