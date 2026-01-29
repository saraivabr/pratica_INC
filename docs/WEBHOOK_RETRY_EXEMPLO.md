# Exemplo Prático: Sistema de Retry em Webhooks

## Antes (sem retry)

```typescript
// app/api/webhook/evolution/[workspaceId]/route.ts

export async function POST(req: Request) {
  const body = await req.json();
  
  // Processar mensagem
  await processMessage(body);
  
  // Enviar resposta para API externa (pode falhar!)
  try {
    await fetch('https://external-api.com/callback', {
      method: 'POST',
      body: JSON.stringify({ status: 'processed' })
    });
  } catch (error) {
    // Falhou e perdeu a mensagem 💀
    console.error('Webhook failed:', error);
  }
  
  return NextResponse.json({ ok: true });
}
```

**Problema:** Se a API externa estiver fora, a mensagem é perdida.

---

## Depois (com retry automático)

```typescript
// app/api/webhook/evolution/[workspaceId]/route.ts
import { executeWebhookWithRetry } from '@/lib/webhookRetry';

export async function POST(req: Request, { params }: { params: { workspaceId: string } }) {
  const body = await req.json();
  
  // Processar mensagem
  await processMessage(body);
  
  // Enviar com retry automático 🚀
  const result = await executeWebhookWithRetry(
    'evolution_callback',
    {
      url: 'https://external-api.com/callback',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: {
        status: 'processed',
        messageId: body.key.id,
        timestamp: new Date().toISOString()
      }
    },
    params.workspaceId
  );
  
  if (!result.success) {
    // Logado no banco, será reprocessado depois
    console.warn(`Webhook failed after ${result.retries} retries: ${result.error}`);
  }
  
  return NextResponse.json({ ok: true });
}
```

**Vantagens:**
- ✅ Retry automático (até 3x)
- ✅ Backoff exponencial (1s, 2s, 4s...)
- ✅ Logs no banco de dados
- ✅ Pode ser reprocessado depois

---

## Reprocessar Webhooks Falhos

### Via Cron Job

```bash
# crontab -e
# Reprocessar webhooks falhos a cada hora
0 * * * * cd /var/www/pratica && node scripts/reprocess-webhooks.mjs >> logs/reprocess.log 2>&1
```

```javascript
// scripts/reprocess-webhooks.mjs
import { reprocessFailedWebhooks } from '../lib/webhookRetry.ts';

async function main() {
  console.log('🔄 Reprocessando webhooks falhos...');
  
  const result = await reprocessFailedWebhooks();
  
  console.log(`✅ Processados: ${result.processed}`);
  console.log(`✅ Sucesso: ${result.succeeded}`);
  console.log(`❌ Falhas: ${result.failed}`);
}

main();
```

### Via Endpoint Admin

```typescript
// app/api/admin/reprocess-webhooks/route.ts
import { reprocessFailedWebhooks } from '@/lib/webhookRetry';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Validar admin auth
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { workspaceId, webhookType } = await req.json();
  
  const result = await reprocessFailedWebhooks(workspaceId, webhookType);
  
  return NextResponse.json({
    success: true,
    ...result
  });
}
```

**Uso:**
```bash
curl -X POST http://localhost:3000/api/admin/reprocess-webhooks \
  -H "Authorization: Bearer pratica2025admin" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "abc123"}'
```

---

## Monitorar Falhas

### Dashboard Simples

```typescript
// app/api/admin/webhook-stats/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  
  const { data: stats } = await supabase
    .from('webhook_stats')
    .select('*')
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  return NextResponse.json(stats);
}
```

### Query Manual

```sql
-- Webhooks com mais falhas
SELECT 
  webhook_type,
  COUNT(*) as total_failed,
  MAX(retry_count) as max_retries,
  last_error
FROM webhook_logs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY webhook_type, last_error
ORDER BY total_failed DESC
LIMIT 10;

-- Webhooks pendentes de reprocessamento
SELECT 
  webhook_type,
  COUNT(*) as pending
FROM webhook_logs
WHERE status = 'failed'
  AND retry_count < 3
GROUP BY webhook_type;
```

---

## Configuração Avançada

### Por Tipo de Webhook

```typescript
const WEBHOOK_CONFIGS = {
  'evolution_message': {
    maxRetries: 5, // Mensagens críticas
    initialDelay: 2000,
    maxDelay: 60000
  },
  'orulo_visit': {
    maxRetries: 2, // Menos crítico
    initialDelay: 1000,
    maxDelay: 10000
  },
  'serasa_score': {
    maxRetries: 1, // API externa cara
    initialDelay: 5000,
    maxDelay: 5000
  }
};

// Usar
const config = WEBHOOK_CONFIGS[webhookType] || {};
await executeWebhookWithRetry(webhookType, payload, workspaceId, config);
```

### Com Circuit Breaker

```typescript
const CIRCUIT_BREAKERS = new Map();

async function executeWithCircuitBreaker(webhookType, payload, workspaceId) {
  const breaker = CIRCUIT_BREAKERS.get(webhookType) || { failures: 0, lastFail: 0 };
  
  // Se falhou muito recentemente, pula
  if (breaker.failures > 10 && Date.now() - breaker.lastFail < 60000) {
    console.warn(`Circuit breaker open for ${webhookType}`);
    return { success: false, error: 'Circuit breaker open' };
  }
  
  const result = await executeWebhookWithRetry(webhookType, payload, workspaceId);
  
  if (!result.success) {
    breaker.failures++;
    breaker.lastFail = Date.now();
  } else {
    breaker.failures = Math.max(0, breaker.failures - 1);
  }
  
  CIRCUIT_BREAKERS.set(webhookType, breaker);
  return result;
}
```

---

## Boas Práticas

### 1. Idempotência
Garanta que reenvios não causem duplicatas:

```typescript
await executeWebhookWithRetry('create_lead', {
  url: 'https://crm.com/leads',
  method: 'POST',
  headers: {
    'Idempotency-Key': `lead-${leadId}-${timestamp}` // ⚠️ IMPORTANTE
  },
  body: leadData
}, workspaceId);
```

### 2. Timeout Adequado
```typescript
// Webhook rápido (notificação)
await executeWebhookWithRetry('notification', payload, workspaceId, {
  maxRetries: 2,
  initialDelay: 500,
  maxDelay: 2000
});

// Webhook lento (processamento)
await executeWebhookWithRetry('batch_process', payload, workspaceId, {
  maxRetries: 1,
  initialDelay: 10000,
  maxDelay: 10000
});
```

### 3. Limpeza de Logs
```sql
-- Via cron diário
DELETE FROM webhook_logs
WHERE created_at < NOW() - INTERVAL '30 days'
  AND status IN ('success', 'failed');
```

---

## Troubleshooting

### Webhook sempre falhando?
1. Verificar URL e autenticação
2. Testar endpoint manualmente
3. Verificar logs: `SELECT * FROM webhook_logs WHERE webhook_type = 'X' ORDER BY created_at DESC LIMIT 10`
4. Validar payload no webhook externo

### Muitos retries consumindo recursos?
1. Ajustar `maxRetries` para menos tentativas
2. Implementar circuit breaker
3. Aumentar `initialDelay` para reduzir carga

### Webhook não está sendo reprocessado?
1. Verificar que `retry_count < maxRetries`
2. Rodar manualmente: `reprocessFailedWebhooks()`
3. Verificar se cron está rodando

---

**Pronto!** Sistema de retry robusto e confiável. 🚀
