// @ts-nocheck
import type { IncomingMessage } from 'http'
import type { SessionData } from '../lib/voice-agent/types'

/**
 * Parse cookie header string into key-value pairs
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}

  if (!cookieHeader) {
    return cookies
  }

  const pairs = cookieHeader.split(';')

  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split('=')
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim()
    }
  }

  return cookies
}

/**
 * Get session data from request cookies
 * Cookie format: pratica-session=URL_ENCODED_JSON
 * JSON structure: { userId: string, phone: string, role: 'corretor' | 'gerente' | 'admin', tenantId?: number }
 */
export function getSessionFromRequest(req: IncomingMessage): SessionData | null {
  const cookies = parseCookies(req.headers.cookie)
  const sessionCookie = cookies['pratica-session']

  if (!sessionCookie) {
    return null
  }

  try {
    // Decode URL-encoded cookie value and parse JSON
    const decodedValue = decodeURIComponent(sessionCookie)
    const session = JSON.parse(decodedValue)

    // Validate required fields
    if (session.userId && session.phone && session.role) {
      return {
        userId: session.userId,
        phone: session.phone,
        role: session.role,
        tenantId: session.tenantId
      }
    }
  } catch {
    // Invalid JSON in cookie
  }

  return null
}

/**
 * Validate if session has access to voice agent
 * Only admin and gerente roles can use voice agent
 */
export function validateVoiceAgentAccess(session: SessionData | null): { valid: boolean; error?: string } {
  if (!session) {
    return {
      valid: false,
      error: 'Authentication required'
    }
  }

  if (session.role !== 'admin' && session.role !== 'gerente') {
    return {
      valid: false,
      error: 'Voice agent access is restricted to admin and manager users only'
    }
  }

  return { valid: true }
}

export interface AuthResult {
  userId: string
  tenantId: number
  role: 'admin' | 'gerente'
  nome?: string
}

export interface AuthError {
  error: string
}

/**
 * Authenticate WebSocket connection
 * Combines session extraction and voice agent access validation
 */
export async function authenticateWebSocket(req: IncomingMessage): Promise<AuthResult | AuthError> {
  const session = getSessionFromRequest(req)
  const validation = validateVoiceAgentAccess(session)

  if (!validation.valid || !session) {
    return {
      error: validation.error || 'Authentication failed'
    }
  }

  return {
    userId: session.userId,
    tenantId: session.tenantId || 1, // Default tenant
    role: session.role as 'admin' | 'gerente',
    nome: undefined // Could be fetched from DB if needed
  }
}
