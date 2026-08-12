import {
  assertSafeWebDavUrl,
  assertWebDavProxyEnabled,
  assertWebDavProxyRequest,
  parseProxyPayload,
  parseProxyV2Metadata,
  requestPinnedWebDav,
  sanitizeProxyHeaders,
  sanitizeProxyResponseHeaders,
  WebDavProxyError,
} from "@/lib/webdav/proxy";
import { HttpBoundaryError } from "@/lib/http/boundary-error";
import { readLimitedRequestText } from "@/lib/http/request-body";
import {
  clientKeyFromHeaders as proxyClientKey,
  createConcurrencyLimiter as createWebDavProxyConcurrencyLimiter,
  createRateLimiter as createWebDavProxyRateLimiter,
} from "@/lib/http/rate-limit";
import {
  LEGACY_WEBDAV_PROXY_REQUEST_BYTES,
  MAX_WEBDAV_BACKUP_BYTES,
  WEBDAV_PROXY_METADATA_HEADER,
  WEBDAV_PROXY_VERSION_HEADER,
  WEBDAV_REQUEST_TIMEOUT_MS,
} from "@/lib/webdav/limits";

export const runtime = "nodejs";

const PROXY_HEADER = "x-dadkit-webdav-proxy";
const PROXY_ERROR_HEADER = "x-dadkit-webdav-proxy-error";
const proxyRateLimiter = createWebDavProxyRateLimiter(60, 60_000);
const proxyConcurrencyLimiter = createWebDavProxyConcurrencyLimiter(2, 1);

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: proxyHeaders(),
  });
}

export async function POST(request: Request) {
  let releaseConcurrency: (() => void) | undefined;

  try {
    assertWebDavProxyRequest(request);
    assertWebDavProxyEnabled();

    const clientKey = proxyClientKey(request.headers);
    const rateLimit = proxyRateLimiter.consume(clientKey);

    if (!rateLimit.allowed) {
      return proxyError("WebDAV 代理请求过于频繁，请稍后再试。", 429, {
        "retry-after": String(rateLimit.retryAfterSeconds),
      });
    }

    releaseConcurrency = proxyConcurrencyLimiter.acquire(clientKey);
    const isV2 = request.headers.get(WEBDAV_PROXY_VERSION_HEADER) === "2";
    const rawBody = await readLimitedRequestText(
      request,
      isV2 ? MAX_WEBDAV_BACKUP_BYTES : LEGACY_WEBDAV_PROXY_REQUEST_BYTES,
      WEBDAV_REQUEST_TIMEOUT_MS,
    );
    const payload = isV2
      ? {
          ...parseProxyV2Metadata(
            request.headers.get(WEBDAV_PROXY_METADATA_HEADER) ?? "",
          ),
          body: rawBody || undefined,
        }
      : parseProxyPayload(rawBody);
    let targetUrl: URL;

    try {
      targetUrl = new URL(payload.url);
    } catch {
      throw new WebDavProxyError("WebDAV 代理地址不正确。", 400);
    }

    const resolvedTarget = await assertSafeWebDavUrl(targetUrl);

    const upstream = await requestPinnedWebDav(targetUrl, resolvedTarget, {
      method: payload.method,
      headers: sanitizeProxyHeaders(payload.headers, targetUrl),
      body: payload.body,
      signal: request.signal,
      maxResponseBytes: MAX_WEBDAV_BACKUP_BYTES,
    });

    const headers = sanitizeProxyResponseHeaders(upstream.headers);
    headers.set(PROXY_HEADER, "1");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return proxyError(
      webDavProxyErrorMessage(error),
      error instanceof WebDavProxyError || error instanceof HttpBoundaryError
        ? error.status
        : 502,
    );
  } finally {
    releaseConcurrency?.();
  }
}

function proxyHeaders() {
  return new Headers({
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; sandbox",
    [PROXY_HEADER]: "1",
    "x-content-type-options": "nosniff",
  });
}

function proxyError(
  message: string,
  status = 502,
  additionalHeaders?: HeadersInit,
) {
  const headers = proxyHeaders();

  headers.set(PROXY_ERROR_HEADER, "1");
  headers.set("content-type", "text/plain; charset=utf-8");

  for (const [name, value] of new Headers(additionalHeaders)) {
    headers.set(name, value);
  }

  return new Response(message, { status, headers });
}

function webDavProxyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "WebDAV 代理请求失败。";
}
