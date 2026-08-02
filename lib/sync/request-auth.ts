import { bearerToken } from "@/lib/sync/http";
import { parseCookieHeader } from "@/lib/sync/session-cookie";

export type SyncRequestCredential = {
  token: string;
  source: "cookie" | "bearer";
};

export function requestCredential(request: Request): SyncRequestCredential | undefined {
  return requestCredentials(request)[0];
}

export function requestCredentials(request: Request): SyncRequestCredential[] {
  const credentials: SyncRequestCredential[] = [];
  const cookie = parseCookieHeader(request.headers.get("cookie"));
  if (cookie) credentials.push({ token: cookie, source: "cookie" });
  const bearer = bearerToken(request);
  if (bearer && bearer !== cookie) credentials.push({ token: bearer, source: "bearer" });
  return credentials;
}
