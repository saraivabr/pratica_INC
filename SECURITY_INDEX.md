# 🔒 Índice de Segurança - Pratica CRM

**Status:** ✅ Hardened Enterprise-Grade  
**Última atualização:** 29 Jan 2025  
**Responsável:** Infraestrutura & Segurança

---

## ✅ Checklist Implementado

### 1. Secrets & Environment Variables
- ✅ `EVOLUTION_WEBHOOK_SECRET` gerado (32 bytes hex)
- ✅ `JWT_SECRET` configurado
- ✅ `NEXTAUTH_SECRET` configurado
- ✅ `DATABASE_URL` configurado
- ✅ `WEBHOOK_BASE_URL` configurado
- ⚠️ **AÇÃO:** Rotacionar secrets a cada 90 dias

**Arquivo:** `.env.local` (não commitar!)

### 2. Rate Limiting
- ✅ Implementado em `/lib/security/rate-limiter.ts`
- ✅ Presets: auth (5/15min), mutation (30/min), read (100/min), webhook (50/min), upload (10/min)
- ✅ Headers RFC 6585 (X-RateLimit-*)
- ✅ Cleanup automático de entradas expiradas

**Rotas protegidas:**
- `/api/auth/send-otp` - 5 tentativas/15min
- `/api/auth/verify-otp` - 5 tentativas/15min
- `/api/webhook/*` - 50 webhooks/min
- APIs de mutação - 30 requests/min
- APIs de leitura - 100 requests/min

**Uso:**
```typescript
import { secureRoute, rateLimitPresets } from '@/lib/security/secure-route'

export const POST = secureRoute(
  async (req, session) => {
    // handler logic
  },
  { rateLimit: rateLimitPresets.auth }
)
```

### 3. Input Validation
- ✅ Implementado em `/lib/security/validation.ts`
- ✅ Schemas Zod reutilizáveis
- ✅ Sanitização de strings (XSS protection)
- ✅ Validação CPF, telefone, email
- ✅ Path traversal protection
- ✅ SQL injection prevention (sanitize + prepared statements)

**Schemas disponíveis:**
- `schemas.phone` - telefone brasileiro
- `schemas.cpf` - CPF válido
- `schemas.email` - email válido
- `schemas.workspaceId` - ID numérico positivo
- `schemas.safeName` - nome com caracteres seguros
- `schemas.safeText` - texto sanitizado
- `schemas.url` - URL válida
- `schemas.token` - token alfanumérico

**Uso:**
```typescript
import { validateRequestBody, schemas } from '@/lib/security/validation'

const validation = await validateRequestBody(request, z.object({
  phone: schemas.phone,
  name: schemas.safeName,
}))

if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 })
}
```

### 4. Security Headers
- ✅ Implementado em `/lib/security/headers.ts`
- ✅ Content Security Policy (CSP)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: SAMEORIGIN
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ X-XSS-Protection
- ✅ Permissions-Policy

**Cache headers:**
- `static` - 1 ano (assets com hash)
- `api` - 1 minuto com revalidação
- `dynamic` - 5 minutos com revalidação
- `no-cache` - nunca cachear (auth, webhooks)

**Uso:**
```typescript
import { withSecurityHeaders } from '@/lib/security/headers'

const response = NextResponse.json(data)
return withSecurityHeaders(response, { cache: 'api', cors: true })
```

### 5. CDN/Cache Configuration
- ✅ Headers otimizados para Vercel/Cloudflare
- ✅ `Cache-Control` com `stale-while-revalidate`
- ✅ `CDN-Cache-Control` separado
- ✅ Validação de cache em responses

### 6. Monitoramento & Logging
- ✅ Logger estruturado em `/lib/monitoring/logger.ts`
- ✅ Logs em JSON para produção
- ✅ Pretty print para desenvolvimento
- ✅ Níveis: debug, info, warn, error, fatal
- ✅ Contexto: userId, workspaceId, requestId, IP, duration
- ✅ Métricas de negócio

**Health check:**
- Endpoint: `GET /api/health/detailed`
- Checa: database, memory, disk, environment
- Status codes: 200 (healthy), 200 (degraded), 503 (unhealthy)

**Uso:**
```typescript
import { logger, logRequest, logError } from '@/lib/monitoring/logger'

export async function POST(req: NextRequest) {
  const logEnd = logRequest(req)
  
  try {
    logger.info('Processing data', { userId: '123' })
    // ...
  } catch (error) {
    logError(error, { route: '/api/data' })
  } finally {
    logEnd()
  }
}
```

### 7. PM2 Configuration
- ✅ Cluster mode com `instances: max`
- ✅ Auto-restart com políticas inteligentes
- ✅ Memory limit: 1GB (auto-restart)
- ✅ Max 10 restarts em 1 minuto
- ✅ Graceful shutdown (5s timeout)
- ✅ Logs estruturados (JSON)
- ✅ Log rotation recomendado (`pm2 install pm2-logrotate`)

**Comandos:**
```bash
pm2 start ecosystem.config.js --env production
pm2 reload ecosystem.config.js
pm2 logs pratica --lines 50 --json
pm2 monit
```

### 8. Row Level Security (RLS)
- ✅ RLS ativo em tabelas com `workspace_id`:
  - `agent_configs`
  - `automacoes_followup`
  - `lembretes`
  - `notificacoes`
- ⚠️ **NOTA:** Tabelas CVCRM usam isolamento via `gerente_id`/`imobiliaria_id`
- ✅ Policies criadas: `workspace_isolation_*`

**Validação:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('agent_configs', 'automacoes_followup', 'lembretes', 'notificacoes');
```

---

## 🚀 Deploy Checklist

### Pré-Deploy
- [ ] Revisar `.env.local` e validar todas as secrets
- [ ] Confirmar `NODE_ENV=production`
- [ ] Verificar `DATABASE_URL` correto
- [ ] Backup do banco antes de migrations

### Deploy
```bash
# 1. Build
cd /var/www/pratica
pnpm install
pnpm run build

# 2. Aplicar migrations (se houver)
# psql -h ... -U postgres -d postgres -f migrations/xxx.sql

# 3. Restart PM2
pm2 reload ecosystem.config.js --env production

# 4. Verificar saúde
pm2 logs pratica --lines 50
curl http://localhost:3000/api/health/detailed

# 5. Validar rate limiting
curl -I http://localhost:3000/api/auth/send-otp
# Deve retornar X-RateLimit-* headers
```

### Pós-Deploy
- [ ] Monitorar logs por 10 minutos
- [ ] Testar login (rate limit funcional?)
- [ ] Testar health check: `GET /api/health/detailed`
- [ ] Verificar memory usage: `pm2 monit`
- [ ] Validar RLS: queries retornam apenas dados do workspace correto

---

## 🔐 Hardening Adicional Recomendado

### Curto Prazo (1-2 semanas)
- [ ] **Fail2ban** - bloquear IPs com múltiplas tentativas de login
- [ ] **Redis para rate limiting** - escalar rate limiter horizontalmente
- [ ] **Sentry/Rollbar** - tracking de erros em produção
- [ ] **Uptime monitoring** - Pingdom, UptimeRobot, ou similar
- [ ] **SSL/TLS certificate monitoring** - alertas antes de expirar

### Médio Prazo (1-2 meses)
- [ ] **WAF (Web Application Firewall)** - Cloudflare ou AWS WAF
- [ ] **DDoS protection** - Cloudflare Pro ou similar
- [ ] **Secrets rotation automation** - rotacionar secrets a cada 90 dias
- [ ] **Audit logging** - log de todas ações sensíveis (GDPR compliance)
- [ ] **Backup automation** - backup diário do banco + retenção 30 dias

### Longo Prazo (3-6 meses)
- [ ] **SOC 2 / ISO 27001** - certificações de segurança
- [ ] **Penetration testing** - teste de invasão profissional
- [ ] **Bug bounty program** - programa de recompensa por bugs
- [ ] **Zero-trust architecture** - segmentação de rede completa
- [ ] **Disaster recovery plan** - plano de recuperação de desastres

---

## 📊 Monitoramento Contínuo

### Métricas a Monitorar
- **Rate limit hits** - quantas requests foram bloqueadas?
- **Failed login attempts** - tentativas de invasão?
- **Response times** - performance degradando?
- **Error rates** - % de 5xx errors
- **Memory usage** - perto de 1GB limit?
- **Database connections** - pool esgotando?

### Logs a Revisar
- `/var/log/pratica/error.log` - erros da aplicação
- `/var/log/pratica/out.log` - logs estruturados
- `pm2 logs pratica --lines 100 --err` - últimos erros

### Alertas Configurar
- 5xx error rate > 1%
- Rate limit blocks > 100/min
- Memory usage > 900MB
- Database connection failures
- Health check returning unhealthy

---

## 🆘 Troubleshooting

### Rate limiting não funciona
- Verificar se `rate-limiter.ts` está sendo importado
- Checar se `X-RateLimit-*` headers aparecem na response
- Validar IP extraction (X-Forwarded-For)

### RLS bloqueando queries legítimas
- Verificar se `app.current_workspace_id` está sendo setado
- Usar `SET app.current_workspace_id = 123` antes das queries
- Checar logs: `SELECT current_setting('app.current_workspace_id', true)`

### Memory leak / OOM
- Analisar heap dump: `node --expose-gc --max-old-space-size=2048`
- Usar `pm2 monit` para identificar processo problemático
- Investigar queries lentas: `SELECT * FROM pg_stat_activity WHERE state = 'active'`

### Logs não aparecem
- Verificar `pm2 logs pratica` funciona
- Checar permissões `/var/log/pratica/`
- Confirmar `log_type: 'json'` em `ecosystem.config.js`

---

## 📞 Contatos

**Emergências de Segurança:**
- Email: security@pratica-inc.com.br
- Slack: #security-alerts
- On-call: [PagerDuty]

**Responsáveis:**
- Infraestrutura: [Nome]
- Segurança: [Nome]
- DevOps: [Nome]

---

**Versão:** 1.0.0  
**Última revisão:** 29 Jan 2025
