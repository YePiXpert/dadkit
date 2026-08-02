import { getSyncSpaceConfig } from "@/lib/sync/space-config";

export const SYNC_SESSION_COOKIE = "dadkit_sync_session";
export const SYNC_SESSION_COOKIE_PATH = "/api/sync";

export function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return undefined;
  for (const entry of cookieHeader.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    const name = entry.slice(0, separator).trim();
    if (name !== SYNC_SESSION_COOKIE) continue;
    const value = entry.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value) || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function shouldUseSecureCookie(request: Request) {
  const configured = process.env.DADKIT_PUBLIC_ORIGIN?.trim();
  if (configured) {
    try {
      return new URL(configured).protocol === "https:";
    } catch {
      return false;
    }
  }
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(token: string, request: Request) {
  const maxAge = Math.floor(getSyncSpaceConfig().sessionTtlMs / 1000);
  const parts = [
    `${SYNC_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Path=${SYNC_SESSION_COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (shouldUseSecureCookie(request)) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(request: Request) {
  const parts = [
    `${SYNC_SESSION_COOKIE}=`,
    `Path=${SYNC_SESSION_COOKIE_PATH}`,
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (shouldUseSecureCookie(request)) parts.push("Secure");
  return parts.join("; ");
}
