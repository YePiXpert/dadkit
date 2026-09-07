import { NextResponse, type NextRequest } from "next/server";

import { APP_LOCAL_ORIGINS } from "@/lib/sync/app-origins";
import { DADKIT_SYNC_PROTOCOL_HEADER } from "@/lib/sync/protocol-version";

// 静态托管与 App 壳场景：资源在本地，/api/sync 需接受跨域 Bearer 请求。
// 允许的来源 = 部署公网 origin + DADKIT_TRUSTED_ORIGINS + App 壳本地 origin。

const ALLOW_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";
const ALLOW_HEADERS = `Content-Type, Authorization, If-None-Match, ${DADKIT_SYNC_PROTOCOL_HEADER}`;
// pull 的 ETag/304 协商与限流退避依赖这些响应头可被跨域 fetch 读取。
const EXPOSE_HEADERS = "ETag, X-DadKit-Server-Time, Retry-After";

function normalizeHttpOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function allowedCorsOrigins(): Set<string> {
  const origins = new Set<string>(APP_LOCAL_ORIGINS);
  const publicOrigin = normalizeHttpOrigin(process.env.DADKIT_PUBLIC_ORIGIN?.trim());
  if (publicOrigin) origins.add(publicOrigin);

  const trusted = process.env.DADKIT_TRUSTED_ORIGINS?.trim();
  if (trusted) {
    for (const candidate of trusted.split(",")) {
      const origin = normalizeHttpOrigin(candidate.trim());
      if (origin) origins.add(origin);
    }
  }
  return origins;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = origin && allowedCorsOrigins().has(origin) ? origin : undefined;

  if (request.method === "OPTIONS") {
    if (!allowed) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Methods": ALLOW_METHODS,
        "Access-Control-Allow-Headers": ALLOW_HEADERS,
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  const response = NextResponse.next();
  response.headers.append("Vary", "Origin");
  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", allowed);
    response.headers.set("Access-Control-Expose-Headers", EXPOSE_HEADERS);
  }
  return response;
}

export const config = {
  matcher: ["/api/sync/:path*"],
};
