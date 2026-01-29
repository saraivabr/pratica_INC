# 🔧 Correção Multi-Tenant - Sistema Prática

**Problema identificado:** Usuário entra direto no admin sem onboarding e sem isolamento de tenant.

**Data:** 28 Jan 2026  
**Prioridade:** 🔴 CRÍTICA

---

## 🐛 Problemas Encontrados

### 1. **Register não atribui tenant_id**
```typescript
// app/api/auth/register/route.ts (linha 60)
const { rows: userRows } = await dbQuery(
  `insert into users (telefone, nome, role, imobiliaria_id, gerente_id, onboarding_status, is_active)
   values ($1, $2, 'corretor', $3, $4, 'completed', true)`,
  //                    ❌ tenant_id NÃO É ATRIBUÍDO
  [normalizedPhone, nome, imobiliariaId, gerenteId]
);
```

### 2. **Verify-OTP não retorna tenant_id**
```typescript
// app/api/auth/verify-otp/route.ts (linha 60)
return NextResponse.json({
  success: true,
  sessionId: session.id,
  user: {
    id: session.user_id,
    telefone: session.telefone,
    nome: session.nome,
    role: session.role,           // ✅ Retorna role
    gerente_id: session.gerente_id,
    avatar_url: session.avatar_url,
    // ❌ tenant_id NÃO É RETORNADO
  },
});
```

### 3. **Middleware não valida tenant_id**
```typescript
// middleware.ts (linha 128)
if (pathname.startsWith('/admin')) {
  if (session) {
    const isAdminOrGerente = session.role === 'admin' || session.role === 'gerente';
    // ❌ Só valida role, não verifica tenant_id
    if (isAdminOrGerente) {
      return NextResponse.next();  // PERMITE ACESSO SEM VALIDAR TENANT
    }
  }
}
```

### 4. **Imobiliárias sem tenant_id**
```sql
-- migrations/004_multi_tenant.sql não criou tenant_id em imobiliarias
-- Mas o código assume que existe!
```

### 5. **Users.role='admin' sem critério**
```typescript
// Register cria 'corretor' mas não há lógica para criar admin/gerente
// Quem define quem é admin?
```

---

## ✅ Solução Completa

### Etapa 1: Adicionar tenant_id em imobiliarias

```sql
-- migrations/021_fix_multi_tenant.sql

-- 1. Adicionar tenant_id em imobiliarias
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- 2. Criar FK para tenants
ALTER TABLE imobiliarias 
  ADD CONSTRAINT fk_imobiliarias_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 3. Criar index
CREATE INDEX IF NOT EXISTS idx_imobiliarias_tenant 
  ON imobiliarias(tenant_id);

-- 4. Para cada imobiliária sem tenant, criar um tenant
DO $$
DECLARE
  imob RECORD;
  new_tenant_id INTEGER;
BEGIN
  FOR imob IN SELECT id, nome FROM imobiliarias WHERE tenant_id IS NULL
  LOOP
    -- Criar tenant para a imobiliária
    INSERT INTO tenants (slug, name, status, plan)
    VALUES (
      'imob-' || imob.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
      imob.nome,
      'active',
      'free'
    )
    RETURNING id INTO new_tenant_id;
    
    -- Atualizar imobiliária
    UPDATE imobiliarias SET tenant_id = new_tenant_id WHERE id = imob.id;
    
    -- Atualizar usuários desta imobiliária
    UPDATE users SET tenant_id = new_tenant_id WHERE imobiliaria_id = imob.id;
    
    RAISE NOTICE 'Tenant % criado para imobiliária % (%)', 
      new_tenant_id, imob.id, imob.nome;
  END LOOP;
END $$;

-- 5. Tornar tenant_id obrigatório em imobiliarias
ALTER TABLE imobiliarias ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Para usuários sem imobiliária, criar tenant individual
DO $$
DECLARE
  usr RECORD;
  new_tenant_id INTEGER;
  new_imob_id UUID;
BEGIN
  FOR usr IN SELECT id, nome, telefone FROM users WHERE tenant_id IS NULL
  LOOP
    -- Criar tenant individual
    INSERT INTO tenants (slug, name, status, plan)
    VALUES (
      'user-' || usr.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
      usr.nome || ' (Individual)',
      'active',
      'free'
    )
    RETURNING id INTO new_tenant_id;
    
    -- Criar imobiliária individual
    INSERT INTO imobiliarias (nome, tenant_id, is_active)
    VALUES (usr.nome || ' - Individual', new_tenant_id, true)
    RETURNING id INTO new_imob_id;
    
    -- Atualizar usuário
    UPDATE users 
    SET tenant_id = new_tenant_id, 
        imobiliaria_id = new_imob_id
    WHERE id = usr.id;
    
    RAISE NOTICE 'Tenant % criado para usuário % (%)', 
      new_tenant_id, usr.id, usr.nome;
  END LOOP;
END $$;

-- 7. Garantir que users.tenant_id seja obrigatório daqui pra frente
-- (mas permitir NULL para compatibilidade com código antigo por enquanto)
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- 8. Criar função para auto-atribuir tenant_id
CREATE OR REPLACE FUNCTION auto_assign_tenant()
RETURNS TRIGGER AS $$
DECLARE
  imob_tenant_id INTEGER;
BEGIN
  -- Se tenant_id já foi definido, não fazer nada
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Se tem imobiliaria_id, pegar tenant_id da imobiliária
  IF NEW.imobiliaria_id IS NOT NULL THEN
    SELECT tenant_id INTO imob_tenant_id 
    FROM imobiliarias 
    WHERE id = NEW.imobiliaria_id;
    
    IF imob_tenant_id IS NOT NULL THEN
      NEW.tenant_id := imob_tenant_id;
      RETURN NEW;
    END IF;
  END IF;
  
  -- Se chegou aqui, criar tenant e imobiliária individual
  DECLARE
    new_tenant_id INTEGER;
    new_imob_id UUID;
  BEGIN
    INSERT INTO tenants (slug, name, status, plan)
    VALUES (
      'user-' || NEW.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
      NEW.nome || ' (Individual)',
      'active',
      'free'
    )
    RETURNING id INTO new_tenant_id;
    
    INSERT INTO imobiliarias (nome, tenant_id, is_active)
    VALUES (NEW.nome || ' - Individual', new_tenant_id, true)
    RETURNING id INTO new_imob_id;
    
    NEW.tenant_id := new_tenant_id;
    NEW.imobiliaria_id := new_imob_id;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar trigger para novos usuários
DROP TRIGGER IF EXISTS trigger_auto_assign_tenant ON users;
CREATE TRIGGER trigger_auto_assign_tenant
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_tenant();

COMMENT ON FUNCTION auto_assign_tenant() IS 
  'Atribui tenant_id automaticamente ao criar usuário (pega da imobiliária ou cria tenant individual)';
```

---

### Etapa 2: Atualizar API de Verify-OTP

```typescript
// app/api/auth/verify-otp/route.ts

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(request, VerifyOTPSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { sessionId, code: otpCode, telefone } = validation.data;

    // Rate limiting...

    // Find session and verify OTP
    const { rows } = await dbQuery(
      `select s.*, 
              u.id as user_id, 
              u.telefone, 
              u.nome, 
              u.role, 
              u.gerente_id, 
              u.avatar_url, 
              u.is_active,
              u.tenant_id,                          -- ⭐ ADICIONAR
              u.imobiliaria_id,                     -- ⭐ ADICIONAR
              i.nome as imobiliaria_nome,           -- ⭐ ADICIONAR
              u.onboarding_status                   -- ⭐ ADICIONAR
       from sessions s
       join users u on u.id = s.user_id
       left join imobiliarias i on i.id = u.imobiliaria_id
       where s.id = $1
       limit 1`,
      [sessionId]
    );

    const session = rows[0];
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Check if OTP matches...
    // Check if OTP expired...
    // Mark session as verified...
    // Update user last login...

    // ⭐ VALIDAR TENANT_ID
    if (!session.tenant_id) {
      console.error(`User ${session.user_id} sem tenant_id! Banco inconsistente.`);
      return NextResponse.json(
        { error: 'Configuração incompleta. Contate o suporte.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      user: {
        id: session.user_id,
        telefone: session.telefone,
        nome: session.nome,
        role: session.role,
        gerente_id: session.gerente_id,
        avatar_url: session.avatar_url,
        tenant_id: session.tenant_id,              // ⭐ RETORNAR
        tenantId: session.tenant_id,               // ⭐ ALIAS
        imobiliaria_id: session.imobiliaria_id,    // ⭐ RETORNAR
        imobiliaria: session.imobiliaria_nome,     // ⭐ RETORNAR
        onboarding_status: session.onboarding_status, // ⭐ RETORNAR
      },
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

---

### Etapa 3: Atualizar Middleware

```typescript
// middleware.ts

interface SessionData {
  userId?: string;
  phone?: string;
  role?: 'corretor' | 'gerente' | 'admin';
  tenantId?: number;        // ⭐ ADICIONAR
}

function getSessionData(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get('pratica-session');

  if (sessionCookie?.value) {
    try {
      const decodedValue = decodeURIComponent(sessionCookie.value);
      const session = JSON.parse(decodedValue);
      if (session.userId && session.phone) {
        return {
          userId: session.userId,
          phone: session.phone,
          role: session.role || 'corretor',
          tenantId: session.tenantId,    // ⭐ ADICIONAR
        };
      }
    } catch {
      // Invalid JSON in cookie
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const session = getSessionData(request);
  const baseUrl = getBaseUrl(request);

  // Handle admin secret key authentication
  if (pathname.startsWith('/admin')) {
    const secretKey = searchParams.get('key');
    const adminSecretKey = process.env.ADMIN_SECRET_KEY;

    // If secret key is provided, redirect to auth endpoint
    if (secretKey && adminSecretKey && secretKey === adminSecretKey) {
      const authUrl = new URL('/api/auth/admin-login', baseUrl);
      authUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(authUrl);
    }

    // ⭐ VALIDAR AUTENTICAÇÃO E TENANT
    if (session) {
      // ⭐ VALIDAR TENANT_ID
      if (!session.tenantId) {
        console.error(`User ${session.userId} tentando acessar admin sem tenant_id`);
        return NextResponse.redirect(new URL('/login?error=missing_tenant', baseUrl));
      }

      const isAdminOrGerente = session.role === 'admin' || session.role === 'gerente';
      if (isAdminOrGerente) {
        return NextResponse.next();
      } else {
        // Corretores não podem acessar admin
        return NextResponse.redirect(new URL('/corretor', baseUrl));
      }
    }

    // Not authenticated and no valid key - show unauthorized
    return NextResponse.redirect(new URL('/login?error=admin_required', baseUrl));
  }

  // Always allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if it's a protected route
  if (isProtectedRoute(pathname)) {
    // Check authentication
    if (!session) {
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ⭐ VALIDAR TENANT_ID EM ROTAS PROTEGIDAS
    if (!session.tenantId) {
      console.error(`User ${session.userId} sem tenant_id tentando acessar ${pathname}`);
      return NextResponse.redirect(new URL('/onboarding/complete', baseUrl));
    }

    // Role-based redirects for homepage
    if (pathname === '/') {
      const isAdminOrGerente = session.role === 'admin' || session.role === 'gerente';
      if (isAdminOrGerente) {
        return NextResponse.redirect(new URL('/admin', baseUrl));
      } else {
        return NextResponse.redirect(new URL('/corretor', baseUrl));
      }
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}
```

---

### Etapa 4: Atualizar Auth Context

```typescript
// lib/auth-context.tsx

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ... existing code ...

  const login = useCallback((user: User, sessionId: string) => {
    setUser(user);
    setSessionId(sessionId);
    
    // Store user and session
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, sessionId);
    
    // ⭐ ATUALIZAR COOKIE COM TENANT_ID
    const cookieValue = JSON.stringify({
      userId: user.id,
      phone: user.telefone,
      sessionId,
      role: user.role,
      tenantId: user.tenant_id || user.tenantId,  // ⭐ ADICIONAR
    });
    
    document.cookie = `pratica-session=${encodeURIComponent(cookieValue)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }, []);

  // ... rest of code ...
}
```

---

### Etapa 5: Criar Página de Onboarding

```typescript
// app/onboarding/complete/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CompleteOnboardingPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se já tem tenant_id, redirecionar
    if (user?.tenant_id || user?.tenantId) {
      router.push('/');
    }
  }, [user, router]);

  const handleCreateTenant = async () => {
    try {
      const response = await fetch('/api/auth/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao completar configuração');
      }

      // Recarregar página para buscar novo tenant_id
      window.location.href = '/';
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuração Incompleta</CardTitle>
          <CardDescription>
            Seu cadastro precisa ser finalizado antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-800 bg-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Seu usuário foi criado mas não está vinculado a nenhuma empresa.
            Precisamos configurar isso antes de você poder usar o sistema.
          </p>

          <div className="space-y-2">
            <Button onClick={handleCreateTenant} className="w-full">
              Completar Configuração
            </Button>
            <Button onClick={logout} variant="outline" className="w-full">
              Sair e Tentar Novamente
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Se o problema persistir, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Etapa 6: Criar API de Complete Setup

```typescript
// app/api/auth/complete-setup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { dbQuery } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = (user as any).id;

    // Verificar se já tem tenant_id
    const { rows: checkRows } = await dbQuery(
      `SELECT tenant_id FROM users WHERE id = $1`,
      [userId]
    );

    if (checkRows[0]?.tenant_id) {
      return NextResponse.json({
        success: true,
        message: 'Configuração já completa',
        tenant_id: checkRows[0].tenant_id,
      });
    }

    // Criar tenant e imobiliária individual
    const { rows: tenantRows } = await dbQuery(
      `INSERT INTO tenants (slug, name, status, plan)
       VALUES ($1, $2, 'active', 'free')
       RETURNING id`,
      [
        `user-${userId}-${Date.now()}`,
        `${(user as any).nome} (Individual)`,
      ]
    );

    const tenantId = tenantRows[0].id;

    const { rows: imobRows } = await dbQuery(
      `INSERT INTO imobiliarias (nome, tenant_id, is_active)
       VALUES ($1, $2, true)
       RETURNING id`,
      [`${(user as any).nome} - Individual`, tenantId]
    );

    const imobiliariaId = imobRows[0].id;

    // Atualizar usuário
    await dbQuery(
      `UPDATE users 
       SET tenant_id = $1, imobiliaria_id = $2
       WHERE id = $3`,
      [tenantId, imobiliariaId, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Configuração completada com sucesso',
      tenant_id: tenantId,
    });
  } catch (error: any) {
    console.error('Error in complete-setup:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 📝 Checklist de Execução

### ✅ Fase 1: Database (30 min)
- [ ] Criar `migrations/021_fix_multi_tenant.sql`
- [ ] Aplicar migração no Scalingo
- [ ] Verificar que todos os usuários têm tenant_id
- [ ] Verificar que todas as imobiliárias têm tenant_id
- [ ] Testar trigger de auto-assign

### ✅ Fase 2: Backend (1h)
- [ ] Atualizar `app/api/auth/verify-otp/route.ts`
- [ ] Atualizar `app/api/auth/send-otp/route.ts` (query)
- [ ] Criar `app/api/auth/complete-setup/route.ts`
- [ ] Testar login e verificar tenant_id no response

### ✅ Fase 3: Middleware (30 min)
- [ ] Atualizar `middleware.ts`
- [ ] Adicionar validação de tenant_id
- [ ] Testar acesso admin com e sem tenant_id
- [ ] Testar redirecionamento para onboarding

### ✅ Fase 4: Frontend (1h)
- [ ] Atualizar `lib/auth-context.tsx`
- [ ] Criar `app/onboarding/complete/page.tsx`
- [ ] Testar fluxo completo de login → onboarding → dashboard
- [ ] Verificar cookie com tenant_id

### ✅ Fase 5: Testes (1h)
- [ ] Login como corretor → deve ir para /corretor
- [ ] Login como admin → deve ir para /admin
- [ ] Tentar acessar /admin sem tenant_id → redireciona
- [ ] Criar novo usuário → auto-assign de tenant funciona
- [ ] Verificar isolamento de dados por tenant

---

## 🎯 Resultado Esperado

Depois dessas correções:

1. ✅ **Todo usuário TEM tenant_id obrigatoriamente**
2. ✅ **Login retorna tenant_id junto com user**
3. ✅ **Cookie armazena tenant_id**
4. ✅ **Middleware valida tenant_id antes de permitir acesso**
5. ✅ **Novos usuários recebem tenant automaticamente (trigger)**
6. ✅ **Usuários sem tenant são redirecionados para onboarding**
7. ✅ **Admin só acessa se role='admin' AND tenant_id presente**
8. ✅ **Corretor só acessa se tenant_id presente**

---

## ⏱️ Tempo Estimado Total

**3-4 horas** (dividido em 5 fases)

---

**Criado em:** 28 Jan 2026  
**Por:** Claude (Moltbot)  
**Status:** 🔴 CRÍTICO - Executar AGORA
