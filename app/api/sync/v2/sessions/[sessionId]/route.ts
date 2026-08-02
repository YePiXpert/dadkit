import { syncError, syncJson } from "@/lib/sync/http";
import {
  readSyncJson,
  rejectInvalidMutationOrigin,
  requireSyncCredential,
  syncStoreErrorResponse,
} from "@/lib/sync/route-utils";
import { revokeSession, updateSession } from "@/lib/sync/server-store";
import type { SyncSpaceRole } from "@/lib/sync/space-schema";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const { sessionId } = await context.params;
    if (!/^[0-9a-f]{64}$/.test(sessionId)) return syncError("设备标识不正确。", 400);
    const payload = await readSyncJson(request);
    const role = payload.role;
    if (role !== undefined && role !== "owner" && role !== "member") {
      return syncError("设备角色不正确。", 400);
    }
    const session = await updateSession(credential.token, sessionId, {
      ...(typeof payload.deviceName === "string" ? { deviceName: payload.deviceName } : {}),
      ...(role ? { role: role as SyncSpaceRole } : {}),
    });
    return session ? syncJson({ session }) : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("请求格式不正确。", 400);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const { sessionId } = await context.params;
    if (!/^[0-9a-f]{64}$/.test(sessionId)) return syncError("设备标识不正确。", 400);
    const revoked = await revokeSession(credential.token, sessionId);
    return revoked ? syncJson({ ok: true }) : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("同步服务暂时不可用。", 500);
  }
}
