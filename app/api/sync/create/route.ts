import { readLimitedRequestText } from "@/lib/http/request-body";
import {
  clientKeyFromHeaders,
  createRateLimiter,
  rateLimitHeaders,
} from "@/lib/http/rate-limit";
import { syncError, syncJson } from "@/lib/sync/http";
import {
  createSpace,
  SyncStoreError,
} from "@/lib/sync/server-store";
import {
  getRequestedDataVersion,
  syncDataVersionResponseHeaders,
} from "@/lib/sync/data-version";
import { getSyncSpaceConfig } from "@/lib/sync/space-config";
import { rejectInvalidMutationOrigin } from "@/lib/sync/route-utils";
import { SYNC_ERROR_CODES } from "@/lib/sync/error-codes";

export const runtime = "nodejs";

const MAX_CREATE_BYTES = 4 * 1024;
const createLimiter = createRateLimiter(3, 60 * 60_000);

export async function POST(request: Request) {
  const originError = rejectInvalidMutationOrigin(request);
  if (originError) return originError;
  try {
    if (!getSyncSpaceConfig().legacyCreateEnabled) {
      return syncError(
        "当前服务器已关闭旧版家庭创建入口。",
        403,
        undefined,
        SYNC_ERROR_CODES.registrationClosed,
      );
    }
  } catch {
    return syncError("同步服务配置无效。", 500);
  }
  const rateLimit = createLimiter.consume(clientKeyFromHeaders(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, rateLimitHeaders(rateLimit));
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
    const dataVersion = getRequestedDataVersion(request.headers);
    const result = await createSpace(name, dataVersion);

    return result
      ? syncJson(
          result,
          201,
          syncDataVersionResponseHeaders(result.version, dataVersion),
        )
      : syncError("这个家庭名称已经存在，请改用“加入家庭”。", 409);
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncError("同步服务暂时不可用，请稍后再试。", 500);
    }
    throw error;
  }
}
