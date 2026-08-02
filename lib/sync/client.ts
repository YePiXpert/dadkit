"use client";

import { create } from "zustand";

import {
  applyImportDataAsync,
  buildLatestPortableData,
  createSnapshotAsync,
} from "@/lib/data/backup";
import {
  isDadKitImportData,
  type DadKitExportData,
  type DadKitImportData,
} from "@/lib/data/format";
import {
  flushPendingChecklistStateSave,
} from "@/lib/data/local-repository";
import {
  loadSyncClientState,
  loadSyncSession,
  saveSyncClientState,
  saveSyncSession,
} from "@/lib/data/settings-repository";
import { useGrowthStore } from "@/lib/growth-store";
import { generateChecklist } from "@/lib/rules";
import {
  estimateSyncClockOffset,
  getSyncClockOffset,
  getSyncClockTimelineInitialized,
  saveSyncClockOffset,
  saveSyncClockTimelineInitialized,
} from "@/lib/sync-clock";
import { mergeExportData } from "@/lib/sync/merge";
import { DADKIT_DATA_VERSION_HEADER } from "@/lib/sync/data-version";
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

class SyncApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
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
  };

  if (!response.ok) {
    throw new SyncApiError(
      typeof payload.error === "string" && payload.error
        ? payload.error
        : "同步服务请求失败。",
      response.status,
    );
  }

  return payload;
}

async function apiRequest<T>(
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
  headers.set(DADKIT_DATA_VERSION_HEADER, "8");

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
      version: 1,
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
    version: 1,
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
    care: { version: 1, clearedAt: shift(baby.care.clearedAt), events },
  };
}

async function applyMerged(data: DadKitExportData) {
  const checklist = generateChecklist({
    currentItems: data.checklist,
    customItems: data.customItems,
    hiddenTemplateItemIds: data.hiddenTemplateItemIds,
  });

  applyingRemote = true;

  try {
    const result = await applyImportDataAsync(data);

    if (!result.ok) {
      throw new Error(result.message);
    }

    useDadKitStore.setState({
      checklist,
      customItems: data.customItems,
      hiddenTemplateItemIds: data.hiddenTemplateItemIds,
    });
    useGrowthStore.setState({
      ...data.growth.profile,
      ...data.growth.progress,
    });
  } finally {
    applyingRemote = false;
  }
}

function clearRetrySchedule() {
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  retryAttempt = 0;
}

function scheduleRetry() {
  if (retryTimer !== undefined || !loadSyncSession()) {
    return;
  }

  const baseDelay =
    SYNC_RETRY_DELAYS_MS[
      Math.min(retryAttempt, SYNC_RETRY_DELAYS_MS.length - 1)
    ]!;
  const delay = getSyncRetryDelay(baseDelay);

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
    const pullHeaders = new Headers();

    if (previousState.lastEtag) {
      pullHeaders.set("if-none-match", previousState.lastEtag);
    }

    const pulled = await apiRequest<SpaceSnapshotPayload>(
      "/api/sync/pull",
      { headers: pullHeaders },
      session.token,
      { acceptNotModified: true },
    );
    const observedOffset = observeServerTime(
      pulled.serverTime ?? pulled.data?.serverTime,
      pulled.requestStartedAt,
      pulled.receivedAt,
    );
    const localExport = await buildLatestPortableData();
    const shouldAlignTimeline =
      !getSyncClockTimelineInitialized() &&
      (observedOffset ?? getSyncClockOffset()) !== undefined;
    const local = shouldAlignTimeline
      ? alignExportDataToServerTime(
          localExport,
          observedOffset ?? getSyncClockOffset() ?? 0,
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
      merged = mergeExportData(local, remoteData);

      if (shouldAlignTimeline || checksumOf(merged) !== checksumOf(local)) {
        await applyMerged(merged);
      }
    } else if (shouldAlignTimeline) {
      // The first server-time observation may arrive with a 304 response. Apply
      // the shifted local timeline before the next write is compared or pushed.
      await applyMerged(merged);
    }

    if (shouldAlignTimeline) {
      saveSyncClockTimelineInitialized(true);
    }

    const mergedChecksum = checksumOf(merged);
    const localHasNews = pulled.notModified
      ? mergedChecksum !== previousState.lastSyncedChecksum
      : !remoteData || mergedChecksum !== checksumOf(remoteData);

    if (localHasNews) {
      const pushed = await apiRequest<SpaceSnapshotPayload>(
        "/api/sync/push",
        { method: "POST", body: JSON.stringify({ data: merged }) },
        session.token,
      );

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
        await applyMerged(merged);
      }
    }

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
    scheduleRetry();

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

export async function leaveSpace() {
  const session = loadSyncSession();

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

  if (session) {
    try {
      await apiRequest("/api/sync/leave", { method: "POST" }, session.token);
    } catch {
      // Local logout is authoritative; server revocation is best-effort.
    }
  }
}
