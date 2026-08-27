import { syncError, syncJson } from "@/lib/sync/http";
import { leaveSpace, SyncStoreError } from "@/lib/sync/server-store";
import {
  clientKeyFromHeaders as proxyClientKey,
  createRateLimiter,
} from "@/lib/http/rate-limit";
import { requestCredential } from "@/lib/sync/request-auth";
import { rejectInvalidMutationOrigin, syncStoreErrorResponse } from "@/lib/sync/route-utils";
import { clearSessionCookie } from "@/lib/sync/session-cookie";

export const runtime = "nodejs";

const leaveRateLimiter = createRateLimiter(30, 60_000);

export async function POST(request: Request) {
  const rateLimit = leaveRateLimiter.consume(proxyClientKey(request.headers));

  if (!rateLimit.allowed) {
    return syncError("操作过于频繁，请稍后再试。", 429, {
      "retry-after": String(rateLimit.retryAfterSeconds),
    });
  }

  const credential = requestCredential(request);
  if (!credential) {
    return syncJson({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
  }
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;

  try {
    await leaveSpace(credential.token);
    return syncJson({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
  } catch (error) {
    if (error instanceof SyncStoreError) {
      return syncStoreErrorResponse(error)!;
    }

    throw error;
  }
}
