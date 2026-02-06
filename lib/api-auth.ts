import { NextRequest, NextResponse } from "next/server";
import { getUserById, type User } from "@/lib/supabase";
import { dbQuery } from "@/lib/db";
import { createHmac, timingSafeEqual } from "crypto";

// ============================================================================
// Types
// ============================================================================

/** Payload stored inside the signed auth cookie (httpOnly) */
interface AuthCookiePayload {
  sessionId: string;
  userId: string;
}

/** Payload stored inside the session cookie (non-httpOnly, for middleware/UI) */
interface SessionCookiePayload {
  role: string;
  workspaceId?: number;
  userId: string;
  nome?: string;
}

/** Legacy cookie format (transition period) */
interface LegacySessionCookie {
  userId: string;
  phone: string;
  sessionId?: string;
  role?: string;
  workspaceId?: number;
}

// ============================================================================
// Constants
// ============================================================================

const AUTH_COOKIE_NAME = "pratica-auth";
const SESSION_COOKIE_NAME = "pratica-session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ============================================================================
// HMAC Signing Utilities
// ============================================================================

function getSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) {
    throw new Error("AUTH_COOKIE_SECRET environment variable is required");
  }
  return secret;
}

/**
 * Create HMAC-SHA256 signature for a payload string.
 */
function signPayload(payload: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(payload);
  return hmac.digest("hex");
}

/**
 * Verify HMAC-SHA256 signature using timing-safe comparison.
 * Returns true if valid, false otherwise.
 */
function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = signPayload(payload);
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ============================================================================
// Cookie Creation / Parsing
// ============================================================================

/**
 * Create a signed cookie value: base64(payload) + "." + hmac-sha256-hex
 */
export function createSignedCookie(sessionId: string, userId: string): string {
  const payload: AuthCookiePayload = { sessionId, userId };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = signPayload(payloadStr);
  return `${payloadStr}.${signature}`;
}

/**
 * Parse and verify a signed cookie value.
 * Returns the payload if valid, null otherwise.
 */
function parseSignedCookie(cookieValue: string): AuthCookiePayload | null {
  try {
    const dotIndex = cookieValue.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payloadStr = cookieValue.substring(0, dotIndex);
    const signature = cookieValue.substring(dotIndex + 1);

    if (!verifySignature(payloadStr, signature)) return null;

    const decoded = Buffer.from(payloadStr, "base64").toString("utf-8");
    const payload = JSON.parse(decoded) as AuthCookiePayload;

    if (!payload.sessionId || !payload.userId) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Parse legacy unsigned cookie (transition period).
 * Still requires DB session validation downstream.
 */
function parseLegacyCookie(raw: string): LegacySessionCookie | null {
  try {
    const decoded = decodeURIComponent(raw);
    const data = JSON.parse(decoded);
    if (!data?.userId) return null;
    return data as LegacySessionCookie;
  } catch {
    return null;
  }
}

// ============================================================================
// Session Validation (DB)
// ============================================================================

/**
 * Validate that a session exists in DB, is verified, not expired, and user is active.
 * Returns the user_id if valid, null otherwise.
 */
async function validateSessionInDb(sessionId: string): Promise<string | null> {
  try {
    const { rows } = await dbQuery(
      `SELECT s.user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.is_verified = true
         AND s.expires_at > now()
         AND u.is_active = true
       LIMIT 1`,
      [sessionId]
    );
    return rows[0]?.user_id || null;
  } catch (error) {
    console.error("[api-auth] Error validating session in DB:", error);
    return null;
  }
}

// ============================================================================
// Main Auth Function
// ============================================================================

/**
 * Get authenticated user from request.
 *
 * 1. Try to parse HMAC-signed `pratica-auth` cookie
 * 2. Verify signature
 * 3. Validate session in DB (is_verified, not expired, user is_active)
 * 4. Return user via getUserById()
 *
 * Legacy fallback: if no signed cookie, try to parse unsigned `pratica-session`
 * cookie (transition period) - still validates session in DB if sessionId present.
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<User | null> {
  // --- Try signed auth cookie first ---
  const authCookieRaw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (authCookieRaw) {
    const payload = parseSignedCookie(authCookieRaw);
    if (payload) {
      // Verify session exists and is valid in DB
      const validUserId = await validateSessionInDb(payload.sessionId);
      if (!validUserId) return null;

      // Ensure userId in cookie matches session's user_id
      if (validUserId !== payload.userId) {
        console.warn(
          `[api-auth] Cookie userId (${payload.userId}) does not match session user_id (${validUserId})`
        );
        return null;
      }

      return getUserById(payload.userId);
    }
  }

  // --- Legacy fallback: unsigned pratica-session cookie ---
  const sessionCookieRaw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookieRaw) {
    const legacy = parseLegacyCookie(sessionCookieRaw);
    if (legacy?.userId) {
      // If legacy cookie has sessionId, validate it in DB
      if (legacy.sessionId) {
        const validUserId = await validateSessionInDb(legacy.sessionId);
        if (!validUserId) return null;

        if (validUserId !== legacy.userId) {
          console.warn(
            `[api-auth] Legacy cookie userId mismatch: cookie=${legacy.userId}, session=${validUserId}`
          );
          return null;
        }
      }
      // Even without sessionId, we still return the user (for backward compat)
      // but only during transition period
      return getUserById(legacy.userId);
    }
  }

  return null;
}

// ============================================================================
// Cookie Setters
// ============================================================================

/**
 * Set both auth cookies on a NextResponse:
 * 1. `pratica-auth` - httpOnly, signed, contains sessionId + userId (for API auth)
 * 2. `pratica-session` - NOT httpOnly, contains role + workspaceId (for middleware/UI)
 */
export function setAuthCookie(
  response: NextResponse,
  sessionId: string,
  userId: string,
  extra?: { role?: string; workspaceId?: number; nome?: string }
): void {
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Set httpOnly signed auth cookie
  const signedValue = createSignedCookie(sessionId, userId);
  response.cookies.set(AUTH_COOKIE_NAME, signedValue, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  // 2. Set non-httpOnly session cookie for middleware routing + client UI
  const sessionPayload: SessionCookiePayload = {
    role: extra?.role || "corretor",
    workspaceId: extra?.workspaceId,
    userId,
    nome: extra?.nome,
  };
  response.cookies.set(
    SESSION_COOKIE_NAME,
    encodeURIComponent(JSON.stringify(sessionPayload)),
    {
      httpOnly: false,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    }
  );
}

/**
 * Clear both auth cookies on a NextResponse.
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: false,
    path: "/",
    maxAge: 0,
  });
}
