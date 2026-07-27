"use client";

import {
  applyImportData,
  exportData,
  loadSnapshots,
  saveSnapshots,
  type DadKitSnapshot,
} from "@/lib/data/backup";
import {
  isDadKitImportData,
  isRecord,
  isValidDateString,
  type DadKitExportData,
} from "@/lib/data/format";
import {
  loadWebDavConfig,
  saveWebDavConfig,
} from "@/lib/data/settings-repository";
import {
  clearStagedItemPhotos,
  commitStagedItemPhotos,
  getAllItemPhotos,
  stageItemPhotos,
  ITEM_PHOTO_MAX_STORED_BYTES,
  type ItemPhotoRecord,
} from "@/lib/item-photos";
import { CHECKLIST_DESCRIPTION_PREFERENCE_KEY } from "@/lib/use-checklist-description-preference";
import {
  applyThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/use-theme";
import type { WebDavConfig } from "@/lib/webdav/types";

const TRANSFER_FORMAT = "dadkit-transfer";
const TRANSFER_VERSION = 1;
const TRANSFER_AAD = "DadKit encrypted transfer v1";
const PBKDF2_ITERATIONS = 310_000;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const MAX_PHOTO_COUNT = 500;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

type TransferPhoto = {
  itemId: string;
  updatedAt: string;
  width: number;
  height: number;
  mimeType: string;
  bytes: string;
  sha256: string;
};

type TransferPayloadCore = {
  format: typeof TRANSFER_FORMAT;
  version: typeof TRANSFER_VERSION;
  createdAt: string;
  data: DadKitExportData;
  snapshots: DadKitSnapshot[];
  preferences: {
    theme: ThemePreference;
    showFullDescriptions: boolean;
  };
  webDav: {
    config: WebDavConfig;
  };
  photos: TransferPhoto[];
};

type TransferPayload = TransferPayloadCore & {
  contentSha256: string;
};

type TransferEnvelope = {
  format: typeof TRANSFER_FORMAT;
  version: typeof TRANSFER_VERSION;
  compression: "gzip";
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt: string;
  };
  cipher: {
    name: "AES-GCM";
    iv: string;
    ciphertext: string;
    sha256: string;
  };
};

export type TransferImportResult = {
  ok: boolean;
  message: string;
  photoCount?: number;
};

export function generateTransferPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return toBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function createTransferArchive(password: string) {
  assertPassword(password);

  const photos = await Promise.all(
    (await getAllItemPhotos()).map(serializePhoto),
  );
  const config = loadWebDavConfig();
  const core: TransferPayloadCore = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    createdAt: new Date().toISOString(),
    data: exportData(),
    snapshots: loadSnapshots(),
    preferences: {
      theme: readThemePreference(),
      showFullDescriptions:
        window.localStorage.getItem(
          CHECKLIST_DESCRIPTION_PREFERENCE_KEY,
        ) !== "false",
    },
    webDav: {
      config: {
        ...config,
        rememberSecret: false,
      },
    },
    photos,
  };
  const coreJson = JSON.stringify(core);

  if (
    typeof window !== "undefined" &&
    window.location.hostname &&
    coreJson.includes(window.location.hostname)
  ) {
    throw new Error(
      "迁移数据中包含当前站点地址。请先从备注或 WebDAV 配置中移除该地址。",
    );
  }

  const payload: TransferPayload = {
    ...core,
    contentSha256: await sha256Hex(textEncoder.encode(coreJson)),
  };
  const compressed = await gzip(textEncoder.encode(JSON.stringify(payload)));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: asArrayBuffer(iv),
        additionalData: asArrayBuffer(textEncoder.encode(TRANSFER_AAD)),
        tagLength: 128,
      },
      key,
      asArrayBuffer(compressed),
    ),
  );
  const envelope: TransferEnvelope = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    compression: "gzip",
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt: toBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: toBase64(iv),
      ciphertext: toBase64(encrypted),
      sha256: await sha256Hex(encrypted),
    },
  };

  return new Blob([JSON.stringify(envelope)], {
    type: "application/vnd.dadkit.transfer+json",
  });
}

export async function importTransferArchive(
  archive: Blob,
  password: string,
): Promise<TransferImportResult> {
  if (archive.size <= 0 || archive.size > MAX_ARCHIVE_BYTES) {
    return { ok: false, message: "迁移包为空或超过 256 MiB。" };
  }

  try {
    assertPassword(password);
    const envelope = parseEnvelope(await archive.text());
    const ciphertext = fromBase64(envelope.cipher.ciphertext);

    if ((await sha256Hex(ciphertext)) !== envelope.cipher.sha256) {
      throw new Error("迁移包密文校验失败。");
    }

    const salt = fromBase64(envelope.kdf.salt);
    const iv = fromBase64(envelope.cipher.iv);
    const key = await deriveKey(password, salt, ["decrypt"]);
    let compressed: ArrayBuffer;

    try {
      compressed = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: asArrayBuffer(iv),
          additionalData: asArrayBuffer(textEncoder.encode(TRANSFER_AAD)),
          tagLength: 128,
        },
        key,
        asArrayBuffer(ciphertext),
      );
    } catch {
      throw new Error("一次性密码不正确，或迁移包已损坏。");
    }

    const payload = await parsePayload(
      textDecoder.decode(asArrayBuffer(await gunzip(new Uint8Array(compressed)))),
    );
    const photos = await deserializeAndValidatePhotos(payload.photos);
    const previous = {
      data: exportData(),
      snapshots: loadSnapshots(),
      webDavConfig: loadWebDavConfig(),
      theme: readThemePreference(),
      description:
        window.localStorage.getItem(CHECKLIST_DESCRIPTION_PREFERENCE_KEY),
    };

    await stageItemPhotos(photos);

    try {
      const imported = applyImportData(payload.data);

      if (!imported.ok) {
        throw new Error(imported.message);
      }
      if (!saveSnapshots(payload.snapshots)) {
        throw new Error("无法保存迁移包中的恢复快照。");
      }

      saveWebDavConfig({
        ...payload.webDav.config,
        rememberSecret: false,
      });
      writePreferences(payload.preferences);
      await commitStagedItemPhotos();
    } catch (error) {
      applyImportData(previous.data);
      saveSnapshots(previous.snapshots);
      saveWebDavConfig(previous.webDavConfig);
      writePreferences({
        theme: previous.theme,
        showFullDescriptions: previous.description !== "false",
      });
      await clearStagedItemPhotos().catch(() => undefined);
      throw error;
    }

    return {
      ok: true,
      message: "加密迁移包导入成功。请重新输入 WebDAV 密码并加入家庭同步空间。",
      photoCount: photos.length,
    };
  } catch (error) {
    await clearStagedItemPhotos().catch(() => undefined);
    return {
      ok: false,
      message:
        error instanceof Error && error.message
          ? error.message
          : "迁移包导入失败，原有数据未更改。",
    };
  }
}

async function serializePhoto(record: ItemPhotoRecord): Promise<TransferPhoto> {
  const bytes = new Uint8Array(await record.blob.arrayBuffer());

  return {
    itemId: record.itemId,
    updatedAt: record.updatedAt,
    width: record.width,
    height: record.height,
    mimeType: record.blob.type,
    bytes: toBase64(bytes),
    sha256: await sha256Hex(bytes),
  };
}

async function deserializeAndValidatePhotos(values: TransferPhoto[]) {
  if (values.length > MAX_PHOTO_COUNT) {
    throw new Error(`迁移包照片数量不能超过 ${MAX_PHOTO_COUNT} 张。`);
  }

  const ids = new Set<string>();
  const records: ItemPhotoRecord[] = [];
  let totalBytes = 0;

  for (const value of values) {
    if (
      !isTransferPhoto(value) ||
      ids.has(value.itemId) ||
      !["image/jpeg", "image/png", "image/webp"].includes(value.mimeType)
    ) {
      throw new Error("迁移包包含无效或重复的照片记录。");
    }

    const bytes = fromBase64(value.bytes);

    totalBytes += bytes.byteLength;
    if (
      bytes.byteLength <= 0 ||
      bytes.byteLength > ITEM_PHOTO_MAX_STORED_BYTES ||
      totalBytes > MAX_ARCHIVE_BYTES
    ) {
      throw new Error("迁移包中的照片大小无效。");
    }
    if ((await sha256Hex(bytes)) !== value.sha256) {
      throw new Error("迁移包中的照片校验失败。");
    }

    ids.add(value.itemId);
    records.push({
      itemId: value.itemId,
      updatedAt: value.updatedAt,
      width: value.width,
      height: value.height,
      blob: new Blob([asArrayBuffer(bytes)], { type: value.mimeType }),
    });
  }

  return records;
}

function parseEnvelope(raw: string): TransferEnvelope {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("文件不是有效的 DadKit 加密迁移包。");
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "format",
      "version",
      "compression",
      "kdf",
      "cipher",
    ]) ||
    value.format !== TRANSFER_FORMAT ||
    value.version !== TRANSFER_VERSION ||
    value.compression !== "gzip" ||
    !isRecord(value.kdf) ||
    !hasExactKeys(value.kdf, [
      "name",
      "hash",
      "iterations",
      "salt",
    ]) ||
    value.kdf.name !== "PBKDF2" ||
    value.kdf.hash !== "SHA-256" ||
    value.kdf.iterations !== PBKDF2_ITERATIONS ||
    typeof value.kdf.salt !== "string" ||
    !isRecord(value.cipher) ||
    !hasExactKeys(value.cipher, ["name", "iv", "ciphertext", "sha256"]) ||
    value.cipher.name !== "AES-GCM" ||
    typeof value.cipher.iv !== "string" ||
    typeof value.cipher.ciphertext !== "string" ||
    typeof value.cipher.sha256 !== "string"
  ) {
    throw new Error("迁移包格式或加密参数无效。");
  }

  return value as TransferEnvelope;
}

async function parsePayload(raw: string): Promise<TransferPayload> {
  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("迁移包解压后的内容无效。");
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "format",
      "version",
      "createdAt",
      "data",
      "snapshots",
      "preferences",
      "webDav",
      "photos",
      "contentSha256",
    ]) ||
    value.format !== TRANSFER_FORMAT ||
    value.version !== TRANSFER_VERSION ||
    !isValidDateString(value.createdAt) ||
    !isDadKitImportData(value.data) ||
    value.data.version !== 5 ||
    !Array.isArray(value.snapshots) ||
    value.snapshots.length > 5 ||
    !value.snapshots.every(isTransferSnapshot) ||
    !isPreferences(value.preferences) ||
    !isTransferWebDav(value.webDav) ||
    !Array.isArray(value.photos) ||
    typeof value.contentSha256 !== "string"
  ) {
    throw new Error("迁移包内容结构无效。");
  }

  const payload = value as unknown as TransferPayload;
  const { contentSha256, ...core } = payload;

  if (
    (await sha256Hex(textEncoder.encode(JSON.stringify(core)))) !==
    contentSha256
  ) {
    throw new Error("迁移包内容校验失败。");
  }

  return payload;
}

function isTransferSnapshot(value: unknown): value is DadKitSnapshot {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["id", "createdAt", "reason", "data"]) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isValidDateString(value.createdAt) &&
    typeof value.reason === "string" &&
    value.reason.length > 0 &&
    isDadKitImportData(value.data)
  );
}

function isPreferences(value: unknown): value is TransferPayload["preferences"] {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["theme", "showFullDescriptions"]) &&
    ["system", "light", "dark"].includes(String(value.theme)) &&
    typeof value.showFullDescriptions === "boolean"
  );
}

function isTransferWebDav(value: unknown): value is TransferPayload["webDav"] {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["config"]) ||
    !isRecord(value.config)
  ) {
    return false;
  }

  const config = value.config;
  return (
    hasExactKeys(config, [
      "enabled",
      "endpoint",
      "username",
      "remoteDir",
      "filename",
      "authMode",
      "rememberSecret",
    ]) &&
    typeof config.enabled === "boolean" &&
    ["endpoint", "username", "remoteDir", "filename"].every(
      (key) => typeof config[key] === "string",
    ) &&
    (config.authMode === "basic" || config.authMode === "app_password") &&
    config.rememberSecret === false
  );
}

function isTransferPhoto(value: unknown): value is TransferPhoto {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "itemId",
      "updatedAt",
      "width",
      "height",
      "mimeType",
      "bytes",
      "sha256",
    ]) &&
    typeof value.itemId === "string" &&
    value.itemId.trim().length > 0 &&
    isValidDateString(value.updatedAt) &&
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    typeof value.height === "number" &&
    Number.isFinite(value.height) &&
    value.height > 0 &&
    typeof value.mimeType === "string" &&
    typeof value.bytes === "string" &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(value.sha256)
  );
}

function writePreferences(preferences: TransferPayload["preferences"]) {
  window.localStorage.setItem(THEME_STORAGE_KEY, preferences.theme);
  window.localStorage.setItem(
    CHECKLIST_DESCRIPTION_PREFERENCE_KEY,
    String(preferences.showFullDescriptions),
  );
  applyThemePreference(preferences.theme);
}

function readThemePreference(): ThemePreference {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function assertPassword(password: string) {
  if (password.length < 12 || password.length > 128) {
    throw new Error("一次性密码需要 12–128 个字符。");
  }
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[],
) {
  const material = await crypto.subtle.importKey(
    "raw",
    asArrayBuffer(textEncoder.encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: asArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", asArrayBuffer(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function gzip(bytes: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("当前浏览器不支持创建压缩迁移包，请先升级浏览器。");
  }

  return transformBytes(bytes, new CompressionStream("gzip"));
}

async function gunzip(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("当前浏览器不支持解压迁移包，请先升级浏览器。");
  }

  return transformBytes(bytes, new DecompressionStream("gzip"));
}

async function transformBytes(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
) {
  const writer = transform.writable.getWriter();
  // Start consuming before awaiting write(): otherwise a larger payload can
  // fill the transform's internal queue and leave the writer waiting forever
  // for a reader that is only created after the write completes.
  const output = new Response(transform.readable).arrayBuffer();

  try {
    await writer.write(asArrayBuffer(bytes));
    await writer.close();
    return new Uint8Array(await output);
  } catch (error) {
    await writer.abort(error).catch(() => undefined);
    await output.catch(() => undefined);
    throw error;
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }

  return btoa(binary);
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Web Crypto's TypeScript declarations intentionally reject an
  // ArrayBufferLike view (which could be backed by SharedArrayBuffer). Copying
  // also prevents a later mutation from changing the authenticated payload.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function fromBase64(value: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("迁移包包含无效的 Base64 数据。");
  }

  let binary: string;

  try {
    binary = atob(value);
  } catch {
    throw new Error("迁移包包含无效的 Base64 数据。");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
