import { syncError, syncJson } from "@/lib/sync/http";
import {
  joinSpace,
  SyncStoreError,
} from "@/lib/sync/server-store";
import { readLimitedRequestText } from "@/lib/http/request-body";
import {
  clientKeyFromHeaders,
  createRateLimiter,
} from "@/lib/http/rate-limit";
import {
  getRequestedDataVersion,
  syncDataVersionResponseHeaders,
} from "@/lib/sync/data-version";

export const runtime = "nodejs";

const MAX_JOIN_BYTES = 8 * 1024;
const joinRateLimiter = createRateLimiter(10, 60_000);

export async function POST(request: Request) {
  const rateLimit = joinRateLimiter.consume(
    clientKeyFromHeaders(request.headers),
  );

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  let payload: {
    name?: unknown;
    code?: unknown;
    existingOnly?: unknown;
  };

  try {
    const raw = await readLimitedRequestText(request, MAX_JOIN_BYTES, 10_000);
    payload = JSON.parse(raw) as {
      name?: unknown;
      code?: unknown;
      existingOnly?: unknown;
    };
  } catch {
    return syncError("请求格式不正确。", 400);
  }

  const { name, code } = payload;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 32
  ) {
    return syncError("空间名需要 2 到 32 个字符。", 400);
  }

  if (
    typeof code !== "string" ||
    code.trim().length < 6 ||
    code.trim().length > 64
  ) {
    return syncError("同步码需要 6 到 64 个字符。", 400);
  }

  try {
    const dataVersion = getRequestedDataVersion(request.headers);
    const result = await joinSpace(
      name,
      code,
      payload.existingOnly === true,
      dataVersion,
    );

    if (!result) {
      return syncError("加入口令不正确、已失效，或家庭不存在。", 401);
    }

    return syncJson(
      result,
      200,
      syncDataVersionResponseHeaders(result.version, dataVersion),
    );
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }

    throw error;
  }
}
