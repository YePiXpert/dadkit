import { syncError, syncJson } from "@/lib/sync/http";
import {
  readSyncJson,
  rejectInvalidMutationOrigin,
  requireSyncCredential,
  syncStoreErrorResponse,
} from "@/lib/sync/route-utils";
import {
  createV2Invite,
  listInvites,
} from "@/lib/sync/server-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const invites = await listInvites(credential.token);
    return invites ? syncJson({ invites }) : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("同步服务暂时不可用。", 500);
  }
}

export async function POST(request: Request) {
  const originError = rejectInvalidMutationOrigin(request, { requireHeader: true });
  if (originError) return originError;
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const payload = await readSyncJson(request);
    const invite = await createV2Invite(
      credential.token,
      typeof payload.ttlMinutes === "number" ? payload.ttlMinutes : undefined,
    );
    return invite ? syncJson({ invite }, 201) : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("请求格式不正确。", 400);
  }
}
