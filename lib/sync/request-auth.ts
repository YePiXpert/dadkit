import { parseCookieHeader } from "@/lib/sync/session-cookie";

export type SyncRequestCredential = {
  token: string;
};

export function requestCredential(request: Request): SyncRequestCredential | undefined {
  const cookie = parseCookieHeader(request.headers.get("cookie"));
  return cookie ? { token: cookie } : undefined;
}
