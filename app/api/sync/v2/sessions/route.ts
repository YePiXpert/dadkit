import { syncError, syncJson } from "@/lib/sync/http";
import { requireSyncCredential, syncStoreErrorResponse } from "@/lib/sync/route-utils";
import { listSessions } from "@/lib/sync/server-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const credential = requireSyncCredential(request);
  if (credential instanceof Response) return credential;
  try {
    const sessions = await listSessions(credential.token);
    return sessions ? syncJson({ sessions }) : syncError("同步会话已失效。", 401);
  } catch (error) {
    return syncStoreErrorResponse(error) ?? syncError("同步服务暂时不可用。", 500);
  }
}
