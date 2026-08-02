import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { HttpBoundaryError } from "@/lib/http/boundary-error";
import { getSyncSpaceConfig } from "@/lib/sync/space-config";

type RateLimitBucket = { count: number; resetAt: number; touchedAt: number };

function normalizeAddress(value: string) {
  let candidate = value.trim();
  const bracketed = candidate.match(/^\[([^\]]+)](?::\d{1,5})?$/);
  if (bracketed) candidate = bracketed[1]!;
  else {
    const ipv4WithPort = candidate.match(/^([^:]+):(\d{1,5})$/);
    if (ipv4WithPort && isIP(ipv4WithPort[1]!) === 4) candidate = ipv4WithPort[1]!;
  }
  return isIP(candidate) ? candidate.toLowerCase() : undefined;
}

export function trustedClientAddress(headers: Headers, trustProxyHops?: number) {
  const hops = trustProxyHops ?? getSyncSpaceConfig().trustProxyHops;
  if (hops <= 0) return "unknown";
  const chain = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => normalizeAddress(entry))
    .filter((entry): entry is string => Boolean(entry));
  if (!chain?.length || chain.length < hops) return "unknown";
  return chain.at(-hops) ?? "unknown";
}

export function clientKeyFromHeaders(headers: Headers, trustProxyHops?: number) {
  const address = trustedClientAddress(headers, trustProxyHops);
  if (address === "unknown") return address;
  return `ip:${createHash("sha256").update(address).digest("hex").slice(0, 24)}`;
}

export function createRateLimiter(
  limit: number,
  windowMs: number,
  options: { maxBuckets?: number; now?: () => number } = {},
) {
  const buckets = new Map<string, RateLimitBucket>();
  const maxBuckets = options.maxBuckets ?? 10_000;
  const nowProvider = options.now ?? Date.now;
  let lastSweep = 0;

  function sweep(now: number) {
    if (now - lastSweep < Math.min(windowMs, 60_000) && buckets.size < maxBuckets) return;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    while (buckets.size >= maxBuckets) {
      const oldest = [...buckets.entries()].sort(
        (left, right) => left[1].touchedAt - right[1].touchedAt,
      )[0];
      if (!oldest) break;
      buckets.delete(oldest[0]);
    }
    lastSweep = now;
  }

  return {
    consume(key: string, suppliedNow?: number) {
      const now = suppliedNow ?? nowProvider();
      sweep(now);
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        buckets.set(key, { count: 1, resetAt, touchedAt: now });
        return { allowed: true, limit, remaining: Math.max(0, limit - 1), resetAt, retryAfterSeconds: 0 };
      }
      existing.touchedAt = now;
      if (existing.count >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt: existing.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
      }
      existing.count += 1;
      return {
        allowed: true,
        limit,
        remaining: limit - existing.count,
        resetAt: existing.resetAt,
        retryAfterSeconds: 0,
      };
    },
    size() {
      return buckets.size;
    },
  };
}

export function rateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}) {
  return {
    "retry-after": String(result.retryAfterSeconds),
    "ratelimit-limit": String(result.limit),
    "ratelimit-remaining": String(result.remaining),
    "ratelimit-reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function createConcurrencyLimiter(globalLimit: number, perClientLimit: number) {
  let active = 0;
  const activeByClient = new Map<string, number>();
  return {
    acquire(key: string) {
      const clientActive = activeByClient.get(key) ?? 0;
      if (clientActive >= perClientLimit) {
        throw new HttpBoundaryError("当前客户端请求过多，请稍后再试。", 429);
      }
      if (active >= globalLimit) {
        throw new HttpBoundaryError("服务当前繁忙，请稍后再试。", 503);
      }
      active += 1;
      activeByClient.set(key, clientActive + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        active -= 1;
        const remaining = (activeByClient.get(key) ?? 1) - 1;
        if (remaining <= 0) activeByClient.delete(key);
        else activeByClient.set(key, remaining);
      };
    },
  };
}
