import { SYNC_ERROR_CODES } from "@/lib/sync/error-codes";
import { syncError, syncJson } from "@/lib/sync/http";
import { isProtocol2TransportAllowed } from "@/lib/sync/origin-policy";
import { DADKIT_SYNC_PROTOCOL_VERSION } from "@/lib/sync/protocol-version";
import {
  readSyncJson,
  rejectInvalidMutationOrigin,
  syncStoreErrorResponse,
} from "@/lib/sync/route-utils";
import { assertCanLeaveSpace, joinWithInvite, leaveSpace } from "@/lib/sync/server-store";
import { sessionCookie } from "@/lib/sync/session-cookie";
import { clientKeyFromHeaders, createRateLimiter, rateLimitHeaders } from "@/lib/http/rate-limit";
import { requestCredential } from "@/lib/sync/request-auth";

export const runtime = "nodejs";
const joinLimiter = createRateLimiter(20, 15 * 60_000);

export async function POST(request: Request) {
  const rateLimit = joinLimiter.consume(clientKeyFromHeaders(request.headers));
  if (!rateLimit.allowed) return syncError("操作过于频繁，请稍后再试。", 429, rateLimitHeaders(rateLimit), SYNC_ERROR_CODES.rateLimited);
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  if (!isProtocol2TransportAllowed(request)) {
    return syncError("公开家庭同步必须通过 HTTPS 使用。", 400, undefined, SYNC_ERROR_CODES.secureTransportRequired);
  }
  try {
    const payload = await readSyncJson(request);
    const previous = requestCredential(request);
    if (previous) await assertCanLeaveSpace(previous.token);
    const result = await joinWithInvite(
      typeof payload.inviteCredential === "string"
        ? payload.inviteCredential
        : "",
      typeof payload.deviceName === "string" ? payload.deviceName : "",
    );
    if (!result) {
      return syncError("邀请无效或已失效。", 401, undefined, SYNC_ERROR_CODES.invalidInvite);
    }
    if (previous) await leaveSpace(previous.token);
    return syncJson(
      { protocolVersion: DADKIT_SYNC_PROTOCOL_VERSION, space: result.space },
      200,
      { "set-cookie": sessionCookie(result.token, request) },
    );
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("邀请无效或已失效。", 401, undefined, SYNC_ERROR_CODES.invalidInvite);
  }
}
