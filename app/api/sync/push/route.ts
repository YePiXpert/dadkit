import { syncError, syncJson } from "@/lib/sync/http";
import { pushSpace, SyncStoreError } from "@/lib/sync/server-store";
import { isDadKitImportData } from "@/lib/data/format";
import { readLimitedRequestText } from "@/lib/http/request-body";
import {
  clientKeyFromHeaders as proxyClientKey,
  createConcurrencyLimiter,
  createRateLimiter as createWebDavProxyRateLimiter,
  rateLimitHeaders,
} from "@/lib/http/rate-limit";
import { HttpBoundaryError } from "@/lib/http/boundary-error";
import {
  getRequestedDataVersion,
  syncDataVersionResponseHeaders,
} from "@/lib/sync/data-version";
import { requestCredential } from "@/lib/sync/request-auth";
import { rejectInvalidMutationOrigin, syncStoreErrorResponse } from "@/lib/sync/route-utils";

export const runtime = "nodejs";

const MAX_PUSH_BYTES = 32 * 1024 * 1024;
const pushRateLimiter = createWebDavProxyRateLimiter(30, 60_000);
const pushConcurrency = createConcurrencyLimiter(8, 2);

export async function POST(request: Request) {
  const credential = requestCredential(request);
  const sessionRateKey = credential?.token.split(".")[0];
  const rateLimit = pushRateLimiter.consume(sessionRateKey ? `space:${sessionRateKey}` : proxyClientKey(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, rateLimitHeaders(rateLimit));
  }

  if (!credential) {
    return syncError("缺少同步会话。", 401);
  }
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;

  let release: () => void;
  try {
    release = pushConcurrency.acquire(sessionRateKey ?? proxyClientKey(request.headers));
  } catch (error) {
    if (error instanceof HttpBoundaryError) {
      return syncError(error.message, error.status);
    }
    throw error;
  }

  try {
    let payload: unknown;
    try {
      const raw = await readLimitedRequestText(request, MAX_PUSH_BYTES, 30_000);
      payload = (JSON.parse(raw) as { data?: unknown }).data;
    } catch {
      return syncError("请求格式不正确或内容过大。", 400);
    }
    if (
      !isDadKitImportData(payload) ||
      (payload.version !== 5 && payload.version !== 6 && payload.version !== 7 && payload.version !== 8 && payload.version !== 9 && payload.version !== 10 && payload.version !== 11)
    ) {
      return syncError("同步数据格式无效。", 400);
    }
    const dataVersion = getRequestedDataVersion(request.headers);
    const snapshot = await pushSpace(credential.token, payload, dataVersion);

    if (!snapshot) {
      return syncError("同步会话已失效，请重新加入家庭。", 401);
    }

    return syncJson(snapshot, 200, {
      ...syncDataVersionResponseHeaders(snapshot.version, dataVersion),
      "x-dadkit-server-time": snapshot.serverTime,
    });
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncStoreErrorResponse(error)!;
    }

    throw error;
  } finally {
    release();
  }
}
