import type { DadKitImportData } from "@/lib/data/format";

export const SYNC_SPACE_SCHEMA_VERSION = 2 as const;

export type SyncSpaceRole = "owner" | "member";

export type SyncSpaceSessionV2 = {
  createdAt: string;
  lastSeenAt: string;
  deviceName: string;
  role: SyncSpaceRole;
  protocolVersion: 2;
};

export type SyncSpaceInviteV2 = {
  id: string;
  codeSalt: string;
  codeHash: string;
  shortCodeSalt?: string;
  shortCodeHash?: string;
  shortCodeLookup?: string;
  createdAt: string;
  expiresAt: string;
  createdBySessionId: string;
  role: "member";
  usedAt: string | null;
  revokedAt: string | null;
};

export type SyncSpaceFileV2 = {
  schemaVersion: 2;
  spaceId: string;
  kind: "random";
  displayName: string;
  createdAt: string;
  dataRevision: number;
  metadataRevision: number;
  dataUpdatedAt: string;
  metadataUpdatedAt: string;
  data: DadKitImportData | null;
  sessions: Record<string, SyncSpaceSessionV2>;
  invites: Record<string, SyncSpaceInviteV2>;
};

export type SyncSpaceUsage = {
  dataBytes: number;
  dataLimitBytes: number;
  deviceCount: number;
  deviceLimit: number;
  activeInviteCount: number;
  activeInviteLimit: number;
};
