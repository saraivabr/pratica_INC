# Fix WhatsApp Messages - Plano de Implementacao

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir o sistema de mensagens WhatsApp para que corretores vejam suas mensagens corretamente.

**Architecture:** O sistema usa multi-tenancy onde cada empresa (tenant) tem sua propria instancia WhatsApp. O problema atual e que a tabela `imobiliarias` nao tem coluna `tenant_id`, fazendo com que `findUserTenant` sempre falhe. A solucao adiciona `tenant_id` nas tabelas necessarias e corrige o fluxo de vinculacao.

**Tech Stack:** PostgreSQL, Next.js 14, TypeScript, Evolution API (WhatsApp)

---

## Problemas Identificados

1. **instanceName nao retornado** - API status nao retornava instanceName (CORRIGIDO)
2. **tenant_id faltando em imobiliarias** - findUserTenant sempre falha
3. **Tipos incompativeis** - Codigo tenta salvar INTEGER em UUID

---

## Task 1: Criar Migration para Adicionar tenant_id

**Files:**
- Create: `migrations/013_fix_tenant_relations.sql`

**Step 1: Criar arquivo de migration**

```sql
-- Migration 013: Corrigir relacoes tenant/imobiliarias/users
-- Data: 2026-01-27
-- Problema: findUserTenant falha porque imobiliarias nao tem tenant_id

-- ============================================================================
-- 1. ADICIONAR tenant_id NA TABELA imobiliarias
-- ============================================================================

ALTER TABLE imobiliarias
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_imobiliarias_tenant
ON imobiliarias(tenant_id) WHERE tenant_id IS NOT NULL;

COMMENT ON COLUMN imobiliarias.tenant_id IS 'Referencia ao tenant (empresa) no sistema multi-tenant';

-- ============================================================================
-- 2. ADICIONAR tenant_id NA TABELA users (acesso direto)
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant
ON users(tenant_id) WHERE tenant_id IS NOT NULL;

COMMENT ON COLUMN users.tenant_id IS 'Referencia direta ao tenant do usuario (cache para performance)';

-- ============================================================================
-- 3. CRIAR TENANTS PARA IMOBILIARIAS EXISTENTES
-- ============================================================================

-- Criar tenant para cada imobiliaria que ainda nao tem
INSERT INTO tenants (slug, name, cvcrm_config, plan, status)
SELECT
    'imob-' || REPLACE(i.id::TEXT, '-', '') as slug,
    COALESCE(i.nome, 'Imobiliaria ' || i.id::TEXT) as name,
    '{}'::jsonb as cvcrm_config,
    'free' as plan,
    'active' as status
FROM imobiliarias i
WHERE i.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.slug = 'imob-' || REPLACE(i.id::TEXT, '-', '')
  );

-- Vincular imobiliarias aos tenants recem criados
UPDATE imobiliarias i
SET tenant_id = t.id
FROM tenants t
WHERE t.slug = 'imob-' || REPLACE(i.id::TEXT, '-', '')
  AND i.tenant_id IS NULL;

-- ============================================================================
-- 4. PROPAGAR tenant_id PARA USERS
-- ============================================================================

-- Atualizar users com tenant_id baseado na sua imobiliaria
UPDATE users u
SET tenant_id = i.tenant_id
FROM imobiliarias i
WHERE u.imobiliaria_id = i.id
  AND u.tenant_id IS NULL
  AND i.tenant_id IS NOT NULL;

-- ============================================================================
-- 5. LOG DE VERIFICACAO
-- ============================================================================

DO $$
DECLARE
    imob_count INTEGER;
    user_count INTEGER;
    tenant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO imob_count FROM imobiliarias WHERE tenant_id IS NOT NULL;
    SELECT COUNT(*) INTO user_count FROM users WHERE tenant_id IS NOT NULL;
    SELECT COUNT(*) INTO tenant_count FROM tenants;

    RAISE NOTICE 'Migration 013 concluida:';
    RAISE NOTICE '  - Imobiliarias com tenant: %', imob_count;
    RAISE NOTICE '  - Users com tenant: %', user_count;
    RAISE NOTICE '  - Total de tenants: %', tenant_count;
END $$;
```

**Step 2: Verificar sintaxe do arquivo**

Run: `cat migrations/013_fix_tenant_relations.sql | head -20`
Expected: Arquivo criado com cabecalho correto

**Step 3: Commit da migration**

```bash
git add migrations/013_fix_tenant_relations.sql
git commit -m "feat(db): add tenant_id to imobiliarias and users tables

- Add tenant_id column to imobiliarias table
- Add tenant_id column to users table (direct access)
- Auto-create tenants for existing imobiliarias
- Propagate tenant_id to users from their imobiliarias"
```

---

## Task 2: Atualizar findUserTenant para Suportar tenant_id Direto

**Files:**
- Modify: `lib/tenant-context.ts` (funcao findUserTenant, linhas ~369-399)

**Step 1: Ler arquivo atual**

Run: Verificar implementacao atual de findUserTenant

**Step 2: Atualizar funcao findUserTenant**

Substituir a funcao `findUserTenant` por:

```typescript
/**
 * Find tenant for a user
 *
 * Prioridade:
 * 1. user.tenant_id (direto, mais rapido)
 * 2. user.imobiliaria_id -> imobiliarias.tenant_id
 *
 * @param user - User object with tenant_id or imobiliaria_id
 * @returns Tenant or null if user has no tenant configured
 */
export async function findUserTenant(user: {
  tenant_id?: number;
  imobiliaria_id?: string | number;
  imobiliarias?: { id?: string | number };
}): Promise<Tenant | null> {
  // Prioridade 1: tenant_id direto no usuario (mais rapido)
  if (user.tenant_id) {
    const tenant = await getTenant(user.tenant_id);
    if (tenant) {
      return tenant;
    }
    console.log(`[Tenant] tenant_id ${user.tenant_id} do usuario nao encontrado no banco`);
  }

  // Prioridade 2: via imobiliaria
  const imobiliariaId = user.imobiliaria_id || user.imobiliarias?.id;

  if (!imobiliariaId) {
    console.log(`[Tenant] Usuario nao tem tenant_id nem imobiliaria_id configurado`);
    return null;
  }

  // Buscar tenant_id atraves da imobiliaria
  try {
    const imobResult = await pool.query(
      'SELECT tenant_id FROM imobiliarias WHERE id = $1',
      [imobiliariaId]
    );

    if (!imobResult.rows[0]?.tenant_id) {
      console.log(`[Tenant] Imobiliaria ${imobiliariaId} nao tem tenant_id configurado`);
      return null;
    }

    const tenantId = imobResult.rows[0].tenant_id;
    const tenant = await getTenant(tenantId);

    if (!tenant) {
      console.log(`[Tenant] Tenant ID ${tenantId} nao encontrado no banco`);
    }

    return tenant;
  } catch (error: any) {
    // Se a coluna tenant_id nao existir, logar erro claro
    if (error.message?.includes('column') && error.message?.includes('tenant_id')) {
      console.error(`[Tenant] ERRO: Coluna tenant_id nao existe na tabela imobiliarias. Execute a migration 013.`);
    } else {
      console.error(`[Tenant] Erro ao buscar tenant:`, error.message);
    }
    return null;
  }
}
```

**Step 3: Verificar que nao quebrou nada**

Run: `npx tsc --noEmit lib/tenant-context.ts`
Expected: Sem erros de TypeScript

**Step 4: Commit**

```bash
git add lib/tenant-context.ts
git commit -m "fix(tenant): update findUserTenant to support direct tenant_id

- Add priority 1: use user.tenant_id directly (faster)
- Add priority 2: fallback to imobiliaria.tenant_id
- Add clear error logging when tenant_id column missing
- Improve error handling for migration detection"
```

---

## Task 3: Corrigir session/start para Criar Imobiliaria Corretamente

**Files:**
- Modify: `app/api/whatsapp/session/start/route.ts` (linhas ~46-84)

**Step 1: Ler codigo atual**

Verificar a secao que cria tenant quando usuario nao tem imobiliaria.

**Step 2: Corrigir logica de criacao**

Substituir o bloco que cria tenant (aproximadamente linhas 46-84) por:

```typescript
    // Buscar tenant do usuario
    let tenant = await findUserTenant(user);

    // Se nao encontrou tenant, criar um novo COM imobiliaria
    if (!tenant) {
      const userId = (user as any).id;
      const userName = (user as any).nome || 'Usuario';

      console.log(`[WhatsApp] Usuario ${userId} sem tenant. Criando tenant e imobiliaria...`);

      try {
        // 1. Criar tenant primeiro
        tenant = await createTenant({
          slug: `user-${userId}-${Date.now()}`,
          name: userName,
          cvcrm_config: {
            base_url: '',
            email: '',
            tokens: {}
          },
          plan: 'free'
        });

        console.log(`[WhatsApp] Tenant ${tenant.id} criado: ${tenant.name}`);

        // 2. Criar imobiliaria vinculada ao tenant
        const imobResult = await dbQuery(
          `INSERT INTO imobiliarias (nome, tenant_id, is_active, created_at)
           VALUES ($1, $2, true, NOW())
           RETURNING id`,
          [userName, tenant.id]
        );

        const newImobiliariaId = imobResult.rows[0]?.id;
        console.log(`[WhatsApp] Imobiliaria ${newImobiliariaId} criada e vinculada ao tenant ${tenant.id}`);

        // 3. Atualizar usuario com imobiliaria_id E tenant_id
        await dbQuery(
          `UPDATE users
           SET imobiliaria_id = $1, tenant_id = $2, updated_at = NOW()
           WHERE id = $3`,
          [newImobiliariaId, tenant.id, userId]
        );

        console.log(`[WhatsApp] Usuario ${userId} vinculado ao tenant ${tenant.id} e imobiliaria ${newImobiliariaId}`);

      } catch (createError: any) {
        console.error('[WhatsApp] Erro ao criar tenant/imobiliaria:', createError);
        return NextResponse.json({
          error: "Erro ao configurar sua empresa. Tente novamente.",
          details: createError.message
        }, { status: 500 });
      }
    }

    if (!tenant) {
      return NextResponse.json({
        error: "Nao foi possivel identificar ou criar sua empresa.",
        details: "Entre em contato com o suporte tecnico."
      }, { status: 400 });
    }
```

**Step 3: Remover codigo antigo com tipo errado**

Garantir que NAO existe mais o codigo que fazia:
```typescript
// REMOVER: await dbQuery(`UPDATE users SET imobiliaria_id = $1...`, [tenant.id, ...])
```

**Step 4: Verificar TypeScript**

Run: `npx tsc --noEmit app/api/whatsapp/session/start/route.ts`
Expected: Sem erros

**Step 5: Commit**

```bash
git add app/api/whatsapp/session/start/route.ts
git commit -m "fix(whatsapp): create imobiliaria when creating tenant for new user

- Create imobiliaria linked to tenant (correct type: UUID)
- Update user with both imobiliaria_id AND tenant_id
- Fix type mismatch: no longer saving INTEGER in UUID column
- Add detailed logging for debugging"
```

---

## Task 4: Atualizar getAuthenticatedUser para Retornar tenant_id

**Files:**
- Modify: `lib/api-auth.ts` (funcao getAuthenticatedUser)

**Step 1: Verificar se getAuthenticatedUser retorna tenant_id**

Run: Ler o arquivo e verificar o SELECT da funcao

**Step 2: Adicionar tenant_id ao SELECT**

Se o SELECT nao incluir tenant_id, adicionar:

```typescript
// Garantir que o SELECT inclui tenant_id
const result = await pool.query(
  `SELECT id, telefone, nome, role, imobiliaria_id, tenant_id, gerente_id,
          avatar_url, is_active, onboarding_status
   FROM users
   WHERE id = $1 AND is_active = true`,
  [userId]
);
```

**Step 3: Commit**

```bash
git add lib/api-auth.ts
git commit -m "fix(auth): include tenant_id in getAuthenticatedUser query"
```

---

## Task 5: Verificar e Corrigir Webhook Evolution

**Files:**
- Review: `app/api/webhook/evolution/[tenantId]/route.ts`

**Step 1: Verificar se webhook usa tenantId da URL corretamente**

O webhook recebe o tenantId da URL: `/api/webhook/evolution/[tenantId]`

Verificar que:
1. tenantId e extraido corretamente dos params
2. Mensagens sao salvas com esse tenant_id
3. Nao ha dependencia de findUserTenant no webhook

**Step 2: Se necessario, corrigir**

O webhook deve funcionar assim:
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const tenantId = parseInt(params.tenantId, 10);

  if (isNaN(tenantId)) {
    return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 });
  }

  // Usar tenantId diretamente, sem depender de findUserTenant
  // ...
}
```

**Step 3: Commit se houve mudancas**

```bash
git add app/api/webhook/evolution/[tenantId]/route.ts
git commit -m "fix(webhook): ensure tenantId from URL is used correctly"
```

---

## Task 6: Testar Localmente (Manual)

**Step 1: Aplicar migration no banco local**

```bash
# Conectar ao banco e executar migration
psql $DATABASE_URL -f migrations/013_fix_tenant_relations.sql
```

**Step 2: Verificar estrutura**

```sql
-- Verificar colunas adicionadas
\d imobiliarias
\d users

-- Verificar dados
SELECT COUNT(*) as imobs_com_tenant FROM imobiliarias WHERE tenant_id IS NOT NULL;
SELECT COUNT(*) as users_com_tenant FROM users WHERE tenant_id IS NOT NULL;
```

**Step 3: Testar fluxo de login**

1. Fazer login como corretor
2. Abrir Developer Tools > Network
3. Verificar resposta de `/api/whatsapp/session/status`
4. Deve conter `instanceName` com valor real (nao "default")

**Step 4: Testar visualizacao de mensagens**

1. Ir para pagina de Mensagens
2. Verificar se conversas aparecem
3. Se nao aparecer, verificar console por erros

---

## Task 7: Criar Script de Verificacao

**Files:**
- Create: `scripts/verify-tenant-setup.mjs`

**Step 1: Criar script de diagnostico**

```javascript
#!/usr/bin/env node
/**
 * Script para verificar se o setup de tenants esta correto
 *
 * Uso: node scripts/verify-tenant-setup.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('=== Verificacao de Setup de Tenants ===\n');

  // 1. Verificar estrutura
  console.log('1. Verificando estrutura das tabelas...');

  const imobCols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'imobiliarias' AND column_name = 'tenant_id'
  `);

  const userCols = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  `);

  console.log(`   - imobiliarias.tenant_id: ${imobCols.rows.length > 0 ? 'OK' : 'FALTANDO!'}`);
  console.log(`   - users.tenant_id: ${userCols.rows.length > 0 ? 'OK' : 'FALTANDO!'}`);

  // 2. Verificar dados
  console.log('\n2. Verificando dados...');

  const stats = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM tenants) as total_tenants,
      (SELECT COUNT(*) FROM imobiliarias) as total_imobs,
      (SELECT COUNT(*) FROM imobiliarias WHERE tenant_id IS NOT NULL) as imobs_com_tenant,
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM users WHERE tenant_id IS NOT NULL) as users_com_tenant
  `);

  const s = stats.rows[0];
  console.log(`   - Total tenants: ${s.total_tenants}`);
  console.log(`   - Imobiliarias: ${s.total_imobs} (${s.imobs_com_tenant} com tenant)`);
  console.log(`   - Users: ${s.total_users} (${s.users_com_tenant} com tenant)`);

  // 3. Verificar instancias WhatsApp
  console.log('\n3. Verificando instancias WhatsApp...');

  const instances = await pool.query(`
    SELECT id, name, evolution_instances
    FROM tenants
    WHERE evolution_instances IS NOT NULL
      AND evolution_instances != '[]'::jsonb
  `);

  console.log(`   - Tenants com WhatsApp configurado: ${instances.rows.length}`);
  instances.rows.forEach(t => {
    const inst = t.evolution_instances?.[0];
    console.log(`     - ${t.name}: ${inst?.instance_name || 'N/A'} (${inst?.status || 'N/A'})`);
  });

  // 4. Verificar mensagens
  console.log('\n4. Verificando mensagens...');

  const msgs = await pool.query(`
    SELECT
      tenant_id,
      instance_name,
      COUNT(*) as total,
      MAX(created_at) as ultima
    FROM whatsapp_messages
    GROUP BY tenant_id, instance_name
    ORDER BY ultima DESC
    LIMIT 5
  `);

  if (msgs.rows.length === 0) {
    console.log('   - Nenhuma mensagem encontrada');
  } else {
    msgs.rows.forEach(m => {
      console.log(`   - Tenant ${m.tenant_id}, Instance ${m.instance_name}: ${m.total} msgs (ultima: ${m.ultima})`);
    });
  }

  // 5. Problemas detectados
  console.log('\n5. Problemas detectados:');

  const problems = [];

  if (imobCols.rows.length === 0) {
    problems.push('- CRITICO: Coluna tenant_id nao existe em imobiliarias. Execute migration 013.');
  }

  if (userCols.rows.length === 0) {
    problems.push('- CRITICO: Coluna tenant_id nao existe em users. Execute migration 013.');
  }

  if (parseInt(s.imobs_com_tenant) < parseInt(s.total_imobs)) {
    problems.push(`- AVISO: ${parseInt(s.total_imobs) - parseInt(s.imobs_com_tenant)} imobiliarias sem tenant_id`);
  }

  if (parseInt(s.users_com_tenant) < parseInt(s.total_users)) {
    problems.push(`- AVISO: ${parseInt(s.total_users) - parseInt(s.users_com_tenant)} users sem tenant_id`);
  }

  if (problems.length === 0) {
    console.log('   Nenhum problema detectado!');
  } else {
    problems.forEach(p => console.log(`   ${p}`));
  }

  console.log('\n=== Fim da Verificacao ===');

  await pool.end();
}

main().catch(console.error);
```

**Step 2: Commit**

```bash
git add scripts/verify-tenant-setup.mjs
git commit -m "chore: add tenant setup verification script"
```

---

## Task 8: Commit Final e Limpeza

**Step 1: Remover arquivo de plano temporario**

```bash
rm -f PLANO_VALIDACAO_WHATSAPP.md
```

**Step 2: Verificar todos os arquivos modificados**

```bash
git status
git diff --stat HEAD~5
```

**Step 3: Tag da versao**

```bash
git tag -a v1.0.0-fix-whatsapp -m "Fix WhatsApp messages not showing for corretores"
```

---

## Ordem de Execucao

1. **Task 1** - Migration SQL (banco de dados)
2. **Task 2** - findUserTenant (lib)
3. **Task 3** - session/start (API)
4. **Task 4** - getAuthenticatedUser (API auth)
5. **Task 5** - Webhook (verificacao)
6. **Task 6** - Teste local manual
7. **Task 7** - Script de verificacao
8. **Task 8** - Commit final

---

## Rollback

Se algo der errado:

```sql
-- Reverter migration (se necessario)
ALTER TABLE imobiliarias DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
```

```bash
# Reverter commits
git revert HEAD~N  # onde N e o numero de commits a reverter
```

---

## Checklist Final

- [ ] Migration 013 executada no banco
- [ ] findUserTenant atualizado
- [ ] session/start corrigido
- [ ] getAuthenticatedUser retorna tenant_id
- [ ] Webhook verificado
- [ ] Teste local passou
- [ ] Script de verificacao criado
- [ ] Commits feitos com mensagens claras
