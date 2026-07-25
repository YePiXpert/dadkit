import {
  createSnapshot,
  importData,
  type DadKitExportData,
  type ImportResult,
} from "@/lib/storage";
import type {
  DadKitWebDavBackup,
  WebDavConfig,
  WebDavConnectionTestResult,
  WebDavSyncResult,
} from "@/lib/webdav/types";

const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const WEB_DAV_PROXY_PATH = "/api/webdav";
const PROXY_HEADER = "x-dadkit-webdav-proxy";
const PROXY_ERROR_HEADER = "x-dadkit-webdav-proxy-error";

export type WebDavTransport = "browser-proxy" | "direct-fetch";

type UploadOptions = {
  deviceId?: string;
  force?: boolean;
};

export function normalizeWebDavEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

export function joinWebDavPath(base: string, ...segments: string[]): string {
  const normalizedBase = normalizeWebDavEndpoint(base);
  const cleanedSegments = segments
    .flatMap((segment) => segment.split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);

  return [normalizedBase, ...cleanedSegments].join("/");
}

export function buildAuthHeader(username: string, secret: string): string {
  const value = `${username}:${secret}`;

  if (typeof Buffer !== "undefined") {
    return `Basic ${Buffer.from(value, "utf-8").toString("base64")}`;
  }

  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return `Basic ${btoa(binary)}`;
}

export function calculateChecksum(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildDadKitWebDavBackup(
  data: DadKitExportData,
  deviceId: string,
): DadKitWebDavBackup {
  const timestamp = new Date().toISOString();

  return {
    schemaVersion: 3,
    app: "DadKit",
    deviceId,
    backupId: backupId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    checksum: calculateChecksum(data),
    data,
  };
}

export async function testWebDavConnection(
  config: WebDavConfig,
  secret: string,
): Promise<WebDavConnectionTestResult> {
  const validation = validateWebDavInput(config, secret);

  if (!validation.ok) {
    return validation;
  }

  try {
    await ensureRemoteDir(config, secret);

    return { ok: true, message: "WebDAV 连接成功" };
  } catch (error) {
    return { ok: false, message: webDavErrorMessage(error) };
  }
}

export async function uploadWebDavBackup(
  config: WebDavConfig,
  secret: string,
  data: DadKitExportData,
  options: UploadOptions = {},
): Promise<WebDavSyncResult> {
  const validation = validateWebDavInput(config, secret);

  if (!validation.ok) {
    return validation;
  }

  const backup = buildDadKitWebDavBackup(
    data,
    options.deviceId ?? "unknown-device",
  );

  try {
    const remote = await downloadWebDavBackup(config, secret);

    if (remote.ok && remote.backup) {
      if (remote.backup.checksum === backup.checksum) {
        return { ok: true, message: "远端已是最新" };
      }

      if (!options.force) {
        return {
          ok: false,
          message: "远端备份与当前本地数据不同。",
          conflict: true,
        };
      }
    } else if (remote.message !== "未找到远端备份。") {
      return { ok: false, message: remote.message };
    }

    await ensureRemoteDir(config, secret);
    const response = await webDavFetch(backupUrl(config), {
      method: "PUT",
      headers: {
        Authorization: buildAuthHeader(config.username, secret),
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(backup, null, 2),
    });

    if (!response.ok) {
      return { ok: false, message: `上传失败，WebDAV 返回 ${response.status}。` };
    }

    return { ok: true, message: "上传成功" };
  } catch (error) {
    return { ok: false, message: webDavErrorMessage(error) };
  }
}

export async function downloadWebDavBackup(
  config: WebDavConfig,
  secret: string,
): Promise<{
  ok: boolean;
  message: string;
  backup?: DadKitWebDavBackup;
}> {
  const validation = validateWebDavInput(config, secret);

  if (!validation.ok) {
    return validation;
  }

  try {
    const response = await webDavFetch(backupUrl(config), {
      method: "GET",
      headers: {
        Authorization: buildAuthHeader(config.username, secret),
      },
    });

    if (response.status === 404) {
      return { ok: false, message: "未找到远端备份。" };
    }

    if (!response.ok) {
      return { ok: false, message: `下载失败，WebDAV 返回 ${response.status}。` };
    }

    const text = await response.text();

    if (text.length > MAX_BACKUP_BYTES) {
      return { ok: false, message: "远端备份过大，未下载。" };
    }

    const parsed = JSON.parse(text) as unknown;

    if (!isDadKitWebDavBackup(parsed)) {
      return { ok: false, message: "远端文件不是 DadKit WebDAV 备份。" };
    }

    if (calculateChecksum(parsed.data) !== parsed.checksum) {
      return { ok: false, message: "远端备份校验失败，未导入。" };
    }

    return { ok: true, message: "下载成功", backup: parsed };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, message: "远端备份 JSON 格式不正确。" };
    }

    return { ok: false, message: webDavErrorMessage(error) };
  }
}

export async function ensureRemoteDir(
  config: WebDavConfig,
  secret: string,
): Promise<void> {
  const parts = config.remoteDir.split("/").filter(Boolean);
  let currentPath = normalizeWebDavEndpoint(config.endpoint);

  for (const part of parts) {
    currentPath = joinWebDavPath(currentPath, part);

    const propfind = await webDavFetch(currentPath, {
      method: "PROPFIND",
      headers: {
        Authorization: buildAuthHeader(config.username, secret),
        Depth: "0",
      },
    });

    if (propfind.ok) {
      continue;
    }

    if (propfind.status !== 404) {
      throw new Error(`检查远端目录失败，WebDAV 返回 ${propfind.status}。`);
    }

    const mkcol = await webDavFetch(currentPath, {
      method: "MKCOL",
      headers: {
        Authorization: buildAuthHeader(config.username, secret),
      },
    });

    if (!mkcol.ok && mkcol.status !== 405) {
      throw new Error(`创建远端目录失败，WebDAV 返回 ${mkcol.status}。`);
    }
  }
}

export function importDadKitWebDavBackup(
  backup: DadKitWebDavBackup,
): ImportResult {
  try {
    createSnapshot("导入 WebDAV 备份前");
  } catch (error) {
    return { ok: false, message: webDavErrorMessage(error) };
  }

  return importData(JSON.stringify(backup.data));
}

function validateWebDavInput(
  config: WebDavConfig,
  secret: string,
): WebDavConnectionTestResult {
  if (!config.endpoint.trim()) {
    return { ok: false, message: "请填写 WebDAV 地址。" };
  }

  if (!config.username.trim()) {
    return { ok: false, message: "请填写 WebDAV 用户名。" };
  }

  if (!secret) {
    return { ok: false, message: "请填写 WebDAV 应用密码或密码。" };
  }

  try {
    const url = new URL(config.endpoint);

    if (url.protocol !== "https:") {
      return { ok: false, message: "WebDAV 地址必须使用 https。" };
    }
  } catch {
    return { ok: false, message: "WebDAV 地址格式不正确。" };
  }

  return { ok: true, message: "校验通过" };
}

async function webDavFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const transport = getWebDavTransport();

  if (transport === "browser-proxy") {
    return browserProxyWebDavFetch(input, init);
  }

  try {
    return await fetch(input, {
      ...init,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "当前 WebDAV 服务未允许浏览器跨域访问。请改用支持 CORS 的 WebDAV 服务，或使用 JSON 备份手动导入导出。",
      );
    }

    throw error;
  }
}

export function selectWebDavTransport({ isBrowser }: { isBrowser: boolean }): WebDavTransport {
  return isBrowser ? "browser-proxy" : "direct-fetch";
}

export function getWebDavTransport(): WebDavTransport {
  return selectWebDavTransport({
    isBrowser: typeof window !== "undefined",
  });
}

async function browserProxyWebDavFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  try {
    const response = await fetch(WEB_DAV_PROXY_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        url: input,
        method: init.method ?? "GET",
        headers: headersToRecord(init.headers),
        body: typeof init.body === "string" ? init.body : undefined,
      }),
    });

    if (response.headers.get(PROXY_HEADER) !== "1") {
      throw new Error(
        "WebDAV 同源代理不可用，请确认当前 DadKit 部署支持 API Route。",
      );
    }

    if (response.headers.get(PROXY_ERROR_HEADER) === "1") {
      const message = await response.text();

      throw new Error(message || "WebDAV 同源代理请求失败。");
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("WebDAV 同源代理请求失败，请检查 DadKit 部署状态。");
    }

    throw error;
  }
}

function headersToRecord(headers: RequestInit["headers"]) {
  return Object.fromEntries(new Headers(headers).entries());
}

function backupUrl(config: WebDavConfig) {
  return joinWebDavPath(config.endpoint, config.remoteDir, config.filename);
}

function backupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `webdav-${crypto.randomUUID()}`;
  }

  return `webdav-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDadKitWebDavBackup(value: unknown): value is DadKitWebDavBackup {
  return (
    isRecord(value) &&
    value.schemaVersion === 3 &&
    value.app === "DadKit" &&
    typeof value.deviceId === "string" &&
    typeof value.backupId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.checksum === "string" &&
    isRecord(value.data) &&
    value.data.version === 3
  );
}

function webDavErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "WebDAV 操作失败，请检查地址、凭据和服务权限。";
}
