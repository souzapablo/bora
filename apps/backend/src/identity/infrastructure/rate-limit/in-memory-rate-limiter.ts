import type { RateLimiterPort } from "../../domain/ports/rate-limiter.port";

/**
 * Hand-rolled in-memory rate limiter (see design.md Tech Decisions — rejected
 * @nestjs/throttler because it can't count only failed attempts / reset on success).
 * Single process, resets on deploy/restart — accepted for v1 per design.md's Risks table.
 */
export class InMemoryRateLimiter implements RateLimiterPort {
  private readonly attempts = new Map<string, number[]>();

  isBlocked(key: string, opts: { max: number; windowMs: number }): boolean {
    const recent = this.prune(key, opts.windowMs);
    return recent.length >= opts.max;
  }

  recordAttempt(key: string, opts: { max: number; windowMs: number }): void {
    const recent = this.prune(key, opts.windowMs);
    recent.push(Date.now());
    this.attempts.set(key, recent);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  /** Removes timestamps older than `windowMs`, persists the pruned list, and returns it. */
  private prune(key: string, windowMs: number): number[] {
    const cutoff = Date.now() - windowMs;
    const existing = this.attempts.get(key) ?? [];
    const recent = existing.filter((timestamp) => timestamp > cutoff);
    this.attempts.set(key, recent);
    return recent;
  }
}
