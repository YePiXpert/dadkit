import {
  applyImportData,
  createSnapshot,
  exportData,
  type DadKitExportData,
  type ImportResult,
  validateImportData,
} from "@/lib/storage";
import { mergeExportData } from "@/lib/sync/merge";
import { calculateChecksum } from "@/lib/webdav/checksum";
import type {
  DadKitWebDavBackup,
  WebDavConfig,
  WebDavConnectionTestResult,
  WebDavSyncResult,
} from "@/lib/webdav/types";

// calculateChecksum 已抽到 @/lib/webdav/checksum，供同步客户端独立引用；
// 这里保持再导出以兼容既有调用方。
export { calculateChecksum };

// 比较备份内容时忽略每次导出都会变化的 exportedAt。
function dadKitContentChecksum(data: { exportedAt: string }) {
  return calculateChecksum({ ...data, exportedAt: "" });
}

const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const WEB_DAV_PROXY_PATH = "/api/webdav";
const PROXY_HEADER = "x-dadkit-webdav-proxy";
const PROXY_ERROR_HEADER = "x-dadkit-webdav-proxy-error";

export type WebDavTransport = "browser-proxy" | "direct-fetch";

type UploadOptions = { deviceId?: string };

type WebDavDownloadResult = {
  ok: boolean;
  message: string;
  backup?: DadKitWebDavBackup;
  notFound?: boolean;
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

  try {
    const remote = await downloadWebDavBackup(config, secret);
    let mergedData = data;

    if (remote.ok && remote.backup) {
      if (
        dadKitContentChecksum(remote.backup.data) ===
        dadKitContentChecksum(data)
      ) {
        return { ok: true, message: "远端已是最新" };
      }

      mergedData = mergeExportData(data, remote.backup.data);
    } else if (!remote.notFound) {
      return { ok: false, message: remote.message };
    }

    const backup = buildDadKitWebDavBackup(
      mergedData,
      options.deviceId ?? "unknown-device",
    );

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
      return { ok: false, message: webDavStatusMessage("上传备份", response.status) };
    }

    return {
      ok: true,
      message:
        remote.ok && remote.backup ? "已合并本地与远端备份并上传" : "上传成功",
    };
  } catch (error) {
    return { ok: false, message: webDavErrorMessage(error) };
  }
}

export async function downloadWebDavBackup(
  config: WebDavConfig,
  secret: string,
): Promise<WebDavDownloadResult> {
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
      return {
        ok: false,
        notFound: true,
        message: webDavStatusMessage("下载远端备份", response.status),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        message: webDavStatusMessage("下载远端备份", response.status),
      };
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

    const payloadValidation = validateImportData(JSON.stringify(parsed.data));

    if (!payloadValidation.ok) {
      return { ok: false, message: "远端备份内容无效，未下载。" };
    }

    return { ok: true, message: "下载成功", backup: parsed };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, message: "远端备份格式不正确。" };
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
      throw new Error(webDavStatusMessage("检查远端目录", propfind.status));
    }

    const mkcol = await webDavFetch(currentPath, {
      method: "MKCOL",
      headers: {
        Authorization: buildAuthHeader(config.username, secret),
      },
    });

    if (!mkcol.ok && mkcol.status !== 405) {
      throw new Error(webDavStatusMessage("创建远端目录", mkcol.status));
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

  return applyImportData(mergeExportData(exportData(), backup.data));
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
      throw new Error("网络连接失败，请检查 WebDAV 地址、HTTPS 和网络后重试。");
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
    (value.data.version === 3 ||
      value.data.version === 4 ||
      value.data.version === 5 ||
      value.data.version === 6)
  );
}

function webDavErrorMessage(error: unknown) {
  if (error instanceof TypeError) {
    return "网络连接失败，请检查 WebDAV 地址、HTTPS 和网络后重试。";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "WebDAV 操作失败，请检查地址、凭据和服务权限。";
}

export function webDavStatusMessage(operation: string, status: number) {
  if (status === 401 || status === 403) {
    return `${operation}失败：身份验证未通过。请确认填写的是 WebDAV 应用专用密码，而不是网页登录密码。`;
  }

  if (status === 404) {
    return `${operation}失败：未找到远端目录或备份文件，请检查 WebDAV 地址和远端目录。`;
  }

  return `${operation}失败：WebDAV 返回 ${status}。请检查地址、账号权限和远端目录后重试。`;
}
