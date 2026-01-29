# 🔒 Security Quick Start Guide

**TL;DR:** Como usar as novas ferramentas de segurança em 30 segundos.

---

## 🚀 Proteger uma Rota de API

### Exemplo 1: Rota de autenticação (rate limited)

```typescript
// app/api/auth/login/route.ts
import { secureRoute, rateLimitPresets } from '@/lib/security'

export const POST = secureRoute(
  async (req, session) => {
    // Seu código aqui
    const { phone } = await req.json()
    // ... processar login
    return NextResponse.json({ success: true })
  },
  {
    rateLimit: rateLimitPresets.auth, // 5 tentativas / 15min
  }
)
```

### Exemplo 2: Rota protegida (requer auth)

```typescript
// app/api/leads/route.ts
import { secureRoute, rateLimitPresets } from '@/lib/security'

export const GET = secureRoute(
  async (req, session) => {
    // session é automaticamente extraído e validado
    if (!session) {
      // Nunca vai acontecer se requireAuth: true
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    const leads = await getLeads(session.userId)
    return NextResponse.json(leads)
  },
  {
    rateLimit: rateLimitPresets.read, // 100 requests/min
    requireAuth: true, // Requer autenticação
    requireWorkspace: true, // Requer workspace_id
  }
)
```

### Exemplo 3: Webhook externo

```typescript
// app/api/webhook/evolution/route.ts
import { secureWebhook } from '@/lib/security'

export const POST = secureWebhook(
  async (req, payload) => {
    // payload já foi parseado e validado
    // secret já foi verificado automaticamente
    
    console.log('Webhook recebido:', payload)
    await processWebhook(payload)
    
    return NextResponse.json({ received: true })
  },
  {
    secretHeader: 'x-webhook-secret', // header com secret (default)
    // secret: process.env.EVOLUTION_WEBHOOK_SECRET (default)
  }
)
```

---

## ✅ Validar Inputs

### Exemplo 1: Validação simples

```typescript
import { validateRequestBody, schemas } from '@/lib/security'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  // Validar body com schemas prontos
  const validation = await validateRequestBody(
    req,
    z.object({
      phone: schemas.phone,
      name: schemas.safeName,
      email: schemas.email.optional(),
    })
  )
  
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }
  
  const { phone, name, email } = validation.data
  // Dados já validados e seguros
}
```

### Exemplo 2: Validação CPF

```typescript
import { validateCPF, schemas } from '@/lib/security'

const cpf = '123.456.789-00'

// Opção 1: função utilitária
if (validateCPF(cpf)) {
  // CPF válido
}

// Opção 2: schema Zod
const schema = z.object({
  cpf: schemas.cpf,
})

const result = schema.safeParse({ cpf })
```

### Exemplo 3: Sanitização

```typescript
import { sanitizeString, sanitizeSQL } from '@/lib/security'

const userInput = '<script>alert("xss")</script> Hello'
const safe = sanitizeString(userInput) // "Hello"

const sqlInput = "'; DROP TABLE users; --"
const safeSql = sanitizeSQL(sqlInput) // "DROP TABLE users"
```

---

## 📝 Logging Estruturado

### Exemplo 1: Logs básicos

```typescript
import { logger } from '@/lib/monitoring'

// Info
logger.info('User logged in', { 
  userId: user.id,
  workspaceId: user.workspaceId 
})

// Warning
logger.warn('High memory usage', { 
  memoryMB: 950 
})

// Error
logger.error('Database connection failed', { 
  error: err,
  route: '/api/leads',
})
```

### Exemplo 2: Request logging

```typescript
import { logRequest, logger } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  const logEnd = logRequest(req) // Inicia timer
  
  try {
    // Processar request
    const result = await processData()
    
    logger.info('Data processed successfully', {
      userId: result.userId,
      count: result.count,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Processing failed', {
      error,
      route: '/api/data',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  } finally {
    logEnd() // Log automático com duration
  }
}
```

### Exemplo 3: Security events

```typescript
import { logger } from '@/lib/monitoring'

// Log tentativa de acesso não autorizado
logger.security('Unauthorized access attempt', {
  ip: req.headers.get('x-forwarded-for'),
  route: req.url,
  userId: session?.userId,
})

// Log evento de negócio
logger.metric('leads_created', 15, 'count', {
  workspaceId: 123,
  userId: 'user-456',
})
```

---

## 🛡️ Security Headers

### Exemplo: API com cache

```typescript
import { withSecurityHeaders } from '@/lib/security'

export async function GET(req: NextRequest) {
  const data = await fetchData()
  
  const response = NextResponse.json(data)
  
  // Adicionar security headers + cache
  return withSecurityHeaders(response, {
    cache: 'api', // 1 minuto com revalidação
    cors: true, // CORS headers
  })
}
```

### Tipos de cache disponíveis:

- `'static'` - 1 ano (assets imutáveis)
- `'api'` - 1 minuto com revalidação
- `'dynamic'` - 5 minutos com revalidação
- `'no-cache'` - nunca cachear (auth, webhooks)

---

## 🔍 Health Check

```bash
# Verificar saúde do sistema
curl http://localhost:3000/api/health/detailed | jq

# Output esperado:
{
  "status": "healthy",
  "timestamp": "2025-01-29T...",
  "uptime": 3600,
  "checks": {
    "database": { "status": "pass", "duration": 15 },
    "memory": { "status": "pass", "metadata": {...} },
    "disk": { "status": "pass" },
    "environment": { "status": "pass" }
  }
}
```

---

## 📦 Importações Rápidas

```typescript
// Tudo de segurança
import {
  secureRoute,
  secureWebhook,
  rateLimitPresets,
  schemas,
  validateRequestBody,
  withSecurityHeaders,
} from '@/lib/security'

// Monitoring
import { logger, logRequest, logError } from '@/lib/monitoring'
```

---

## 🎯 Presets de Rate Limiting

```typescript
import { rateLimitPresets } from '@/lib/security'

// Disponíveis:
rateLimitPresets.auth      // 5 requests / 15min (login, OTP)
rateLimitPresets.mutation  // 30 requests / min (POST, PUT, DELETE)
rateLimitPresets.read      // 100 requests / min (GET)
rateLimitPresets.webhook   // 50 requests / min (webhooks externos)
rateLimitPresets.upload    // 10 requests / min (upload de arquivos)
```

---

## ⚡ Cheat Sheet

| Preciso de... | Use |
|---------------|-----|
| Proteger rota de login | `secureRoute(..., { rateLimit: rateLimitPresets.auth })` |
| Validar CPF | `schemas.cpf` ou `validateCPF(cpf)` |
| Log estruturado | `logger.info(msg, context)` |
| Security headers | `withSecurityHeaders(response, { cache: 'api' })` |
| Webhook seguro | `secureWebhook(handler)` |
| Rota com auth | `secureRoute(..., { requireAuth: true })` |
| Health check | `GET /api/health/detailed` |

---

## 📚 Documentação Completa

- **Índice de Segurança:** `SECURITY_INDEX.md`
- **Deploy Summary:** `SECURITY_DEPLOY_SUMMARY.md`
- **Validação:** `bash scripts/validate-security.sh`

---

**Dúvidas?** Consulte os comentários nos arquivos em `lib/security/` e `lib/monitoring/`.

Cada módulo tem exemplos de uso no topo do arquivo!
