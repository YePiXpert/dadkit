import { lookup as dnsLookup } from "node:dns/promises";
import type { ClientRequest, IncomingMessage } from "node:http";
import { request as httpsRequest, type RequestOptions } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { domainToASCII } from "node:url";

const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "PUT",
  "DELETE",
  "OPTIONS",
  "PROPFIND",
  "PROPPATCH",
  "MKCOL",
  "COPY",
  "MOVE",
  "LOCK",
  "UNLOCK",
  "REPORT",
  "ACL",
  "SEARCH",
  "MKCALENDAR",
  "CHECKOUT",
  "CHECKIN",
  "VERSION-CONTROL",
  "MERGE",
  "LABEL",
  "UPDATE",
  "ORDERPATCH",
]);
const ALLOWED_HEADERS = new Set([
  "authorization",
  "brief",
  "content-type",
  "depth",
  "destination",
  "if",
  "if-match",
  "if-none-match",
  "lock-token",
  "overwrite",
  "timeout",
  "translate",
]);
const SAFE_RESPONSE_HEADERS = ["etag", "last-modified"];
const DEFAULT_OUTBOUND_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const BLOCKED_IP_RANGES = createBlockedIpRanges();

type DnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;

type AllowedHost = {
  hostname: string;
  port?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type HttpsRequestFactory = (
  options: RequestOptions & { servername?: string },
  callback: (response: IncomingMessage) => void,
) => ClientRequest;

export type ResolvedWebDavTarget = {
  address: string;
  family: 4 | 6;
};

export type WebDavProxyPayload = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
};

export class WebDavProxyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WebDavProxyError";
  }
}

export function assertWebDavProxyEnabled(
  configuredHosts = process.env.DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS,
) {
  const hasUsableHost = parseAllowedHosts(configuredHosts).some(({ hostname }) => {
    const family = isIP(hostname);

    return (
      !isBlockedHostname(hostname) &&
      (family === 0 || !isPrivateIpAddress(hostname))
    );
  });

  if (!hasUsableHost) {
    throw new WebDavProxyError(
      "WebDAV 代理未启用：请配置有效的 DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS。",
      503,
    );
  }
}

export function assertValidWebDavResponseStatus(status: number | undefined) {
  const responseStatus = status ?? 502;

  if (
    !Number.isInteger(responseStatus) ||
    responseStatus < 200 ||
    responseStatus > 599
  ) {
    throw new WebDavProxyError("WebDAV 代理收到了无效的上游响应状态。", 502);
  }

  return responseStatus;
}

export function assertWebDavProxyRequest(
  request: Request,
  publicOrigin = process.env.DADKIT_PUBLIC_ORIGIN,
) {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (mediaType !== "application/json") {
    throw new WebDavProxyError(
      "WebDAV 代理只接受 application/json 请求。",
      415,
    );
  }

  const expectedOrigin = resolveExpectedOrigin(request.url, publicOrigin);
  const requestOrigin = request.headers.get("origin");

  if (!requestOrigin || normalizeOrigin(requestOrigin) !== expectedOrigin) {
    throw new WebDavProxyError("WebDAV 代理拒绝跨站请求。", 403);
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (fetchSite && fetchSite !== "same-origin") {
    throw new WebDavProxyError("WebDAV 代理拒绝跨站请求。", 403);
  }
}

export async function readLimitedRequestText(
  request: Request,
  maxBytes: number,
  timeoutMs = 30_000,
) {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    if (!/^\d+$/.test(contentLength)) {
      throw new WebDavProxyError("WebDAV 代理请求长度不正确。", 400);
    }

    if (Number(contentLength) > maxBytes) {
      throw new WebDavProxyError("WebDAV 代理请求过大。", 413);
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const timeoutError = new WebDavProxyError(
    "WebDAV 代理读取请求体超时。",
    408,
  );
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(timeoutError);
      void reader.cancel(timeoutError).catch(() => undefined);
    }, Math.max(1, timeoutMs));
  });

  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        void reader.cancel().catch(() => undefined);
        throw new WebDavProxyError("WebDAV 代理请求过大。", 413);
      }

      chunks.push(value);
    }
  } finally {
    clearTimeout(timeoutHandle);
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new WebDavProxyError("WebDAV 代理请求编码不正确。", 400);
  }
}

export function sanitizeProxyHeaders(
  headers?: Record<string, string>,
  targetUrl?: URL,
) {
  const sanitized = new Headers();

  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = key.toLowerCase();

    if (!ALLOWED_HEADERS.has(normalizedKey) || typeof value !== "string") {
      continue;
    }

    if (normalizedKey === "destination" && targetUrl) {
      let destination: URL;

      try {
        destination = new URL(value, targetUrl);
      } catch {
        throw new WebDavProxyError("WebDAV Destination 请求头不正确。", 400);
      }

      if (destination.origin !== targetUrl.origin) {
        throw new WebDavProxyError(
          "WebDAV 代理不允许跨主机移动或复制资源。",
          400,
        );
      }
    }

    sanitized.set(key, value);
  }

  return sanitized;
}

export function sanitizeProxyResponseHeaders(upstreamHeaders: Headers) {
  const sanitized = new Headers({
    "cache-control": "no-store",
    "content-disposition": "attachment",
    "content-security-policy": "default-src 'none'; sandbox",
    "content-type": "application/octet-stream",
    "x-content-type-options": "nosniff",
  });

  for (const headerName of SAFE_RESPONSE_HEADERS) {
    const value = upstreamHeaders.get(headerName);

    if (value) {
      sanitized.set(headerName, value);
    }
  }

  return sanitized;
}

export function parseProxyPayload(rawBody: string): WebDavProxyPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new WebDavProxyError("WebDAV 代理请求格式不正确。", 400);
  }

  if (!isRecord(parsed)) {
    throw new WebDavProxyError("WebDAV 代理请求格式不正确。", 400);
  }

  const method = typeof parsed.method === "string" ? parsed.method.toUpperCase() : "";

  if (!ALLOWED_METHODS.has(method)) {
    throw new WebDavProxyError("WebDAV 代理方法不受支持。", 400);
  }

  if (typeof parsed.url !== "string" || !parsed.url.trim()) {
    throw new WebDavProxyError("WebDAV 代理地址不能为空。", 400);
  }

  if (parsed.body !== undefined && typeof parsed.body !== "string") {
    throw new WebDavProxyError("WebDAV 代理请求体格式不正确。", 400);
  }

  return {
    url: parsed.url,
    method,
    headers: isStringRecord(parsed.headers) ? parsed.headers : undefined,
    body: parsed.body,
  };
}

export function isWebDavHostAllowed(
  url: URL,
  configuredHosts = process.env.DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS,
) {
  const allowedHosts = parseAllowedHosts(configuredHosts);
  const hostname = normalizeHostname(url.hostname);
  const effectivePort =
    url.port || (url.protocol === "https:" ? "443" : url.protocol === "http:" ? "80" : "");

  return allowedHosts.some(
    (allowed) =>
      allowed.hostname === hostname &&
      (allowed.port ?? "443") === effectivePort,
  );
}

export async function assertSafeWebDavUrl(
  url: URL,
  options: {
    allowedHosts?: string;
    lookup?: DnsLookup;
  } = {},
): Promise<ResolvedWebDavTarget> {
  if (url.protocol !== "https:") {
    throw new WebDavProxyError("WebDAV 代理只允许 https 地址。", 400);
  }

  if (url.username || url.password) {
    throw new WebDavProxyError(
      "WebDAV 代理地址不能包含用户名或密码。",
      400,
    );
  }

  const configuredHosts =
    options.allowedHosts ?? process.env.DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS;
  assertWebDavProxyEnabled(configuredHosts);

  if (!isWebDavHostAllowed(url, configuredHosts)) {
    throw new WebDavProxyError("WebDAV 代理目标主机不在允许列表中。", 403);
  }

  const hostname = normalizeHostname(url.hostname);

  if (isBlockedHostname(hostname)) {
    throw new WebDavProxyError(
      "WebDAV 代理不允许访问本机或内网地址。",
      403,
    );
  }

  const addressFamily = isIP(hostname);
  let addresses: Array<{ address: string; family: number }>;

  try {
    addresses = addressFamily
      ? [{ address: hostname, family: addressFamily }]
      : await (options.lookup ?? (dnsLookup as DnsLookup))(hostname, {
          all: true,
          verbatim: true,
        });
  } catch {
    throw new WebDavProxyError("WebDAV 代理无法解析目标主机。", 502);
  }

  if (addresses.length === 0) {
    throw new WebDavProxyError("WebDAV 代理无法解析目标主机。", 502);
  }

  if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new WebDavProxyError(
      "WebDAV 代理不允许访问本机或内网地址。",
      403,
    );
  }

  const selected = addresses[0];
  const family = isIP(selected.address);

  if (family !== 4 && family !== 6) {
    throw new WebDavProxyError("WebDAV 代理目标地址不正确。", 502);
  }

  return { address: selected.address, family };
}

export function createPinnedLookup(target: ResolvedWebDavTarget) {
  return ((
    _hostname: string,
    options: { all?: boolean },
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | Array<ResolvedWebDavTarget>,
      family?: number,
    ) => void,
  ) => {
    if (options?.all) {
      callback(null, [target]);
      return;
    }

    callback(null, target.address, target.family);
  }) as LookupFunction;
}

export async function requestPinnedWebDav(
  url: URL,
  target: ResolvedWebDavTarget,
  init: {
    method: string;
    headers?: HeadersInit;
    body?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    maxResponseBytes?: number;
  },
  dependencies: { request?: HttpsRequestFactory } = {},
) {
  if (url.protocol !== "https:") {
    throw new WebDavProxyError("WebDAV 代理只允许 https 地址。", 400);
  }

  const headers = new Headers(init.headers);
  const body = init.body === undefined ? undefined : Buffer.from(init.body, "utf-8");

  if (body && !headers.has("content-length")) {
    headers.set("content-length", String(body.byteLength));
  }

  const hostname = normalizeHostname(url.hostname);
  const options: RequestOptions & { servername?: string } = {
    protocol: url.protocol,
    hostname,
    port: url.port || undefined,
    path: `${url.pathname}${url.search}`,
    method: init.method,
    headers: Object.fromEntries(headers.entries()),
    lookup: createPinnedLookup(target),
    signal: init.signal,
  };

  if (url.protocol === "https:" && isIP(hostname) === 0) {
    options.servername = hostname;
  }

  return new Promise<Response>((resolve, reject) => {
    const timeoutError = new WebDavProxyError(
      "WebDAV 代理等待目标服务器响应超时。",
      504,
    );
    const timeoutMs = init.timeoutMs ?? DEFAULT_OUTBOUND_TIMEOUT_MS;
    const maxResponseBytes =
      init.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const requestFactory = dependencies.request ?? httpsRequest;
    let settled = false;
    let upstream: IncomingMessage | undefined;
    let upstreamRequest: ClientRequest | undefined;

    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(overallTimer);
      upstream?.destroy();
      upstreamRequest?.destroy();
      reject(
        error instanceof WebDavProxyError
          ? error
          : new WebDavProxyError("WebDAV 代理请求上游失败。", 502),
      );
    };
    const resolveOnce = (response: Response) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(overallTimer);
      resolve(response);
    };
    const handleResponse = (incoming: IncomingMessage) => {
      upstream = incoming;
      let responseHeaders: Headers;
      let status: number;
      let hasBody: boolean;

      try {
        responseHeaders = new Headers();

        for (const [name, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) {
            for (const entry of value) {
              responseHeaders.append(name, entry);
            }
          } else if (value !== undefined) {
            responseHeaders.set(name, value);
          }
        }

        status = assertValidWebDavResponseStatus(incoming.statusCode);
        hasBody =
          init.method !== "HEAD" && ![101, 204, 205, 304].includes(status);

        if (hasBody) {
          assertBoundedContentLength(
            incoming.headers["content-length"],
            maxResponseBytes,
          );
        }
      } catch (error) {
        rejectOnce(
          error instanceof WebDavProxyError
            ? error
            : new WebDavProxyError("WebDAV 代理收到了无效的上游响应。", 502),
        );
        return;
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;

      incoming.on("data", (chunk: Buffer | string) => {
        if (settled) {
          return;
        }

        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buffer.byteLength;

        if (totalBytes > maxResponseBytes) {
          rejectOnce(
            new WebDavProxyError("WebDAV 代理收到的上游响应过大。", 502),
          );
          return;
        }

        if (hasBody) {
          chunks.push(buffer);
        }
      });
      incoming.once("aborted", () => {
        rejectOnce(new WebDavProxyError("WebDAV 上游响应被提前中断。", 502));
      });
      incoming.once("error", rejectOnce);
      incoming.once("close", () => {
        if (!incoming.complete) {
          rejectOnce(new WebDavProxyError("WebDAV 上游响应不完整。", 502));
        }
      });
      incoming.once("end", () => {
        if (settled) {
          return;
        }

        try {
          const responseBody = hasBody
            ? (Buffer.concat(chunks, totalBytes) as unknown as BodyInit)
            : null;

          resolveOnce(
            new Response(responseBody, {
              status,
              statusText: incoming.statusMessage,
              headers: responseHeaders,
            }),
          );
        } catch {
          rejectOnce(
            new WebDavProxyError("WebDAV 代理收到了无效的上游响应。", 502),
          );
        }
      });
    };

    const overallTimer = setTimeout(
      () => rejectOnce(timeoutError),
      Math.max(1, timeoutMs),
    );

    try {
      upstreamRequest = requestFactory(options, handleResponse);
      upstreamRequest.once("error", rejectOnce);
      upstreamRequest.end(body);
    } catch (error) {
      rejectOnce(error);
    }
  });
}

function assertBoundedContentLength(
  value: string | string[] | undefined,
  maxBytes: number,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue === undefined) {
    return;
  }

  if (!/^\d+$/.test(rawValue) || Number(rawValue) > maxBytes) {
    throw new WebDavProxyError("WebDAV 代理收到的上游响应过大。", 502);
  }
}

export function proxyClientKey(headers: Headers) {
  const forwardedFor = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);

  return forwardedFor ? `xff:${forwardedFor.slice(0, 128)}` : "unknown";
}

export function createWebDavProxyRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, RateLimitBucket>();
  let lastSweep = 0;

  return {
    consume(key: string, now = Date.now()) {
      if (now - lastSweep >= windowMs) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= now) {
            buckets.delete(bucketKey);
          }
        }

        lastSweep = now;
      }

      const existing = buckets.get(key);

      if (!existing || existing.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (existing.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((existing.resetAt - now) / 1000),
          ),
        };
      }

      existing.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export function createWebDavProxyConcurrencyLimiter(
  globalLimit: number,
  perClientLimit: number,
) {
  let active = 0;
  const activeByClient = new Map<string, number>();

  return {
    acquire(key: string) {
      const clientActive = activeByClient.get(key) ?? 0;

      if (clientActive >= perClientLimit) {
        throw new WebDavProxyError(
          "当前客户端的 WebDAV 代理请求过多，请稍后再试。",
          429,
        );
      }

      if (active >= globalLimit) {
        throw new WebDavProxyError(
          "WebDAV 代理当前繁忙，请稍后再试。",
          503,
        );
      }

      active += 1;
      activeByClient.set(key, clientActive + 1);
      let released = false;

      return () => {
        if (released) {
          return;
        }

        released = true;
        active -= 1;
        const remaining = (activeByClient.get(key) ?? 1) - 1;

        if (remaining <= 0) {
          activeByClient.delete(key);
        } else {
          activeByClient.set(key, remaining);
        }
      };
    },
  };
}

export function isBlockedHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".home") ||
    normalized.endsWith(".lan")
  );
}

export function isPrivateIpAddress(address: string) {
  const family = isIP(address);

  if (family === 4) {
    return BLOCKED_IP_RANGES.check(address, "ipv4");
  }

  if (family === 6) {
    return BLOCKED_IP_RANGES.check(address, "ipv6");
  }

  return true;
}

function createBlockedIpRanges() {
  const blockList = new BlockList();

  for (const [network, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ] as const) {
    blockList.addSubnet(network, prefix, "ipv4");
  }

  for (const [network, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["100::", 64],
    ["2001:2::", 48],
    ["2001:db8::", 32],
    ["3fff::", 20],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
  ] as const) {
    blockList.addSubnet(network, prefix, "ipv6");
  }

  return blockList;
}

function parseAllowedHosts(configuredHosts?: string) {
  return (configuredHosts ?? "")
    .split(",")
    .map(parseAllowedHost)
    .filter((entry): entry is AllowedHost => entry !== undefined);
}

function parseAllowedHost(value: string): AllowedHost | undefined {
  const raw = value.trim().toLowerCase();

  if (!raw || raw.includes("://") || /[/@?#*]/.test(raw)) {
    return undefined;
  }

  let hostname = raw;
  let port: string | undefined;

  if (raw.startsWith("[")) {
    const match = raw.match(/^\[([^\]]+)](?::(\d+))?$/);

    if (!match) {
      return undefined;
    }

    hostname = match[1];
    port = match[2];
  } else if (isIP(raw) !== 6) {
    const match = raw.match(/^([^:]+)(?::(\d+))?$/);

    if (!match) {
      return undefined;
    }

    hostname = match[1];
    port = match[2];
  }

  const normalizedHostname = normalizeHostname(hostname);
  const numericPort = port === undefined ? undefined : Number(port);

  if (
    !normalizedHostname ||
    (numericPort !== undefined &&
      (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535))
  ) {
    return undefined;
  }

  return {
    hostname: normalizedHostname,
    port: numericPort === undefined ? undefined : String(numericPort),
  };
}

function normalizeHostname(hostname: string) {
  const unwrapped = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|]$/g, "")
    .replace(/\.$/, "");

  return domainToASCII(unwrapped) || unwrapped;
}

function resolveExpectedOrigin(requestUrl: string, configuredOrigin?: string) {
  if (!configuredOrigin?.trim()) {
    return new URL(requestUrl).origin;
  }

  let parsed: URL;

  try {
    parsed = new URL(configuredOrigin);
  } catch {
    throw new WebDavProxyError("DADKIT_PUBLIC_ORIGIN 配置不正确。", 503);
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new WebDavProxyError("DADKIT_PUBLIC_ORIGIN 配置不正确。", 503);
  }

  return parsed.origin;
}

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}
