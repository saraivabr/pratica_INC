# Security & Quality Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all critical, high, and medium issues found in the security & quality audit across API routes, database, and frontend.

**Architecture:** 7 independent work streams that can execute in parallel. Stream 1 (auth hardening) creates the pattern used by Stream 2 (API route auth), so Stream 1 must complete first. All other streams are fully independent.

**Tech Stack:** Next.js 14, PostgreSQL, TypeScript, crypto (HMAC signing)

---

## Stream 1: Auth Cookie Hardening (MUST RUN FIRST)

### Task 1.1: Sign session cookies with HMAC

**Files:**
- Modify: `lib/api-auth.ts` (complete rewrite)
- Modify: `lib/auth-context.tsx` (lines 55-62, 111-118)
- Modify: `app/api/auth/verify-otp/route.ts` (add signed cookie set)
- Modify: `app/api/auth/validate/route.ts` (add signed cookie set)
- Modify: `app/api/auth/admin-login/route.ts` (add signed cookie set)

**Current problem:** `getAuthenticatedUser()` parses userId from an unsigned client-set cookie and trusts it blindly. Anyone can forge a cookie with any userId.

**Fix approach:**
1. Server-side: Sign cookies with HMAC-SHA256 using `AUTH_COOKIE_SECRET` env var
2. Server-side: Set cookies as `httpOnly` from API routes (verify-otp, validate, admin-login)
3. Server-side: `getAuthenticatedUser()` verifies HMAC signature AND validates session in DB
4. Client-side: Remove `document.cookie` setting from auth-context.tsx (server sets it)
5. Client-side: Keep localStorage for UI state only (user name, role for rendering)

**Step 1: Add AUTH_COOKIE_SECRET to environment**

Add to `.env.local`:
```
AUTH_COOKIE_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

**Step 2: Rewrite `lib/api-auth.ts` with HMAC signing**

```typescript
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getUserById, type User } from "@/lib/supabase";
import { dbQuery } from "@/lib/db";

const COOKIE_SECRET = process.env.AUTH_COOKIE_SECRET || "";
const COOKIE_NAME = "pratica-session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload {
  sessionId: string;
  userId: string;
}

function sign(payload: string): string {
  return createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function createSignedCookie(sessionId: string, userId: string): string {
  const payload = JSON.stringify({ sessionId, userId });
  const sig = sign(payload);
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}

function parseSignedCookie(raw: string | undefined): SessionPayload | null {
  if (!raw || !COOKIE_SECRET) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const dotIndex = decoded.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payloadB64 = decoded.substring(0, dotIndex);
    const sig = decoded.substring(dotIndex + 1);
    const payloadStr = Buffer.from(payloadB64, "base64").toString("utf-8");

    if (!verifySignature(payloadStr, sig)) return null;

    const data = JSON.parse(payloadStr);
    if (!data?.sessionId || !data?.userId) return null;
    return { sessionId: data.sessionId, userId: data.userId };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const raw = request.cookies.get(COOKIE_NAME)?.value;

  // Try new signed format first
  const signed = parseSignedCookie(raw);
  if (signed) {
    // Verify session exists and is valid in DB
    const { rows } = await dbQuery(
      `SELECT s.user_id FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.is_verified = true AND s.expires_at > now() AND u.is_active = true
       LIMIT 1`,
      [signed.sessionId]
    );
    if (!rows[0] || rows[0].user_id !== signed.userId) return null;
    return getUserById(signed.userId);
  }

  // Legacy fallback: unsigned cookie (for transition period - remove after 1 week)
  try {
    const decoded = decodeURIComponent(raw || "");
    const data = JSON.parse(decoded);
    if (data?.userId && data?.sessionId) {
      // Verify session in DB even for legacy cookies
      const { rows } = await dbQuery(
        `SELECT s.user_id FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.is_verified = true AND s.expires_at > now() AND u.is_active = true
         LIMIT 1`,
        [data.sessionId]
      );
      if (!rows[0] || rows[0].user_id !== data.userId) return null;
      return getUserById(data.userId);
    }
  } catch {}

  return null;
}

export function setAuthCookie(response: NextResponse, sessionId: string, userId: string): void {
  const value = createSignedCookie(sessionId, userId);
  response.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
```

**Step 3: Update verify-otp to set signed httpOnly cookie**

In `app/api/auth/verify-otp/route.ts`, after marking session as verified, set the cookie server-side:

```typescript
import { setAuthCookie } from '@/lib/api-auth';

// After the existing response creation, before return:
const response = NextResponse.json({ success: true, sessionId: session.id, user: { ... } });
setAuthCookie(response, session.id, session.user_id);
return response;
```

**Step 4: Update validate route to refresh signed cookie**

In `app/api/auth/validate/route.ts`, set/refresh the cookie on successful validation:

```typescript
import { setAuthCookie } from '@/lib/api-auth';

// Replace the existing return:
const response = NextResponse.json({ valid: true, sessionId, user: { ... } });
setAuthCookie(response, sessionId, session.user_id);
return response;
```

**Step 5: Update auth-context.tsx - remove client-side cookie setting**

Remove all `document.cookie = ...` lines (lines 62, 118). The server now sets httpOnly cookies.
Keep localStorage for UI-only data (user name, role for rendering).

**Step 6: Add logout API route**

Create `app/api/auth/logout/route.ts` that clears the httpOnly cookie:

```typescript
import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/api-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearAuthCookie(response);
  return response;
}
```

Update `auth-context.tsx` logout to call this endpoint.

**Step 7: Update OTP comparison to use timing-safe**

In `app/api/auth/verify-otp/route.ts` line 76, replace:
```typescript
if (session.otp_code !== otpCode) {
```
with:
```typescript
import { timingSafeEqual } from 'crypto';
const otpMatch = session.otp_code && otpCode &&
  session.otp_code.length === otpCode.length &&
  timingSafeEqual(Buffer.from(session.otp_code), Buffer.from(otpCode));
if (!otpMatch) {
```

**Step 8: Generate AUTH_COOKIE_SECRET and set in env**

```bash
echo "AUTH_COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> /var/www/pratica/.env.local
```

**Step 9: Commit**

```bash
git add lib/api-auth.ts lib/auth-context.tsx app/api/auth/verify-otp/route.ts app/api/auth/validate/route.ts app/api/auth/logout/route.ts .env.local
git commit -m "security: harden auth with HMAC-signed httpOnly cookies and DB session validation"
```

---

## Stream 2: Add Auth to Unprotected API Routes (depends on Stream 1)

### Task 2.1: Add auth to tenant routes

**Files:**
- Modify: `app/api/tenants/[id]/route.ts`
- Modify: `app/api/tenants/[id]/whatsapp/route.ts`

Add `requireWorkspaceContext(request)` at start of each handler. Return 401 if not authenticated. Verify user is admin/gerente role.

### Task 2.2: Add auth to agent routes

**Files:**
- Modify: `app/api/agents/route.ts`
- Modify: `app/api/agents/[instanceName]/route.ts`
- Modify: `app/api/agents/[instanceName]/toggle/route.ts`
- Modify: `app/api/agents/[instanceName]/logs/route.ts`
- Modify: `app/api/agents/test/route.ts`

Replace `searchParams.get('workspaceId') || '1'` with `requireWorkspaceContext(request)`. Use ctx.workspaceId.

### Task 2.3: Add auth to salva-leads routes

**Files:**
- Modify: `app/api/salva-leads/leads/route.ts`
- Modify: `app/api/salva-leads/novo-lead/route.ts`
- Modify: `app/api/salva-leads/agendar-visita/route.ts`
- Modify: `app/api/salva-leads/conversations/route.ts`
- Modify: `app/api/salva-leads/conversations/[id]/route.ts`
- Modify: `app/api/salva-leads/stats/route.ts`

Add `requireWorkspaceContext(request)` and use ctx.workspaceId instead of client-supplied workspace_id.

### Task 2.4: Add auth to analytics routes

**Files:**
- Modify: `app/api/analytics/conversao/route.ts`
- Modify: `app/api/analytics/vendas/route.ts`
- Modify: `app/api/analytics/tempo-medio/route.ts`
- Modify: `app/api/analytics/top-imoveis/route.ts`

Add `requireWorkspaceContext(request)` and filter all queries by ctx.workspaceId.

### Task 2.5: Add auth to sofia routes

**Files:**
- Modify: `app/api/sofia/config/route.ts`
- Modify: `app/api/sofia/metrics/route.ts`

Replace `workspaceId = 1` default with `requireWorkspaceContext(request)`.

### Task 2.6: Add auth to whatsapp routes

**Files:**
- Modify: `app/api/whatsapp/send-material/route.ts`
- Modify: `app/api/whatsapp/session/reconnect/route.ts`
- Modify: `app/api/whatsapp/sync/opportunities/route.ts`

Add `requireWorkspaceContext(request)` or at minimum `getAuthenticatedUser(request)`.

### Task 2.7: Add auth to remaining routes

**Files:**
- Modify: `app/api/acoes/agendar-visita/route.ts`
- Modify: `app/api/leads/score/[id]/route.ts`
- Modify: `app/api/leads/score/stats/route.ts`
- Modify: `app/api/reservas/route.ts`
- Modify: `app/api/comissao/pdf/route.ts`
- Modify: `app/api/admin/users/route.ts` (add workspace_id filter)

### Task 2.8: Fix admin users workspace isolation

In `app/api/admin/users/route.ts`, add workspace_id filter to GET query. Admin should only see users from their workspace.

### Task 2.9: Commit

```bash
git commit -m "security: add authentication to 45+ unprotected API routes"
```

---

## Stream 3: Fix SQL Injection (independent)

### Task 3.1: Whitelist sort parameter

**Files:**
- Modify: `app/api/salva-leads/leads/route.ts` (line 28)

Replace:
```typescript
const sort = searchParams.get('sort') || 'score DESC';
```
With:
```typescript
const ALLOWED_SORTS: Record<string, string> = {
  'score': 'score DESC',
  'score_asc': 'score ASC',
  'created_at': 'created_at DESC',
  'created_at_asc': 'created_at ASC',
  'nome': 'nome ASC',
  'nome_desc': 'nome DESC',
};
const sortKey = searchParams.get('sort') || 'score';
const sort = ALLOWED_SORTS[sortKey] || 'score DESC';
```

### Task 3.2: Commit

```bash
git commit -m "security: fix SQL injection in salva-leads sort parameter"
```

---

## Stream 4: Database Constraints (independent)

### Task 4.1: Add critical foreign keys

**Files:**
- Create: `migrations/050_add_critical_fks.sql`

Add FKs for populated tables only (22 tables with data):
- `users.workspace_id -> workspaces.id`
- `users.imobiliaria_id -> imobiliarias.id`
- `sessions.user_id -> users.id`
- `tracking_events.user_id -> users.id`
- `whatsapp_messages.workspace_id -> workspaces.id`
- `assistente_conversas.user_id -> users.id`
- `assistente_mensagens.conversa_id -> assistente_conversas.id`
- `disparo_leads.disparo_id -> disparos.id`
- `workspace_members.workspace_id -> workspaces.id`
- `workspace_members.user_id -> users.id`

Use `NOT VALID` to avoid locking tables, then `VALIDATE` separately.

### Task 4.2: Add CHECK constraints for enums

**Files:**
- Create: `migrations/051_add_check_constraints.sql`

Add CHECKs on populated tables:
- `users.role IN ('corretor','gerente','admin','recepcionista')`
- `workspace_members.role IN ('owner','admin','member','viewer')`
- `workspaces.type IN ('personal','shared')`
- `workspaces.plan IN ('free','starter','pro','enterprise')`
- `sessions.is_verified IN (true, false)` (already boolean, OK)

### Task 4.3: Add positive value constraints

**Files:**
- Append to: `migrations/051_add_check_constraints.sql`

Add CHECKs: `valor >= 0` on all money columns in comissao and cvcrm tables.

### Task 4.4: Remove duplicate indexes

**Files:**
- Create: `migrations/052_cleanup_indexes.sql`

```sql
DROP INDEX IF EXISTS idx_agent_configs_tenant_instance;
DROP INDEX IF EXISTS idx_recepcao_locais_qr_token;
```

### Task 4.5: Run migrations

```bash
psql -U pratica -d pratica < /var/www/pratica/migrations/050_add_critical_fks.sql
psql -U pratica -d pratica < /var/www/pratica/migrations/051_add_check_constraints.sql
psql -U pratica -d pratica < /var/www/pratica/migrations/052_cleanup_indexes.sql
```

### Task 4.6: Commit

```bash
git commit -m "db: add foreign keys, check constraints, remove duplicate indexes"
```

---

## Stream 5: Fix Error Leakage & Backup Routes (independent)

### Task 5.1: Stop leaking error details to client

**Files to modify** (replace `error.message` with generic message in catch blocks):
- `app/api/tenants/[id]/route.ts`
- `app/api/salva-leads/conversations/route.ts`
- `app/api/salva-leads/novo-lead/route.ts`
- `app/api/sofia/metrics/route.ts`
- `app/api/analytics/conversao/route.ts`
- `app/api/leads/by-phone/route.ts`

Pattern: Replace `{ error: error.message }` with `{ error: 'Erro interno do servidor' }` and keep `console.error` for server logs.

### Task 5.2: Exclude backup routes from Next.js compilation

**Files:**
- Move: `app/api/webhook/evolution/_backups_ignore/` to `_backups/` (outside app/ directory)

```bash
mv /var/www/pratica/app/api/webhook/evolution/_backups_ignore /var/www/pratica/_backups_evolution_webhook
```

### Task 5.3: Commit

```bash
git commit -m "security: stop leaking error internals, move backup code out of app/"
```

---

## Stream 6: Frontend Cleanup (independent)

### Task 6.1: Replace all alert() with toast()

**Files:**
- Modify: `app/admin/equipe/page.tsx` (12 alerts -> toast)
- Modify: `app/admin/intermediacao/beneficiarios/[id]/page.tsx` (2 alerts)
- Modify: `app/admin/intermediacao/beneficiarios/novo/page.tsx` (2 alerts)
- Modify: `app/corretor/clientes/[id]/page.tsx` (2 alerts)
- Modify: `components/whatsapp-chat.tsx` (2 alerts)
- Modify: `components/corretor/chat-crm.tsx` (2 alerts)
- Modify: `components/intermediacao/PrintButton.tsx` (1 alert)

Pattern: `alert("Sucesso!")` -> `toast.success("Sucesso!")` and `alert("Erro...")` -> `toast.error("Erro...")`
Import `{ toast } from "sonner"` where missing.

### Task 6.2: Fix hardcoded values in recepcao

**Files:**
- Modify: `app/corretor/recepcao/page.tsx` (lines 607, 617)

Replace hardcoded `totalPortaria={10}` and `totalLeads={5}` with actual data from the component's state/API response.

### Task 6.3: Fix empty catch blocks

**Files:**
- Modify: `app/corretor/assistente/page.tsx` (lines 68, 153)
- Modify: `app/corretor/disparador/page.tsx` (lines 233, 309, 330)

Add `toast.error("Erro ao carregar dados")` or at minimum `console.error(error)` to catch blocks.

### Task 6.4: Remove console.log from components

**Files:**
- Modify: `app/admin/intermediacao/page.tsx` (line 266)
- Modify: `app/corretor/mensagens/page.tsx` (lines 120, 125)
- Modify: `components/academy/certificate-card.tsx` (line 81)

Remove or replace with proper error handling.

### Task 6.5: Commit

```bash
git commit -m "fix: replace alerts with toasts, fix empty catches, remove console.logs"
```

---

## Stream 7: CSRF Protection (independent, lower priority)

### Task 7.1: Use existing CSRF utilities

**Files:**
- Modify: `lib/security-utils.ts` (verify generateCSRFToken/validateCSRFToken work)
- Modify: `lib/auth-context.tsx` (generate CSRF token on login)
- Modify: State-changing API routes (POST/PUT/DELETE/PATCH) to validate CSRF token

**Note:** With httpOnly cookies, CSRF becomes more important since the browser auto-sends the cookie. Add CSRF token as `X-CSRF-Token` header from client, validate on server.

This is lower priority since SameSite=Lax on the cookie already prevents most CSRF vectors.

### Task 7.2: Commit

```bash
git commit -m "security: enable CSRF protection for state-changing routes"
```

---

## Execution Order

```
Stream 1 (Auth Hardening) ──────────────> Stream 2 (API Route Auth)

Stream 3 (SQL Injection)    ─── parallel ───┐
Stream 4 (DB Constraints)  ─── parallel ───┤
Stream 5 (Error Leakage)   ─── parallel ───┤  All independent
Stream 6 (Frontend)         ─── parallel ───┤
Stream 7 (CSRF)             ─── parallel ───┘
```

**Stream 1 MUST complete before Stream 2** (Stream 2 uses the auth patterns created in Stream 1).

**All other streams are fully independent** and can run in parallel.

---

## Verification

After all streams complete:
1. `pnpm build` - verify no TypeScript errors
2. Test login flow end-to-end (OTP -> cookie set -> page access -> API calls)
3. Test that forged cookies are rejected
4. Test that unauthenticated API calls return 401
5. Test that SQL injection in sort param is blocked
6. Verify DB constraints with `\d+ table_name` in psql
