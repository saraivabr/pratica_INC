# 🔒 Implementação Rate Limiting e Validação Zod - Fase 2

**Data:** 22 de Janeiro de 2026  
**Status:** ✅ Implementado  
**Prioridade:** 🟠 Alto

---

## 📋 Resumo das Implementações

Foram implementadas **proteções adicionais de segurança** em endpoints críticos:

| Implementação | Arquivos | Status |
|--------------|----------|--------|
| Rate Limiter (classe reutilizável) | `lib/rate-limiter.ts` | ✅ Criado |
| Validation Schemas (Zod) | `lib/validation-schemas.ts` | ✅ Criado |
| Rate limiting em send-otp | `app/api/auth/send-otp/route.ts` | ✅ Aplicado |
| Rate limiting em verify-otp | `app/api/auth/verify-otp/route.ts` | ✅ Aplicado |
| Rate limiting + validação WhatsApp | `app/api/whatsapp/send/route.ts` | ✅ Aplicado |

---

## 🛡️ Rate Limiter

### Implementação

**Arquivo:** `lib/rate-limiter.ts`

**Características:**
- ✅ In-memory storage (simples e eficiente)
- ✅ Limpeza automática de entradas expiradas
- ✅ Configurações pré-definidas para cenários comuns
- ✅ Headers HTTP padrão (X-RateLimit-*)
- ✅ Singleton pattern

**Configurações Pré-definidas:**

```typescript
{
  OTP_SEND: {
    windowMs: 1 hora,
    maxRequests: 3  // 3 tentativas por hora por telefone
  },
  
  OTP_VERIFY: {
    windowMs: 15 minutos,
    maxRequests: 5  // 5 tentativas por 15 min por telefone
  },
  
  WHATSAPP_SEND: {
    windowMs: 1 minuto,
    maxRequests: 20  // 20 mensagens por minuto por usuário
  },
  
  API_GENERAL: {
    windowMs: 1 minuto,
    maxRequests: 100  // 100 requests por minuto por usuário
  },
  
  LOGIN: {
    windowMs: 15 minutos,
    maxRequests: 5  // 5 tentativas por 15 min por IP
  }
}
```

### Uso

```typescript
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

// Em uma API route:
const rateLimitKey = `endpoint:${uniqueId}`;
const rateLimit = rateLimiter.check(rateLimitKey, RateLimitConfigs.OTP_SEND);

if (!rateLimit.allowed) {
  return NextResponse.json(
    { error: 'Muitas tentativas', retryAfter: rateLimit.retryAfter },
    { 
      status: 429,
      headers: {
        'Retry-After': rateLimit.retryAfter?.toString(),
        'X-RateLimit-Limit': '3',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
      }
    }
  );
}
```

### Escalabilidade

**Nota:** Para produção com múltiplas instâncias, considere migrar para **Redis**:

```typescript
// Futuro: lib/rate-limiter-redis.ts
import Redis from 'ioredis';

class RedisRateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async check(key: string, config: RateLimitConfig) {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;
    
    // Usar Redis INCR + EXPIRE
    const count = await this.redis.incr(windowKey);
    
    if (count === 1) {
      await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }
    
    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime: now + config.windowMs,
    };
  }
}
```

---

## ✅ Validation Schemas (Zod)

### Implementação

**Arquivo:** `lib/validation-schemas.ts`

**Schemas Criados:**

1. **phoneSchema** - Telefone brasileiro
   - Aceita: `(11) 99999-9999` ou `(11) 9999-9999`
   - Normaliza para: `11999999999` (apenas dígitos)

2. **otpCodeSchema** - Código OTP
   - Exatamente 6 dígitos numéricos

3. **emailSchema** - Email válido
   - Validação RFC compliant
   - Máximo 255 caracteres

4. **nameSchema** - Nome de pessoa
   - Mínimo 2 caracteres
   - Máximo 100 caracteres
   - Apenas letras (incluindo acentos)

5. **messageTextSchema** - Mensagens WhatsApp
   - Mínimo 1 caractere
   - Máximo 4096 caracteres

6. **uuidSchema** - UUID válido
   - Formato UUID v4

7. **urlSchema** - URL válida
   - Validação URL completa
   - Máximo 2048 caracteres

**Schemas de Requisições:**

- `SendOTPSchema` - POST /api/auth/send-otp
- `VerifyOTPSchema` - POST /api/auth/verify-otp
- `SendWhatsAppMessageSchema` - POST /api/whatsapp/send
- `CreateLeadSchema` - POST /api/leads/create
- `UpdateLeadSchema` - PATCH /api/leads/:id
- `CreateUserSchema` - POST /api/users/create

### Uso

**Opção 1 - Helper validateRequest:**

```typescript
import { validateRequest, SendOTPSchema } from '@/lib/validation-schemas';

export async function POST(request: Request) {
  const validation = await validateRequest(request, SendOTPSchema);
  
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }
  
  const { telefone } = validation.data; // Type-safe!
  // ...
}
```

**Opção 2 - Uso direto:**

```typescript
import { z } from 'zod';
import { phoneSchema } from '@/lib/validation-schemas';

const MySchema = z.object({
  phone: phoneSchema,
  age: z.number().min(18).max(120),
});

const result = MySchema.safeParse(data);
if (!result.success) {
  // Handle errors
}
```

### Benefícios

1. ✅ **Type Safety** - TypeScript infere tipos automaticamente
2. ✅ **Mensagens Claras** - Erros em português
3. ✅ **Transformações** - Normalização automática
4. ✅ **Validações Complexas** - Regex, ranges, formatos
5. ✅ **Reutilizável** - Um schema, múltiplos usos

---

## 🚀 Endpoints Protegidos

### 1. POST /api/auth/send-otp

**Proteções Aplicadas:**
- ✅ Validação Zod do campo `telefone`
- ✅ Rate limiting: 3 tentativas por hora por telefone
- ✅ Headers HTTP padrão de rate limit

**Respostas:**

```typescript
// Sucesso (200)
{
  "exists": true,
  "sessionId": "uuid",
  "message": "Link de acesso enviado no WhatsApp!",
  "user": { /* ... */ }
}

// Rate limit excedido (429)
{
  "error": "Muitas tentativas. Tente novamente mais tarde.",
  "retryAfter": 3600  // segundos
}
// Headers:
// Retry-After: 3600
// X-RateLimit-Limit: 3
// X-RateLimit-Remaining: 0
// X-RateLimit-Reset: 2026-01-22T21:00:00.000Z

// Validação falhou (400)
{
  "error": "Formato de telefone inválido. Use: (11) 99999-9999"
}
```

---

### 2. POST /api/auth/verify-otp

**Proteções Aplicadas:**
- ✅ Validação Zod dos campos `telefone`, `code`, `sessionId`
- ✅ Rate limiting: 5 tentativas por 15 minutos por telefone
- ✅ Headers HTTP padrão de rate limit

**Respostas:**

```typescript
// Sucesso (200)
{
  "success": true,
  "user": { /* ... */ },
  "session": { /* ... */ }
}

// Rate limit excedido (429)
{
  "error": "Muitas tentativas de verificação. Tente novamente mais tarde.",
  "retryAfter": 900  // segundos (15 min)
}

// Código inválido (400)
{
  "error": "code: Código deve ter exatamente 6 dígitos"
}
```

---

### 3. POST /api/whatsapp/send

**Proteções Aplicadas:**
- ✅ Validação Zod dos campos `instanceName`, `phoneNumber`, `message`
- ✅ Rate limiting: 20 mensagens por minuto por usuário
- ✅ Headers HTTP padrão de rate limit
- ✅ Mensagens limitadas a 4096 caracteres

**Respostas:**

```typescript
// Sucesso (200)
{
  "success": true,
  "messageId": "uuid",
  "status": "sent"
}

// Rate limit excedido (429)
{
  "success": false,
  "error": "Limite de mensagens atingido. Aguarde antes de enviar mais mensagens.",
  "retryAfter": 60  // segundos
}

// Mensagem muito longa (400)
{
  "success": false,
  "error": "Mensagem muito longa (máximo 4096 caracteres)",
  "field": "message"
}
```

---

## 🧪 Testes

### Teste Manual - Rate Limiting

**Script de teste send-otp:**

```bash
#!/bin/bash
# test-rate-limit.sh

PHONE="(11) 99999-9999"
API_URL="http://localhost:3000/api/auth/send-otp"

echo "Testando rate limit: 3 tentativas permitidas por hora"

for i in {1..5}; do
  echo "\nTentativa $i:"
  
  response=$(curl -s -w "\nHTTP %{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"telefone\": \"$PHONE\"}")
  
  echo "$response"
  sleep 2
done

echo "\n\nTentativas 4 e 5 devem retornar HTTP 429 (Too Many Requests)"
```

**Executar:**
```bash
chmod +x test-rate-limit.sh
./test-rate-limit.sh
```

**Resultado Esperado:**
```
Tentativa 1:
HTTP 200 (sucesso)

Tentativa 2:
HTTP 200 (sucesso)

Tentativa 3:
HTTP 200 (sucesso)

Tentativa 4:
HTTP 429 (rate limit excedido) ✅
Headers: Retry-After: 3600

Tentativa 5:
HTTP 429 (rate limit excedido) ✅
```

### Teste Manual - Validação

```bash
# Telefone inválido
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"telefone": "123"}'

# Esperado: HTTP 400
# { "error": "Formato de telefone inválido. Use: (11) 99999-9999" }

# Código OTP inválido
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"telefone": "(11) 99999-9999", "code": "12345"}'

# Esperado: HTTP 400
# { "error": "code: Código deve ter exatamente 6 dígitos" }
```

### Testes Unitários

**Criar:** `__tests__/unit/rate-limiter.test.ts`

```typescript
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

describe('RateLimiter', () => {
  afterEach(() => {
    rateLimiter.reset('test-key');
  });

  it('should allow requests under limit', () => {
    const result1 = rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    const result2 = rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    const result3 = rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
  });

  it('should block requests over limit', () => {
    // 3 allowed
    rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    
    // 4th should be blocked
    const result4 = rateLimiter.check('test-key', RateLimitConfigs.OTP_SEND);
    expect(result4.allowed).toBe(false);
    expect(result4.retryAfter).toBeGreaterThan(0);
  });
  
  it('should reset after window expires', async () => {
    const config = { windowMs: 100, maxRequests: 1 };
    
    // First request allowed
    const result1 = rateLimiter.check('test-key', config);
    expect(result1.allowed).toBe(true);
    
    // Second request blocked
    const result2 = rateLimiter.check('test-key', config);
    expect(result2.allowed).toBe(false);
    
    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Third request should be allowed (new window)
    const result3 = rateLimiter.check('test-key', config);
    expect(result3.allowed).toBe(true);
  });
});
```

**Executar:**
```bash
pnpm run test __tests__/unit/rate-limiter.test.ts
```

---

## 📊 Métricas de Segurança

### Antes (Fase 1)
- Vulnerabilidades P3: 3
- Rate limiting: 0 endpoints
- Validação input: Manual
- Nota Segurança: 8/10

### Depois (Fase 2)
- Vulnerabilidades P3: 1 (apenas CSRF restante)
- Rate limiting: 3 endpoints críticos protegidos ✅
- Validação input: Centralizada com Zod ✅
- Nota Segurança: 8.5/10

**Melhoria:** +2 vulnerabilidades eliminadas

---

## 🔜 Próximos Passos

**Fase 2 Continuação:**
1. [ ] Implementar proteção CSRF
2. [ ] Aplicar rate limiting em mais endpoints (leads, users)
3. [ ] Adicionar testes unitários completos

**Fase 3:**
1. [ ] Substituir tipos `any` (60+ instâncias)
2. [ ] Consolidar código duplicado
3. [ ] Melhorar tratamento de erros

---

## 📞 Suporte

**Documentação Relacionada:**
- `ANALISE_COMPLETA.md` - Análise sistema completo
- `PLANO_ACAO_PRIORIZACAO.md` - Roadmap completo
- `SECURITY_FIXES_FASE1.md` - Correções Fase 1

**Problemas?**
1. Verificar logs do servidor
2. Testar com curl/Postman
3. Verificar headers HTTP de rate limit

---

**Implementado por:** GitHub Copilot Coding Agent  
**Data:** 22 de Janeiro de 2026  
**Tempo de Implementação:** ~1 hora  
**Linhas de Código:** ~500 linhas
