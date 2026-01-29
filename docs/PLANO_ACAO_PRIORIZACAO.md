# 🎯 PLANO DE AÇÃO PRIORIZADO - Pratica IA

**Data:** 22 de Janeiro de 2026  
**Baseado em:** Análise completa do código (ANALISE_COMPLETA.md)  
**Objetivo:** Roteiro de melhorias priorizadas por urgência e impacto

---

## 📊 MATRIZ DE PRIORIZAÇÃO

### Critérios de Priorização
- **Urgência:** Crítico (24h) → Alto (1 semana) → Médio (1 mês) → Baixo (3+ meses)
- **Impacto:** Segurança > Funcionalidade > Performance > Qualidade
- **Esforço:** P (Pequeno: <4h) | M (Médio: 1-3 dias) | G (Grande: 1-2 semanas)

---

## 🚨 FASE 1: CRÍTICO (24-48 HORAS)

**Objetivo:** Eliminar vulnerabilidades de segurança que impedem uso seguro em produção

### 1.1 Vulnerabilidade XSS - httpOnly Cookie ⚠️ CRÍTICO
**Urgência:** 🔴 Crítico (24h)  
**Impacto:** 🔴 Alto - Permite roubo de tokens de sessão via XSS  
**Esforço:** 🟢 P (15 minutos)

**Arquivo:** `app/api/auth/admin-login/route.ts` (linha 57)

**Mudança:**
```typescript
// ANTES (linha 57):
httpOnly: false,

// DEPOIS:
httpOnly: true,
```

**Validação:**
- [ ] Testar login admin funciona
- [ ] Verificar cookie não acessível via `document.cookie` no console browser
- [ ] Confirmar sessões persistem corretamente

---

### 1.2 TypeScript Errors Ignorados em Produção ⚠️ CRÍTICO
**Urgência:** 🔴 Crítico (24h)  
**Impacto:** 🔴 Alto - Código com erros pode chegar à produção  
**Esforço:** 🟡 M (1-2 dias para corrigir todos erros)

**Arquivo:** `next.config.mjs` (linha 3-4)

**Mudança:**
```typescript
// ANTES:
typescript: {
  ignoreBuildErrors: true,
},

// DEPOIS:
typescript: {
  ignoreBuildErrors: false,
},
```

**Ações:**
1. [ ] Rodar `pnpm run build` e listar todos erros TypeScript
2. [ ] Corrigir erros críticos (tipos incorretos, imports faltando)
3. [ ] Para warnings não-críticos, adicionar `// @ts-expect-error` com justificativa
4. [ ] Fazer build passar com sucesso
5. [ ] Commitar mudança no next.config.mjs

---

### 1.3 Geração OTP Não-Criptográfica ⚠️ ALTO
**Urgência:** 🟠 Alto (48h)  
**Impacto:** 🟠 Médio-Alto - Códigos OTP previsíveis  
**Esforço:** 🟢 P (30 minutos)

**Arquivo:** `app/api/auth/send-otp/route.ts` (linha ~100)

**Mudança:**
```typescript
// ANTES:
const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

// DEPOIS:
import crypto from 'crypto'

function generateSecureOTP(): string {
  const buffer = crypto.randomBytes(3) // 3 bytes = 24 bits
  const number = buffer.readUIntBE(0, 3) // Read as big-endian unsigned int
  return (number % 900000 + 100000).toString() // Range: 100000-999999
}

const otpCode = generateSecureOTP()
```

**Validação:**
- [ ] Testar geração 1000 códigos, verificar distribuição uniforme
- [ ] Verificar sempre 6 dígitos
- [ ] Confirmar OTP funciona no fluxo login completo

---

### 1.4 Remover OTP de Resposta API ⚠️ ALTO
**Urgência:** 🟠 Alto (48h)  
**Impacto:** 🟠 Médio - Facilita bypass segurança em dev  
**Esforço:** 🟢 P (10 minutos)

**Arquivo:** `app/api/auth/send-otp/route.ts` (linha ~87)

**Mudança:**
```typescript
// ANTES:
if (process.env.NODE_ENV !== 'production') {
  return NextResponse.json({ 
    success: true, 
    code: otpCode  // ⚠️ REMOVER
  })
}

// DEPOIS:
// Apenas log no servidor, NUNCA na resposta
console.log(`[DEV ONLY] OTP para ${phone}: ${otpCode}`)

return NextResponse.json({ 
  success: true,
  message: process.env.NODE_ENV !== 'production' 
    ? 'OTP gerado (veja logs do servidor)' 
    : 'Código enviado via WhatsApp'
})
```

---

### 1.5 Remover Logging de Tokens ⚠️ ALTO
**Urgência:** 🟠 Alto (48h)  
**Impacto:** 🟠 Médio - Vazamento parcial tokens em logs  
**Esforço:** 🟢 P (5 minutos)

**Arquivo:** `lib/cvcrm-client.ts` (linha ~28)

**Mudança:**
```typescript
// ANTES:
console.log(`Token: ${token.slice(0, 5)}...`)

// DEPOIS:
console.log('Token: [REDACTED]')
// Ou melhor ainda, remover completamente se não essencial
```

---

## 🔒 FASE 2: SEGURANÇA ALTA (1 SEMANA)

### 2.1 Adicionar Rate Limiting em Endpoints Críticos
**Urgência:** 🟠 Alto (1 semana)  
**Impacto:** 🟠 Alto - Previne brute force e DoS  
**Esforço:** 🟡 M (1 dia)

**Arquivos afetados:**
- `app/api/auth/send-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `app/api/whatsapp/send/route.ts`

**Implementação:**
```typescript
// Criar: lib/rate-limiter.ts
import { RateLimiter } from 'limiter'

const otpLimiter = new RateLimiter({
  tokensPerInterval: 3, // 3 tentativas
  interval: 'hour' // por hora
})

// Em send-otp/route.ts:
export async function POST(request: Request) {
  const { phone } = await request.json()
  
  // Rate limit por telefone
  const key = `otp:${phone}`
  const allowed = await otpLimiter.removeTokens(1, key)
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em 1 hora.' },
      { status: 429 }
    )
  }
  
  // ... resto do código
}
```

**Validação:**
- [ ] Testar 3 tentativas consecutivas funcionam
- [ ] Testar 4ª tentativa retorna 429
- [ ] Verificar reset após 1 hora
- [ ] Testar diferentes telefones não compartilham limite

---

### 2.2 Adicionar Validação Input com Zod
**Urgência:** 🟠 Alto (1 semana)  
**Impacto:** 🟠 Alto - Previne injection, XSS, dados inválidos  
**Esforço:** 🟡 M (2 dias)

**Arquivos afetados:**
- Todos endpoints em `app/api/`

**Implementação:**
```typescript
// Criar: lib/validation-schemas.ts
import { z } from 'zod'

export const SendOTPSchema = z.object({
  phone: z.string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Formato telefone inválido')
    .transform(s => s.replace(/\D/g, '')) // Remove formatação
})

export const VerifyOTPSchema = z.object({
  phone: z.string().regex(/^\d{10,11}$/),
  code: z.string().length(6).regex(/^\d{6}$/)
})

export const SendMessageSchema = z.object({
  instanceId: z.string().uuid(),
  to: z.string().regex(/^\d{10,11}$/),
  message: z.string()
    .min(1, 'Mensagem não pode ser vazia')
    .max(4096, 'Mensagem muito longa'),
  mediaUrl: z.string().url().optional()
})

// Em send-otp/route.ts:
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = SendOTPSchema.parse(body) // Valida e lança erro se inválido
    
    // ... resto do código
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
}
```

**Schemas a criar:**
- [ ] `SendOTPSchema` - validação telefone
- [ ] `VerifyOTPSchema` - validação telefone + código
- [ ] `SendMessageSchema` - validação mensagem WhatsApp
- [ ] `CreateLeadSchema` - validação dados lead
- [ ] `UpdateLeadSchema` - validação atualização lead

---

### 2.3 Implementar Proteção CSRF
**Urgência:** 🟠 Alto (1 semana)  
**Impacto:** 🟠 Médio-Alto - Previne CSRF attacks  
**Esforço:** 🟡 M (1 dia)

**Implementação:**
```typescript
// Criar: middleware/csrf.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export function csrfMiddleware(request: NextRequest) {
  // Apenas para métodos state-changing
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return NextResponse.next()
  }
  
  // Verificar token CSRF do header
  const csrfToken = request.headers.get('X-CSRF-Token')
  const sessionCsrf = request.cookies.get('csrf-token')?.value
  
  if (!csrfToken || csrfToken !== sessionCsrf) {
    return NextResponse.json(
      { error: 'Token CSRF inválido' },
      { status: 403 }
    )
  }
  
  return NextResponse.next()
}

// Atualizar middleware.ts:
import { csrfMiddleware } from './middleware/csrf'

export function middleware(request: NextRequest) {
  // ... lógica existente
  
  // Adicionar proteção CSRF para rotas API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return csrfMiddleware(request)
  }
  
  // ... resto
}
```

---

## 🛠️ FASE 3: QUALIDADE CÓDIGO (1 MÊS)

### 3.1 Substituir Tipos `any` por Interfaces TypeScript
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Médio - Melhora type safety e previne bugs  
**Esforço:** 🔴 G (2 semanas - 60+ instâncias)

**Estratégia incremental:**
1. Criar interfaces TypeScript completas
2. Substituir `any` de forma gradual (5-10 por dia)
3. Priorizar arquivos com mais impacto

**Arquivos prioritários:**
1. [ ] `lib/lead-recovery.ts` - Interface para resposta leads
2. [ ] `lib/salva-leads/tools.ts` - Interface empreendimentos
3. [ ] `lib/salva-leads/agent.ts` - Interface tool_calls
4. [ ] `lib/sofia/flows.ts` - Interfaces flows e messages
5. [ ] `lib/sync/base-agent.ts` - Genéricos adequados

**Exemplo:**
```typescript
// ANTES:
let empreendimentos: any[]

// DEPOIS:
interface Empreendimento {
  id: string
  nome: string
  cidade: string
  preco_min: number
  preco_max: number
  unidades_disponiveis: number
}

let empreendimentos: Empreendimento[]
```

---

### 3.2 Consolidar Código Duplicado
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Médio - Facilita manutenção  
**Esforço:** 🟡 M (3 dias)

**Duplicações identificadas:**

#### A. Lógica Formatação Mensagens
**Arquivos:** `lib/whatsapp-formatter.ts` + `lib/salva-leads/tools.ts`

**Ação:**
```typescript
// Criar: lib/formatters/whatsapp-message.ts
export class WhatsAppMessageFormatter {
  static formatEmpreendimento(emp: Empreendimento): string { /* ... */ }
  static formatSimulacao(sim: Simulacao): string { /* ... */ }
  static formatLead(lead: Lead): string { /* ... */ }
}

// Usar em ambos arquivos:
import { WhatsAppMessageFormatter } from '@/lib/formatters/whatsapp-message'
```

#### B. Lógica Paginação
**Arquivos:** `lib/cvcrm-api.ts` + `lib/cvcrm-api-simple.ts`

**Ação:**
```typescript
// Criar: lib/pagination/cursor-based.ts
export class CursorPagination<T> {
  constructor(
    private fetchPage: (cursor: string | null) => Promise<PageResult<T>>
  ) {}
  
  async *iterate(): AsyncGenerator<T> {
    let cursor: string | null = null
    
    do {
      const page = await this.fetchPage(cursor)
      for (const item of page.items) {
        yield item
      }
      cursor = page.nextCursor
    } while (cursor)
  }
}
```

#### C. Gestão Sessões OTP
**Arquivos:** `app/api/auth/send-otp/route.ts` + `verify-otp/route.ts`

**Ação:**
```typescript
// Criar: lib/auth/otp-session.ts
export class OTPSession {
  static async create(phone: string, code: string): Promise<void> { /* ... */ }
  static async verify(phone: string, code: string): Promise<boolean> { /* ... */ }
  static async invalidate(phone: string): Promise<void> { /* ... */ }
}
```

---

### 3.3 Melhorar Tratamento de Erros
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Médio - Melhor debugabilidade  
**Esforço:** 🟡 M (3 dias)

**Ações:**

#### A. Criar Hierarquia Classes Erro
```typescript
// Criar: lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_ERROR', 429)
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, details?: unknown) {
    super(`${service}: ${message}`, 'EXTERNAL_API_ERROR', 502, details)
  }
}
```

#### B. Implementar Error Handler Global
```typescript
// Criar: lib/error-handler.ts
export function handleAPIError(error: unknown): NextResponse {
  console.error('[API Error]', error)
  
  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message, 
        code: error.code,
        details: error.details 
      },
      { status: error.statusCode }
    )
  }
  
  // Erro desconhecido
  return NextResponse.json(
    { error: 'Erro interno do servidor' },
    { status: 500 }
  )
}

// Usar em todas rotas API:
export async function POST(request: Request) {
  try {
    // ... lógica
  } catch (error) {
    return handleAPIError(error)
  }
}
```

---

### 3.4 Adicionar Logging Estruturado
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Médio - Melhor observabilidade  
**Esforço:** 🟢 P (1 dia)

**Implementação:**
```typescript
// Criar: lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined
})

// Usar em código:
import { logger } from '@/lib/logger'

logger.info({ phone }, 'OTP enviado')
logger.error({ error, phone }, 'Falha ao enviar OTP')
logger.warn({ attempts: 3, phone }, 'Múltiplas tentativas OTP')
```

**Dependência:**
```bash
pnpm add pino pino-pretty
```

---

## 📈 FASE 4: TESTES (1 MÊS)

### 4.1 Aumentar Cobertura Testes para 50%
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Alto - Previne regressões  
**Esforço:** 🔴 G (2 semanas)

**Prioridades:**

#### A. Testes Unitários (80% do esforço)
1. [ ] **Cliente CVCRM API** (`lib/cvcrm-client.ts`)
   - Mock fetch responses
   - Testar paginação
   - Testar tratamento erros
   - Testar rate limiting

2. [ ] **Processador Salva-Leads** (`lib/salva-leads/processor.ts`)
   - Mock busca leads
   - Testar filtros
   - Testar envio mensagens
   - Testar tratamento erros

3. [ ] **Flows Sofia IA** (`lib/sofia/flows.ts`)
   - Mock OpenAI responses
   - Testar fluxos conversacionais
   - Testar tratamento erros API

4. [ ] **Calculadoras Financeiras** (`lib/caixa-calculator.ts`)
   - Testar cálculos parcelas
   - Testar validações entrada
   - Testar edge cases (entrada 0%, prazo máximo)

5. [ ] **Formatadores WhatsApp** (`lib/whatsapp-formatter.ts`)
   - Testar formatação mensagens
   - Testar escape caracteres especiais
   - Testar truncamento mensagens longas

#### B. Testes Integração (15% do esforço)
1. [ ] **Fluxo Completo Login OTP**
   - send-otp → WhatsApp mock → verify-otp
   - Testar expiração código
   - Testar código inválido

2. [ ] **Sincronização WhatsApp → CV CRM**
   - Webhook → processamento → criação interação
   - Testar diferentes tipos mensagem

3. [ ] **Pipeline Leads**
   - Criação → movimentação → conversão
   - Testar validações estado

#### C. Testes E2E (5% do esforço)
1. [ ] **Jornada Corretor Completa**
   - Login → consulta empreendimento → simulação → compartilhamento

2. [ ] **Jornada Admin Dashboard**
   - Login → visualização métricas → gestão leads → resposta chat

---

### 4.2 Setup Testes CI/CD
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Alto - Previne deploy código quebrado  
**Esforço:** 🟢 P (4 horas)

**Implementação:**
```yaml
# Criar: .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm run test:unit
      
      - name: Run integration tests
        run: pnpm run test:integration
      
      - name: Run security tests
        run: pnpm run test:security
      
      - name: Check TypeScript
        run: pnpm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 🚀 FASE 5: FEATURES INCOMPLETAS (TRIMESTRE)

### 5.1 Implementar Agentes Sincronização CV CRM
**Urgência:** 🔵 Médio-Baixo (3 meses)  
**Impacto:** 🟠 Alto - Completa funcionalidade core  
**Esforço:** 🔴 G (6 semanas)

**Agentes a implementar (25 restantes):**

**Prioridade Alta (2 semanas):**
1. [ ] Empreendimentos, Blocos, Unidades
2. [ ] Clientes, Propostas
3. [ ] Comissões

**Prioridade Média (2 semanas):**
4. [ ] Contratos, Distratos
5. [ ] Agenda, Atendimentos
6. [ ] Tabelas, Índices

**Prioridade Baixa (2 semanas):**
7. [ ] Evolução Obra
8. [ ] Repasses
9. [ ] Interessados
10. [ ] Demais agentes

**Estratégia:**
- Usar padrão `lib/sync/base-agent.ts` existente
- Implementar 2-3 agentes por semana
- Testar cada agente isoladamente antes próximo

---

### 5.2 Completar Busca Leads Salva-Leads
**Urgência:** 🟡 Médio (1 mês)  
**Impacto:** 🟡 Médio - Feature parcialmente funcional  
**Esforço:** 🟡 M (1 semana)

**Arquivo:** `lib/salva-leads/processor.ts`

**TODO atual (linha 1):**
```typescript
// TODO: Implementar busca real baseado na estrutura do CV CRM
```

**Implementação:**
```typescript
// Atualizar processor.ts:
async function buscarLeadsPerdidos(
  tenantId: string,
  diasInatividade: number = 30
): Promise<Lead[]> {
  // Usar cliente CV CRM
  const cvcrm = new CVCRMClient(tenantId)
  
  // Buscar interações sem resposta há X dias
  const interacoes = await cvcrm.getInteracoes({
    dataAte: subDays(new Date(), diasInatividade),
    status: 'sem_resposta',
    ordenacao: 'data_desc'
  })
  
  // Buscar clientes dessas interações
  const leads: Lead[] = []
  for (const interacao of interacoes) {
    const cliente = await cvcrm.getCliente(interacao.cliente_id)
    leads.push({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      ultimaInteracao: interacao.data,
      empreendimentoInteresse: interacao.empreendimento_id
    })
  }
  
  return leads
}
```

---

### 5.3 Integração Orulo/PowerBI
**Urgência:** 🔵 Baixo (3 meses)  
**Impacto:** 🟡 Médio - Feature documentada não funcional  
**Esforço:** 🔴 G (2 semanas)

**Situação atual:**
- Scripts scraping existem: `scrape_orulo.mjs`, `scrape_powerbi_v*.mjs`
- Nenhuma integração real com API

**Ações:**
1. [ ] Investigar se Orulo/PowerBI têm API REST
2. [ ] Se sim: Implementar cliente API
3. [ ] Se não: Melhorar scraping com Playwright
4. [ ] Criar endpoint API Next.js para dados
5. [ ] Integrar com dashboard admin

---

## ⚡ FASE 6: PERFORMANCE (TRIMESTRE)

### 6.1 Adicionar Cache Redis
**Urgência:** 🔵 Baixo (3 meses)  
**Impacto:** 🟡 Médio - Reduz latência e carga API  
**Esforço:** 🟡 M (1 semana)

**Implementação:**
```typescript
// Adicionar dependência:
// pnpm add ioredis

// Criar: lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  }
  
  static async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value))
  }
  
  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}

// Usar em cvcrm-client.ts:
async getEmpreendimentos() {
  const cacheKey = `cvcrm:${this.tenantId}:empreendimentos`
  
  // Tentar cache primeiro
  const cached = await Cache.get(cacheKey)
  if (cached) return cached
  
  // Se não em cache, buscar API
  const data = await this.fetchFromAPI('/empreendimentos')
  
  // Cachear por 1 hora
  await Cache.set(cacheKey, data, 3600)
  
  return data
}
```

---

### 6.2 Otimizar Queries N+1
**Urgência:** 🔵 Baixo (3 meses)  
**Impacto:** 🟡 Médio - Reduz latência  
**Esforço:** 🟡 M (3 dias)

**Exemplo: Processador Salva-Leads**

**ANTES:**
```typescript
for (const corretor of corretores) {
  const leads = await getLeadsPorCorretor(corretor.id) // N+1!
  // ...
}
```

**DEPOIS:**
```typescript
// Buscar todos de uma vez
const corretor_ids = corretores.map(c => c.id)
const leadsMap = await getLeadsAgrupados(corretor_ids) // 1 query

for (const corretor of corretores) {
  const leads = leadsMap[corretor.id] || []
  // ...
}
```

---

## 📊 TRACKING DE PROGRESSO

### Métricas Objetivo

| Métrica | Atual | Meta Fase 2 | Meta Fase 4 | Meta Final |
|---------|-------|-------------|-------------|------------|
| Vulnerabilidades P1 | 2 | 0 | 0 | 0 |
| Vulnerabilidades P2 | 3 | 0 | 0 | 0 |
| Vulnerabilidades P3 | 3 | 3 | 1 | 0 |
| Cobertura Testes | 10-15% | 15% | 50% | 70% |
| Tipos `any` | 60+ | 60+ | 30 | 10 |
| Features Completas | 60% | 65% | 70% | 90% |
| Nota Qualidade | 7.0 | 8.0 | 8.5 | 9.5 |

---

## 🎯 RESUMO EXECUTIVO

### Próximos 7 Dias (CRÍTICO)
1. ✅ Corrigir httpOnly cookie (15 min)
2. ✅ Desabilitar ignoreBuildErrors e corrigir erros (1-2 dias)
3. ✅ Usar crypto.randomBytes() para OTP (30 min)
4. ✅ Remover OTP de resposta API (10 min)
5. ✅ Remover logging tokens (5 min)

**Total Esforço:** 2-3 dias  
**Impacto:** Elimina 100% vulnerabilidades P1

### Próximos 30 Dias
6. ✅ Adicionar rate limiting (1 dia)
7. ✅ Adicionar validação Zod (2 dias)
8. ✅ Implementar proteção CSRF (1 dia)
9. ✅ Consolidar código duplicado (3 dias)
10. ✅ Melhorar tratamento erros (3 dias)

**Total Esforço:** 2 semanas  
**Impacto:** Elimina 100% vulnerabilidades P2, melhora qualidade código

### Próximos 90 Dias
11. ✅ Substituir tipos `any` (2 semanas)
12. ✅ Aumentar testes para 50% (2 semanas)
13. ✅ Implementar agentes sync (6 semanas)
14. ✅ Completar features parciais (2 semanas)

**Total Esforço:** 12 semanas  
**Impacto:** Features 90% completas, código production-ready

---

**Documento vivo - atualizar conforme progresso**

*Última atualização: 22 de Janeiro de 2026*
