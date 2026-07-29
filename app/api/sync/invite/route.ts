import { readLimitedRequestText } from "@/lib/http/request-body";
import {
  clientKeyFromHeaders,
  createRateLimiter,
} from "@/lib/http/rate-limit";
import { bearerToken, syncError, syncJson } from "@/lib/sync/http";
import {
  createInvite,
  SyncStoreError,
} from "@/lib/sync/server-store";

export const runtime = "nodejs";

const MAX_INVITE_BYTES = 4 * 1024;
const inviteLimiter = createRateLimiter(10, 60_000);

export async function POST(request: Request) {
  const rateLimit = inviteLimiter.consume(clientKeyFromHeaders(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  const token = bearerToken(request);
  if (!token) {
    return syncError("同步会话已失效，请重新加入家庭。", 401);
  }

  let payload: { name?: unknown };

  try {
    const raw = await readLimitedRequestText(request, MAX_INVITE_BYTES, 10_000);
    payload = JSON.parse(raw) as { name?: unknown };
  } catch {
    return syncError("请求格式不正确。", 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length < 2 || name.length > 32) {
    return syncError("家庭名称需要 2 到 32 个字符。", 400);
  }

  try {
    const result = await createInvite(token, name);

    if (result === null) {
      return syncError("家庭名称与当前同步空间不一致。", 400);
    }
    if (!result) {
      return syncError("同步会话已失效，请重新加入家庭。", 401);
    }

    return syncJson(result);
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }
    throw error;
  }
}
