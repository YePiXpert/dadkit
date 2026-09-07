import { APP_LOCAL_ORIGINS } from "@/lib/sync/app-origins";
import { hasBearerCredential } from "@/lib/sync/request-auth";
import { getSyncSpaceConfig } from "@/lib/sync/space-config";

function normalizeHttpOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function configuredOrigin(request: Request) {
  const configured = process.env.DADKIT_PUBLIC_ORIGIN?.trim();
  return normalizeHttpOrigin(configured) ?? new URL(request.url).origin;
}

function configuredTrustedOrigins() {
  const origins = new Set<string>();
  const trusted = process.env.DADKIT_TRUSTED_ORIGINS?.trim();

  if (trusted) {
    for (const candidate of trusted.split(",")) {
      const origin = normalizeHttpOrigin(candidate.trim());
      if (origin) origins.add(origin);
    }
  }

  return origins;
}

function configuredMutationOrigins(request: Request) {
  return new Set([configuredOrigin(request), ...configuredTrustedOrigins()]);
}

// 跨站客户端（App 壳本地 origin、静态托管域名）：未认证的 join/spaces
// 请求也来自它们，按显式白名单放行，sec-fetch-site 为 cross-site 属预期。
// requireHttps 下静态托管域名同样必须 https，仅本地开发回环放行 http。
function isCrossSiteClientOrigin(origin: string) {
  if (APP_LOCAL_ORIGINS.includes(origin)) return true;
  if (!configuredTrustedOrigins().has(origin)) return false;
  return (
    origin.startsWith("https://") || isLocalDevelopmentOrigin(origin)
  );
}

export function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1")
    );
  } catch {
    return false;
  }
}

export function checkMutationOrigin(
  request: Request,
  options: { requireHeader?: boolean } = {},
) {
  // Bearer 认证：token 本身即凭证，浏览器侧还需先通过 CORS 预检，
  // 没有同源 Cookie 的 CSRF 面。
  if (hasBearerCredential(request)) return true;

  const origin = request.headers.get("origin");

  if (origin && isCrossSiteClientOrigin(origin)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return options.requireHeader !== true;
  if (!configuredMutationOrigins(request).has(origin)) return false;
  return (
    !getSyncSpaceConfig().requireHttps ||
    origin.startsWith("https://") ||
    isLocalDevelopmentOrigin(origin)
  );
}

export function secureTransportAvailable(request: Request) {
  const origin = configuredOrigin(request);
  return origin.startsWith("https://") || isLocalDevelopmentOrigin(origin);
}

export function isProtocol2TransportAllowed(request: Request) {
  return !getSyncSpaceConfig().requireHttps || secureTransportAvailable(request);
}
