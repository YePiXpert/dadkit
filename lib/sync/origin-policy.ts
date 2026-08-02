import { getSyncSpaceConfig } from "@/lib/sync/space-config";

function configuredOrigin(request: Request) {
  const configured = process.env.DADKIT_PUBLIC_ORIGIN?.trim();
  try {
    return new URL(configured || request.url).origin;
  } catch {
    return new URL(request.url).origin;
  }
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
  return origin === configuredOrigin(request);
}

export function secureTransportAvailable(request: Request) {
  const origin = configuredOrigin(request);
  return origin.startsWith("https://") || isLocalDevelopmentOrigin(origin);
}

export function isProtocol2TransportAllowed(request: Request) {
  return !getSyncSpaceConfig().requireHttps || secureTransportAvailable(request);
}
