# 🚀 Plano de Melhorias - Migração de Features do CRM Clawd

**Data:** 28 de Janeiro de 2026
**Projeto:** appnovo_pratica
**Origem:** /Users/saraiva/clawd

---

## 📊 Análise Comparativa

### ✅ O que JÁ EXISTE no appnovo_pratica:
- [x] Sofia Vendedor implementada (lib/sofia/)
- [x] Sistema de autenticação OTP via WhatsApp
- [x] Lead scoring e recovery
- [x] Salva-leads backend parcial
- [x] Z-API integrado e funcionando
- [x] CVCRM integrado
- [x] Webhook WhatsApp (/api/webhook/zapi)
- [x] Database schema para leads

### ❌ O que PRECISA SER TRAZIDO do Clawd:

#### 1. **Sistema de Notificações Inteligentes** 🔔
**Origem:** `backend/routes/notificacoes.js` + `backend/services/notificacaoService.js`
- Notificações automáticas para corretor
- WhatsApp + Dashboard
- Tipos: novo_lead, lead_aqueceu, visitou, comprou
- Sistema de confirmação (1h antes da visita)
- Follow-up automático baseado em score

#### 2. **One-Click Actions** ⚡
**Origem:** `backend/routes/acoes-corretor.js`
- **Simulação Financeira**
  - Input: valor, taxa juros, prazo
  - Output: entrada, parcela, total
  - Envio automático pro cliente via WhatsApp
- **Agendamento de Visita**
  - Link Calendly ou escolha manual
  - Notifica cliente automaticamente
  - Cria evento no Google Calendar
- **Geração de Post**
  - IA cria post com heading, descrição, CTA
  - Hashtags automáticas
  - Pronto para copiar/colar

#### 3. **Analytics Dashboard Completo** 📈
**Origem:** `backend/routes/analytics.js`
- Taxa de conversão (leads → vendas)
- Métricas de vendas (visitaram, compraram)
- Tempo médio até venda
- Top imóveis (mais procurados)
- Gráficos em tempo real

#### 4. **Follow-up Automation** 🤖
**Origem:** `backend/services/followupAutomation.js`
- Follow-up baseado em score do lead
- Mensagens automáticas em intervalos inteligentes
- Integração com WhatsApp
- Escalation rules (se não responde em X dias)

#### 5. **Agendamento Service Robusto** 📅
**Origem:** `backend/services/agendamentoService.js`
- Criar agendamento completo
- Notificações 1h antes (WhatsApp)
- Confirmação do cliente
- Reagendamento fácil
- Integração Google Calendar

#### 6. **Dashboard Corretor** 💼
**Origem:** Nova implementação baseada em analytics
- Visão geral de leads
- Score por lead
- Ações rápidas (ligar, agendar, simular)
- Timeline de interações
- Métricas de performance

---

## 🎯 Plano de Implementação

### **FASE 1: Backend Core (Alta Prioridade)** ⚡
**Tempo estimado:** 2-3 horas

#### 1.1. Sistema de Notificações
```typescript
// app/api/notificacoes/route.ts
- GET /api/notificacoes → Listar notificações
- POST /api/notificacoes → Criar notificação
- PUT /api/notificacoes/:id → Marcar como lida
- GET /api/notificacoes/unread-count → Contagem não lidas
```

#### 1.2. One-Click Actions
```typescript
// app/api/acoes/simulacao/route.ts
POST /api/acoes/simulacao
Body: { leadId, valor, taxaJuros, prazo, whatsapp }
Response: { entrada, parcela, total, mensagemEnviada }

// app/api/acoes/agendar-visita/route.ts
POST /api/acoes/agendar-visita
Body: { leadId, dataVisita, hora, imovelId, corretor_id }
Response: { agendamentoId, notificacaoEnviada }

// app/api/acoes/gerar-post/route.ts
POST /api/acoes/gerar-post
Body: { imovelId, tipo: 'instagram' | 'facebook' }
Response: { heading, descricao, cta, hashtags }
```

#### 1.3. Analytics
```typescript
// app/api/analytics/conversao/route.ts
GET /api/analytics/conversao?tenant_id=1
Response: { total_leads, convertidos, taxa }

// app/api/analytics/vendas/route.ts
GET /api/analytics/vendas?tenant_id=1
Response: { visitaram, compraram, taxa }

// app/api/analytics/tempo-medio/route.ts
GET /api/analytics/tempo-medio?tenant_id=1
Response: { dias_medio, breakdown }

// app/api/analytics/top-imoveis/route.ts
GET /api/analytics/top-imoveis?tenant_id=1
Response: [{ imovel, leads, conversoes }]
```

### **FASE 2: Services Layer** 🔧
**Tempo estimado:** 2-3 horas

#### 2.1. Notificação Service
```typescript
// lib/services/notificacaoService.ts
- criarNotificacao(corretor_id, tipo, mensagem, lead_id)
- enviarNotificacaoWhatsApp(corretor, mensagem)
- agendarNotificacao1hAntes(agendamento_id)
- processarRespostaConfirmacao(telefone, resposta)
```

#### 2.2. Agendamento Service
```typescript
// lib/services/agendamentoService.ts
- criarAgendamento(dados)
- notificarCliente(agendamento_id)
- notificarCorretor(agendamento_id)
- confirmarVisita(agendamento_id)
- reagendar(agendamento_id, novaData)
```

#### 2.3. Follow-up Automation
```typescript
// lib/services/followupAutomation.ts
- iniciarFollowup(lead_id)
- calcularProximoFollowup(lead)
- enviarMensagemFollowup(lead)
- escalarParaGerente(lead_id)
```

### **FASE 3: Database Schema** 💾
**Tempo estimado:** 1 hora

#### 3.1. Novas Tabelas
```sql
-- Notificações
CREATE TABLE notificacoes (
  id SERIAL PRIMARY KEY,
  corretor_id INTEGER NOT NULL,
  lead_id INTEGER,
  tipo VARCHAR(50), -- novo_lead, lead_aqueceu, visitou, comprou
  mensagem TEXT,
  lida BOOLEAN DEFAULT FALSE,
  link_acao VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE agendamentos (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  cliente_nome VARCHAR(255),
  cliente_telefone VARCHAR(20),
  imovel_id INTEGER,
  corretor_id VARCHAR(50),
  data_visita TIMESTAMP,
  endereco_visita TEXT,
  status VARCHAR(50) DEFAULT 'pendente',
  confirmado BOOLEAN DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mensagens Follow-up
CREATE TABLE followups (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  mensagem TEXT,
  enviado_em TIMESTAMP,
  proximo_followup TIMESTAMP,
  resposta TEXT,
  respondeu BOOLEAN DEFAULT FALSE
);

-- Simulações
CREATE TABLE simulacoes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  valor DECIMAL(12,2),
  entrada DECIMAL(12,2),
  taxa_juros DECIMAL(5,2),
  prazo INTEGER,
  parcela DECIMAL(12,2),
  total DECIMAL(12,2),
  enviada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **FASE 4: Frontend Dashboard** 🎨
**Tempo estimado:** 3-4 horas

#### 4.1. Dashboard Corretor
```typescript
// app/corretor/dashboard/page.tsx
- Cards de métricas (leads, agendamentos, vendas)
- Lista de leads com scores
- Timeline de interações
- Botões de ação rápida
- Gráficos de conversão
```

#### 4.2. Página de Lead Individual
```typescript
// app/corretor/leads/[id]/page.tsx
- Dados completos do lead
- Score e status
- Histórico de mensagens
- Botões: Simular, Agendar, Enviar Post
- Timeline de follow-ups
```

#### 4.3. Analytics Dashboard
```typescript
// app/corretor/analytics/page.tsx
- Gráfico de conversão
- Métricas de vendas
- Top imóveis
- Tempo médio de venda
- Filtros por período
```

---

## 📁 Estrutura de Arquivos a Criar

```
app/
├── api/
│   ├── notificacoes/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   └── unread-count/route.ts
│   ├── acoes/
│   │   ├── simulacao/route.ts
│   │   ├── agendar-visita/route.ts
│   │   └── gerar-post/route.ts
│   └── analytics/
│       ├── conversao/route.ts
│       ├── vendas/route.ts
│       ├── tempo-medio/route.ts
│       └── top-imoveis/route.ts
│
├── corretor/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── leads/
│   │   └── [id]/page.tsx
│   └── analytics/
│       └── page.tsx
│
lib/
├── services/
│   ├── notificacaoService.ts
│   ├── agendamentoService.ts
│   └── followupAutomation.ts
│
├── migrations/
│   └── 002_melhorias_clawd.sql
│
components/
├── corretor/
│   ├── LeadCard.tsx
│   ├── LeadTimeline.tsx
│   ├── QuickActions.tsx
│   └── MetricsCard.tsx
```

---

## ✅ Checklist de Implementação

### Fase 1: Backend Core
- [ ] Criar `/api/notificacoes/route.ts`
- [ ] Criar `/api/acoes/simulacao/route.ts`
- [ ] Criar `/api/acoes/agendar-visita/route.ts`
- [ ] Criar `/api/acoes/gerar-post/route.ts`
- [ ] Criar `/api/analytics/conversao/route.ts`
- [ ] Criar `/api/analytics/vendas/route.ts`
- [ ] Criar `/api/analytics/tempo-medio/route.ts`
- [ ] Criar `/api/analytics/top-imoveis/route.ts`

### Fase 2: Services
- [ ] Criar `lib/services/notificacaoService.ts`
- [ ] Criar `lib/services/agendamentoService.ts`
- [ ] Criar `lib/services/followupAutomation.ts`

### Fase 3: Database
- [ ] Criar migration `002_melhorias_clawd.sql`
- [ ] Rodar migration no banco de desenvolvimento
- [ ] Validar schema

### Fase 4: Frontend
- [ ] Criar Dashboard Corretor
- [ ] Criar Página de Lead Individual
- [ ] Criar Analytics Dashboard
- [ ] Criar componentes reutilizáveis

### Fase 5: Testes
- [ ] Testar criação de notificação
- [ ] Testar simulação financeira
- [ ] Testar agendamento de visita
- [ ] Testar geração de post
- [ ] Testar analytics
- [ ] Testar follow-up automation

### Fase 6: Deploy
- [ ] Build local sem erros
- [ ] Testar em staging
- [ ] Deploy para produção
- [ ] Monitorar logs

---

## 🎬 Próximos Passos Imediatos

1. **Começar pela Fase 1** - Backend Core (APIs)
2. **Criar migration SQL** - Database schema
3. **Implementar services** - Lógica de negócio
4. **Desenvolver frontend** - Dashboard
5. **Testar end-to-end** - Validar fluxo completo
6. **Deploy produção** - Go live!

---

## 📞 Comandos Úteis

```bash
# Rodar migrations
cd /Users/saraiva/_Projetos/appnovo_pratica
psql $DATABASE_URL < lib/migrations/002_melhorias_clawd.sql

# Testar localmente
npm run dev

# Build
npm run build

# Deploy
git add -A
git commit -m "feat: migração melhorias clawd"
git push scalingo main
```

---

**Status:** 📋 Planejado
**Próximo:** 🚀 Iniciar Fase 1
