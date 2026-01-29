/**
 * Structured Logging - Production Enterprise Grade
 * Logs estruturados para facilitar análise e alertas
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  userId?: string
  workspaceId?: number
  requestId?: string
  ip?: string
  route?: string
  method?: string
  duration?: number
  statusCode?: number
  error?: Error | string
  metadata?: Record<string, any>
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  environment: string
  service: string
  version: string
}

class Logger {
  private service: string
  private version: string
  private environment: string
  
  constructor() {
    this.service = 'pratica-crm'
    this.version = process.env.APP_VERSION || '1.0.0'
    this.environment = process.env.NODE_ENV || 'development'
  }
  
  /**
   * Format log entry as JSON
   */
  private formatLog(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      environment: this.environment,
      service: this.service,
      version: this.version,
    }
  }
  
  /**
   * Output log (JSON em produção, pretty print em dev)
   */
  private output(entry: LogEntry): void {
    if (this.environment === 'production') {
      // JSON puro para facilitar parsing (ELK, Datadog, etc)
      console.log(JSON.stringify(entry))
    } else {
      // Pretty print para dev
      const emoji = {
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        fatal: '💀',
      }[entry.level]
      
      console.log(
        `${emoji} [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`,
        entry.context ? `\n  Context:` : '',
        entry.context ? JSON.stringify(entry.context, null, 2) : ''
      )
    }
  }
  
  /**
   * Log methods
   */
  debug(message: string, context?: LogContext): void {
    if (this.environment === 'development') {
      this.output(this.formatLog('debug', message, context))
    }
  }
  
  info(message: string, context?: LogContext): void {
    this.output(this.formatLog('info', message, context))
  }
  
  warn(message: string, context?: LogContext): void {
    this.output(this.formatLog('warn', message, context))
  }
  
  error(message: string, context?: LogContext): void {
    this.output(this.formatLog('error', message, context))
    
    // Em produção, poderia enviar para sistema de alertas (Sentry, etc)
    if (this.environment === 'production' && context?.error) {
      this.sendAlert('error', message, context)
    }
  }
  
  fatal(message: string, context?: LogContext): void {
    this.output(this.formatLog('fatal', message, context))
    
    // Fatal sempre envia alerta
    this.sendAlert('fatal', message, context)
  }
  
  /**
   * Log request/response
   */
  request(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    
    this.output(
      this.formatLog(
        level,
        `${method} ${route} - ${statusCode} (${duration}ms)`,
        {
          method,
          route,
          statusCode,
          duration,
          ...context,
        }
      )
    )
  }
  
  /**
   * Log security event
   */
  security(event: string, context?: LogContext): void {
    this.output(
      this.formatLog(
        'warn',
        `[SECURITY] ${event}`,
        {
          ...context,
          metadata: {
            ...context?.metadata,
            securityEvent: event,
          },
        }
      )
    )
    
    // Security events sempre geram alerta
    this.sendAlert('security', event, context)
  }
  
  /**
   * Log business metric
   */
  metric(metric: string, value: number, unit?: string, context?: LogContext): void {
    this.output(
      this.formatLog(
        'info',
        `[METRIC] ${metric}: ${value}${unit || ''}`,
        {
          ...context,
          metadata: {
            ...context?.metadata,
            metric,
            value,
            unit,
          },
        }
      )
    )
  }
  
  /**
   * Send alert (integração futura com Slack, PagerDuty, etc)
   */
  private sendAlert(type: string, message: string, context?: LogContext): void {
    // TODO: Implementar integração com sistema de alertas
    // Por enquanto, apenas log
    if (this.environment === 'production') {
      console.error(`[ALERT:${type}] ${message}`, context)
    }
  }
}

// Singleton instance
export const logger = new Logger()

/**
 * Request Logger Middleware (para usar em route handlers)
 */
export function logRequest(
  req: Request,
  startTime: number = Date.now()
): () => void {
  const url = new URL(req.url)
  const method = req.method
  const route = url.pathname
  
  // Retorna função para chamar após response
  return () => {
    const duration = Date.now() - startTime
    logger.request(method, route, 200, duration) // Status será atualizado se error
  }
}

/**
 * Error Logger - log automático de errors em try/catch
 */
export function logError(error: unknown, context?: LogContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  
  logger.error(errorMessage, {
    ...context,
    error: error instanceof Error ? error : new Error(String(error)),
    metadata: {
      ...context?.metadata,
      stack: errorStack,
    },
  })
}

/**
 * Exemplo de uso:
 * 
 * import { logger } from '@/lib/monitoring/logger'
 * 
 * export async function POST(req: NextRequest) {
 *   const logEnd = logRequest(req)
 *   
 *   try {
 *     const data = await processData()
 *     logger.info('Data processed successfully', { userId: data.userId })
 *     return NextResponse.json(data)
 *   } catch (error) {
 *     logError(error, { route: '/api/data' })
 *     return NextResponse.json({ error: 'Failed' }, { status: 500 })
 *   } finally {
 *     logEnd()
 *   }
 * }
 */
