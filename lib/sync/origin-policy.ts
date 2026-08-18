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

function configuredMutationOrigins(request: Request) {
  const origins = new Set([configuredOrigin(request)]);
  const trusted = process.env.DADKIT_TRUSTED_ORIGINS?.trim();

  if (trusted) {
    for (const candidate of trusted.split(",")) {
      const origin = normalizeHttpOrigin(candidate.trim());
      if (origin) origins.add(origin);
    }
  }

  return origins;
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
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
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
