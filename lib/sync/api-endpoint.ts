// 同步 API 端点解析：静态托管与 App 壳场景下资源在本地，API 请求需指向云端。
// 构建期通过 NEXT_PUBLIC_DADKIT_API_BASE 注入（空值 = 同源部署，保持相对路径）。

const RAW_API_BASE = process.env.NEXT_PUBLIC_DADKIT_API_BASE?.trim() ?? "";
const RAW_PUBLIC_WEB_ORIGIN =
  process.env.NEXT_PUBLIC_DADKIT_PUBLIC_WEB_ORIGIN?.trim() ?? "";

function normalizeHttpOrigin(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export const SYNC_API_BASE = normalizeHttpOrigin(RAW_API_BASE) ?? "";

export function isRemoteSyncApi() {
  return SYNC_API_BASE !== "";
}

export function resolveApiUrl(path: string): string {
  if (!SYNC_API_BASE) return path;
  return `${SYNC_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

// 邀请链接必须指向公网 Web 应用：App 壳内的 origin 是本地 scheme（如
// appassets/dadkit-local），直接用 location.origin 会生成无法访问的链接。
export function publicAppOrigin(): string {
  const configured = normalizeHttpOrigin(RAW_PUBLIC_WEB_ORIGIN);
  if (configured) return configured;
  if (typeof window === "undefined") return "http://localhost";
  return window.location.origin;
}
