# Projeto Prática - Informações para Claude

## Banco de Dados

### Configuração Principal
- **Produção**: PostgreSQL local na VPS
- **Host**: `185.182.184.122`
- **URL**: `postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica`

### Acesso Remoto
```bash
ssh root@185.182.184.122
psql -U pratica -d pratica
```

**Para rodar SQL diretamente:**
```bash
ssh root@185.182.184.122 "psql -U pratica -d pratica -c 'SELECT * FROM tabela;'"
```

### Supabase (DESATIVADO)
O Supabase foi desativado. As variáveis ainda existem no .env.local como backup, mas não são usadas.

### Redis (ATIVO)
Cache distribuído, rate limiting e debounce.

**Uso no código:**
- `lib/redis.ts` - Cliente singleton
- `lib/cache.ts` - Cache genérico (CV CRM, leads)
- `lib/debounce.ts` - Debounce distribuído
- `lib/rate-limiter.ts` - Rate limiting distribuído

---

## Infraestrutura

| Serviço | Uso |
|---------|-----|
| **VPS (185.182.184.122)** | App (PM2) + PostgreSQL + Redis |
| **Evolution API** | WhatsApp (multi-tenant) |
| **CV CRM** | Integração com CRM imobiliário |
| **OpenAI** | IA (Sofia, análises) |

---

## Módulos Principais

### WhatsApp Multi-Tenant (Evolution API)
Sistema de conexão WhatsApp por corretor usando Evolution API.

**Arquitetura:**
- Cada corretor tem sua própria instância WhatsApp
- Instâncias são nomeadas no formato `corretor-{userId}-{timestamp}`
- Webhooks são recebidos em `/api/webhook/evolution/{tenantId}`
- Suporta conexão via QR Code ou Pairing Code (8 dígitos)

**Arquivos principais:**
- `app/api/whatsapp/session/start/route.ts` - Criar/reconectar instância
- `app/api/webhook/evolution/[tenantId]/route.ts` - Receber eventos WhatsApp
- `lib/evolution-api.ts` - Cliente da Evolution API

**Fluxo de conexão:**
1. Usuário chama POST `/api/whatsapp/session/start`
2. Sistema cria instância na Evolution API com webhook configurado
3. Se usuário tem telefone cadastrado, gera Pairing Code (preferencial)
4. Senão, retorna QR Code para scan
5. Webhook `CONNECTION_UPDATE` atualiza `users.evolution_connected`

**Isolamento de tenant:**
- `findUserByPhone()` SEMPRE filtra por `tenant_id`
- Evita vazamento de dados entre tenants com telefones duplicados
- Queries usam `WHERE telefone = $1 AND tenant_id = $2`

**Variáveis de ambiente necessárias:**
- `EVOLUTION_API_URL` - URL da Evolution API
- `EVOLUTION_API_KEY` - API Key da Evolution
- `WEBHOOK_BASE_URL` ou `NEXT_PUBLIC_APP_URL` - URL base para webhooks (obrigatório em produção)

**Tabelas:**
- `users.evolution_instance_name` - Nome da instância do corretor
- `users.evolution_connected` - Status de conexão (boolean)
- `whatsapp_messages` - Histórico de mensagens
- `whatsapp_contacts` - Contatos WhatsApp

---

### Salva-Leads
Sistema de follow-up automático de leads via WhatsApp do corretor.

**Funcionalidades:**
- Bot responde leads automaticamente usando instância do corretor
- Debounce de 10s para acumular mensagens rápidas
- Pausa automática quando corretor intervém manualmente
- Integração com CV CRM para criar interações

**Arquivos:**
- `lib/salva-leads/conversation.ts` - Gerenciamento de conversas
- `app/api/salva-leads/process-debounced/route.ts` - Cron de processamento
- `app/corretor/salva-leads/page.tsx` - Interface do corretor

---

### Disparador de Eventos
Módulo para enviar convites de eventos para corretores via WhatsApp.

**Tabelas:**
- `eventos` - Eventos criados
- `evento_convidados` - Corretores convidados

**Telas:** `/admin/eventos`

**API:** `/api/eventos/*`

**Funcionalidades:**
- Criar eventos com data/hora/local
- Selecionar corretores da base CV CRM ou importar planilha
- IA gera mensagens únicas (anti-spam)
- Sofia responde dúvidas e coleta confirmação
- Lembrete automático configurável (1h, 6h, 12h, 24h, 48h antes)

---

## Comandos Úteis

### Deploy (VPS)
```bash
# Sync arquivos para VPS
rsync -avz --exclude node_modules --exclude .next --exclude .git \
  ./ root@185.182.184.122:/var/www/pratica/

# Build e restart no servidor
ssh root@185.182.184.122 "cd /var/www/pratica && pnpm build && pm2 restart pratica"

# Ver logs
ssh root@185.182.184.122 "pm2 logs pratica --lines 100"

# Ver status
ssh root@185.182.184.122 "pm2 status"
```

### Desenvolvimento
```bash
# Rodar local
pnpm dev

# Build
pnpm build
```

### Banco de Dados
```bash
# Acessar banco (interativo)
ssh root@185.182.184.122 "psql -U pratica -d pratica"

# Rodar migração
ssh root@185.182.184.122 "psql -U pratica -d pratica < /var/www/pratica/migrations/XXX.sql"
```

---

## Migrações

As migrações ficam em `/migrations/`. Para rodar na VPS:

```bash
cat migrations/012_disparador_eventos.sql | ssh root@185.182.184.122 "psql -U pratica -d pratica"
```

**Migrações existentes:**
- 001-011: Estrutura base, CV CRM sync, multi-tenant, WhatsApp, etc.
- 012: Disparador de Eventos (eventos, evento_convidados)
- 013: Fix tenant relations (propagação de tenant_id)
