import { readLimitedRequestText } from "@/lib/http/request-body";
import { SYNC_ERROR_CODES } from "@/lib/sync/error-codes";
import { syncError } from "@/lib/sync/http";
import { checkMutationOrigin } from "@/lib/sync/origin-policy";
import { requestCredential } from "@/lib/sync/request-auth";
import { SyncStoreError } from "@/lib/sync/server-store";

export async function readSyncJson(request: Request, maxBytes = 8 * 1024) {
  const raw = await readLimitedRequestText(request, maxBytes, 10_000);
  return JSON.parse(raw) as Record<string, unknown>;
}

export function syncStoreErrorResponse(error: unknown) {
  if (error instanceof SyncStoreError) {
    return syncError(error.message, error.status, undefined, error.code, error.details);
  }
  return undefined;
}

export function requireSyncCredential(request: Request) {
  const credential = requestCredential(request);
  return credential ?? syncError(
    "同步会话已失效，请重新加入家庭。",
    401,
    undefined,
    SYNC_ERROR_CODES.sessionRevoked,
  );
}

export function rejectInvalidMutationOrigin(
  request: Request,
  options: { requireHeader?: boolean } = {},
) {
  if (checkMutationOrigin(request, options)) return undefined;
  return syncError(
    "请求来源不受信任。",
    403,
    undefined,
    SYNC_ERROR_CODES.originRejected,
  );
}

export function metadataEtag(revision: number) {
  return `"dadkit-space-meta-${revision}"`;
}
