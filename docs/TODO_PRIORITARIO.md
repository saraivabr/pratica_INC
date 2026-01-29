# 📋 TODO Prioritário - Sistema Prática

**Data:** 28 Jan 2026  
**Status Core:** ✅ 100% Funcional  
**Commit atual:** a91e831

---

## 🔴 CRÍTICO - Bloqueadores (Fazer AGORA)

### 1. Sistema de Intermediação - BLOQUEADO

**Problema:** 33 rotas de API implementadas, mas **tabelas não existem no banco**.

**Status:**
- ✅ Frontend: 10 páginas refatoradas (2,268 linhas)
- ✅ Backend: 33 rotas de API funcionais
- ❌ Database: 6 tabelas faltando
- ❌ Nomenclatura: 3 padrões diferentes (inconsistente)

**Tabelas necessárias:**
```
• im_vendas            - Vendas imobiliárias
• im_beneficiarios     - Corretores/equipe que recebem
• im_distribuicao      - Split de comissão entre beneficiários
• im_parcelas          - Parcelamento das comissões
• im_pagamentos        - Pagamentos efetuados
• im_auditoria         - Log de alterações
```

**Ações:**
1. ✏️ Criar `migrations/020_sistema_intermediacao.sql` com schema completo
2. 🔧 Padronizar nomenclatura em ~15 arquivos de API:
   - `vendas_intermediacao` → `im_vendas`
   - `intermediacao_beneficiarios` → `im_beneficiarios`
   - etc.
3. 🚀 Aplicar migração no Scalingo
4. ✅ Testar endpoints end-to-end

**Impacto:** Se intermediação é core business, sistema não funciona sem isso.

**Tempo estimado:** 3-4 horas

---

### 2. WEBHOOK_BASE_URL - Produção

**Problema:** Código trava se não estiver configurado em produção.

**Localização:** `app/api/whatsapp/session/start/route.ts` (linha ~160)

```typescript
if (!baseUrl && process.env.NODE_ENV === 'production') {
  return NextResponse.json(
    { error: 'Configuração de webhook inválida' },
    { status: 500 }
  );
}
```

**Ação:**
```bash
# Scalingo
scalingo -a pratica --region osc-fr1 env-set \
  WEBHOOK_BASE_URL=https://app.pratica.com
```

**Impacto:** WhatsApp não conecta em produção sem isso.

**Tempo estimado:** 5 minutos

---

## 🟡 ALTA - Melhorias Importantes (Fazer LOGO)

### 3. README.md - Falta Documentação Raiz

**Problema:** Projeto sem README no root.

**Deve conter:**
```markdown
# Prática - Sistema Imobiliário Multi-Tenant

## Stack
- Next.js 16 + React 19 + TypeScript
- PostgreSQL (Scalingo) + Redis + MongoDB
- Evolution API (WhatsApp multi-tenant)
- OpenAI (Sofia - IA)

## Instalação
...

## Variáveis de Ambiente
...

## Deploy
...

## Arquitetura
...
```

**Tempo estimado:** 1 hora

---

### 4. Testes Automatizados - Cobertura Baixa

**Status atual:**
- 📁 Diretório `__tests__` existe
- 📝 Apenas 5 arquivos de teste
- ❌ Cobertura insuficiente para sistema crítico

**Testes essenciais faltando:**
```
• auth-flow.test.ts              - Login, OTP, sessão
• whatsapp-connection.test.ts    - Pairing code, QR code, webhook
• multi-tenant-isolation.test.ts - Garantir isolamento
• evolution-api-client.test.ts   - Mocks das chamadas Evolution
• salva-leads-flow.test.ts       - Bot automático
```

**Frameworks disponíveis:**
- ✅ Vitest (configurado)
- ✅ Playwright (e2e)

**Ação:** Criar testes para fluxos críticos primeiro.

**Tempo estimado:** 8-12 horas (dividir em sprints)

---

### 5. Variáveis de Ambiente - Documentação

**Problema:** 20+ variáveis encontradas no código, mas sem documentação central.

**Críticas encontradas:**
```bash
# Evolution API
EVOLUTION_BASE_URL
EVOLUTION_API_KEY
EVOLUTION_WEBHOOK_SECRET
WEBHOOK_BASE_URL           # ⚠️ Obrigatória em produção

# Database
DATABASE_URL
SCALINGO_REDIS_URL

# CV CRM (10+ tokens)
CVCRM_BASE_URL
CVCRM_EMAIL
CVCRM_TOKEN_LEAD
CVCRM_TOKEN_CORRETOR
...

# OpenAI
OPENAI_API_KEY

# Auth
ADMIN_SECRET_KEY
BYPASS_OTP_CODE
CRON_SECRET
```

**Ação:** Criar `.env.example` documentado + seção no README.

**Tempo estimado:** 1 hora

---

## 🟢 MÉDIA - Nice to Have (Fazer DEPOIS)

### 6. Otimizações de Performance

**Oportunidades identificadas:**

#### Database
- [ ] Adicionar indexes em queries lentas
- [ ] Implementar connection pooling otimizado
- [ ] Cache Redis para queries frequentes (CV CRM já usa!)

#### Frontend
- [ ] Code splitting por rota
- [ ] Lazy loading de componentes pesados
- [ ] Otimizar bundle size (atualmente?)

#### APIs
- [ ] Rate limiting (Redis já disponível)
- [ ] Pagination em todas as listagens (já tem em algumas)
- [ ] Compression (gzip/brotli)

**Tempo estimado:** 4-6 horas

---

### 7. Monitoramento e Observabilidade

**Faltando:**
- [ ] Logs estruturados (winston/pino)
- [ ] Métricas de performance (Prometheus/Grafana?)
- [ ] Error tracking (Sentry/Rollbar?)
- [ ] APM (New Relic/Datadog?)

**Scalingo tem:**
- ✅ Logs nativos (`scalingo logs -f`)
- ✅ Métricas básicas (CPU, RAM, requests)

**Ação:** Avaliar necessidade vs custo.

**Tempo estimado:** 2-4 horas (setup inicial)

---

### 8. Features WhatsApp Extras

**Já implementado:**
- ✅ Salva-Leads (bot automático com pausa manual)
- ✅ Disparador de Eventos (convites + lembretes)
- ✅ Sofia (IA genérica)
- ✅ Pairing Code + QR Code
- ✅ Webhook isolado por tenant

**Possíveis adições:**
- [ ] Envio de mídia (imagem/vídeo/doc) via API
- [ ] Templates de mensagem (quick replies)
- [ ] Campanhas agendadas (bulk send)
- [ ] Analytics de conversas (taxa de resposta, etc)
- [ ] Chatbot com fluxos visuais (low-code?)

**Tempo estimado:** Varia por feature (4-16 horas cada)

---

### 9. Dashboards e Relatórios

**Status:**
- ✅ Já existe: `/admin/intermediacao/relatorios` (se tabelas existirem)
- ✅ Componentes: 172 componentes UI disponíveis

**Possíveis melhorias:**
- [ ] Dashboard de métricas WhatsApp (mensagens/dia, taxa resposta)
- [ ] Relatório de vendas com gráficos (Recharts já instalado!)
- [ ] Exportação Excel/PDF (react-pdf já instalado!)
- [ ] Filtros avançados e salvos

**Tempo estimado:** 4-8 horas por dashboard

---

## 📊 Resumo Executivo

### Situação Atual
```
✅ Core: 100% funcional
   • Multi-tenancy seguro
   • WhatsApp por corretor (Evolution API)
   • Webhook isolado
   • 165 queries isoladas
   • 163 rotas de API

❌ Intermediação: BLOQUEADO
   • 33 APIs prontas
   • 6 tabelas faltando
   • Migração não criada

⚠️ Testes/Docs: Insuficiente
   • 5 testes apenas
   • Sem README raiz
   • Variáveis não documentadas
```

### Prioridade de Execução

**Esta Semana:**
1. 🔴 WEBHOOK_BASE_URL em produção (5 min)
2. 🔴 Sistema de Intermediação (3-4h) **[SE FOR CORE BUSINESS]**
3. 🟡 README.md (1h)
4. 🟡 .env.example documentado (1h)

**Próxima Semana:**
5. 🟡 Testes críticos (8h dividido em 2-3 dias)
6. 🟢 Otimizações de performance (4-6h)

**Backlog:**
7. 🟢 Monitoramento avançado (avaliar necessidade)
8. 🟢 Features WhatsApp extras (conforme demanda)
9. 🟢 Dashboards adicionais (conforme demanda)

---

## ❓ Decisões Necessárias

### 1. Sistema de Intermediação é Core Business?

**Se SIM:** 🔴 Prioridade máxima - sistema não funciona sem isso
**Se NÃO:** 🟢 Pode ser removido ou mantido como "futuro"

**Evidências de que É importante:**
- 33 rotas de API implementadas
- 10 páginas admin dedicadas
- 2,268 linhas de código refatoradas
- Commit específico (a91e831) para isso

### 2. Investir em Monitoramento Pago?

**Opções:**
- Gratuito: Scalingo logs + métricas nativas
- Pago: Sentry ($26/mês), New Relic ($99/mês), Datadog ($$$)

**Recomendação:** Começar com gratuito, avaliar após crescimento.

### 3. Priorizar Features ou Testes?

**Features primeiro:**
- ✅ Entregar valor rápido
- ❌ Débito técnico cresce

**Testes primeiro:**
- ✅ Código mais confiável
- ❌ Entrega mais lenta

**Recomendação:** **50/50** - Testar o que já funciona enquanto adiciona features novas.

---

## 🎯 Recomendação Final

### Ação Imediata (Hoje)
```bash
# 1. Configurar webhook em produção (5 min)
scalingo -a pratica --region osc-fr1 env-set WEBHOOK_BASE_URL=https://app.pratica.com

# 2. Decidir sobre intermediação (conversa de 10 min)
# É core business? Se sim, criar migração amanhã.
```

### Próximos Passos (Esta Semana)
1. **Dia 1-2:** Sistema de Intermediação (SE for core)
2. **Dia 3:** README + .env.example
3. **Dia 4-5:** Testes dos fluxos críticos

### Próximas 2 Semanas
- Completar testes essenciais
- Otimizações de performance
- Monitoramento básico

**Sistema está 80% pronto.** O core funciona, falta polimento e features secundárias.

---

**Criado em:** 28 Jan 2026  
**Por:** Claude (Moltbot)  
**Baseado em:** Análise completa do commit a91e831 + estrutura do projeto
