import { bearerToken, syncError, syncJson } from "@/lib/sync/http";
import { leaveSpace, SyncStoreError } from "@/lib/sync/server-store";
import {
  createWebDavProxyRateLimiter,
  proxyClientKey,
} from "@/lib/webdav/proxy";

export const runtime = "nodejs";

const leaveRateLimiter = createWebDavProxyRateLimiter(30, 60_000);

export async function POST(request: Request) {
  const rateLimit = leaveRateLimiter.consume(proxyClientKey(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  const token = bearerToken(request);

  if (!token) {
    return syncJson({ ok: true });
  }

  try {
    leaveSpace(token);
    return syncJson({ ok: true });
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }

    throw error;
  }
}
