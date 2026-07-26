import { bearerToken, syncError, syncJson } from "@/lib/sync/http";
import { pushSpace, SyncStoreError } from "@/lib/sync/server-store";
import { isDadKitImportData } from "@/lib/storage";
import {
  createWebDavProxyRateLimiter,
  proxyClientKey,
  readLimitedRequestText,
} from "@/lib/webdav/proxy";

export const runtime = "nodejs";

const MAX_PUSH_BYTES = 2 * 1024 * 1024;
const pushRateLimiter = createWebDavProxyRateLimiter(120, 60_000);

export async function POST(request: Request) {
  const rateLimit = pushRateLimiter.consume(proxyClientKey(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  const token = bearerToken(request);

  if (!token) {
    return syncError("缺少同步会话。", 401);
  }

  let payload: unknown;

  try {
    const raw = await readLimitedRequestText(request, MAX_PUSH_BYTES, 30_000);
    payload = (JSON.parse(raw) as { data?: unknown }).data;
  } catch {
    return syncError("请求格式不正确或内容过大。", 400);
  }

  if (
    !isDadKitImportData(payload) ||
    payload.version !== 5
  ) {
    return syncError("同步数据格式无效。", 400);
  }

  try {
    const snapshot = pushSpace(token, payload);

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
