export const MAX_WEBDAV_BACKUP_BYTES = 32 * 1024 * 1024;
export const LEGACY_WEBDAV_PROXY_REQUEST_BYTES = 3 * 1024 * 1024;
export const WEBDAV_REQUEST_TIMEOUT_MS = 30_000;

export const WEBDAV_PROXY_VERSION_HEADER = "x-dadkit-webdav-proxy-version";
export const WEBDAV_PROXY_METADATA_HEADER = "x-dadkit-webdav-proxy-metadata";

export type WebDavProxyMetadata = {
  url: string;
  method: string;
  headers?: Record<string, string>;
};

export function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function encodeWebDavProxyMetadata(metadata: WebDavProxyMetadata) {
  const bytes = new TextEncoder().encode(JSON.stringify(metadata));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeWebDavProxyMetadata(encoded: string): unknown {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}
