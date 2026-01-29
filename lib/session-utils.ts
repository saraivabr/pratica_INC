/**
 * Session Utilities - Gerenciamento seguro de sessões
 * 
 * Centraliza lógica de cookies seguros (httpOnly, secure, SameSite)
 * e duração de 30 dias para melhor UX.
 */

export const SESSION_DURATION_DAYS = 30;
export const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

/**
 * Cria cookie de sessão seguro
 * - httpOnly: protege contra XSS
 * - secure: apenas HTTPS (exceto localhost em dev)
 * - SameSite=Lax: proteção CSRF mantendo usabilidade
 * - 30 dias de duração
 */
export function createSessionCookie(sessionData: {
  userId: string;
  phone: string;
  sessionId: string;
  role: string;
  workspaceId?: number;
}): string {
  const cookieValue = JSON.stringify(sessionData);
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || '';

  const attributes = [
    `pratica-session=${encodeURIComponent(cookieValue)}`,
    'Path=/',
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    'SameSite=Lax',
    'HttpOnly',
  ];

  // Secure flag apenas em produção (localhost não suporta HTTPS)
  if (isProduction) {
    attributes.push('Secure');
  }

  // Domain apenas se configurado (para subdomínios)
  if (domain) {
    attributes.push(`Domain=${domain}`);
  }

  return attributes.join('; ');
}

/**
 * Remove cookie de sessão
 */
export function clearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || '';

  const attributes = [
    'pratica-session=',
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:01 GMT',
  ];

  if (domain) {
    attributes.push(`Domain=${domain}`);
  }

  return attributes.join('; ');
}

/**
 * Parse session cookie value
 */
export function parseSessionCookie(cookieValue: string): {
  userId: string;
  phone: string;
  sessionId: string;
  role: string;
  workspaceId?: number;
} | null {
  try {
    const decoded = decodeURIComponent(cookieValue);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
