import type { DadKitImportData } from "@/lib/data/format";
import type { SyncSpaceFileV2, SyncSpaceUsage } from "@/lib/sync/space-schema";
import type { SyncSpaceConfig } from "@/lib/sync/space-config";

export function canonicalDataBytes(data: DadKitImportData | null) {
  return data === null ? 0 : Buffer.byteLength(JSON.stringify(data), "utf8");
}

export function isSessionActive(lastSeenAt: string, now: number, ttlMs: number) {
  return now - Date.parse(lastSeenAt) <= ttlMs;
}

export function isInviteActive(
  invite: SyncSpaceFileV2["invites"][string],
  now: number,
) {
  return (
    invite.usedAt === null &&
    invite.revokedAt === null &&
    Date.parse(invite.expiresAt) > now
  );
}

export function syncSpaceUsage(
  space: SyncSpaceFileV2,
  config: SyncSpaceConfig,
  now = Date.now(),
): SyncSpaceUsage {
  return {
    dataBytes: canonicalDataBytes(space.data),
    dataLimitBytes: config.maxSpaceBytes,
    deviceCount: Object.values(space.sessions).filter((session) =>
      isSessionActive(session.lastSeenAt, now, config.sessionTtlMs),
    ).length,
    deviceLimit: config.maxDevices,
    activeInviteCount: Object.values(space.invites).filter((invite) =>
      isInviteActive(invite, now),
    ).length,
    activeInviteLimit: config.maxActiveInvites,
  };
}
