export interface RateLimiterPort {
  isBlocked(key: string, opts: { max: number; windowMs: number }): boolean;
  recordAttempt(key: string, opts: { max: number; windowMs: number }): void;
  reset(key: string): void;
}
