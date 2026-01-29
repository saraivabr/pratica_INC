/**
 * Detailed Health Check Endpoint
 * Checklist completo: DB, services, recursos
 */

import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { logger } from '@/lib/monitoring/logger'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: CheckResult
    memory: CheckResult
    disk: CheckResult
    environment: CheckResult
  }
  version: string
  environment: string
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail'
  message: string
  duration?: number
  metadata?: Record<string, any>
}

/**
 * Check Database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  
  try {
    const result = await dbQuery('SELECT 1 as health')
    const duration = Date.now() - start
    
    if (result.rows[0]?.health === 1) {
      return {
        status: 'pass',
        message: 'Database connection healthy',
        duration,
      }
    }
    
    return {
      status: 'fail',
      message: 'Database query returned unexpected result',
      duration,
    }
  } catch (error) {
    const duration = Date.now() - start
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Database connection failed',
      duration,
    }
  }
}

/**
 * Check Memory usage
 */
function checkMemory(): CheckResult {
  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
  const percentUsed = Math.round((usage.heapUsed / usage.heapTotal) * 100)
  
  let status: 'pass' | 'warn' | 'fail' = 'pass'
  let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${percentUsed}%)`
  
  if (percentUsed > 90) {
    status = 'fail'
    message = `Critical memory usage: ${percentUsed}%`
  } else if (percentUsed > 75) {
    status = 'warn'
    message = `High memory usage: ${percentUsed}%`
  }
  
  return {
    status,
    message,
    metadata: {
      heapUsedMB,
      heapTotalMB,
      percentUsed,
      rss: Math.round(usage.rss / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    },
  }
}

/**
 * Check Disk space (if available)
 */
function checkDisk(): CheckResult {
  // Node.js não tem API nativa para disk usage
  // Em produção, usar biblioteca como 'diskusage' ou monitorar externamente
  return {
    status: 'pass',
    message: 'Disk monitoring not implemented (use external monitoring)',
  }
}

/**
 * Check Environment variables
 */
function checkEnvironment(): CheckResult {
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_DB_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'EVOLUTION_WEBHOOK_SECRET',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
  ]
  
  const missing = requiredVars.filter(v => !process.env[v])
  
  if (missing.length > 0) {
    return {
      status: 'fail',
      message: `Missing required environment variables: ${missing.join(', ')}`,
      metadata: { missing },
    }
  }
  
  return {
    status: 'pass',
    message: 'All required environment variables present',
    metadata: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
    },
  }
}

/**
 * GET /api/health/detailed
 */
export async function GET(req: Request) {
  const startTime = Date.now()
  
  try {
    // Run all health checks in parallel
    const [database, memory, disk, environment] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkDisk()),
      Promise.resolve(checkEnvironment()),
    ])
    
    // Determine overall status
    const checks = { database, memory, disk, environment }
    const hasFailure = Object.values(checks).some(c => c.status === 'fail')
    const hasWarning = Object.values(checks).some(c => c.status === 'warn')
    
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
      hasFailure ? 'unhealthy' : 
      hasWarning ? 'degraded' : 
      'healthy'
    
    const health: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }
    
    const duration = Date.now() - startTime
    
    // Log health check
    if (overallStatus === 'unhealthy') {
      logger.error('Health check failed', {
        duration,
        metadata: { health },
      })
    } else if (overallStatus === 'degraded') {
      logger.warn('Health check degraded', {
        duration,
        metadata: { health },
      })
    }
    
    // Return appropriate status code
    const statusCode = 
      overallStatus === 'unhealthy' ? 503 : 
      overallStatus === 'degraded' ? 200 : // Ainda operacional
      200
    
    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
    
  } catch (error) {
    logger.error('Health check crashed', {
      error: error instanceof Error ? error : new Error(String(error)),
    })
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    )
  }
}
