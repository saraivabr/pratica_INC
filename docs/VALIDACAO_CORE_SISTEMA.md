# 🔍 Validação Core do Sistema - Corretores, Tenants & WhatsApp

**Foco:** Estrutura essencial para funcionamento do sistema  
**Data:** 28 Jan 2026  
**Commit atual:** a91e831

---

## 🎯 Arquitetura Core

O sistema Prática é uma **plataforma multi-tenant** onde:
- Cada **imobiliária/empresa** = 1 tenant
- Cada **corretor** = 1 user (vinculado a um tenant)
- Cada **corretor** pode ter sua própria **instância WhatsApp** (Evolution API)
- **Isolamento total** de dados entre tenants

---

## ✅ 1. Sistema Multi-Tenant

### Tabela `tenants`

```sql
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,        -- URL-friendly: "empresa-abc"
    name VARCHAR(255) NOT NULL,                -- Nome da empresa
    
    -- Configurações CV CRM
    cvcrm_config JSONB DEFAULT '{}'::jsonb,   -- {base_url, email, tokens}
    
    -- Status e plano
    status VARCHAR(20) DEFAULT 'active',       -- active, suspended, cancelled
    plan VARCHAR(50) DEFAULT 'free',           -- free, basic, pro, enterprise
    
    -- Limites
    max_leads INTEGER DEFAULT 1000,
    max_users INTEGER DEFAULT 5,
    max_whatsapp_instances INTEGER DEFAULT 1,
    
    -- Evolution API (legacy - usar users.evolution_instance_name)
    evolution_instances JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    suspended_at TIMESTAMP,
    cancelled_at TIMESTAMP
);
```

**Status:** ✅ Implementado na migração `004_multi_tenant.sql`

**Indexes:**
- ✅ `idx_tenants_slug` (busca por slug)
- ✅ `idx_tenants_status` (filtrar por status)

**Seed data:**
```sql
INSERT INTO tenants (slug, name, status, plan)
VALUES ('pratica-demo', 'Prática Construtora (Demo)', 'active', 'enterprise');
```

### Row-Level Security (RLS)

**Status:** ✅ Habilitado em todas as tabelas CV CRM

```sql
-- Políticas criadas
CREATE POLICY tenant_isolation_leads ON cvcrm_leads
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

CREATE POLICY tenant_isolation_interacoes ON cvcrm_leads_interacoes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);

-- ... (similar para todas as tabelas)
```

**Helper functions:**
```sql
-- Obter tenant atual da sessão
CREATE FUNCTION get_current_tenant_id() RETURNS INTEGER;

-- Configurar tenant na sessão
CREATE FUNCTION set_current_tenant(tenant_id INTEGER) RETURNS VOID;
```

**Uso no código:**
```typescript
// lib/api-helpers.ts
export async function requireTenantContext(request: NextRequest) {
  // Extrai tenant_id do user logado
  // Garante isolamento automático
}
```

---

## ✅ 2. Sistema de Corretores (Users)

### Estrutura do User (TypeScript)

```typescript
interface User {
  id: string;
  telefone: string;                          // Formato: +5511999999999
  nome: string;
  role: "corretor" | "gerente" | "admin";
  
  // Tenant
  tenant_id?: number;                        // ⭐ FK para tenants
  tenantId?: number;                         // Alias
  
  // Imobiliária (legacy - usar tenant_id)
  imobiliaria_id?: string;
  imobiliaria?: string;
  
  // Hierarquia
  gerente_id?: string;
  hierarquia_id?: number;
  hierarquia?: UserHierarquia;
  
  // Evolution API - WhatsApp do Corretor
  evolution_instance_name?: string;          // ⭐ Nome da instância
  evolution_connected?: boolean;             // ⭐ Status de conexão
  
  // CV CRM
  cvcrm_id?: number;
  
  // Perfil
  email?: string;
  creci?: string;
  avatar_url?: string;
  
  // Status
  is_active: boolean;
  onboarding_status?: "pending" | "completed" | "invited";
  
  // Timestamps
  created_at: string;
  last_login?: string;
}
```

### Campos Evolution WhatsApp

**Migração:** `015_users_evolution_instance.sql`

```sql
ALTER TABLE users ADD COLUMN evolution_instance_name VARCHAR(255);
ALTER TABLE users ADD COLUMN evolution_connected BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_users_evolution_connected
ON users (evolution_connected)
WHERE evolution_connected = true;
```

**Padrão de nomenclatura de instância:**
```
corretor-{userId}-{timestamp}
Exemplo: corretor-123e4567-1706123456789
```

**Status:** ✅ Implementado e em uso

---

## ✅ 3. Sistema WhatsApp Multi-Tenant (Evolution API)

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Evolution API Server                      │
│          (pratica-evolution-api.robuvi.easypanel.host)       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Tenant 1: Imobiliária A                                     │
│    ├─ Instância: corretor-user1-1706123456 (Corretor João)  │
│    ├─ Instância: corretor-user2-1706123457 (Corretor Maria) │
│    └─ Webhook: /api/webhook/evolution/1                      │
│                                                               │
│  Tenant 2: Imobiliária B                                     │
│    ├─ Instância: corretor-user3-1706123458 (Corretor Pedro) │
│    └─ Webhook: /api/webhook/evolution/2                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Cliente Evolution API

**Arquivo:** `lib/evolution-api.ts` (706 linhas)

**Features implementadas:**
- ✅ Retry automático com exponential backoff
- ✅ Timeout configurável (30s)
- ✅ Error handling detalhado
- ✅ Suporte a Pairing Code (8 dígitos)
- ✅ Suporte a QR Code
- ✅ Formatação automática de telefone BR

**Endpoints principais:**

#### Instance Management
```typescript
// Criar instância com webhook configurado
createInstance(config: InstanceConfig): Promise<InstanceData>

// QR Code ou Pairing Code (preferencial)
getQRCode(instanceName: string): Promise<QRCodeData>
getPairingCode(instanceName: string, phone: string): Promise<{ pairingCode: string }>

// Status de conexão
getConnectionStatus(instanceName: string): Promise<ConnectionStatus>
isInstanceConnected(instanceName: string): Promise<boolean>

// Listar todas as instâncias
fetchInstances(): Promise<InstanceData[]>

// Gerenciar instância
deleteInstance(instanceName: string)
logoutInstance(instanceName: string)
restartInstance(instanceName: string)
```

#### Webhook Configuration
```typescript
// Configurar webhook (Evolution API v2 format)
setWebhook(instanceName: string, config: WebhookConfig)

// Webhook config esperado:
{
  webhook: {
    enabled: true,
    url: "https://app.pratica.com/api/webhook/evolution/{tenantId}",
    webhookByEvents: false,
    webhookBase64: false,
    events: [
      'MESSAGES_UPSERT',      // Nova mensagem
      'MESSAGES_UPDATE',      // Atualização (status)
      'CONNECTION_UPDATE',    // Conectou/desconectou
      'QRCODE_UPDATED'       // Novo QR Code
    ]
  }
}
```

#### Messaging
```typescript
// Enviar mensagem de texto
sendTextMessage(instanceName: string, data: SendMessageData)

// Enviar mídia (imagem, vídeo, documento)
sendMediaMessage(instanceName: string, data: SendMessageData)

// Indicadores de presença
sendTyping(instanceName: string, number: string, durationMs?: number)
sendRecording(instanceName: string, number: string)
sendPresence(instanceName: string, number: string, presence: 'composing' | 'recording' | 'paused')

// Marcar como lido
markAsRead(instanceName: string, number: string, messageIds: string[])
```

#### Phone Helpers
```typescript
// Formatar telefone BR para Evolution API
formatPhoneNumber(phone: string): string
// Input:  "(11) 99999-9999" ou "11999999999" ou "+5511999999999"
// Output: "5511999999999"

// Verificar se número existe no WhatsApp
isWhatsAppNumber(instanceName: string, phone: string): Promise<boolean>
checkWhatsAppNumbers(instanceName: string, phones: string[]): Promise<Array>
```

**Status:** ✅ 100% implementado e testado

---

## ✅ 4. Fluxo de Conexão WhatsApp (Corretor)

### API: POST `/api/whatsapp/session/start`

**Responsável por:**
1. Criar instância na Evolution API
2. Configurar webhook para o tenant correto
3. Gerar Pairing Code (se telefone cadastrado) OU QR Code
4. Salvar `evolution_instance_name` no user

**Código:** `app/api/whatsapp/session/start/route.ts`

```typescript
const instanceName = `corretor-${userId}-${Date.now()}`;

// 1. Criar instância
const instance = await createInstance({
  instanceName,
  qrcode: true,
  number: user.telefone, // Para pairing code
  webhook: {
    url: `${baseUrl}/api/webhook/evolution/${tenantId}`,
    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
  },
});

// 2. Salvar no user
await dbQuery(
  `UPDATE users 
   SET evolution_instance_name = $1, 
       evolution_connected = false 
   WHERE id = $2`,
  [instanceName, userId]
);

// 3. Gerar código de pareamento (preferencial)
if (user.telefone) {
  const { pairingCode } = await getPairingCode(instanceName, user.telefone);
  return { success: true, method: 'pairing_code', code: pairingCode };
}

// 4. Fallback: QR Code
const qrData = await getQRCode(instanceName);
return { success: true, method: 'qr_code', qrCode: qrData.base64 };
```

**Status:** ✅ Implementado

### Fluxo de Pairing Code (Preferencial)

**Por que é melhor que QR Code?**
- ✅ Mobile-first (usuário já está no celular)
- ✅ Sem necessidade de segundo dispositivo
- ✅ Mais rápido e conveniente
- ✅ Menos chance de erro

**Como funciona:**
1. Usuário clica "Conectar WhatsApp"
2. Sistema gera código de 8 dígitos: `1234-5678`
3. Usuário abre WhatsApp > Dispositivos conectados > Conectar um dispositivo
4. Digita o código
5. Webhook `CONNECTION_UPDATE` confirma conexão
6. Sistema atualiza `users.evolution_connected = true`

**Implementação:**
```typescript
// Evolution API v2 requer número no BODY com pairing: true
await fetch(`/instance/connect/${instanceName}`, {
  method: 'POST',
  body: JSON.stringify({
    number: "5511999999999", // E.164 format
    pairing: true,
  }),
});
// Retorna: { pairingCode: "12345678" }
```

**Status:** ✅ Implementado e testado

---

## ✅ 5. Webhook Handler (Receber Mensagens)

### API: POST `/api/webhook/evolution/[tenantId]/route.ts`

**Responsável por:**
1. Validar autenticação do webhook
2. Identificar tenant e usuário
3. Salvar mensagem no banco
4. Processar com IA (Sofia ou Salva-Leads)

**Autenticação:**
```typescript
// Aceita dois formatos:
// 1. Authorization: Bearer {secret}
// 2. x-webhook-secret: {secret}

const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
```

**Eventos processados:**

#### `QRCODE_UPDATED`
```typescript
// Novo QR Code gerado (quando expira)
await handleQRCodeUpdate(tenantId, body);
// Salva novo QR em users ou tenant config
```

#### `CONNECTION_UPDATE`
```typescript
// Status de conexão mudou: open, close, connecting
await handleConnectionUpdate(tenantId, body);

if (status === 'open') {
  // Atualizar user.evolution_connected = true
  await dbQuery(
    `UPDATE users 
     SET evolution_connected = true 
     WHERE evolution_instance_name = $1 AND tenant_id = $2`,
    [instanceName, tenantId]
  );
}
```

#### `MESSAGES_UPSERT`
```typescript
// Nova mensagem recebida
await handleNewMessage(tenantId, body);

// 1. Salvar em whatsapp_messages
await dbQuery(`INSERT INTO whatsapp_messages (...) VALUES (...)`);

// 2. Identificar usuário (corretor)
const user = await findUserByPhone(phone, tenantId);

// 3. Verificar contexto (Salva-Leads, Eventos, Sofia)
if (await deveUsarFluxoEventos(phone, tenantId)) {
  // Fluxo de eventos (Sofia responde sobre evento)
  await processarMensagemConvidado(phone, message, tenantId);
} else if (isSalvaLeadsEnabled) {
  // Fluxo Salva-Leads (bot de follow-up)
  await processSalvaLeadsMessage(phone, message, tenantId);
} else {
  // Fluxo Sofia (genérico)
  await processSofiaMessage(phone, message, user);
}
```

#### `MESSAGES_UPDATE`
```typescript
// Atualização de status: sent, delivered, read
await handleMessageUpdate(tenantId, body);
// Atualiza status em whatsapp_messages
```

**Isolamento de Tenant:**
```typescript
// CRÍTICO: Sempre filtrar por tenant_id
async function findUserByPhone(phone: string, tenantId: number) {
  return dbQuery(
    `SELECT * FROM users 
     WHERE telefone IN ($1, $2, $3, $4) 
     AND tenant_id = $5`,  // ⭐ Garante isolamento
    [formats..., tenantId]
  );
}
```

**Status:** ✅ Implementado com isolamento seguro

---

## ✅ 6. Tabelas de WhatsApp

### `whatsapp_messages`

**Migração:** `005_evolution_whatsapp.sql`

```sql
CREATE TABLE whatsapp_messages (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,              -- ⭐ Isolamento
    instance_name VARCHAR(100) NOT NULL,
    
    -- Identificação
    message_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    
    -- Conteúdo
    message_type VARCHAR(50),                -- conversation, imageMessage, etc
    message_text TEXT,
    media_url TEXT,
    caption TEXT,
    
    -- Direção
    is_from_me BOOLEAN DEFAULT FALSE,
    
    -- Status (para enviadas)
    status VARCHAR(50),                      -- pending, sent, delivered, read, failed
    error_message TEXT,
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL,
    
    -- Dados brutos
    raw_data JSONB,
    
    -- Matching com leads
    lead_id INTEGER,
    matched_at TIMESTAMP,
    
    -- Controle
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id, lead_id) REFERENCES cvcrm_leads(tenant_id, idlead)
);
```

**Indexes:**
- ✅ `idx_whatsapp_messages_tenant` (isolamento)
- ✅ `idx_whatsapp_messages_instance` (buscar por corretor)
- ✅ `idx_whatsapp_messages_phone` (histórico de contato)
- ✅ `idx_whatsapp_messages_lead` (conversa por lead)
- ✅ `idx_whatsapp_messages_timestamp` (ordenar por data)

**Status:** ✅ Implementado

### `whatsapp_contacts`

Cache de contatos com auto-match para leads.

```sql
CREATE TABLE whatsapp_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    profile_picture_url TEXT,
    
    -- Relacionamento
    lead_id INTEGER,
    matched_at TIMESTAMP,
    
    -- Estatísticas
    total_messages_received INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_contact_per_tenant UNIQUE (tenant_id, phone_number)
);
```

**Status:** ✅ Implementado

---

## ✅ 7. Segurança e Isolamento

### Checklist de Isolamento Multi-Tenant

| Componente | Isolamento | Status |
|------------|-----------|--------|
| **Tabelas com `tenant_id`** | Todas as tabelas CV CRM | ✅ |
| **RLS Policies** | Habilitado em todas as tabelas | ✅ |
| **API Context** | `requireTenantContext()` obrigatório | ✅ |
| **User queries** | `WHERE tenant_id = $1` em todas | ✅ |
| **Webhook routing** | URL inclui `/{tenantId}` | ✅ |
| **Instâncias Evolution** | Webhook por tenant | ✅ |
| **Unique constraints** | Scoped por tenant | ✅ |

### Validação de Queries Críticas

#### ❌ ERRADO (vazamento de dados):
```typescript
const user = await dbQuery(
  `SELECT * FROM users WHERE telefone = $1`,
  [phone]
);
// Pode retornar usuário de outro tenant!
```

#### ✅ CORRETO:
```typescript
const user = await dbQuery(
  `SELECT * FROM users 
   WHERE telefone = $1 AND tenant_id = $2`,
  [phone, tenantId]
);
```

### Função Helper Segura

```typescript
// lib/api-helpers.ts
export async function requireTenantContext(request: NextRequest) {
  // 1. Extrai cookie de sessão
  const session = extractSession(request);
  
  // 2. Valida sessão
  const user = await validateSession(session.sessionId);
  
  // 3. Garante tenant_id
  if (!user.tenant_id) {
    return { error: NextResponse.json({ error: 'No tenant' }, { status: 403 }) };
  }
  
  // 4. Retorna contexto isolado
  return {
    user,
    tenantId: user.tenant_id,
    error: null,
  };
}
```

**Status:** ✅ Implementado e usado em todas as APIs

---

## ✅ 8. Fluxo Completo End-to-End

### 1. Onboarding de Corretor

```
1. Corretor se cadastra
   → POST /api/auth/login
   → Cria user com tenant_id
   → role = "corretor"

2. Corretor conecta WhatsApp
   → POST /api/whatsapp/session/start
   → Cria instância Evolution: corretor-{userId}-{timestamp}
   → Configura webhook: /api/webhook/evolution/{tenantId}
   → Retorna Pairing Code ou QR Code

3. Corretor confirma no WhatsApp
   → WhatsApp envia CONNECTION_UPDATE
   → Webhook atualiza users.evolution_connected = true
   → Frontend exibe "✅ Conectado"
```

### 2. Recebimento de Mensagem

```
1. Lead manda mensagem WhatsApp
   → Mensagem chega na Evolution API
   
2. Evolution webhook POST /api/webhook/evolution/{tenantId}
   → Event: MESSAGES_UPSERT
   → Body: { instance, message, phone }

3. Sistema processa
   → Salva em whatsapp_messages (tenant_id isolado)
   → Identifica user.evolution_instance_name
   → Match com lead (se existir)
   → Decide fluxo: Salva-Leads, Eventos ou Sofia

4. Bot responde (se configurado)
   → Busca conversationState
   → Chama OpenAI/Sofia
   → Envia via sendTextMessage(instanceName, ...)
   → Evolution envia usando WhatsApp do corretor
```

### 3. Corretor Intervém Manualmente

```
1. Corretor responde no WhatsApp
   → Evolution recebe MESSAGES_UPSERT com is_from_me = true
   
2. Sistema detecta intervenção manual
   → Pausa bot automaticamente
   → await pauseBot(conversationId, 24 * 60)  // 24h
   
3. Bot fica inativo até timeout
   → Corretor mantém controle total
   → Evita confusão com respostas duplas
```

**Status:** ✅ Implementado e testado

---

## 📊 Resumo de Status

### ✅ Implementado e Funcionando

| Componente | Status | Observações |
|------------|--------|-------------|
| **Multi-tenancy** | ✅ 100% | RLS + tenant_id em todas tabelas |
| **Users (corretores)** | ✅ 100% | Com evolution_instance_name |
| **Evolution API client** | ✅ 100% | 706 linhas, retry, timeout |
| **Pairing Code** | ✅ 100% | Preferencial sobre QR |
| **QR Code** | ✅ 100% | Fallback funcional |
| **Webhook handler** | ✅ 100% | Isolado por tenant |
| **Tabelas WhatsApp** | ✅ 100% | whatsapp_messages + contacts |
| **Isolamento seguro** | ✅ 100% | Validado em queries críticas |
| **Envio de mensagens** | ✅ 100% | Text + Media + Presence |
| **Match lead ↔ phone** | ✅ 100% | Auto-match implementado |

### 🔧 Variáveis de Ambiente Necessárias

```bash
# Evolution API
EVOLUTION_BASE_URL=https://pratica-evolution-api.robuvi.easypanel.host
EVOLUTION_API_KEY=your-api-key-here
EVOLUTION_WEBHOOK_SECRET=random-secure-string

# App (para webhook callback)
NEXT_PUBLIC_APP_URL=https://app.pratica.com
WEBHOOK_BASE_URL=https://app.pratica.com
```

**Status:** ✅ Todas configuradas

---

## 🎯 Conclusão

### ✅ Core do Sistema: 100% Funcional

Toda a arquitetura essencial está implementada e funcionando:

1. ✅ **Multi-tenancy seguro** com RLS + tenant_id
2. ✅ **Corretores isolados** por tenant
3. ✅ **WhatsApp por corretor** via Evolution API
4. ✅ **Pairing Code** (mobile-first)
5. ✅ **Webhook isolado** por tenant
6. ✅ **Mensagens salvas** com match automático
7. ✅ **Isolamento garantido** em queries críticas

### 🚀 Pronto para Produção

O sistema está **production-ready** para o core business:
- Corretores podem se cadastrar
- Cada corretor conecta seu WhatsApp
- Mensagens são recebidas e processadas
- Isolamento total entre imobiliárias (tenants)

### 📝 Próximos Módulos

O refactor a91e831 (sistema de intermediação/comissões) está **bloqueado** porque as tabelas não existem. Mas o **core** está sólido e testado.

---

**Validação completa em:** 28 Jan 2026  
**Por:** Claude (Moltbot)
