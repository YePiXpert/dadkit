import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import {
  createServer as createTcpServer,
  type AddressInfo,
  type Socket,
} from "node:net";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/webdav/route";
import {
  assertSafeWebDavUrl,
  assertValidWebDavResponseStatus,
  assertWebDavProxyEnabled,
  assertWebDavProxyRequest,
  createWebDavProxyConcurrencyLimiter,
  createWebDavProxyRateLimiter,
  isWebDavHostAllowed,
  isPrivateIpAddress,
  parseProxyPayload,
  readLimitedRequestText,
  requestPinnedWebDav,
  sanitizeProxyHeaders,
  sanitizeProxyResponseHeaders,
  WebDavProxyError,
} from "@/lib/webdav/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

function fakeClientRequest(start: () => void) {
  const request = new EventEmitter() as unknown as ClientRequest;

  request.destroyed = false;
  request.end = (() => {
    queueMicrotask(start);
    return request;
  }) as ClientRequest["end"];
  request.destroy = (() => {
    request.destroyed = true;
    return request;
  }) as ClientRequest["destroy"];

  return request;
}

function fakeRequestFactory(
  respond: (callback: (response: IncomingMessage) => void) => void,
) {
  return (
    _options: unknown,
    callback: (response: IncomingMessage) => void,
  ) => fakeClientRequest(() => respond(callback));
}

function fakeIncomingMessage(headers: IncomingMessage["headers"] = {}) {
  const incoming = new PassThrough() as unknown as IncomingMessage & PassThrough;

  incoming.statusCode = 200;
  incoming.statusMessage = "OK";
  incoming.headers = headers;
  incoming.complete = false;

  return incoming;
}

describe("WebDAV proxy request boundary", () => {
  it("rejects a disabled proxy before consuming any request body", async () => {
    vi.stubEnv("DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS", "");
    const request = new Request("https://dadkit.example/api/webdav", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://dadkit.example",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({
        url: "https://webdav.example/dav",
        method: "GET",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(request.bodyUsed).toBe(false);
  });

  it("rejects the cross-site text/plain form shape before parsing its body", async () => {
    const response = await POST(
      new Request("https://dadkit.example/api/webdav", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
        body: '{"url":"https://evil.example/payload","method":"GET"}',
      }),
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("requires both a matching Origin and same-origin fetch metadata", () => {
    const crossOrigin = new Request("https://dadkit.example/api/webdav", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        origin: "https://evil.example",
      },
      body: "{}",
    });
    const crossSiteMetadata = new Request(
      "https://dadkit.example/api/webdav",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://dadkit.example",
          "sec-fetch-site": "cross-site",
        },
        body: "{}",
      },
    );

    expect(() => assertWebDavProxyRequest(crossOrigin)).toThrow(
      "WebDAV 代理拒绝跨站请求。",
    );
    expect(() => assertWebDavProxyRequest(crossSiteMetadata)).toThrow(
      "WebDAV 代理拒绝跨站请求。",
    );
  });

  it("supports an explicit public origin behind a reverse proxy", () => {
    const request = new Request("http://dadkit:3333/api/webdav", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://dadkit.example",
        "sec-fetch-site": "same-origin",
      },
      body: "{}",
    });

    expect(() =>
      assertWebDavProxyRequest(request, "https://dadkit.example"),
    ).not.toThrow();
  });

  it("stops reading a streaming body as soon as its byte limit is exceeded", async () => {
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(6));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("https://dadkit.example/api/webdav", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readLimitedRequestText(request, 10)).rejects.toMatchObject({
      status: 413,
    });
    expect(pulls).toBeLessThanOrEqual(3);
    expect(cancelled).toBe(true);
  });

  it("cancels a request body that exceeds its absolute read deadline", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("https://dadkit.example/api/webdav", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readLimitedRequestText(request, 10, 10)).rejects.toMatchObject({
      status: 408,
    });
    expect(cancelled).toBe(true);
  });

  it("limits in-flight work globally and per proxy client", () => {
    const limiter = createWebDavProxyConcurrencyLimiter(2, 1);
    const releaseA = limiter.acquire("a");

    expect(() => limiter.acquire("a")).toThrow(
      expect.objectContaining({ status: 429 }),
    );

    const releaseB = limiter.acquire("b");

    expect(() => limiter.acquire("c")).toThrow(
      expect.objectContaining({ status: 503 }),
    );

    releaseA();
    releaseA();
    const releaseC = limiter.acquire("c");

    releaseC();
    releaseB();
  });

  it("returns Retry-After after sixty requests from one proxy client", async () => {
    vi.stubEnv("DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS", "webdav.example");
    const makeRequest = () =>
      new Request("https://dadkit.example/api/webdav", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://dadkit.example",
          "sec-fetch-site": "same-origin",
          "x-forwarded-for": "198.51.100.200",
        },
        body: "{}",
      });

    for (let count = 0; count < 60; count += 1) {
      expect((await POST(makeRequest())).status).toBe(400);
    }

    const limited = await POST(makeRequest());

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("WebDAV proxy target policy", () => {
  it("treats an invalid or private-only allowlist as disabled", () => {
    expect(() => assertWebDavProxyEnabled("localhost,127.0.0.1")).toThrow(
      expect.objectContaining({ status: 503 }),
    );
    expect(() => assertWebDavProxyEnabled("webdav.example")).not.toThrow();
  });

  it("blocks hexadecimal IPv4-mapped IPv6 loopback addresses", () => {
    expect(isPrivateIpAddress("::ffff:7f00:1")).toBe(true);
    expect(isPrivateIpAddress("::ffff:127.0.0.1")).toBe(true);
  });

  it("uses exact configured host matching and optional exact ports", () => {
    const configured = "webdav.example,files.example:8443";

    expect(
      isWebDavHostAllowed(new URL("https://webdav.example/dav"), configured),
    ).toBe(true);
    expect(
      isWebDavHostAllowed(
        new URL("https://webdav.example:8443/dav"),
        configured,
      ),
    ).toBe(false);
    expect(
      isWebDavHostAllowed(
        new URL("https://attacker-webdav.example/dav"),
        configured,
      ),
    ).toBe(false);
    expect(
      isWebDavHostAllowed(
        new URL("https://files.example:8443/dav"),
        configured,
      ),
    ).toBe(true);
    expect(
      isWebDavHostAllowed(
        new URL("https://files.example:9443/dav"),
        configured,
      ),
    ).toBe(false);
  });

  it("is disabled with a clear error when no host allowlist is configured", async () => {
    await expect(
      assertSafeWebDavUrl(new URL("https://webdav.example/dav"), {
        allowedHosts: "",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 503,
        message: expect.stringContaining(
          "DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS",
        ),
      }),
    );
  });

  it("rejects cleartext WebDAV even when the host is allowlisted", async () => {
    await expect(
      assertSafeWebDavUrl(new URL("http://webdav.example/dav"), {
        allowedHosts: "webdav.example",
      }),
    ).rejects.toEqual(
      expect.objectContaining({ status: 400, message: "WebDAV 代理只允许 https 地址。" }),
    );
  });

  it("rejects a hostname if any resolved address is private", async () => {
    await expect(
      assertSafeWebDavUrl(new URL("https://webdav.example/dav"), {
        allowedHosts: "webdav.example",
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("pins the outbound socket and applies its connection timeout", async () => {
    let connections = 0;
    const sockets = new Set<Socket>();
    const server = createTcpServer((socket) => {
      connections += 1;
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    try {
      const port = (server.address() as AddressInfo).port;
      await expect(
        requestPinnedWebDav(
          new URL(`https://rebind.example:${port}/dav`),
          { address: "127.0.0.1", family: 4 },
          {
            method: "PROPFIND",
            headers: { depth: "0" },
            timeoutMs: 25,
          },
        ),
      ).rejects.toMatchObject({ status: 504 });
      expect(connections).toBe(1);
    } finally {
      for (const socket of sockets) {
        socket.destroy();
      }

      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("supports extended WebDAV methods and keeps destinations same-origin", () => {
    expect(
      parseProxyPayload(
        JSON.stringify({ url: "https://webdav.example/a", method: "lock" }),
      ).method,
    ).toBe("LOCK");

    expect(() =>
      sanitizeProxyHeaders(
        { Destination: "https://other.example/b" },
        new URL("https://webdav.example/a"),
      ),
    ).toThrow("不允许跨主机移动或复制资源");
  });
});

describe("WebDAV proxy response boundary", () => {
  it("turns statuses rejected by Fetch Response into a controlled 502", () => {
    expect(() => assertValidWebDavResponseStatus(199)).toThrow(
      expect.objectContaining({ status: 502 }),
    );
    expect(() => assertValidWebDavResponseStatus(600)).toThrow(
      expect.objectContaining({ status: 502 }),
    );
    expect(assertValidWebDavResponseStatus(undefined)).toBe(502);
    expect(assertValidWebDavResponseStatus(599)).toBe(599);
  });

  it("rejects an oversized declared response before reading its body", async () => {
    await expect(
      requestPinnedWebDav(
        new URL("https://webdav.example/dav"),
        { address: "93.184.216.34", family: 4 },
        { method: "GET", maxResponseBytes: 4, timeoutMs: 100 },
        {
          request: fakeRequestFactory((callback) => {
            callback(fakeIncomingMessage({ "content-length": "5" }));
          }),
        },
      ),
    ).rejects.toMatchObject({ status: 502, message: expect.stringContaining("过大") });
  });

  it("rejects a chunked response as soon as it crosses the byte cap", async () => {
    await expect(
      requestPinnedWebDav(
        new URL("https://webdav.example/dav"),
        { address: "93.184.216.34", family: 4 },
        { method: "GET", maxResponseBytes: 4, timeoutMs: 100 },
        {
          request: fakeRequestFactory((callback) => {
            const incoming = fakeIncomingMessage();

            callback(incoming);
            incoming.write("12345");
          }),
        },
      ),
    ).rejects.toMatchObject({ status: 502, message: expect.stringContaining("过大") });
  });

  it("keeps the absolute upstream deadline after response headers arrive", async () => {
    await expect(
      requestPinnedWebDav(
        new URL("https://webdav.example/dav"),
        { address: "93.184.216.34", family: 4 },
        { method: "GET", maxResponseBytes: 8, timeoutMs: 10 },
        {
          request: fakeRequestFactory((callback) => {
            const incoming = fakeIncomingMessage();

            callback(incoming);
            incoming.write("1");
          }),
        },
      ),
    ).rejects.toMatchObject({ status: 504 });
  });

  it("buffers a complete bounded upstream response", async () => {
    const response = await requestPinnedWebDav(
      new URL("https://webdav.example/dav"),
      { address: "93.184.216.34", family: 4 },
      { method: "GET", maxResponseBytes: 4, timeoutMs: 100 },
      {
        request: fakeRequestFactory((callback) => {
          const incoming = fakeIncomingMessage({ "content-length": "4" });

          callback(incoming);
          incoming.complete = true;
          incoming.end("okay");
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("okay");
  });

  it("never reflects active upstream content types or cookies", () => {
    const headers = sanitizeProxyResponseHeaders(
      new Headers({
        "content-type": "text/html; charset=utf-8",
        etag: '"backup-1"',
        "set-cookie": "session=attacker",
      }),
    );

    expect(headers.get("content-type")).toBe("application/octet-stream");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("content-security-policy")).toContain("sandbox");
    expect(headers.get("etag")).toBe('"backup-1"');
    expect(headers.get("set-cookie")).toBeNull();
  });

  it("enforces the limiter window independently per client", () => {
    const limiter = createWebDavProxyRateLimiter(2, 1_000);

    expect(limiter.consume("a", 0).allowed).toBe(true);
    expect(limiter.consume("a", 1).allowed).toBe(true);
    expect(limiter.consume("a", 2)).toMatchObject({ allowed: false });
    expect(limiter.consume("b", 2).allowed).toBe(true);
    expect(limiter.consume("a", 1_000).allowed).toBe(true);
  });

  it("keeps structured status codes on policy errors", () => {
    const error = new WebDavProxyError("blocked", 403);

    expect(error).toMatchObject({ message: "blocked", status: 403 });
  });
});
