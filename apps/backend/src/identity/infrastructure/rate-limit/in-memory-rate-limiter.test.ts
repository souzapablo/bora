import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryRateLimiter } from "./in-memory-rate-limiter";

describe("InMemoryRateLimiter", () => {
  const opts = { max: 3, windowMs: 1000 };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not blocked under the threshold", () => {
    const limiter = new InMemoryRateLimiter();

    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);

    expect(limiter.isBlocked("key", opts)).toBe(false);
  });

  it("is blocked at/over the threshold within the window", () => {
    const limiter = new InMemoryRateLimiter();

    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);

    expect(limiter.isBlocked("key", opts)).toBe(true);
  });

  it("clears prior attempts for a key on reset", () => {
    const limiter = new InMemoryRateLimiter();

    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);
    expect(limiter.isBlocked("key", opts)).toBe(true);

    limiter.reset("key");

    expect(limiter.isBlocked("key", opts)).toBe(false);
  });

  it("prunes entries older than windowMs and does not count them toward the block", () => {
    const limiter = new InMemoryRateLimiter();

    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);
    limiter.recordAttempt("key", opts);
    expect(limiter.isBlocked("key", opts)).toBe(true);

    vi.advanceTimersByTime(opts.windowMs + 1);

    expect(limiter.isBlocked("key", opts)).toBe(false);
  });
});
