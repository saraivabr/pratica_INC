# Guia Rápido - IA Conversacional WhatsApp

## 🎯 Para Corretores

### O que a IA faz por você
- ✅ Responde leads instantaneamente (24/7)
- ✅ Qualifica e aquece leads automaticamente
- ✅ Passa apenas leads prontos para comprar
- ✅ Te dá todo o contexto da conversa

### Quando você recebe um lead

**Lead Quente 🔥 (responder em 1h)**
```
Score: 85-100
Sinais: Perguntou preço, quer visita, tem entrada
Ação: Ligar ou responder IMEDIATAMENTE
```

**Lead Morno 🟡 (responder em 24h)**
```
Score: 60-85  
Sinais: Interessado mas sem urgência
Ação: Entrar em contato sem pressionar
```

### Como responder

✅ **FAZER:**
- Ler conversa completa com IA (2 min)
- Usar mesmo tom natural da Sofia
- Confirmar informações que IA coletou
- Agradecer o interesse

❌ **NÃO FAZER:**
- Ignorar ou demorar pra responder
- Mudar completamente o tom
- Questionar informações da IA
- Ser muito formal/corporativo

### Exemplo de primeira mensagem

```
Oi João! Sou o Carlos 😊

A Sofia me passou seu caso. Vi que você tá 
interessado numa unidade de 3 quartos no 
Vista Verde, é isso mesmo?

Posso te passar mais detalhes agora?
```

---

## 💬 Para Gestores

### Métricas para Acompanhar

| Métrica | Meta | Como Ver |
|---------|------|----------|
| Taxa de resposta IA | >60% | Dashboard > IA Stats |
| Leads qualificados/dia | 15+ | Dashboard > Leads |
| Tempo até handoff | <48h | Relatório Conversões |
| Taxa conversão quentes | >80% | Dashboard > Pipeline |

### Alertas Importantes

**🔴 Alerta Crítico:** Lead quente sem resposta há 2h+  
**🟡 Alerta Atenção:** Lead morno sem resposta há 24h+  
**🔵 Info:** Novo lead atribuído

### Quando Ajustar

Ajuste as mensagens da IA se:
- Taxa de resposta < 50%
- Leads reclamam do bot
- Taxa de conversão baixa
- Muitos leads congelados

---

## 🛠️ Para Desenvolvedores

### Arquivos Principais

```
docs/AI_CONVERSACIONAL_WHATSAPP.md  - Guia completo
lib/whatsapp-bot-logic.ts           - Lógica do bot
lib/whatsapp-bot-example.ts         - Exemplos de uso
lib/whatsapp-templates.ts           - Templates mensagens
```

### Fluxo de Integração

```typescript
import { WhatsAppBot } from '@/lib/whatsapp-bot-logic';

// 1. Processar mensagem recebida
const response = WhatsAppBot.generateBotResponse(state, message);

// 2. Verificar se deve passar pro corretor
const { should, reason } = WhatsAppBot.shouldHandoffToCorretor(state, message);

// 3. Atualizar estado
const newState = WhatsAppBot.updateConversationState(state, message, response);

// 4. Enviar resposta
await sendWhatsAppMessage(phone, response.message);
```

### Calcular Score

```typescript
const score = WhatsAppBot.calculateLeadScore(context);
// { total: 95, temperature: 'hot', factors: {...} }
```

### Detectar Sinais

```typescript
WhatsAppBot.detectHotSignals(msg);    // true/false
WhatsAppBot.detectColdSignals(msg);   // true/false  
WhatsAppBot.detectHumanRequest(msg);  // true/false
```

---

## 📊 Classificação de Leads

### 🔥 QUENTE (Hot) - Score 86-100
**Passar IMEDIATO para corretor**

Sinais:
- Perguntou preço/tabela
- Quer agendar visita
- Mencionou valor de entrada
- Tem prazo definido
- 3+ perguntas específicas

### 🟡 MORNO (Warm) - Score 61-85
**Nutrir 2-3 dias → Passar**

Sinais:
- Respondeu positivamente
- Pediu informações
- Sem urgência aparente
- Está "pesquisando"

### 🔵 FRIO (Cold) - Score 31-60
**Nutrir até 7 dias**

Sinais:
- Respostas curtas
- "Só olhando"
- Sem prazo
- Pouco engajamento

### ❄️ CONGELADO (Frozen) - Score 0-30
**Pausar contato**

Sinais:
- Não responde (3 tentativas)
- "Não tenho interesse"
- Pediu para não contatar

---

## 🚦 Regras de Handoff

### ✅ Passar AGORA

1. Lead perguntou sobre **preços**
2. Lead quer **agendar visita**
3. Lead tem **entrada alta** (>R$50k)
4. Lead fez **3+ perguntas** específicas
5. Lead pediu **falar com vendedor**
6. Lead mencionou **urgência**

### ⏸️ NÃO Passar (ainda)

1. Lead só disse **"oi"**
2. Lead **não responde** perguntas
3. Lead **"só olhando"**
4. Primeiro contato há **menos de 4h**

---

## ⏰ Timing

| Ação | Quando |
|------|--------|
| Resposta inicial | 30s - 2min |
| Entre mensagens | 10s - 30s |
| 1º follow-up | 4 horas |
| 2º follow-up | 24 horas |
| 3º follow-up (último) | 48 horas |
| Nutrição morno | 48h |
| Nutrição frio | 72h |

## 📱 Horário de Operação

```
Seg-Sex: 8h - 20h
Sábado: 9h - 18h
Domingo: Apenas respostas
```

Fora do horário:
> "Recebi sua mensagem mas já passei do horário.  
> Vou te responder amanhã de manhã!"

---

## 🆘 Casos Especiais

### Lead Agressivo
→ Manter calma, transferir pro corretor

### Lead Pede Desconto Grande
→ Não prometer, passar pro corretor

### Lead Menciona Concorrente
→ Reforçar diferenciais, passar URGENTE

### Lead Quer Humano
→ Transferir IMEDIATAMENTE

### Lead Fora do Perfil
→ Educadamente redirecionar

---

## 📞 Contatos

**Suporte Técnico:** dev@pratica.com.br  
**Ajustar IA:** produto@pratica.com.br  
**Comercial:** comercial@pratica.com.br

---

**Versão:** 1.0  
**Atualizado:** Janeiro 2026
