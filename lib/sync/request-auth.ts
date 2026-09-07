import { parseCookieHeader } from "@/lib/sync/session-cookie";

export type SyncRequestCredential = {
  token: string;
};

const BEARER_PATTERN = /^Bearer[ \t]+(\S+)$/i;

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  return BEARER_PATTERN.exec(header)?.[1];
}

export function requestCredential(request: Request): SyncRequestCredential | undefined {
  // 跨域（静态托管/App 壳）没有同源 Cookie，客户端以 Bearer 携带会话 token。
  const bearer = bearerToken(request);
  if (bearer) return { token: bearer };
  const cookie = parseCookieHeader(request.headers.get("cookie"));
  return cookie ? { token: cookie } : undefined;
}

export function hasBearerCredential(request: Request): boolean {
  return bearerToken(request) !== undefined;
}
