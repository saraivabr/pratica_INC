/**
 * Rate Limiter for CV CRM API
 * Implements token bucket algorithm with configurable limits
 */

import { RateLimiterConfig } from './types';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private bucket: TokenBucket;
  private requestQueue: Array<{
    resolve: (value: void) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = {
      maxRequestsPerMinute: config?.maxRequestsPerMinute ?? 60,
      maxRequestsPerSecond: config?.maxRequestsPerSecond ?? 5,
      burstLimit: config?.burstLimit ?? 10,
      retryAfterMs: config?.retryAfterMs ?? 1000,
    };

    this.bucket = {
      tokens: this.config.burstLimit,
      lastRefill: Date.now(),
    };
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.bucket.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.config.maxRequestsPerSecond;

    this.bucket.tokens = Math.min(
      this.config.burstLimit,
      this.bucket.tokens + tokensToAdd
    );
    this.bucket.lastRefill = now;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.requestQueue.length > 0) {
      this.refillTokens();

      if (this.bucket.tokens >= 1) {
        this.bucket.tokens -= 1;
        const request = this.requestQueue.shift();
        if (request) {
          request.resolve();
        }
      } else {
        // Wait for token refill
        const waitTime = Math.ceil(1000 / this.config.maxRequestsPerSecond);
        await this.sleep(waitTime);
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Acquire a token to make a request
   * Returns a promise that resolves when a token is available
   */
  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * Get current status
   */
  getStatus(): { availableTokens: number; queueLength: number } {
    this.refillTokens();
    return {
      availableTokens: Math.floor(this.bucket.tokens),
      queueLength: this.requestQueue.length,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.bucket = {
      tokens: this.config.burstLimit,
      lastRefill: Date.now(),
    };
    this.requestQueue = [];
    this.processing = false;
  }
}

// Global rate limiter instance for CV CRM API
let globalRateLimiter: RateLimiter | null = null;

export function getGlobalRateLimiter(): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter({
      maxRequestsPerMinute: 60,
      maxRequestsPerSecond: 3,
      burstLimit: 10,
      retryAfterMs: 1000,
    });
  }
  return globalRateLimiter;
}

export function resetGlobalRateLimiter(): void {
  if (globalRateLimiter) {
    globalRateLimiter.reset();
  }
}
