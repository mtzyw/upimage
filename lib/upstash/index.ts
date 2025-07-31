import { Duration, Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
} else {
  console.log('Redis is disabled: Required environment variables are not set');
}

interface RateLimitConfig {
  prefix: string;
  maxRequests: number;
  window: string; // eg: '10 s', '1 h', '1 d'
}

/**
 * Get or create a rate limiter
 * @param config Rate limit configuration
 * @returns Ratelimit instance or null (if Redis is disabled)
 */
export function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) {
    return null;
  }

  const key = `${config.prefix}:${config.maxRequests}:${config.window}`;

  if (!limiters.has(key)) {
    const [amount, duration] = config.window.split(' ');
    let windowMs: number;

    switch (duration) {
      case 's':
        windowMs = parseInt(amount) * 1000;
        break;
      case 'm':
        windowMs = parseInt(amount) * 60 * 1000;
        break;
      case 'h':
        windowMs = parseInt(amount) * 60 * 60 * 1000;
        break;
      case 'd':
        windowMs = parseInt(amount) * 24 * 60 * 60 * 1000;
        break;
      default:
        throw new Error(`Invalid duration: ${duration}. Use s, m, h, or d.`);
    }

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, config.window as Duration),
      prefix: config.prefix,
    });

    limiters.set(key, limiter);
  }

  return limiters.get(key) || null;
}

/**
 * Check if the rate limit is exceeded
 * @param identifier Identifier (e.g. IP address)
 * @param config Rate limit configuration
 * @returns Whether the request is allowed
 */
export async function checkRateLimit(identifier: string, config: RateLimitConfig): Promise<boolean> {
  const limiter = getRateLimiter(config);
  if (!limiter) {
    return true;
  }

  const { success } = await limiter.limit(identifier);
  return success;
}

export { redis };
