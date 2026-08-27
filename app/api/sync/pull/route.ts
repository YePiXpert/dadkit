import { syncError, syncJson } from "@/lib/sync/http";
import { pullSpace, SyncStoreError } from "@/lib/sync/server-store";
import {
  clientKeyFromHeaders as proxyClientKey,
  createRateLimiter,
  rateLimitHeaders,
} from "@/lib/http/rate-limit";
import { createSyncEtag } from "@/lib/sync/data-version";
import { requestCredential } from "@/lib/sync/request-auth";

export const runtime = "nodejs";

const pullRateLimiter = createRateLimiter(120, 60_000);

export async function GET(request: Request) {
  const credential = requestCredential(request);
  const sessionRateKey = credential?.token.split(".")[0];
  const rateLimit = pullRateLimiter.consume(sessionRateKey ? `space:${sessionRateKey}` : proxyClientKey(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, rateLimitHeaders(rateLimit));
  }

  if (!credential) {
    return syncError("缺少同步会话。", 401);
  }

  try {
    const snapshot = await pullSpace(credential.token);

    if (!snapshot) {
      return syncError("同步会话已失效，请重新加入家庭。", 401);
    }

    const etag = createSyncEtag(snapshot.version);

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "cache-control": "private, no-cache",
          etag,
          "x-dadkit-server-time": snapshot.serverTime,
        },
      });
    }

    return syncJson(snapshot, 200, {
      "cache-control": "private, no-cache",
      etag,
      "x-dadkit-server-time": snapshot.serverTime,
    });
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }

    throw error;
  }
}
