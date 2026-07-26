import { bearerToken, syncError, syncJson } from "@/lib/sync/http";
import { pullSpace, SyncStoreError } from "@/lib/sync/server-store";
import {
  createWebDavProxyRateLimiter,
  proxyClientKey,
} from "@/lib/webdav/proxy";

export const runtime = "nodejs";

const pullRateLimiter = createWebDavProxyRateLimiter(120, 60_000);

export async function GET(request: Request) {
  const rateLimit = pullRateLimiter.consume(proxyClientKey(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  const token = bearerToken(request);

  if (!token) {
    return syncError("缺少同步会话。", 401);
  }

  try {
    const snapshot = pullSpace(token);

    if (!snapshot) {
      return syncError("同步会话已失效，请重新输入同步码。", 401);
    }

    return syncJson(snapshot);
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }

    throw error;
  }
}
