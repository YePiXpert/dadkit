import { bearerToken, syncError, syncJson } from "@/lib/sync/http";
import { pullSpace, SyncStoreError } from "@/lib/sync/server-store";
import {
  clientKeyFromHeaders as proxyClientKey,
  createRateLimiter as createWebDavProxyRateLimiter,
} from "@/lib/http/rate-limit";
import {
  getRequestedDataVersion,
  syncDataVersionResponseHeaders,
} from "@/lib/sync/data-version";

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
    const dataVersion = getRequestedDataVersion(request.headers);
    const snapshot = await pullSpace(token, dataVersion);

    if (!snapshot) {
      return syncError("同步会话已失效，请重新输入同步码。", 401);
    }

    const versionedHeaders = syncDataVersionResponseHeaders(
      snapshot.version,
      dataVersion,
    );
    const etag = versionedHeaders.etag;

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "cache-control": "private, no-cache",
          ...versionedHeaders,
          "x-dadkit-server-time": snapshot.serverTime,
        },
      });
    }

    return syncJson(snapshot, 200, {
      "cache-control": "private, no-cache",
      ...versionedHeaders,
      "x-dadkit-server-time": snapshot.serverTime,
    });
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }

    throw error;
  }
}
