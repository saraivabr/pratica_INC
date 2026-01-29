/**
 * Security Headers - Production Enterprise Grade
 * Protege contra XSS, clickjacking, MIME sniffing, etc.
 */

export interface SecurityHeadersOptions {
  csp?: boolean // Content Security Policy
  hsts?: boolean // HTTP Strict Transport Security
  noSniff?: boolean // X-Content-Type-Options
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  referrerPolicy?: 'no-referrer' | 'strict-origin-when-cross-origin' | 'same-origin'
}

/**
 * Generate comprehensive security headers
 */
export function getSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const {
    csp = true,
    hsts = true,
    noSniff = true,
    frameOptions = 'SAMEORIGIN',
    referrerPolicy = 'strict-origin-when-cross-origin',
  } = options
  
  const headers: Record<string, string> = {}
  
  // Content Security Policy
  if (csp) {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com", // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' https:",
      "connect-src 'self' https://*.supabase.co https://pratica.cvcrm.com.br wss://*.supabase.co https://api.openai.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ]
    headers['Content-Security-Policy'] = cspDirectives.join('; ')
  }
  
  // HTTP Strict Transport Security (force HTTPS)
  if (hsts) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }
  
  // Prevenir MIME sniffing
  if (noSniff) {
    headers['X-Content-Type-Options'] = 'nosniff'
  }
  
  // Prevenir clickjacking
  if (frameOptions) {
    headers['X-Frame-Options'] = frameOptions
  }
  
  // Referrer Policy
  if (referrerPolicy) {
    headers['Referrer-Policy'] = referrerPolicy
  }
  
  // Outros headers de segurança
  headers['X-XSS-Protection'] = '1; mode=block' // Proteção XSS legada (browsers antigos)
  headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()' // Desabilitar recursos sensíveis por padrão
  
  return headers
}

/**
 * Cache Control Headers - otimizado para CDN
 */
export function getCacheHeaders(type: 'static' | 'api' | 'dynamic' | 'no-cache'): Record<string, string> {
  switch (type) {
    case 'static':
      // Assets estáticos (imagens, fonts, CSS, JS com hash)
      // 1 ano de cache + immutable
      return {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
      }
    
    case 'api':
      // APIs com revalidação
      // Cache por 1 minuto, mas revalidar sempre
      return {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, max-age=60',
      }
    
    case 'dynamic':
      // Conteúdo dinâmico mas cacheável (perfis, listagens)
      // Cache por 5 minutos com revalidação
      return {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=300',
      }
    
    case 'no-cache':
      // Conteúdo sensível/privado (auth, webhooks)
      // Nunca cachear
      return {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    
    default:
      return {}
  }
}

/**
 * CORS Headers - configuração segura
 */
export function getCORSHeaders(options: {
  origin?: string | string[]
  methods?: string[]
  credentials?: boolean
} = {}): Record<string, string> {
  const {
    origin = process.env.NEXT_PUBLIC_APP_URL || '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials = true,
  } = options
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workspace-ID',
    'Access-Control-Max-Age': '86400', // 24 horas
  }
  
  // Origin handling
  if (Array.isArray(origin)) {
    // Se é array, deixar o middleware decidir dinamicamente
    // (Next.js não suporta múltiplos origins em string)
    headers['Access-Control-Allow-Origin'] = origin[0] // Default para primeiro
  } else {
    headers['Access-Control-Allow-Origin'] = origin
  }
  
  if (credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  
  return headers
}

/**
 * Combine all headers
 */
export function getAllSecurityHeaders(options: {
  security?: SecurityHeadersOptions
  cache?: 'static' | 'api' | 'dynamic' | 'no-cache'
  cors?: boolean
} = {}): Record<string, string> {
  return {
    ...getSecurityHeaders(options.security),
    ...(options.cache ? getCacheHeaders(options.cache) : {}),
    ...(options.cors ? getCORSHeaders() : {}),
  }
}

/**
 * Helper: aplicar headers em NextResponse
 */
export function withSecurityHeaders(
  response: Response,
  options: {
    security?: SecurityHeadersOptions
    cache?: 'static' | 'api' | 'dynamic' | 'no-cache'
    cors?: boolean
  } = {}
): Response {
  const headers = getAllSecurityHeaders(options)
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

/**
 * Exemplo de uso:
 * 
 * export async function GET(req: NextRequest) {
 *   const data = await fetchData()
 *   
 *   const response = NextResponse.json(data)
 *   return withSecurityHeaders(response, { cache: 'api', cors: true })
 * }
 */
