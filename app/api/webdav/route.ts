import {
  assertSafeWebDavUrl,
  parseProxyPayload,
  sanitizeProxyHeaders,
} from "@/lib/webdav/proxy";

export const runtime = "nodejs";

const MAX_PROXY_REQUEST_BYTES = 3 * 1024 * 1024;
const RELAY_RESPONSE_HEADERS = ["content-type", "etag", "last-modified"];
const PROXY_HEADER = "x-dadkit-webdav-proxy";
const PROXY_ERROR_HEADER = "x-dadkit-webdav-proxy-error";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: proxyHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    if (rawBody.length > MAX_PROXY_REQUEST_BYTES) {
      return proxyError("WebDAV 代理请求过大。", 413);
    }

    const payload = parseProxyPayload(rawBody);
    const targetUrl = new URL(payload.url);

    await assertSafeWebDavUrl(targetUrl);

    const upstream = await fetch(targetUrl, {
      method: payload.method,
      headers: sanitizeProxyHeaders(payload.headers),
      body: payload.body,
      cache: "no-store",
      redirect: "manual",
    });

    const headers = proxyHeaders();

    for (const headerName of RELAY_RESPONSE_HEADERS) {
      const value = upstream.headers.get(headerName);

      if (value) {
        headers.set(headerName, value);
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    return proxyError(webDavProxyErrorMessage(error));
  }
}

function proxyHeaders() {
  return new Headers({
    [PROXY_HEADER]: "1",
  });
}

function proxyError(message: string, status = 502) {
  const headers = proxyHeaders();

  headers.set(PROXY_ERROR_HEADER, "1");
  headers.set("content-type", "text/plain; charset=utf-8");

  return new Response(message, { status, headers });
}

function webDavProxyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "WebDAV 代理请求失败。";
}
