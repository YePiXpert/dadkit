"use client";

import { create } from "zustand";

import {
  applyImportDataAsync,
  buildLatestPortableData,
  createSnapshotAsync,
} from "@/lib/data/backup";
import {
  isDadKitImportData,
  upgradeExportDataToLatest,
  type DadKitExportData,
  type DadKitImportData,
} from "@/lib/data/format";
import {
  flushPendingChecklistStateSave,
} from "@/lib/data/local-repository";
import {
  isLegacySyncSession,
  isSyncSessionV2,
  loadSyncClientState,
  loadSyncSession,
  saveSyncClientState,
  saveSyncSession,
  type SyncSessionLocalV2,
} from "@/lib/data/settings-repository";
import {
  estimateSyncClockOffset,
  getSyncClockOffset,
  getSyncClockTimelineInitialized,
  saveSyncClockOffset,
  saveSyncClockTimelineInitialized,
} from "@/lib/sync-clock";
import { mergeExportData } from "@/lib/sync/merge";
import { DADKIT_DATA_VERSION_HEADER } from "@/lib/sync/data-version";
import {
  DADKIT_SYNC_PROTOCOL_HEADER,
  DADKIT_SYNC_PROTOCOL_VERSION,
} from "@/lib/sync/protocol-version";
import { normalizeSyncSpaceName } from "@/lib/sync/space-name";
import {
  clearSyncSessionExpired,
  markSyncSessionExpired,
} from "@/lib/sync-session-status";
import { useDadKitStore } from "@/lib/store";
import { calculateChecksum } from "@/lib/webdav/checksum";

export type SyncOutcome = {
  ok: boolean;
  message?: string;
  deferred?: boolean;
};

export type SyncInvite = {
  code: string;
  expiresAt: string;
};

export type SyncInviteOutcome = SyncOutcome & {
  invite?: SyncInvite;
};

export type SyncJoinDataMode = "remote" | "merge";

type SyncStatus = {
  joined: boolean;
  syncing: boolean;
  lastSyncAt?: string;
  lastError?: string;
  retryAt?: string;
  retryAttempt?: number;
};

type SpaceSnapshotPayload = {
  version: number;
  updatedAt: string;
  serverTime?: string;
  data: unknown;
};

type ApiResult<T> = {
  data?: T;
  etag?: string;
  receivedAt: number;
  requestStartedAt: number;
  serverTime?: string;
  notModified: boolean;
};

export class SyncApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "SyncApiError";
  }
}

export const SYNC_REQUEST_TIMEOUT_MS = 15_000;
export const SYNC_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 120_000, 300_000];

export function getSyncRetryDelay(
  baseDelay: number,
  random = Math.random(),
) {
  return Math.round(baseDelay * (0.8 + Math.min(1, Math.max(0, random)) * 0.4));
}

export const useSyncStatusStore = create<SyncStatus>(() => ({
  joined: false,
  syncing: false,
}));

let applyingRemote = false;
let syncInFlight: Promise<SyncOutcome> | undefined;
let syncQueued = false;
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

export function isApplyingRemote() {
  return applyingRemote;
}

export function refreshSyncStatus() {
  const state = loadSyncClientState();

  useSyncStatusStore.setState({
    joined: Boolean(loadSyncSession()),
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    retryAt: state.retryAt,
    retryAttempt: state.retryAttempt,
  });
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    details?: Record<string, unknown>;
  };

  if (!response.ok) {
    throw new SyncApiError(
      typeof payload.error === "string" && payload.error
        ? payload.error
        : "同步服务请求失败。",
      response.status,
      payload.code,
      payload.details,
      Number(response.headers.get("retry-after")) || undefined,
    );
  }

  return payload;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  options: { acceptNotModified?: boolean } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("同步请求超时。")),
    SYNC_REQUEST_TIMEOUT_MS,
  );
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  headers.set(DADKIT_DATA_VERSION_HEADER, "9");
  headers.set(DADKIT_SYNC_PROTOCOL_HEADER, String(DADKIT_SYNC_PROTOCOL_VERSION));

  const parentSignal = init.signal;
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal) {
    if (parentSignal.aborted) {
      abortFromParent();
    } else {
      parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  const requestStartedAt = Date.now();

  try {
    const response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers,
      signal: controller.signal,
    });
    const receivedAt = Date.now();
    const etag = response.headers.get("etag") ?? undefined;
    const serverTime = response.headers.get("x-dadkit-server-time") ?? undefined;

    if (options.acceptNotModified && response.status === 304) {
      return {
        etag,
        receivedAt,
        requestStartedAt,
        serverTime,
        notModified: true,
      };
    }

    const data = await parseApiResponse<T>(response);

    return {
      data,
      etag,
      receivedAt,
      requestStartedAt,
      serverTime: serverTime ?? getPayloadServerTime(data),
      notModified: false,
    };
  } catch (error) {
    if (error instanceof SyncApiError) {
      throw error;
    }

    if (controller.signal.aborted && !parentSignal?.aborted) {
      throw new SyncApiError("同步请求超过 15 秒，稍后会自动重试。", 0);
    }

    throw new SyncApiError("网络连接失败，稍后会自动重试。", 0);
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

function checksumOf(data: DadKitImportData) {
  return calculateChecksum({ ...data, exportedAt: "" });
}

function getPayloadServerTime(payload: unknown) {
  return (
    payload &&
    typeof payload === "object" &&
    "serverTime" in payload &&
    typeof payload.serverTime === "string"
      ? payload.serverTime
      : undefined
  );
}

function observeServerTime(
  serverTime: string | undefined,
  requestStartedAt: number,
  receivedAt: number,
) {
  const offset = estimateSyncClockOffset(
    serverTime,
    receivedAt,
    requestStartedAt,
  );

  if (offset !== undefined) {
    saveSyncClockOffset(offset);
  }

  return offset;
}

export function alignExportDataToServerTime(
  data: DadKitExportData,
  offset: number,
): DadKitExportData {
  const shiftTimestamp = (timestamp: number) =>
    timestamp === 0 ? 0 : timestamp + offset;
  const shiftItem = (item: (typeof data.checklist)[number]) =>
    typeof item.updatedAt === "number"
      ? { ...item, updatedAt: shiftTimestamp(item.updatedAt) }
      : item;

  return {
    ...data,
    checklist: data.checklist.map(shiftItem),
    customItems: data.customItems.map(shiftItem),
    hiddenTemplateItemStamps: Object.fromEntries(
      Object.entries(data.hiddenTemplateItemStamps).map(([id, stamp]) => [
        id,
        { ...stamp, updatedAt: shiftTimestamp(stamp.updatedAt) },
      ]),
    ),
    deletedCustomItems: Object.fromEntries(
      Object.entries(data.deletedCustomItems).map(([id, timestamp]) => [
        id,
        shiftTimestamp(timestamp),
      ]),
    ),
    growthUpdatedAt: shiftTimestamp(data.growthUpdatedAt),
    hospital: {
      version: 1,
      fields: Object.fromEntries(
        Object.entries(data.hospital.fields).map(([key, field]) => [
          key,
          { ...field, updatedAt: shiftTimestamp(field.updatedAt) },
        ]),
      ) as DadKitExportData["hospital"]["fields"],
    },
    planning: {
      version: 2,
      clearedAt: shiftTimestamp(data.planning.clearedAt),
      items: Object.fromEntries(
        Object.entries(data.planning.items).map(([itemId, record]) => [
          itemId,
          Object.fromEntries(
            Object.entries(record).map(([key, field]) => [
              key,
              { ...field, updatedAt: shiftTimestamp(field.updatedAt) },
            ]),
          ),
        ]),
      ) as DadKitExportData["planning"]["items"],
    },
    household: {
      version: 1,
      clearedAt: shiftTimestamp(data.household.clearedAt),
      householdName: {
        ...data.household.householdName,
        updatedAt: shiftTimestamp(data.household.householdName.updatedAt),
      },
      members: Object.fromEntries(
        Object.entries(data.household.members).map(([id, member]) => [id, {
          ...member,
          createdAt: shiftTimestamp(member.createdAt),
          displayName: { ...member.displayName, updatedAt: shiftTimestamp(member.displayName.updatedAt) },
          relationshipLabel: { ...member.relationshipLabel, updatedAt: shiftTimestamp(member.relationshipLabel.updatedAt) },
          deleted: { ...member.deleted, updatedAt: shiftTimestamp(member.deleted.updatedAt) },
        }]),
      ),
    },
    baby: alignBabyDataToServerTime(data.baby, offset),
  };
}

function alignBabyDataToServerTime(
  baby: DadKitExportData["baby"],
  offset: number,
): DadKitExportData["baby"] {
  const shift = (timestamp: number) => (timestamp === 0 ? 0 : timestamp + offset);
  const shiftIso = (value: string | null) =>
    value === null ? null : new Date(Date.parse(value) + offset).toISOString();
  const events = baby.care.events.map((event) => {
    const base = {
      ...event,
      createdAt: shift(event.createdAt),
      updatedAt: shift(event.updatedAt),
      deletedAt: event.deletedAt === null ? null : shift(event.deletedAt),
    };
    if (event.type === "breastfeeding") {
      return {
        ...base,
        startAt: shiftIso(event.startAt)!,
        endAt: shiftIso(event.endAt),
        segments: event.segments.map((segment) => ({
          ...segment,
          startAt: shiftIso(segment.startAt)!,
          endAt: shiftIso(segment.endAt),
        })),
      };
    }
    if (event.type === "bottle" || event.type === "diaper") {
      return { ...base, occurredAt: shiftIso(event.occurredAt)! };
    }
    return {
      ...base,
      startAt: shiftIso(event.startAt)!,
      endAt: shiftIso(event.endAt),
    };
  }) as DadKitExportData["baby"]["care"]["events"];

  return {
    version: 2,
    profile: {
      version: 1,
      clearedAt: shift(baby.profile.clearedAt),
      fields: {
        nickname: { ...baby.profile.fields.nickname, updatedAt: shift(baby.profile.fields.nickname.updatedAt) },
        birthDate: { ...baby.profile.fields.birthDate, updatedAt: shift(baby.profile.fields.birthDate.updatedAt) },
        birthTime: { ...baby.profile.fields.birthTime, updatedAt: shift(baby.profile.fields.birthTime.updatedAt) },
        sex: { ...baby.profile.fields.sex, updatedAt: shift(baby.profile.fields.sex.updatedAt) },
      },
    },
    care: { version: 2, clearedAt: shift(baby.care.clearedAt), events },
  };
}

async function applyMerged(data: DadKitExportData, alignOffset?: number) {
  const latestExport = await buildLatestPortableData();
  const latestLocal = alignOffset === undefined
    ? latestExport
    : alignExportDataToServerTime(latestExport, alignOffset);
  const rebased = mergeExportData(latestLocal, data);

  applyingRemote = true;

  try {
    const result = await applyImportDataAsync(rebased);

    if (!result.ok) {
      throw new Error(result.message);
    }
    return rebased;
  } finally {
    applyingRemote = false;
  }
}

async function replaceLocalWithRemote(
  data: DadKitImportData,
  localChecklistMode: DadKitExportData["checklistMode"],
) {
  const replacement: DadKitExportData = {
    ...upgradeExportDataToLatest(data),
    // 清单显示模式是设备偏好，不随家庭数据覆盖。
    checklistMode: localChecklistMode,
  };

  applyingRemote = true;
  try {
    const result = await applyImportDataAsync(replacement);
    if (!result.ok) throw new Error(result.message);
    return replacement;
  } finally {
    applyingRemote = false;
  }
}

function isCurrentSyncSession(expected: ReturnType<typeof loadSyncSession>) {
  const current = loadSyncSession();
  if (!expected || !current) return false;

  if (isLegacySyncSession(expected) || isLegacySyncSession(current)) {
    return (
      isLegacySyncSession(expected) &&
      isLegacySyncSession(current) &&
      expected.token === current.token
    );
  }

  return (
    expected.spaceId === current.spaceId &&
    expected.sessionId === current.sessionId
  );
}

function clearRetrySchedule() {
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  retryAttempt = 0;
}

function scheduleRetry(minimumDelayMs = 0) {
  if (retryTimer !== undefined || !loadSyncSession()) {
    return;
  }

  const baseDelay =
    SYNC_RETRY_DELAYS_MS[
      Math.min(retryAttempt, SYNC_RETRY_DELAYS_MS.length - 1)
    ]!;
  const delay = Math.max(minimumDelayMs, getSyncRetryDelay(baseDelay));

  retryAttempt += 1;
  const retryAt = new Date(Date.now() + delay).toISOString();
  const state = loadSyncClientState();
  saveSyncClientState({ ...state, retryAt, retryAttempt });
  useSyncStatusStore.setState({ retryAt, retryAttempt });
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void syncNow();
  }, delay);
  (retryTimer as { unref?: () => void }).unref?.();
}

async function doSync(): Promise<SyncOutcome> {
  const session = loadSyncSession();

  if (!session) {
    return { ok: false };
  }

  if (useDadKitStore.getState().pendingRemovalIds.length > 0) {
    return {
      ok: false,
      message: "删除撤销窗口尚未结束，稍后自动同步。",
      deferred: true,
    };
  }

  useSyncStatusStore.setState({ syncing: true });

  try {
    flushPendingChecklistStateSave();
    const previousState = loadSyncClientState();
    const initialDataMode = previousState.initialDataMode;
    const pullHeaders = new Headers();

    if (previousState.lastEtag) {
      pullHeaders.set("if-none-match", previousState.lastEtag);
    }

    const pulled = await apiRequest<SpaceSnapshotPayload>(
      "/api/sync/pull",
      { headers: pullHeaders },
      isLegacySyncSession(session) ? session.token : undefined,
      { acceptNotModified: true },
    );
    if (!isCurrentSyncSession(session)) return { ok: false };
    const observedOffset = observeServerTime(
      pulled.serverTime ?? pulled.data?.serverTime,
      pulled.requestStartedAt,
      pulled.receivedAt,
    );
    const localExport = await buildLatestPortableData();
    const shouldAlignTimeline =
      !getSyncClockTimelineInitialized() &&
      (observedOffset ?? getSyncClockOffset()) !== undefined;
    const alignmentOffset = shouldAlignTimeline
      ? observedOffset ?? getSyncClockOffset() ?? 0
      : undefined;
    const local = shouldAlignTimeline
      ? alignExportDataToServerTime(
          localExport,
          alignmentOffset!,
        )
      : localExport;
    let merged = local;

    if (shouldAlignTimeline) {
      try {
        await createSnapshotAsync("首次同步时间校准前");
      } catch {
        // 快照是尽力而为的保护，失败不阻断同步。
      }
    }
    let latestEtag = pulled.etag ?? previousState.lastEtag;
    let remoteData: DadKitImportData | undefined;

    if (
      !pulled.notModified &&
      pulled.data?.data &&
      isDadKitImportData(pulled.data.data)
    ) {
      remoteData = pulled.data.data;
      if (initialDataMode === "remote") {
        merged = await replaceLocalWithRemote(remoteData, local.checklistMode);
      } else {
        merged = mergeExportData(local, remoteData);

        if (shouldAlignTimeline || checksumOf(merged) !== checksumOf(local)) {
          merged = await applyMerged(merged, alignmentOffset);
        }
      }
    } else if (initialDataMode === "remote") {
      throw new Error("家庭数据尚未准备好，请让创建者先完成一次同步后重试。");
    } else if (shouldAlignTimeline) {
      // The first server-time observation may arrive with a 304 response. Apply
      // the shifted local timeline before the next write is compared or pushed.
      merged = await applyMerged(merged, alignmentOffset);
    }

    if (shouldAlignTimeline) {
      saveSyncClockTimelineInitialized(true);
    }

    const mergedChecksum = checksumOf(merged);
    const localHasNews = initialDataMode === "remote"
      ? false
      : pulled.notModified
        ? mergedChecksum !== previousState.lastSyncedChecksum
        : !remoteData || mergedChecksum !== checksumOf(remoteData);

    if (localHasNews) {
      if (!isCurrentSyncSession(session)) return { ok: false };
      const pushed = await apiRequest<SpaceSnapshotPayload>(
        "/api/sync/push",
        { method: "POST", body: JSON.stringify({ data: merged }) },
        isLegacySyncSession(session) ? session.token : undefined,
      );
      if (!isCurrentSyncSession(session)) return { ok: false };

      latestEtag = pushed.etag ?? latestEtag;
      observeServerTime(
        pushed.serverTime ?? pushed.data?.serverTime,
        pushed.requestStartedAt,
        pushed.receivedAt,
      );

      if (
        pushed.data?.data &&
        isDadKitImportData(pushed.data.data) &&
        checksumOf(pushed.data.data) !== mergedChecksum
      ) {
        // A legacy-compatible response may omit hospital and/or planning.
        // Merge its supported fields instead of treating absence as a clear.
        merged = mergeExportData(merged, pushed.data.data);
        merged = await applyMerged(merged);
      }
    }

    if (!isCurrentSyncSession(session)) return { ok: false };
    const lastSyncAt = new Date().toISOString();

    saveSyncClientState({
      lastSyncAt,
      lastEtag: latestEtag,
      lastSyncedChecksum: checksumOf(merged),
    });
    useSyncStatusStore.setState({
      joined: true,
      syncing: false,
      lastSyncAt,
      lastError: undefined,
      retryAt: undefined,
      retryAttempt: undefined,
    });
    clearRetrySchedule();

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "同步失败。";

    if (!isCurrentSyncSession(session)) return { ok: false };

    if (error instanceof SyncApiError && error.status === 401) {
      clearRetrySchedule();
      saveSyncSession(undefined);
      markSyncSessionExpired("家庭同步会话已失效，请重新加入后继续同步。");
      saveSyncClientState({ lastError: message });
      useSyncStatusStore.setState({
        joined: false,
        syncing: false,
        lastError: message,
        retryAt: undefined,
        retryAttempt: undefined,
      });

      return { ok: false, message };
    }

    const state = loadSyncClientState();

    saveSyncClientState({ ...state, lastError: message });
    useSyncStatusStore.setState({ syncing: false, lastError: message });
    if (!(error instanceof SyncApiError && error.status === 413)) {
      scheduleRetry(
        error instanceof SyncApiError && error.status === 429
          ? (error.retryAfterSeconds ?? 0) * 1000
          : 0,
      );
    }

    return { ok: false, message };
  }
}

async function runSyncQueue() {
  let outcome: SyncOutcome = { ok: false };

  do {
    syncQueued = false;
    outcome = await doSync();
  } while (syncQueued && loadSyncSession());

  return outcome;
}

export function syncNow(): Promise<SyncOutcome> {
  if (syncInFlight) {
    syncQueued = true;
    return syncInFlight;
  }

  syncInFlight = runSyncQueue().finally(() => {
    syncInFlight = undefined;
  });

  return syncInFlight;
}

export async function joinSpace(
  name: string,
  code: string,
): Promise<SyncOutcome> {
  const spaceName = normalizeSyncSpaceName(name);

  try {
    const result = await apiRequest<{ token: string }>("/api/sync/join", {
      method: "POST",
      body: JSON.stringify({ name: spaceName, code, existingOnly: true }),
    });

    if (!result.data?.token) {
      throw new SyncApiError("同步服务没有返回有效会话。", 502);
    }

    clearRetrySchedule();
    saveSyncClientState({});
    saveSyncSession({
      token: result.data.token,
      joinedAt: new Date().toISOString(),
      spaceName,
    });
    useSyncStatusStore.setState({ joined: true });
    clearSyncSessionExpired();

    const synced = await syncNow();

    return synced.deferred ? { ok: true } : synced;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && error.message
          ? error.message
          : "加入家庭同步失败。",
    };
  }
}

export async function createSpace(
  name: string,
): Promise<SyncInviteOutcome> {
  const spaceName = normalizeSyncSpaceName(name);

  try {
    const result = await apiRequest<{
      token: string;
      invite: SyncInvite;
    }>("/api/sync/create", {
      method: "POST",
      body: JSON.stringify({ name: spaceName }),
    });

    if (!result.data?.token || !result.data.invite) {
      throw new SyncApiError("同步服务没有返回有效会话。", 502);
    }

    clearRetrySchedule();
    saveSyncClientState({});
    saveSyncSession({
      token: result.data.token,
      joinedAt: new Date().toISOString(),
      spaceName,
    });
    useSyncStatusStore.setState({ joined: true });
    clearSyncSessionExpired();

    const synced = await syncNow();

    return {
      ok: true,
      invite: result.data.invite,
      message: synced.ok || synced.deferred ? undefined : synced.message,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && error.message
          ? error.message
          : "创建家庭同步失败。",
    };
  }
}

export async function createInvite(
  name: string,
): Promise<SyncInviteOutcome> {
  const session = loadSyncSession();
  const spaceName = normalizeSyncSpaceName(name);

  if (!session) {
    return { ok: false, message: "请先加入家庭同步。" };
  }
  if (!isLegacySyncSession(session)) {
    return { ok: false, message: "请在同步管理页生成邀请链接。" };
  }

  try {
    const result = await apiRequest<SyncInvite>(
      "/api/sync/invite",
      {
        method: "POST",
        body: JSON.stringify({ name: spaceName }),
      },
      session.token,
    );

    if (!result.data?.code || !result.data.expiresAt) {
      throw new SyncApiError("同步服务没有返回有效口令。", 502);
    }

    saveSyncSession({ ...session, spaceName });
    return { ok: true, invite: result.data };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "生成加入口令失败。";

    if (error instanceof SyncApiError && error.status === 401) {
      clearRetrySchedule();
      saveSyncSession(undefined);
      markSyncSessionExpired("家庭同步会话已失效，请重新加入后继续同步。");
      saveSyncClientState({ lastError: message });
      useSyncStatusStore.setState({
        joined: false,
        syncing: false,
        lastError: message,
        retryAt: undefined,
        retryAttempt: undefined,
      });
    }

    return { ok: false, message };
  }
}

export async function leaveSpace(): Promise<SyncOutcome> {
  const session = loadSyncSession();
  if (session) {
    try {
      await apiRequest(
        "/api/sync/leave",
        { method: "POST" },
        isLegacySyncSession(session) ? session.token : undefined,
      );
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "退出同步空间失败。",
      };
    }
  }

  clearRetrySchedule();
  clearSyncSessionExpired();
  saveSyncSession(undefined);
  saveSyncClientState({});
  useSyncStatusStore.setState({
    joined: false,
    syncing: false,
    lastSyncAt: undefined,
    lastError: undefined,
    retryAt: undefined,
    retryAttempt: undefined,
  });
  return { ok: true };
}

export type SyncSpaceRole = "owner" | "member";

export type SyncSpaceUsage = {
  dataBytes: number;
  dataLimitBytes: number;
  deviceCount: number;
  deviceLimit: number;
  activeInviteCount: number;
  activeInviteLimit: number;
};

export type SyncSessionMetadata = {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  deviceName: string;
  role: SyncSpaceRole;
  protocolVersion: 1 | 2;
};

export type SyncSpaceMetadata = {
  spaceId: string;
  kind: "legacy-name" | "random";
  displayName: string;
  dataRevision: number;
  metadataRevision: number;
  dataUpdatedAt: string;
  metadataUpdatedAt: string;
  currentSession: SyncSessionMetadata;
  usage: SyncSpaceUsage;
};

export type SyncInviteMetadata = {
  id: string;
  createdAt: string;
  expiresAt: string;
  createdBySessionId: string;
  role: "member";
  usedAt: string | null;
  revokedAt: string | null;
};

export type SyncServiceInfo = {
  syncProtocolVersion: 2;
  supportedDataVersions: number[];
  registrationMode: "open" | "closed";
  maxSpaceBytes: number;
  maxDevices: number;
  maxActiveInvites: number;
  inviteTtlOptions: number[];
  secureTransport: boolean;
  serverTime: string;
};

function localSessionFromSpace(
  space: SyncSpaceMetadata,
  joinedAt = new Date().toISOString(),
): SyncSessionLocalV2 {
  return {
    version: 2,
    protocolVersion: 2,
    spaceId: space.spaceId,
    displayName: space.displayName,
    sessionId: space.currentSession.id,
    deviceName: space.currentSession.deviceName,
    role: space.currentSession.role,
    joinedAt,
  };
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function fetchSyncServiceInfo() {
  try {
    const result = await apiRequest<SyncServiceInfo>("/api/sync/service-info");
    return { ok: true as const, data: result.data! };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "无法读取同步服务信息。") };
  }
}

export async function fetchSyncSpaceMetadata() {
  try {
    const result = await apiRequest<{ space: SyncSpaceMetadata }>("/api/sync/v2/space");
    if (!result.data?.space) throw new SyncApiError("同步空间信息不完整。", 502);
    const existing = loadSyncSession();
    saveSyncSession(localSessionFromSpace(result.data.space, existing?.joinedAt));
    return { ok: true as const, space: result.data.space };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "无法读取同步空间信息。") };
  }
}

export async function createRandomSyncSpace(displayName: string, deviceName: string) {
  try {
    const result = await apiRequest<{ space: SyncSpaceMetadata }>(
      "/api/sync/v2/spaces",
      { method: "POST", body: JSON.stringify({ displayName, deviceName }) },
    );
    if (!result.data?.space) throw new SyncApiError("同步服务没有返回空间信息。", 502);
    clearRetrySchedule();
    saveSyncClientState({});
    saveSyncSession(localSessionFromSpace(result.data.space));
    useSyncStatusStore.setState({ joined: true });
    clearSyncSessionExpired();
    const synced = await syncNow();
    return {
      ok: true as const,
      space: result.data.space,
      message: synced.ok || synced.deferred ? undefined : synced.message,
    };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "创建家庭同步空间失败。") };
  }
}

export async function joinSyncSpaceByInvite(
  inviteToken: string,
  deviceName: string,
  options: {
    replaceExisting: boolean;
    initialDataMode: SyncJoinDataMode;
  },
) {
  try {
    const existing = loadSyncSession();
    if (existing && !options.replaceExisting) {
      return {
        ok: false as const,
        message: "当前设备已经连接家庭同步，请先确认切换同步空间。",
      };
    }
    await createSnapshotAsync("加入家庭同步前");
    const result = await apiRequest<{ space: SyncSpaceMetadata }>(
      "/api/sync/v2/join",
      { method: "POST", body: JSON.stringify({ inviteToken, deviceName }) },
      isLegacySyncSession(existing) ? existing.token : undefined,
    );
    if (!result.data?.space) throw new SyncApiError("同步服务没有返回空间信息。", 502);
    clearRetrySchedule();
    saveSyncClientState({ initialDataMode: options.initialDataMode });
    saveSyncSession(localSessionFromSpace(result.data.space));
    useSyncStatusStore.setState({ joined: true });
    clearSyncSessionExpired();
    const synced = await syncNow();
    return {
      ok: true as const,
      space: result.data.space,
      message: synced.ok || synced.deferred ? undefined : synced.message,
    };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "加入家庭同步失败。") };
  }
}

export async function upgradeLegacySyncSession(deviceName = "这台设备") {
  const legacy = loadSyncSession();
  if (!isLegacySyncSession(legacy)) return { ok: false as const, message: "没有需要升级的旧同步会话。" };
  try {
    const upgraded = await apiRequest<{ space: SyncSpaceMetadata }>(
      "/api/sync/v2/session/upgrade",
      {
        method: "POST",
        body: JSON.stringify({
          displayName: legacy.spaceName ?? "家庭同步",
          deviceName,
        }),
      },
      legacy.token,
    );
    if (!upgraded.data?.space) throw new SyncApiError("同步会话升级响应不完整。", 502);

    // 只有 Cookie 独立通过一次认证后，才删除本机原始 token。
    const verified = await apiRequest<{ space: SyncSpaceMetadata }>("/api/sync/v2/space");
    if (!verified.data?.space) throw new SyncApiError("Cookie 会话验证失败。", 401);
    saveSyncSession(localSessionFromSpace(verified.data.space, legacy.joinedAt));
    return { ok: true as const, space: verified.data.space };
  } catch (error) {
    // 保留旧 token；原有 pull/push 仍可继续使用。
    return { ok: false as const, message: messageOf(error, "旧同步会话暂时无法升级。") };
  }
}

export async function listSyncSessions() {
  try {
    const result = await apiRequest<{ sessions: SyncSessionMetadata[] }>("/api/sync/v2/sessions");
    return { ok: true as const, sessions: result.data?.sessions ?? [] };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "无法读取设备列表。") };
  }
}

export async function updateSyncSession(
  sessionId: string,
  patch: { deviceName?: string; role?: SyncSpaceRole },
) {
  try {
    const result = await apiRequest<{ session: SyncSessionMetadata }>(
      `/api/sync/v2/sessions/${encodeURIComponent(sessionId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
    if (result.data?.session.current) {
      const local = loadSyncSession();
      if (isSyncSessionV2(local)) {
        saveSyncSession({
          ...local,
          deviceName: result.data.session.deviceName,
          role: result.data.session.role,
        });
      }
    }
    return { ok: true as const, session: result.data?.session };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "更新设备失败。") };
  }
}

export async function revokeSyncSession(sessionId: string) {
  try {
    await apiRequest(`/api/sync/v2/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "撤销设备失败。") };
  }
}

export async function listSyncInvites() {
  try {
    const result = await apiRequest<{ invites: SyncInviteMetadata[] }>("/api/sync/v2/invites");
    return { ok: true as const, invites: result.data?.invites ?? [] };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "无法读取邀请列表。") };
  }
}

export async function createSyncInviteLink(ttlMinutes: number) {
  try {
    const result = await apiRequest<{
      invite: { id: string; token: string; expiresAt: string };
    }>("/api/sync/v2/invites", {
      method: "POST",
      body: JSON.stringify({ ttlMinutes }),
    });
    const invite = result.data?.invite;
    if (!invite) throw new SyncApiError("同步服务没有返回邀请。", 502);
    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    return {
      ok: true as const,
      invite: {
        ...invite,
        link: `${origin}/join#invite=${encodeURIComponent(invite.token)}`,
      },
    };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "生成邀请失败。") };
  }
}

export async function revokeSyncInvite(inviteId: string) {
  try {
    await apiRequest(`/api/sync/v2/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "撤销邀请失败。") };
  }
}

export async function renameSyncSpace(displayName: string) {
  try {
    const result = await apiRequest<{ space: SyncSpaceMetadata }>("/api/sync/v2/space", {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    });
    if (result.data?.space) {
      const local = loadSyncSession();
      if (isSyncSessionV2(local)) saveSyncSession({ ...local, displayName: result.data.space.displayName });
    }
    return { ok: true as const, space: result.data?.space };
  } catch (error) {
    return { ok: false as const, message: messageOf(error, "重命名同步空间失败。") };
  }
}

export async function deleteSyncSpacePermanently(confirmation: string) {
  try {
    await createSnapshotAsync("永久删除服务器同步空间前");
    await apiRequest("/api/sync/v2/space", {
      method: "DELETE",
      body: JSON.stringify({ confirmation }),
    });
    clearRetrySchedule();
    saveSyncSession(undefined);
    saveSyncClientState({});
    useSyncStatusStore.setState({ joined: false, syncing: false });
    return { ok: true as const };
  } catch (error) {
    // 服务端确认删除前保留本机会话与全部业务数据。
    return { ok: false as const, message: messageOf(error, "永久删除同步空间失败。") };
  }
}
