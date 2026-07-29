import { readLimitedRequestText } from "@/lib/http/request-body";
import {
  clientKeyFromHeaders,
  createRateLimiter,
} from "@/lib/http/rate-limit";
import { syncError, syncJson } from "@/lib/sync/http";
import {
  createSpace,
  SyncStoreError,
} from "@/lib/sync/server-store";

export const runtime = "nodejs";

const MAX_CREATE_BYTES = 4 * 1024;
const createLimiter = createRateLimiter(5, 60_000);

export async function POST(request: Request) {
  const rateLimit = createLimiter.consume(clientKeyFromHeaders(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  let payload: { name?: unknown };

  try {
    const raw = await readLimitedRequestText(request, MAX_CREATE_BYTES, 10_000);
    payload = JSON.parse(raw) as { name?: unknown };
  } catch {
    return syncError("请求格式不正确。", 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (name.length < 2 || name.length > 32) {
    return syncError("家庭名称需要 2 到 32 个字符。", 400);
  }

  try {
    const result = await createSpace(name);

    return result
      ? syncJson(result, 201)
      : syncError("这个家庭名称已经存在，请改用“加入家庭”。", 409);
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }
    throw error;
  }
}
