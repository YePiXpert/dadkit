import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const ALLOWED_METHODS = new Set(["GET", "PUT", "PROPFIND", "MKCOL"]);
const ALLOWED_HEADERS = new Set(["authorization", "content-type", "depth"]);

export type WebDavProxyPayload = {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
};

export function sanitizeProxyHeaders(headers?: Record<string, string>) {
  const sanitized = new Headers();

  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = key.toLowerCase();

    if (ALLOWED_HEADERS.has(normalizedKey) && typeof value === "string") {
      sanitized.set(key, value);
    }
  }

  return sanitized;
}

export function parseProxyPayload(rawBody: string): WebDavProxyPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error("WebDAV 代理请求格式不正确。");
  }

  if (!isRecord(parsed)) {
    throw new Error("WebDAV 代理请求格式不正确。");
  }

  const method = typeof parsed.method === "string" ? parsed.method.toUpperCase() : "";

  if (!ALLOWED_METHODS.has(method)) {
    throw new Error("WebDAV 代理方法不受支持。");
  }

  if (typeof parsed.url !== "string" || !parsed.url.trim()) {
    throw new Error("WebDAV 代理地址不能为空。");
  }

  if (parsed.body !== undefined && typeof parsed.body !== "string") {
    throw new Error("WebDAV 代理请求体格式不正确。");
  }

  return {
    url: parsed.url,
    method,
    headers: isStringRecord(parsed.headers) ? parsed.headers : undefined,
    body: parsed.body,
  };
}

export async function assertSafeWebDavUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("WebDAV 代理只允许 http 或 https 地址。");
  }

  if (url.username || url.password) {
    throw new Error("WebDAV 代理地址不能包含用户名或密码。");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("WebDAV 代理不允许访问本机或内网地址。");
  }

  const hostIsIpAddress = isIP(url.hostname) !== 0;
  const addresses = hostIsIpAddress
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true });

  if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error("WebDAV 代理不允许访问本机或内网地址。");
  }
}

export function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  );
}

export function isPrivateIpAddress(address: string) {
  if (address.startsWith("::ffff:")) {
    return isPrivateIpAddress(address.slice("::ffff:".length));
  }

  if (isIP(address) === 4) {
    const [first = 0, second = 0] = address
      .split(".")
      .map((part) => Number(part));

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19))
    );
  }

  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    const firstSegment = normalized.split(":")[0] ?? "";
    const firstHextet = Number.parseInt(firstSegment || "0", 16);

    return (
      normalized === "::" ||
      normalized === "::1" ||
      (firstHextet & 0xfe00) === 0xfc00 ||
      (firstHextet & 0xffc0) === 0xfe80
    );
  }

  return true;
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
