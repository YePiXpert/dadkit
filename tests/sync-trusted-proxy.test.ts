import { describe, expect, it } from "vitest";

import {
  clientKeyFromHeaders,
  createRateLimiter,
  trustedClientAddress,
} from "@/lib/http/rate-limit";

describe("trusted proxy and bounded rate limiting", () => {
  it("ignores forwarding headers by default and parses one trusted hop", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.8" });
    expect(trustedClientAddress(headers, 0)).toBe("unknown");
    expect(trustedClientAddress(headers, 1)).toBe("203.0.113.8");
    expect(clientKeyFromHeaders(headers, 1)).toMatch(/^ip:[0-9a-f]{24}$/);
  });

  it("accepts IPv6 forms and rejects arbitrary header text", () => {
    expect(trustedClientAddress(new Headers({ "x-forwarded-for": "[2001:db8::1]:443" }), 1)).toBe("2001:db8::1");
    expect(trustedClientAddress(new Headers({ "x-forwarded-for": "attacker supplied text" }), 1)).toBe("unknown");
  });

  it("caps buckets and exposes deterministic reset metadata", () => {
    let now = 1000;
    const limiter = createRateLimiter(1, 1000, { maxBuckets: 3, now: () => now });
    limiter.consume("a");
    limiter.consume("b");
    limiter.consume("c");
    limiter.consume("d");
    expect(limiter.size()).toBeLessThanOrEqual(3);
    const blocked = limiter.consume("d");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    now = 3000;
    expect(limiter.consume("d").allowed).toBe(true);
  });
});
