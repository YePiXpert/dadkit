import type { DadKitImportData } from "@/lib/storage";

export type WebDavAuthMode = "basic" | "app_password";

export type WebDavConfig = {
  enabled: boolean;
  endpoint: string;
  username: string;
  remoteDir: string;
  filename: string;
  authMode: WebDavAuthMode;
  rememberSecret: boolean;
};

export type WebDavSyncState = {
  deviceId: string;
  lastSyncAt?: string;
  lastUploadAt?: string;
  lastDownloadAt?: string;
  lastRemoteUpdatedAt?: string;
  lastError?: string;
};

export type DadKitWebDavBackup = {
  schemaVersion: 3;
  app: "DadKit";
  deviceId: string;
  backupId: string;
  createdAt: string;
  updatedAt: string;
  checksum: string;
  data: DadKitImportData;
};

export type WebDavConnectionTestResult = {
  ok: boolean;
  message: string;
};

export type WebDavSyncResult = {
  ok: boolean;
  message: string;
  conflict?: boolean;
};

export const DEFAULT_WEBDAV_CONFIG: WebDavConfig = {
  enabled: false,
  endpoint: "https://webdav.123pan.cn/webdav",
  username: "",
  remoteDir: "/DadKit",
  filename: "dadkit-backup-v3.json",
  authMode: "app_password",
  rememberSecret: false,
};
