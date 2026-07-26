"use client";

import { create } from "zustand";

import { GROWTH_STORAGE_KEYS, useGrowthStore } from "@/lib/growth-store";
import { generateChecklist } from "@/lib/rules";
import {
  exportData,
  isDadKitImportData,
  loadSyncClientState,
  loadSyncSession,
  saveChecklistState,
  saveDeletedCustomItems,
  saveGrowthUpdatedAt,
  saveHiddenTemplateItemStamps,
  saveSyncClientState,
  saveSyncSession,
  type DadKitExportData,
  type DadKitImportData,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import { mergeExportData } from "@/lib/sync/merge";
import { calculateChecksum } from "@/lib/webdav/client";

export type SyncOutcome = {
  ok: boolean;
  message?: string;
};

type SyncStatus = {
  joined: boolean;
  syncing: boolean;
  lastSyncAt?: string;
  lastError?: string;
};

type SpaceSnapshotPayload = {
  version: number;
  updatedAt: string;
  data: unknown;
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

export const useSyncStatusStore = create<SyncStatus>(() => ({
  joined: false,
  syncing: false,
}));

let applyingRemote = false;
let syncInFlight: Promise<SyncOutcome> | undefined;

export function isApplyingRemote() {
  return applyingRemote;
}

export function refreshSyncStatus() {
  const state = loadSyncClientState();

  useSyncStatusStore.setState({
    joined: Boolean(loadSyncSession()),
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
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
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new SyncApiError("网络连接失败，稍后会自动重试。", 0);
  }

  return parseApiResponse<T>(response);
}

function checksumOf(data: DadKitImportData) {
  return calculateChecksum({ ...data, exportedAt: "" });
}

function applyMerged(data: DadKitExportData) {
  const checklist = generateChecklist({
    currentItems: data.checklist,
    customItems: data.customItems,
    hiddenTemplateItemIds: data.hiddenTemplateItemIds,
  });

  applyingRemote = true;

  try {
    saveChecklistState({
      checklist,
      customItems: data.customItems,
      hiddenTemplateItemIds: data.hiddenTemplateItemIds,
    });
    saveHiddenTemplateItemStamps(data.hiddenTemplateItemStamps);
    saveDeletedCustomItems(data.deletedCustomItems);
    saveGrowthUpdatedAt(data.growthUpdatedAt);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        GROWTH_STORAGE_KEYS.profile,
        JSON.stringify(data.growth.profile),
      );
      window.localStorage.setItem(
        GROWTH_STORAGE_KEYS.progress,
        JSON.stringify(data.growth.progress),
      );
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

async function doSync(): Promise<SyncOutcome> {
  const session = loadSyncSession();

  if (!session) {
    return { ok: false };
  }

  useSyncStatusStore.setState({ syncing: true });

  try {
    const pulled = await apiRequest<SpaceSnapshotPayload>(
      "/api/sync/pull",
      {},
      session.token,
    );
    const local = exportData();
    let merged = local;

    if (pulled.data && isDadKitImportData(pulled.data)) {
      merged = mergeExportData(local, pulled.data);

      if (checksumOf(merged) !== checksumOf(local)) {
        applyMerged(merged);
      }
    }

    // 本地没有带来任何新内容时跳过上传,避免无意义的版本递增。
    const localHasNews =
      !pulled.data ||
      !isDadKitImportData(pulled.data) ||
      checksumOf(merged) !== checksumOf(pulled.data);

    if (localHasNews) {
      const pushed = await apiRequest<SpaceSnapshotPayload>(
        "/api/sync/push",
        { method: "POST", body: JSON.stringify({ data: merged }) },
        session.token,
      );

      if (
        pushed.data &&
        isDadKitImportData(pushed.data) &&
        pushed.data.version === 5 &&
        checksumOf(pushed.data) !== checksumOf(merged)
      ) {
        applyMerged(pushed.data);
      }
    }

    const lastSyncAt = new Date().toISOString();

    saveSyncClientState({ lastSyncAt });
    useSyncStatusStore.setState({
      joined: true,
      syncing: false,
      lastSyncAt,
      lastError: undefined,
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "同步失败。";

    if (error instanceof SyncApiError && error.status === 401) {
      saveSyncSession(undefined);
      saveSyncClientState({ lastError: message });
      useSyncStatusStore.setState({
        joined: false,
        syncing: false,
        lastError: message,
      });

      return { ok: false, message };
    }

    const state = loadSyncClientState();

    saveSyncClientState({ lastSyncAt: state.lastSyncAt, lastError: message });
    useSyncStatusStore.setState({ syncing: false, lastError: message });

    return { ok: false, message };
  }
}

export function syncNow(): Promise<SyncOutcome> {
  if (!syncInFlight) {
    syncInFlight = doSync().finally(() => {
      syncInFlight = undefined;
    });
  }

  return syncInFlight;
}

export async function joinSpace(
  name: string,
  code: string,
): Promise<SyncOutcome> {
  try {
    const result = await apiRequest<{ token: string }>("/api/sync/join", {
      method: "POST",
      body: JSON.stringify({ name, code }),
    });

    saveSyncSession({ token: result.token, joinedAt: new Date().toISOString() });
    useSyncStatusStore.setState({ joined: true });

    return await syncNow();
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

export async function leaveSpace() {
  const session = loadSyncSession();

  saveSyncSession(undefined);
  saveSyncClientState({});
  useSyncStatusStore.setState({
    joined: false,
    syncing: false,
    lastSyncAt: undefined,
    lastError: undefined,
  });

  if (session) {
    try {
      await apiRequest("/api/sync/leave", { method: "POST" }, session.token);
    } catch {
      // 本地已退出,服务端吊销失败不影响结果。
    }
  }
}
