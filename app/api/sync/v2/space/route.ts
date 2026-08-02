import { syncError, syncJson } from "@/lib/sync/http";
import {
  metadataEtag,
  readSyncJson,
  rejectInvalidMutationOrigin,
  requireSyncCredential,
  syncStoreErrorResponse,
} from "@/lib/sync/route-utils";
import {
  deleteSpace,
  getSpaceMetadata,
  renameSpace,
} from "@/lib/sync/server-store";
import { clearSessionCookie } from "@/lib/sync/session-cookie";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const space = await getSpaceMetadata(credential.token);
    if (!space) return syncError("同步会话已失效。", 401);
    const etag = metadataEtag(space.metadataRevision);
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { "cache-control": "no-store", etag, "x-content-type-options": "nosniff" } });
    }
    return syncJson({ space }, 200, { etag });
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("同步服务暂时不可用。", 500);
  }
}

export async function PATCH(request: Request) {
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const payload = await readSyncJson(request);
    const space = await renameSpace(
      credential.token,
      typeof payload.displayName === "string" ? payload.displayName : "",
    );
    return space
      ? syncJson({ space }, 200, { etag: metadataEtag(space.metadataRevision) })
      : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("请求格式不正确。", 400);
  }
}

export async function DELETE(request: Request) {
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const payload = await readSyncJson(request);
    const deleted = await deleteSpace(
      credential.token,
      typeof payload.confirmation === "string" ? payload.confirmation : "",
    );
    return deleted
      ? syncJson({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) })
      : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("请求格式不正确。", 400);
  }
}
