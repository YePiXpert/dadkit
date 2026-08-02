import { bearerToken, syncError, syncJson } from "@/lib/sync/http";
import {
  readSyncJson,
  rejectInvalidMutationOrigin,
  syncStoreErrorResponse,
} from "@/lib/sync/route-utils";
import { upgradeSession } from "@/lib/sync/server-store";
import { sessionCookie } from "@/lib/sync/session-cookie";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originError = rejectInvalidMutationOrigin(request);
  if (originError) return originError;
  const token = bearerToken(request);
  if (!token) return syncError("缺少可升级的同步会话。", 401);
  try {
    const payload = await readSyncJson(request);
    const space = await upgradeSession(
      token,
      typeof payload.displayName === "string" ? payload.displayName : "",
      typeof payload.deviceName === "string" ? payload.deviceName : "",
    );
    if (!space) return syncError("同步会话已失效。", 401);
    return syncJson(
      { protocolVersion: 2, space },
      200,
      { "set-cookie": sessionCookie(token, request) },
    );
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("请求格式不正确。", 400);
  }
}
