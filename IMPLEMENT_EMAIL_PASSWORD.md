# 🔐 Implementar Login Email/Senha - Guia Completo

**Tempo estimado:** 2h  
**Prioridade:** Média (fallback opcional, OTP é método primário)  
**Risco:** Baixo (feature adicional, não quebra existente)

---

## 1. Migration: Adicionar password_hash

```sql
-- migrations/023_add_password_auth.sql

BEGIN;

-- Adicionar coluna password_hash (nullable - OTP ainda é primário)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Adicionar índice em email para busca rápida
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Adicionar coluna password_reset_token (para recuperação)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

COMMENT ON COLUMN users.password_hash IS 
  'Bcrypt hash da senha (opcional - OTP via telefone é método primário)';

COMMENT ON COLUMN users.password_reset_token IS 
  'Token único para reset de senha via email';

COMMIT;
```

**Executar:**
```bash
psql -h localhost -U pratica -d pratica -f migrations/023_add_password_auth.sql
```

---

## 2. Criar Endpoint de Login

### `/app/api/auth/login/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validateRequest, LoginSchema } from '@/lib/validation-schemas';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    // Validar request
    const validation = await validateRequest(request, LoginSchema);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Rate limiting: 5 tentativas por 15 min
    const rateLimitKey = `login:${email}`;
    const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.LOGIN);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Muitas tentativas. Tente novamente mais tarde.',
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // Buscar usuário por email
    const { rows } = await dbQuery(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );

    const user = rows[0];

    // Email não existe OU senha não configurada
    if (!user || !user.password_hash) {
      // Mesmo erro para ambos os casos (segurança)
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Usuário inativo. Entre em contato com seu gerente.' },
        { status: 403 }
      );
    }

    // Criar sessão
    const { rows: sessionRows } = await dbQuery(
      `INSERT INTO sessions (user_id, is_verified, expires_at)
       VALUES ($1, true, now() + interval '7 days')
       RETURNING id`,
      [user.id]
    );
    
    const session = sessionRows[0];

    if (!session) {
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      );
    }

    // Atualizar last_login
    await dbQuery(
      `UPDATE users SET last_login = now() WHERE id = $1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        workspace_id: user.workspace_id,
      },
    });
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 3. Adicionar Schema de Validação

### `/lib/validation-schemas.ts` (adicionar)

```typescript
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

// Rate limit config para login
export const RateLimitConfigs = {
  // ... existentes
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
};
```

---

## 4. Criar Endpoint de Cadastro de Senha

### `/app/api/auth/set-password/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Hash da senha (bcrypt com salt 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Atualizar senha
    await dbQuery(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Senha cadastrada com sucesso',
    });
  } catch (error) {
    console.error('Error in set-password:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 5. Atualizar UI de Login

### `/app/login/page.tsx` (adicionar tab)

```typescript
const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');

// UI
<Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as any)}>
  <TabsList>
    <TabsTrigger value="otp">WhatsApp (Recomendado)</TabsTrigger>
    <TabsTrigger value="password">Email & Senha</TabsTrigger>
  </TabsList>
  
  <TabsContent value="otp">
    {/* Formulário OTP existente */}
  </TabsContent>
  
  <TabsContent value="password">
    <form onSubmit={handlePasswordLogin}>
      <Input 
        type="email" 
        placeholder="Email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input 
        type="password" 
        placeholder="Senha" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit">Entrar</Button>
      
      <Button 
        variant="link" 
        onClick={() => setShowForgotPassword(true)}
      >
        Esqueci minha senha
      </Button>
    </form>
  </TabsContent>
</Tabs>

// Handler
const handlePasswordLogin = async (e: FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      setError(data.error);
      return;
    }
    
    // Salvar sessão no cookie
    document.cookie = `pratica-session=${encodeURIComponent(JSON.stringify({
      userId: data.user.id,
      phone: data.user.telefone || '',
      role: data.user.role,
      workspaceId: data.user.workspace_id,
    }))}; path=/; max-age=${7 * 24 * 60 * 60}`;
    
    router.push('/');
  } catch (error) {
    setError('Erro ao fazer login');
  } finally {
    setIsLoading(false);
  }
};
```

---

## 6. Adicionar Opção "Cadastrar Senha" no Perfil

### `/app/perfil/page.tsx` (adicionar seção)

```typescript
<Card>
  <CardHeader>
    <CardTitle>Segurança</CardTitle>
  </CardHeader>
  <CardContent>
    {user.password_hash ? (
      <p className="text-sm text-muted-foreground mb-4">
        ✅ Você já configurou uma senha para login
      </p>
    ) : (
      <p className="text-sm text-muted-foreground mb-4">
        Configure uma senha para fazer login via email (opcional)
      </p>
    )}
    
    <Button 
      onClick={() => setShowPasswordDialog(true)}
      variant={user.password_hash ? 'outline' : 'default'}
    >
      {user.password_hash ? 'Alterar Senha' : 'Cadastrar Senha'}
    </Button>
  </CardContent>
</Card>

{/* Dialog */}
<Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cadastrar Senha</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSetPassword}>
      <Input 
        type="password" 
        placeholder="Nova senha (mín. 6 caracteres)" 
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <Input 
        type="password" 
        placeholder="Confirmar senha" 
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button type="submit">Salvar</Button>
    </form>
  </DialogContent>
</Dialog>
```

---

## 7. Instalar bcryptjs

```bash
cd /var/www/pratica
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

---

## 8. Testes

### Teste Manual

```bash
# 1. Cadastrar senha para um usuário
curl -X POST http://localhost:3000/api/auth/set-password \
  -H "Cookie: pratica-session=..." \
  -H "Content-Type: application/json" \
  -d '{"password": "teste123"}'

# 2. Login com email/senha
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "teste123"
  }'

# 3. Validar sessão criada
curl http://localhost:3000/api/auth/validate \
  -H "Cookie: pratica-session=..."
```

### Casos de Teste

- [ ] Login com email correto + senha correta → 200
- [ ] Login com email correto + senha errada → 401
- [ ] Login com email inexistente → 401
- [ ] Login com usuário sem password_hash → 401
- [ ] Login com usuário inativo → 403
- [ ] Rate limiting após 5 tentativas → 429
- [ ] Set password com senha < 6 chars → 400
- [ ] Set password sem autenticação → 401

---

## 9. Segurança

### ✅ Implementado

- Bcrypt hash (salt 10)
- Rate limiting (5 tentativas / 15min)
- Mesmo erro para email inexistente ou senha errada
- Validação Zod nos inputs
- Cookie httpOnly (já existente)
- Session expira em 7 dias (já existente)

### 🔒 Melhorias Futuras

- [ ] Password reset via email (com token)
- [ ] 2FA opcional (TOTP)
- [ ] Log de tentativas de login falhadas
- [ ] Força de senha (regex complexo)
- [ ] Expiração de senha (90 dias)

---

## 10. Checklist Final

- [ ] Migration 023 executada
- [ ] Endpoint `/api/auth/login` criado
- [ ] Endpoint `/api/auth/set-password` criado
- [ ] bcryptjs instalado
- [ ] UI login com tabs (OTP/Password)
- [ ] Perfil com opção "Cadastrar Senha"
- [ ] Rate limiter configurado
- [ ] Testes manuais passando
- [ ] Documentação atualizada

---

**Tempo total:** ~2h  
**Prioridade:** Baixa (OTP é suficiente)  
**Quando implementar:** Após corrigir workspace isolation
