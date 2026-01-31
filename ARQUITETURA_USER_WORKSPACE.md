# 🏗️ Nova Arquitetura: User Workspace (1 Usuário = 1 Workspace)

**Conceito:** Cada usuário tem seu próprio espaço isolado, como se fosse seu próprio "mini-sistema".

**Data:** 28 Jan 2026  
**Prioridade:** 🔴 CRÍTICA

---

## 🎯 Filosofia

### Modelo Antigo (Multi-Tenant por Imobiliária)
```
Imobiliária X (tenant_id=1)
  ├─ Gerente (acessa tudo da imobiliária)
  ├─ Corretor A (acessa tudo da imobiliária)
  ├─ Corretor B (acessa tudo da imobiliária)
  └─ Leads compartilhados
  
❌ Problema: Todos veem os leads de todos
❌ Problema: Sem privacidade entre corretores
❌ Problema: Complexo gerenciar permissões
```

### Modelo Novo (User Workspace)
```
Corretor A (user_id=123, workspace_id=123)
  ├─ Seus leads
  ├─ Suas conversas WhatsApp
  ├─ Suas vendas
  └─ Seus dados ISOLADOS

Corretor B (user_id=456, workspace_id=456)
  ├─ Seus leads (diferentes de A)
  ├─ Suas conversas WhatsApp (diferentes de A)
  └─ ZERO acesso aos dados de A

Gerente/Admin (opcional)
  └─ Acesso a MÚLTIPLOS workspaces (se configurado)
  
✅ Vantagem: Isolamento total por padrão
✅ Vantagem: Privacidade garantida
✅ Vantagem: Simplicidade
✅ Vantagem: Compartilhamento é opt-in (não obrigatório)
```

---

## 🔄 Mudanças na Arquitetura

### 1. Conceito de Workspace

**Workspace = Espaço pessoal do usuário**

```typescript
interface Workspace {
  id: number;                    // Workspace ID (mesmo que user_id na maioria dos casos)
  owner_id: string;              // User que é dono
  name: string;                  // "João Silva - Corretor"
  type: 'personal' | 'shared';   // Personal (1 user) ou Shared (time)
  
  // Opcional: Se workspace compartilhado
  members?: string[];            // User IDs com acesso
  
  // Configurações
  settings: {
    cv_crm_config?: any;         // Cada workspace tem seu próprio CV CRM
    evolution_instance?: string; // Cada workspace tem seu WhatsApp
    // ...
  };
}
```

### 2. Mapeamento User → Workspace

**Regra:** `workspace_id = user_id` (por padrão)

```sql
-- Novo campo em users
ALTER TABLE users ADD COLUMN workspace_id INTEGER;

-- Por padrão, workspace_id aponta para um workspace pessoal
-- Trigger auto-cria workspace ao criar user
```

### 3. Todas as Tabelas Usam workspace_id

```sql
-- Substituir tenant_id por workspace_id em TODAS as tabelas

-- Leads
ALTER TABLE cvcrm_leads DROP COLUMN tenant_id;
ALTER TABLE cvcrm_leads ADD COLUMN workspace_id INTEGER NOT NULL;
-- FK: workspace_id → workspaces.id

-- WhatsApp
ALTER TABLE whatsapp_messages DROP COLUMN tenant_id;
ALTER TABLE whatsapp_messages ADD COLUMN workspace_id INTEGER NOT NULL;

-- Eventos
ALTER TABLE eventos DROP COLUMN tenant_id;
ALTER TABLE eventos ADD COLUMN workspace_id INTEGER NOT NULL;

-- etc...
```

---

## 🏗️ Estrutura de Tabelas

### Tabela `workspaces`

```sql
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    
    -- Proprietário
    owner_id UUID NOT NULL,  -- FK para users.id
    
    -- Informações
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly
    type VARCHAR(20) NOT NULL DEFAULT 'personal',  -- personal | shared
    
    -- Configurações do workspace
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- CV CRM (cada workspace pode ter seu próprio)
    cvcrm_config JSONB DEFAULT '{}'::jsonb,  -- {base_url, email, tokens}
    
    -- Evolution API (cada workspace tem sua instância WhatsApp)
    evolution_instance_name VARCHAR(255),
    evolution_connected BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    plan VARCHAR(50) DEFAULT 'free',  -- free, pro, enterprise
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_type ON workspaces(type);

COMMENT ON TABLE workspaces IS 
  'Workspace pessoal de cada usuário. 1 user = 1 workspace (padrão).';
```

### Tabela `workspace_members` (Opcional - Compartilhamento)

```sql
CREATE TABLE workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',  -- owner, admin, member, viewer
    permissions JSONB DEFAULT '{}'::jsonb,  -- Permissões granulares
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

COMMENT ON TABLE workspace_members IS 
  'Membros com acesso a um workspace compartilhado (opcional).';
```

### Atualizar `users`

```sql
ALTER TABLE users ADD COLUMN workspace_id INTEGER;

-- FK para workspace principal do usuário
ALTER TABLE users 
  ADD CONSTRAINT fk_users_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX idx_users_workspace ON users(workspace_id);

-- Remover tenant_id (não é mais necessário)
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;

COMMENT ON COLUMN users.workspace_id IS 
  'Workspace principal do usuário (geralmente seu workspace pessoal).';
```

---

## 🔐 Isolamento e Segurança

### 1. Queries SEMPRE Filtram por workspace_id

```typescript
// ❌ ERRADO (vaza dados)
const leads = await dbQuery(
  `SELECT * FROM cvcrm_leads WHERE status = $1`,
  [status]
);

// ✅ CORRETO (isolado)
const leads = await dbQuery(
  `SELECT * FROM cvcrm_leads 
   WHERE workspace_id = $1 AND status = $2`,
  [workspaceId, status]
);
```

### 2. API Helper Atualizado

```typescript
// lib/api-helpers.ts

export async function requireWorkspaceContext(request: NextRequest) {
  // 1. Validar autenticação
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }

  // 2. Obter workspace do usuário
  const workspaceId = (user as any).workspace_id;
  
  if (!workspaceId) {
    // Usuário sem workspace → criar automaticamente
    const newWorkspaceId = await autoCreateWorkspace(user);
    return {
      user,
      workspaceId: newWorkspaceId,
      error: null,
    };
  }

  return {
    user,
    workspaceId,
    error: null,
  };
}

async function autoCreateWorkspace(user: any): Promise<number> {
  const { rows } = await dbQuery(
    `INSERT INTO workspaces (owner_id, name, slug, type)
     VALUES ($1, $2, $3, 'personal')
     RETURNING id`,
    [
      user.id,
      `${user.nome} - Workspace`,
      `user-${user.id}-${Date.now()}`,
    ]
  );

  const workspaceId = rows[0].id;

  // Atualizar user com workspace_id
  await dbQuery(
    `UPDATE users SET workspace_id = $1 WHERE id = $2`,
    [workspaceId, user.id]
  );

  return workspaceId;
}
```

### 3. Row-Level Security (RLS)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE cvcrm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
-- etc...

-- Política: Usuário só vê dados do seu workspace
CREATE POLICY workspace_isolation_leads ON cvcrm_leads
  USING (
    workspace_id = current_setting('app.current_workspace_id', true)::INTEGER
  );

CREATE POLICY workspace_isolation_messages ON whatsapp_messages
  USING (
    workspace_id = current_setting('app.current_workspace_id', true)::INTEGER
  );

-- Helper para setar workspace na sessão
CREATE OR REPLACE FUNCTION set_current_workspace(wid INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_workspace_id', wid::TEXT, false);
END;
$$ LANGUAGE plpgsql;
```

---

## 🔄 Migração Completa

### `migrations/022_user_workspace_architecture.sql`

```sql
-- ============================================================================
-- MIGRAÇÃO: User Workspace Architecture
-- Transforma sistema de multi-tenant (imobiliária) para user workspace
-- ============================================================================

BEGIN;

-- 1. Criar tabela workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'personal',
    settings JSONB DEFAULT '{}'::jsonb,
    cvcrm_config JSONB DEFAULT '{}'::jsonb,
    evolution_instance_name VARCHAR(255),
    evolution_connected BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_type ON workspaces(type);

-- 2. Criar tabela workspace_members (compartilhamento opcional)
CREATE TABLE IF NOT EXISTS workspace_members (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- 3. Criar workspace para cada usuário existente
INSERT INTO workspaces (owner_id, name, slug, type, evolution_instance_name, evolution_connected)
SELECT 
  u.id as owner_id,
  u.nome || ' - Workspace' as name,
  'user-' || u.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())) as slug,
  'personal' as type,
  u.evolution_instance_name,
  COALESCE(u.evolution_connected, false) as evolution_connected
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.owner_id = u.id
);

-- 4. Adicionar workspace_id em users
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- 5. Atribuir workspace_id a cada usuário (seu próprio workspace)
UPDATE users u
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = u.id
  AND u.workspace_id IS NULL;

-- 6. Criar FK users → workspaces
ALTER TABLE users 
  ADD CONSTRAINT fk_users_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX idx_users_workspace ON users(workspace_id);

-- 7. Migrar dados de tenant_id para workspace_id em todas as tabelas

-- CV CRM Leads
ALTER TABLE cvcrm_leads ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE cvcrm_leads l
SET workspace_id = u.workspace_id
FROM users u
WHERE l.tenant_id = (
  SELECT tenant_id FROM users WHERE id = u.id LIMIT 1
)
AND l.workspace_id IS NULL;

-- WhatsApp Messages
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE whatsapp_messages m
SET workspace_id = u.workspace_id
FROM users u
WHERE m.tenant_id = (
  SELECT tenant_id FROM users WHERE id = u.id LIMIT 1
)
AND m.workspace_id IS NULL;

-- WhatsApp Contacts
ALTER TABLE whatsapp_contacts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE whatsapp_contacts c
SET workspace_id = u.workspace_id
FROM users u
WHERE c.tenant_id = (
  SELECT tenant_id FROM users WHERE id = u.id LIMIT 1
)
AND c.workspace_id IS NULL;

-- Eventos
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE eventos e
SET workspace_id = u.workspace_id
FROM users u
WHERE e.tenant_id = (
  SELECT tenant_id FROM users WHERE id = u.id LIMIT 1
)
AND e.workspace_id IS NULL;

-- Evento Convidados
ALTER TABLE evento_convidados ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
UPDATE evento_convidados ec
SET workspace_id = e.workspace_id
FROM eventos e
WHERE ec.evento_id = e.id
AND ec.workspace_id IS NULL;

-- Adicionar workspace_id em outras tabelas conforme necessário...
-- (cvcrm_leads_interacoes, cvcrm_leads_tarefas, etc.)

-- 8. Tornar workspace_id obrigatório (após migração)
-- ALTER TABLE cvcrm_leads ALTER COLUMN workspace_id SET NOT NULL;
-- ALTER TABLE whatsapp_messages ALTER COLUMN workspace_id SET NOT NULL;
-- (fazer depois de validar que todos têm workspace_id)

-- 9. Criar índices em workspace_id
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_workspace ON cvcrm_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace ON whatsapp_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_workspace ON whatsapp_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_eventos_workspace ON eventos(workspace_id);

-- 10. RLS Policies (substituir tenant_id por workspace_id)
ALTER TABLE cvcrm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_leads ON cvcrm_leads;
CREATE POLICY workspace_isolation_leads ON cvcrm_leads
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_messages ON whatsapp_messages;
CREATE POLICY workspace_isolation_messages ON whatsapp_messages
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- 11. Trigger para auto-criar workspace ao criar usuário
CREATE OR REPLACE FUNCTION auto_create_workspace()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id INTEGER;
BEGIN
  -- Se workspace_id já foi definido, não fazer nada
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Criar workspace pessoal
  INSERT INTO workspaces (owner_id, name, slug, type)
  VALUES (
    NEW.id,
    NEW.nome || ' - Workspace',
    'user-' || NEW.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
    'personal'
  )
  RETURNING id INTO new_workspace_id;
  
  -- Atribuir ao usuário
  NEW.workspace_id := new_workspace_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_workspace ON users;
CREATE TRIGGER trigger_auto_create_workspace
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workspace();

-- 12. Helper functions
CREATE OR REPLACE FUNCTION set_current_workspace(wid INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_workspace_id', wid::TEXT, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_workspace_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN current_setting('app.current_workspace_id', true)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;

COMMENT ON TABLE workspaces IS 
  '1 usuário = 1 workspace (por padrão). Isolamento completo de dados.';
COMMENT ON TABLE workspace_members IS 
  'Compartilhamento opcional de workspace entre usuários.';
```

---

## 🔧 Atualizar Código Backend

### 1. Substituir requireTenantContext → requireWorkspaceContext

```typescript
// lib/api-helpers.ts

export async function requireWorkspaceContext(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { 
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) 
    };
  }

  let workspaceId = (user as any).workspace_id;

  // Auto-criar workspace se não existir
  if (!workspaceId) {
    workspaceId = await autoCreateWorkspace(user);
  }

  return {
    user,
    workspaceId,
    error: null,
  };
}

async function autoCreateWorkspace(user: any): Promise<number> {
  const { rows } = await dbQuery(
    `INSERT INTO workspaces (owner_id, name, slug, type)
     VALUES ($1, $2, $3, 'personal')
     RETURNING id`,
    [user.id, `${user.nome} - Workspace`, `user-${user.id}-${Date.now()}`]
  );

  const workspaceId = rows[0].id;

  await dbQuery(
    `UPDATE users SET workspace_id = $1 WHERE id = $2`,
    [workspaceId, user.id]
  );

  return workspaceId;
}
```

### 2. Atualizar APIs (Exemplo: Leads)

```typescript
// app/api/cvcrm/leads/route.ts

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);  // ⭐ Mudança
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const { rows } = await dbQuery(
      `SELECT * FROM cvcrm_leads 
       WHERE workspace_id = $1 
       ${status ? 'AND status = $2' : ''}
       ORDER BY created_at DESC`,
      status ? [ctx.workspaceId, status] : [ctx.workspaceId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Atualizar Webhook do WhatsApp

```typescript
// app/api/webhook/evolution/[workspaceId]/route.ts
// (renomear de [tenantId] para [workspaceId])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const params = await context.params;
    const workspaceId = parseInt(params.workspaceId);

    if (isNaN(workspaceId)) {
      return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
    }

    const body = await request.json();

    // Processar evento...
    // Salvar mensagem com workspace_id
    await dbQuery(
      `INSERT INTO whatsapp_messages (workspace_id, ...)
       VALUES ($1, ...)`,
      [workspaceId, ...]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🎨 Atualizar Frontend

### 1. Auth Context

```typescript
// lib/auth-context.tsx

export interface User {
  id: string;
  telefone: string;
  nome: string;
  role: 'corretor' | 'gerente' | 'admin';
  workspace_id: number;          // ⭐ Obrigatório
  workspaceId: number;           // ⭐ Alias
  evolution_instance_name?: string;
  evolution_connected?: boolean;
  // ... resto
}

const login = useCallback((user: User, sessionId: string) => {
  setUser(user);
  setSessionId(sessionId);
  
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, sessionId);
  
  // Cookie com workspace_id
  const cookieValue = JSON.stringify({
    userId: user.id,
    phone: user.telefone,
    sessionId,
    role: user.role,
    workspaceId: user.workspace_id,  // ⭐ Salvar
  });
  
  document.cookie = `pratica-session=${encodeURIComponent(cookieValue)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}, []);
```

### 2. Middleware

```typescript
// middleware.ts

interface SessionData {
  userId?: string;
  phone?: string;
  role?: 'corretor' | 'gerente' | 'admin';
  workspaceId?: number;  // ⭐ Mudança
}

export function middleware(request: NextRequest) {
  const session = getSessionData(request);
  
  // Validar workspace_id
  if (isProtectedRoute(pathname) && session) {
    if (!session.workspaceId) {
      return NextResponse.redirect(new URL('/onboarding/workspace', baseUrl));
    }
  }

  // ... resto do código
}
```

---

## 🎯 Benefícios da Nova Arquitetura

### ✅ Vantagens

1. **Isolamento Total**
   - Cada usuário é um "island"
   - Zero risco de vazamento de dados entre usuários
   - Privacidade garantida por design

2. **Simplicidade**
   - Menos conceitos (sem hierarquia de imobiliária → usuários)
   - Queries mais simples (sempre filtra por workspace_id do user)
   - Menos bugs de isolamento

3. **Flexibilidade**
   - Usuários podem compartilhar workspace (opt-in via workspace_members)
   - Admin pode acessar múltiplos workspaces (se necessário)
   - Escalável para qualquer modelo de negócio

4. **Segurança**
   - RLS automático por workspace
   - Impossível acessar dados de outro workspace sem permissão explícita
   - Auditoria mais clara (workspace_id sempre presente)

5. **UX Melhor**
   - Usuário entra e vê APENAS seus dados
   - Sem confusão de "lead é meu ou do colega?"
   - Interface mais limpa e focada

### 🆚 Comparação

| Aspecto | Multi-Tenant (Antigo) | User Workspace (Novo) |
|---------|----------------------|----------------------|
| **Isolamento** | Por imobiliária | Por usuário |
| **Privacidade** | Baixa (todos veem tudo) | Alta (cada um vê só o seu) |
| **Complexidade** | Alta (hierarquia, permissões) | Baixa (1 user = 1 workspace) |
| **Compartilhamento** | Obrigatório | Opcional (opt-in) |
| **Segurança** | Média (precisa validar role) | Alta (isolamento por design) |
| **Escalabilidade** | Limitada | Ilimitada |

---

## 📝 Checklist de Migração

### ✅ Fase 1: Database (1-2h)
- [ ] Criar `migrations/022_user_workspace_architecture.sql`
- [ ] Aplicar migração no Scalingo
- [ ] Validar que todos os usuários têm workspace_id
- [ ] Validar que todos os dados migraram (tenant_id → workspace_id)
- [ ] Testar trigger de auto-criação

### ✅ Fase 2: Backend (2-3h)
- [ ] Renomear `requireTenantContext` → `requireWorkspaceContext`
- [ ] Atualizar TODAS as APIs para usar workspace_id
- [ ] Buscar/substituir "tenant_id" → "workspace_id" em 165 ocorrências
- [x] Renomear webhook: `/api/webhook/evolution/[tenantId]` → `[workspaceId]`
- [ ] Atualizar `verify-otp` para retornar workspace_id

### ✅ Fase 3: Frontend (1-2h)
- [ ] Atualizar `User` interface (workspace_id obrigatório)
- [ ] Atualizar `auth-context` (salvar workspace_id)
- [ ] Atualizar `middleware` (validar workspace_id)
- [ ] Criar página `/onboarding/workspace` (se não tiver)

### ✅ Fase 4: Evolution API (30 min)
- [ ] Atualizar `createInstance` para usar workspace_id no webhook URL
- [ ] Atualizar `users.evolution_instance_name` para `workspaces.evolution_instance_name`

### ✅ Fase 5: Testes (1h)
- [ ] Login → workspace_id presente
- [ ] Criar lead → salva com workspace_id correto
- [ ] Listar leads → vê apenas seus leads
- [ ] WhatsApp → mensagens isoladas por workspace
- [ ] Novo usuário → workspace criado automaticamente

---

## ⏱️ Tempo Total Estimado

**5-8 horas** (pode ser feito em 1-2 dias)

---

## 🚀 Resultado Final

Depois da migração:

```typescript
// Corretor A faz login
const user = { id: 'abc', nome: 'João', workspace_id: 1 };

// Busca seus leads
GET /api/cvcrm/leads
→ WHERE workspace_id = 1  // ✅ Vê APENAS seus leads

// Corretor B faz login
const user = { id: 'xyz', nome: 'Maria', workspace_id: 2 };

// Busca seus leads
GET /api/cvcrm/leads
→ WHERE workspace_id = 2  // ✅ Vê APENAS seus leads (diferentes de A)

// Zero chance de vazamento!
```

---

**Criado em:** 28 Jan 2026  
**Por:** Claude (Moltbot)  
**Arquitetura:** User Workspace (1 user = 1 workspace)
