import { syncError, syncJson } from "@/lib/sync/http";
import {
  rejectInvalidMutationOrigin,
  requireSyncCredential,
  syncStoreErrorResponse,
} from "@/lib/sync/route-utils";
import { revokeInvite } from "@/lib/sync/server-store";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const { inviteId } = await context.params;
    if (!/^[0-9a-f]{32}$/.test(inviteId)) return syncError("邀请标识不正确。", 400);
    const revoked = await revokeInvite(credential.token, inviteId);
    return revoked ? syncJson({ ok: true }) : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("同步服务暂时不可用。", 500);
  }
}
