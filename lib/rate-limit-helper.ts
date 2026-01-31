import { NextRequest, NextResponse } from 'next/server';
import rateLimiter, { RateLimitConfigs } from './rate-limiter';

type RateLimitConfigKey = keyof typeof RateLimitConfigs;

/**
 * Apply rate limiting to an API route.
 * Returns null if allowed, or a NextResponse (429) if rate limited.
 */
export async function applyRateLimit(
  request: NextRequest,
  configKey: RateLimitConfigKey,
  keyPrefix?: string
): Promise<NextResponse | null> {
  const config = RateLimitConfigs[configKey];
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const key = `${keyPrefix || configKey.toLowerCase()}:${ip}`;
  const result = await rateLimiter.check(key, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Muitas requisições. Tente novamente mais tarde.',
        code: 'RATE_LIMITED',
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': result.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        },
      }
    );
  }

  return null;
}
