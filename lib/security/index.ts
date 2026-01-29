/**
 * Security Module - Index
 * Centralized exports for all security utilities
 */

// Rate Limiting
export {
  rateLimit,
  rateLimitPresets,
  withRateLimit,
  type RateLimitConfig,
} from './rate-limiter'

// Input Validation
export {
  validateCPF,
  validatePhone,
  validateEmail,
  sanitizeString,
  sanitizeSQL,
  validatePath,
  validateWorkspaceId,
  validateUUID,
  schemas,
  validateRequestBody,
  validateHeaders,
} from './validation'

// Secure Route Wrappers
export {
  secureRoute,
  secureWebhook,
} from './secure-route'

// Security Headers
export {
  getSecurityHeaders,
  getCacheHeaders,
  getCORSHeaders,
  getAllSecurityHeaders,
  withSecurityHeaders,
  type SecurityHeadersOptions,
} from './headers'

/**
 * Quick start guide:
 * 
 * 1. Secure an API route with rate limiting:
 * 
 *    import { secureRoute, rateLimitPresets } from '@/lib/security'
 *    
 *    export const POST = secureRoute(
 *      async (req, session) => {
 *        // your handler
 *      },
 *      { rateLimit: rateLimitPresets.auth, requireAuth: true }
 *    )
 * 
 * 2. Validate request body:
 * 
 *    import { validateRequestBody, schemas } from '@/lib/security'
 *    
 *    const validation = await validateRequestBody(req, z.object({
 *      phone: schemas.phone,
 *      name: schemas.safeName,
 *    }))
 * 
 * 3. Add security headers:
 * 
 *    import { withSecurityHeaders } from '@/lib/security'
 *    
 *    const response = NextResponse.json(data)
 *    return withSecurityHeaders(response, { cache: 'api' })
 * 
 * 4. Secure a webhook:
 * 
 *    import { secureWebhook } from '@/lib/security'
 *    
 *    export const POST = secureWebhook(async (req, payload) => {
 *      // webhook handler
 *    })
 */
