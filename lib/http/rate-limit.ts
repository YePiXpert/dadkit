import { HttpBoundaryError } from "@/lib/http/boundary-error";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export function clientKeyFromHeaders(headers: Headers) {
  const forwardedFor = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);

  return forwardedFor ? `xff:${forwardedFor.slice(0, 128)}` : "unknown";
}

export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, RateLimitBucket>();
  let lastSweep = 0;

  return {
    consume(key: string, now = Date.now()) {
      if (now - lastSweep >= windowMs) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= now) {
            buckets.delete(bucketKey);
          }
        }

        lastSweep = now;
      }

      const existing = buckets.get(key);

      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (existing.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((existing.resetAt - now) / 1000),
          ),
        };
      }

      existing.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export function createConcurrencyLimiter(
  globalLimit: number,
  perClientLimit: number,
) {
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
        if (released) {
          return;
        }

        released = true;
        active -= 1;
        const remaining = (activeByClient.get(key) ?? 1) - 1;

        if (remaining <= 0) {
          activeByClient.delete(key);
        } else {
          activeByClient.set(key, remaining);
        }
      };
    },
  };
}
