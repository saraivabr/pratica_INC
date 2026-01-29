/**
 * Monitoring Module - Index
 * Centralized exports for monitoring and logging
 */

export {
  logger,
  logRequest,
  logError,
  type LogLevel,
  type LogContext,
} from './logger'

/**
 * Quick start guide:
 * 
 * 1. Basic logging:
 * 
 *    import { logger } from '@/lib/monitoring'
 *    
 *    logger.info('User logged in', { userId: '123' })
 *    logger.warn('High memory usage', { memoryMB: 950 })
 *    logger.error('Database connection failed', { error })
 * 
 * 2. Request logging:
 * 
 *    import { logRequest } from '@/lib/monitoring'
 *    
 *    export async function POST(req: NextRequest) {
 *      const logEnd = logRequest(req)
 *      try {
 *        // handler logic
 *      } finally {
 *        logEnd()
 *      }
 *    }
 * 
 * 3. Error logging:
 * 
 *    import { logError } from '@/lib/monitoring'
 *    
 *    try {
 *      // ...
 *    } catch (error) {
 *      logError(error, { userId, workspaceId })
 *    }
 * 
 * 4. Security events:
 * 
 *    logger.security('Failed login attempt', {
 *      ip: req.headers.get('x-forwarded-for'),
 *      phone: '+5511999999999',
 *    })
 * 
 * 5. Business metrics:
 * 
 *    logger.metric('leads_created', 15, 'count', { workspaceId: 123 })
 *    logger.metric('response_time', 250, 'ms', { route: '/api/leads' })
 */
