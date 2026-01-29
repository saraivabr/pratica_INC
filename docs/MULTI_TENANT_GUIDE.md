# 🏢 Multi-Tenant Guide - CV CRM Sync

Sistema completo de multi-tenancy (row-based) para gerenciar múltiplas empresas/clientes com isolamento de dados.

## 📊 Arquitetura

**Estratégia**: Row-Based Multi-Tenancy
- Todas as empresas compartilham as mesmas tabelas
- Cada registro tem um `tenant_id` que identifica a empresa
- Row Level Security (RLS) garante isolamento automático

### Por Que Row-Based?

✅ **Escalável** para 100+ clientes
✅ **Simples** de gerenciar (uma única migration)
✅ **Performance** ótima com indexes corretos
✅ **Backup** mais fácil

## 🗄️ Estrutura de Banco

### Tabela Principal: `tenants`

```sql
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,     -- 'empresa-abc'
    name VARCHAR(255) NOT NULL,            -- 'Empresa ABC Ltda'

    -- Configurações CV CRM (por cliente)
    cvcrm_config JSONB NOT NULL,           -- {base_url, email, tokens}

    -- Status e plano
    status VARCHAR(20) DEFAULT 'active',   -- active, suspended, cancelled
    plan VARCHAR(50) DEFAULT 'free',       -- free, basic, pro, enterprise

    -- Limites
    max_leads INTEGER DEFAULT 1000,
    max_users INTEGER DEFAULT 5,
    max_whatsapp_instances INTEGER DEFAULT 1,

    -- Evolution API (WhatsApp)
    evolution_instances JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Todas as Tabelas CV CRM Têm `tenant_id`

```sql
-- Exemplo: cvcrm_leads
ALTER TABLE cvcrm_leads ADD COLUMN tenant_id INTEGER;
ALTER TABLE cvcrm_leads ADD CONSTRAINT fk_leads_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Unique constraint tenant-scoped
CREATE UNIQUE INDEX idx_leads_tenant_idlead_unique
    ON cvcrm_leads(tenant_id, idlead);
```

**Tabelas com tenant_id**:
- ✅ `cvcrm_leads`
- ✅ `cvcrm_leads_interacoes`
- ✅ `cvcrm_leads_tarefas`
- ✅ `cvcrm_atendimentos`
- ✅ `cvcrm_atendimentos_arquivos`
- ✅ `cvcrm_assistencias`
- ✅ `cvcrm_sync_logs`
- ✅ `cvcrm_sync_cursors`

## 🚀 Como Usar

### 1. Criar um Novo Tenant (Cliente/Empresa)

**Via API:**

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "construtora-xyz",
    "name": "Construtora XYZ Ltda",
    "cvcrm_config": {
      "base_url": "https://xyz.cvcrm.com.br",
      "email": "contato@xyz.com.br",
      "tokens": {
        "lead": "token-xyz-aqui"
      }
    },
    "plan": "pro"
  }'
```

**Via TypeScript:**

```typescript
import { createTenant } from '@/lib/tenant-context';

const tenant = await createTenant({
  slug: 'construtora-xyz',
  name: 'Construtora XYZ Ltda',
  cvcrm_config: {
    base_url: 'https://xyz.cvcrm.com.br',
    email: 'contato@xyz.com.br',
    tokens: {
      lead: 'token-xyz-aqui'
    }
  },
  plan: 'pro'
});

console.log('Tenant criado:', tenant.id);
```

**Via SQL:**

```sql
INSERT INTO tenants (slug, name, cvcrm_config, plan)
VALUES (
  'construtora-xyz',
  'Construtora XYZ Ltda',
  '{"base_url": "https://xyz.cvcrm.com.br", "email": "contato@xyz.com.br", "tokens": {"lead": "token-xyz"}}'::jsonb,
  'pro'
);
```

### 2. Listar Tenants

```bash
# Todos os tenants ativos
curl http://localhost:3000/api/tenants

# Incluir suspensos/cancelados
curl http://localhost:3000/api/tenants?status=all
```

### 3. Rodar Sync para um Tenant

**Agente Individual:**

```bash
# Leads core para tenant_id = 1
npx tsx lib/sync/agents-simple/01-leads-core.ts 1

# Leads interações para tenant_id = 2
npx tsx lib/sync/agents-simple/02-leads-interacoes.ts 2
```

**Todos os Agentes (Sequencial):**

```bash
# Para tenant_id = 1
npx tsx lib/sync/agents-simple/run-all.ts 1

# Para tenant_id = 3
npx tsx lib/sync/agents-simple/run-all.ts 3
```

**Todos os Agentes (Paralelo - RÁPIDO!):**

```bash
npx tsx lib/sync/agents-simple/run-all.ts 1 --parallel
```

### 4. Consultar Dados por Tenant

**Usando TenantQuery Helper:**

```typescript
import { tenantQuery } from '@/lib/tenant-context';

const query = tenantQuery(1); // tenant_id = 1

// SELECT
const leads = await query.select('cvcrm_leads', { score: { $gte: 50 } });

// INSERT (tenant_id adicionado automaticamente)
const newLead = await query.insert('cvcrm_leads', {
  idlead: 12345,
  nome: 'João Silva',
  email: 'joao@exemplo.com'
});

// UPDATE
await query.update('cvcrm_leads', { idlead: 12345 }, { score: 90 });

// DELETE
await query.delete('cvcrm_leads', { idlead: 12345 });
```

**Usando withTenant (com RLS):**

```typescript
import { withTenant } from '@/lib/tenant-context';

const leads = await withTenant(1, async (client) => {
  // RLS ativado: só vê dados do tenant 1
  const result = await client.query('SELECT * FROM cvcrm_leads LIMIT 10');
  return result.rows;
});
```

**SQL Direto:**

```sql
-- SEMPRE filtrar por tenant_id!
SELECT * FROM cvcrm_leads
WHERE tenant_id = 1
  AND score >= 50;

-- Joins tenant-aware
SELECT
  l.nome,
  i.descricao,
  i.data_cad
FROM cvcrm_leads l
JOIN cvcrm_leads_interacoes i ON i.tenant_id = l.tenant_id AND i.idlead = l.idlead
WHERE l.tenant_id = 1
ORDER BY i.data_cad DESC
LIMIT 10;
```

## 🔒 Segurança: Row Level Security (RLS)

O PostgreSQL garante isolamento automático com RLS:

```sql
-- Ativar RLS na tabela
ALTER TABLE cvcrm_leads ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem dados do próprio tenant
CREATE POLICY tenant_isolation_leads ON cvcrm_leads
    USING (tenant_id = current_setting('app.current_tenant_id', true)::INTEGER);
```

**Como funciona:**

```typescript
// 1. Definir tenant context
await client.query(`SELECT set_config('app.current_tenant_id', '1', false)`);

// 2. Todas as queries agora são filtradas automaticamente
const result = await client.query('SELECT * FROM cvcrm_leads');
// RLS adiciona automaticamente: WHERE tenant_id = 1
```

## 📊 Monitoramento

### Ver Todos os Tenants

```sql
SELECT
  id,
  slug,
  name,
  status,
  plan,
  cvcrm_config->>'email' as email,
  created_at
FROM tenants
ORDER BY created_at DESC;
```

### Estatísticas por Tenant

```sql
SELECT
  t.id,
  t.name,
  COUNT(l.*) as total_leads,
  COUNT(CASE WHEN l.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as leads_last_30d
FROM tenants t
LEFT JOIN cvcrm_leads l ON l.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY total_leads DESC;
```

### Logs de Sync por Tenant

```sql
SELECT
  t.name as tenant,
  sl.agent_name,
  sl.records_processed,
  sl.records_created,
  sl.records_updated,
  sl.started_at,
  sl.completed_at - sl.started_at as duration
FROM cvcrm_sync_logs sl
JOIN tenants t ON t.id = sl.tenant_id
WHERE sl.status = 'completed'
ORDER BY sl.started_at DESC
LIMIT 20;
```

## 🔄 Workflow Completo

### Setup Inicial

```bash
# 1. Rodar migration multi-tenant
psql $DATABASE_URL -f migrations/004_multi_tenant.sql

# 2. Criar primeiro tenant (já existe o demo)
curl -X POST http://localhost:3000/api/tenants -H "Content-Type: application/json" -d '{
  "slug": "minha-empresa",
  "name": "Minha Empresa",
  "cvcrm_config": {
    "base_url": "https://pratica.cvcrm.com.br",
    "email": "email@exemplo.com",
    "tokens": {"lead": "seu-token"}
  }
}'
```

### Operação Diária

```bash
# 1. Sync matinal de todos os tenants
for tenant_id in 1 2 3; do
  echo "Syncing tenant $tenant_id..."
  npx tsx lib/sync/agents-simple/run-all.ts $tenant_id
done

# 2. Verificar status
curl http://localhost:3000/api/tenants
```

## 🎯 Próximos Passos

### 1. **Evolution API Integration** 🔜
```typescript
// Cada tenant terá suas próprias instâncias WhatsApp
const tenant = await getTenant(1);
tenant.evolution_instances = [
  {
    instance_name: 'empresa-abc-comercial',
    qr_code: 'data:image/png;base64,...',
    status: 'connected'
  }
];
```

### 2. **Página Admin de Tenants** 🔜
```
/admin/tenants
  - Lista de todos os tenants
  - Criar/editar/suspender tenants
  - Configurar tokens CV CRM
  - Ver estatísticas de sync
  - Gerenciar instâncias Evolution
```

### 3. **Subdomain Routing** 🔜
```
empresa-abc.seuapp.com → tenant: empresa-abc
empresa-xyz.seuapp.com → tenant: empresa-xyz
```

### 4. **Sync Automático (Cron)** 🔜
```typescript
// A cada 6 horas, sync todos os tenants ativos
cron.schedule('0 */6 * * *', async () => {
  const tenants = await listTenants('active');
  for (const tenant of tenants) {
    await runAllAgents(tenant.id, false);
  }
});
```

## 🐛 Troubleshooting

### Erro: "tenant_id cannot be null"

```sql
-- Verificar se tenant existe
SELECT * FROM tenants WHERE id = 1;

-- Criar se não existir
INSERT INTO tenants (slug, name, cvcrm_config) VALUES (...);
```

### Erro: "no unique constraint matching ON CONFLICT"

Você está usando o sync antigo. Use os novos agentes:

```bash
# ✅ Correto (com tenant_id)
npx tsx lib/sync/agents-simple/01-leads-core.ts 1

# ❌ Errado (sem tenant_id)
npx tsx lib/sync/agents-simple/01-leads-core.ts
```

### RLS bloqueando queries

```sql
-- Desabilitar RLS temporariamente (apenas para debug!)
ALTER TABLE cvcrm_leads DISABLE ROW LEVEL SECURITY;

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'cvcrm_leads';
```

## 📝 Exemplo Completo

```typescript
// 1. Criar tenant
const tenant = await createTenant({
  slug: 'construtora-abc',
  name: 'Construtora ABC',
  cvcrm_config: {
    base_url: 'https://abc.cvcrm.com.br',
    email: 'ti@abc.com',
    tokens: { lead: 'token-abc' }
  }
});

// 2. Rodar sync
await syncLeadsCore(tenant.id, true);

// 3. Consultar dados
const query = tenantQuery(tenant.id);
const leads = await query.select('cvcrm_leads', { score: { $gte: 70 } });

console.log(`Tenant ${tenant.name} tem ${leads.length} leads com score >= 70`);
```

---

**Criado em**: 2026-01-17
**Status**: ✅ Totalmente funcional
**Agentes atualizados**: 5/5 ✅
**Migration**: 004_multi_tenant.sql ✅
