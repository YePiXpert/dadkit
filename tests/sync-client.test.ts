import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import {
  alignExportDataToServerTime,
  getSyncRetryDelay,
  joinSyncSpaceByInvite,
  leaveSpace,
  refreshSyncStatus,
  syncNow,
  useSyncStatusStore,
} from "@/lib/sync/client";
import {
  exportData,
  buildLatestPortableData,
  loadSnapshotsAsync,
  loadSyncClientState,
  loadSyncSession,
  saveChecklist,
  saveCustomItems,
  STORAGE_KEYS,
} from "@/lib/storage";
import { MemoryBabyRepository, setBabyRepositoryForTests } from "@/lib/baby/repository";
import type { DadKitExportData } from "@/lib/data/format";
import { mergeExportData } from "@/lib/sync/merge";
import { getSyncClockTimelineInitialized } from "@/lib/sync-clock";
import {
  clearSyncSessionExpired,
  getSyncSessionStatus,
} from "@/lib/sync-session-status";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { DADKIT_DATA_VERSION_HEADER } from "@/lib/sync/data-version";
import { portableV5, portableV11 } from "@/tests/helpers/portable-data";
import { generateChecklist } from "@/lib/rules";

function testItem(id: string, patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id,
    name: `测试物品 ${id}`,
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind: "pack_existing",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function joinedV2Space() {
  return {
    spaceId: "a".repeat(64),
    kind: "random",
    displayName: "测试家庭",
    dataRevision: 1,
    metadataRevision: 1,
    dataUpdatedAt: "2026-08-18T00:00:00.000Z",
    metadataUpdatedAt: "2026-08-18T00:00:00.000Z",
    currentSession: {
      id: "b".repeat(64),
      current: true,
      deviceName: "新设备",
      role: "member",
      protocolVersion: 2,
      createdAt: "2026-08-18T00:00:00.000Z",
      lastSeenAt: "2026-08-18T00:00:00.000Z",
    },
    usage: {
      dataBytes: 1,
      dataLimitBytes: 1024,
      deviceCount: 2,
      deviceLimit: 12,
      activeInviteCount: 0,
      activeInviteLimit: 5,
    },
  };
}

function localSyncSession(displayName = "测试家庭") {
  return {
    version: 2,
    protocolVersion: 2,
    spaceId: "a".repeat(64),
    displayName,
    sessionId: "b".repeat(64),
    deviceName: "测试设备",
    role: "owner",
    joinedAt: "2026-08-01T00:00:00.000Z",
  };
}

function resetStores() {
  useDadKitStore.setState({
    hydrated: false,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    pendingRemovalIds: [],
    hiddenTemplateItemIds: [],
  });
  useSyncStatusStore.setState({
    joined: false,
    syncing: false,
    lastSyncAt: undefined,
    lastError: undefined,
  });
  clearSyncSessionExpired();
}

afterEach(() => {
  setBabyRepositoryForTests(undefined);
  resetStores();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("family sync client", () => {
  it("adds bounded jitter to retry delays", () => {
    expect(getSyncRetryDelay(10_000, 0)).toBe(8_000);
    expect(getSyncRetryDelay(10_000, 0.5)).toBe(10_000);
    expect(getSyncRetryDelay(10_000, 1)).toBe(12_000);
  });

  it("aligns fast and slow device timestamps before item-wise merging", () => {
    const remote = {
      ...exportData(),
      checklist: [testItem("shared", { status: "packed", updatedAt: 200 })],
      customItems: [],
    };
    const fastClockLocal = {
      ...exportData(),
      checklist: [
        testItem("shared", { status: "todo", updatedAt: 3_600_100 }),
      ],
      customItems: [],
    };
    const slowClockLocal = {
      ...exportData(),
      checklist: [
        testItem("shared", { status: "todo", updatedAt: -3_599_700 }),
      ],
      customItems: [],
    };

    expect(
      mergeExportData(
        alignExportDataToServerTime(fastClockLocal, -3_600_000),
        remote,
      ).checklist[0]?.status,
    ).toBe("packed");
    expect(
      mergeExportData(
        alignExportDataToServerTime(slowClockLocal, 3_600_000),
        remote,
      ).checklist[0]?.status,
    ).toBe("todo");
    expect(alignExportDataToServerTime(remote, 3_600_000).growthUpdatedAt).toBe(
      0,
    );
  });

  it("persists the first server-time alignment before pushing local changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T00:00:00.000Z"));

    try {
      const { localValues } = installBrowserStorage();
      localValues.set(
        "dadkit:v3:sync-session",
        JSON.stringify({ ...localSyncSession(), joinedAt: new Date().toISOString() }),
      );
      saveChecklist([
        testItem("clocked", { updatedAt: Date.now() + 100 }),
      ]);
      useDadKitStore.setState({ hydrated: true });

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) => {
          if (url === "/api/sync/pull") {
            return jsonResponse(
              { version: 0, updatedAt: "", data: null },
              200,
              {
                "x-dadkit-server-time": new Date(
                  Date.now() - 3_600_000,
                ).toISOString(),
              },
            );
          }
          if (url === "/api/sync/push") {
            return jsonResponse(
              { version: 1, updatedAt: "", data: JSON.parse(String(init?.body)).data },
              200,
              {
                "x-dadkit-server-time": new Date(
                  Date.now() - 3_600_000,
                ).toISOString(),
              },
            );
          }
          throw new Error("unexpected sync request");
        }),
      );

      await expect(syncNow()).resolves.toMatchObject({ ok: true });

      const persisted = JSON.parse(localValues.get(STORAGE_KEYS.checklist) ?? "[]") as ChecklistItem[];
      expect(localValues.get("dadkit:v3:sync-clock-offset-ms")).toBe("-3600000");
      expect(persisted[0]?.updatedAt).toBe(Date.now() - 3_600_000 + 100);
      expect((await loadSnapshotsAsync())[0]?.reason).toBe("首次同步时间校准前");
      expect(getSyncClockTimelineInitialized()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is a no-op without a session", async () => {
    installBrowserStorage();
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const outcome = await syncNow();

    expect(outcome.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("defers sync while a removal is waiting for undo confirmation", async () => {
    installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify(localSyncSession()),
    });
    useDadKitStore.setState({
      hydrated: true,
      checklist: [],
      customItems: [],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: ["item-1"],
    });
    useSyncStatusStore.setState({ joined: true });
    const fetchMock = vi.fn(async () =>
      jsonResponse({ version: 0, updatedAt: "", data: null }, 200),
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await syncNow();

    expect(outcome.ok).toBe(false);
    expect(outcome.deferred).toBe(true);
    expect(outcome.message).toContain("撤销窗口");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not request a new invite space until replacing the current session is confirmed", async () => {
    installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify({
        version: 2,
        protocolVersion: 2,
        spaceId: "a".repeat(64),
        displayName: "现有家庭",
        sessionId: "b".repeat(64),
        deviceName: "这台设备",
        role: "member",
        joinedAt: "2026-08-01T00:00:00.000Z",
      }),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await joinSyncSpaceByInvite("DK2.invite", "新设备", {
      replaceExisting: false,
      initialDataMode: "remote",
    });

    expect(outcome).toMatchObject({ ok: false });
    expect(outcome.message).toContain("确认切换同步空间");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("replaces local business data from the family on first v2 join without pushing", async () => {
    installBrowserStorage({
      [STORAGE_KEYS.checklistMode]: JSON.stringify("full"),
    });
    setBabyRepositoryForTests(new MemoryBabyRepository());
    const local = testItem("local-only", { updatedAt: 300 });
    const remote = testItem("remote-only", { updatedAt: 100 });
    saveChecklist([local]);
    saveCustomItems([local]);
    useDadKitStore.setState({
      hydrated: true,
      checklist: [local],
      checklistMode: "full",
      customItems: [local],
    });
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(url);
      if (url === "/api/sync/v2/join") {
        return jsonResponse({ space: joinedV2Space() });
      }
      if (url === "/api/sync/pull") {
        return jsonResponse({
          version: 1,
          updatedAt: "2026-08-18T00:00:00.000Z",
          data: portableV11({ checklist: [remote], customItems: [remote] }),
        });
      }
      throw new Error(`unexpected url ${url}`);
    }));

    const outcome = await joinSyncSpaceByInvite("DK2.invite", "新设备", {
      replaceExisting: false,
      initialDataMode: "remote",
    });

    expect(outcome.ok).toBe(true);
    expect(urls).toEqual(["/api/sync/v2/join", "/api/sync/pull"]);
    const replacedIds = useDadKitStore.getState().checklist.map((item) => item.id);
    expect(replacedIds).toContain("remote-only");
    expect(replacedIds).not.toContain("local-only");
    expect(useDadKitStore.getState().checklistMode).toBe("full");
    expect(loadSyncClientState().initialDataMode).toBeUndefined();
    expect((await loadSnapshotsAsync()).some((snapshot) =>
      snapshot.reason === "加入家庭同步前"
    )).toBe(true);
  });

  it("merges and uploads local business data when explicitly selected", async () => {
    installBrowserStorage();
    setBabyRepositoryForTests(new MemoryBabyRepository());
    const local = testItem("local-only", { updatedAt: 300 });
    const remote = testItem("remote-only", { updatedAt: 100 });
    saveChecklist([local]);
    saveCustomItems([local]);
    useDadKitStore.setState({
      hydrated: true,
      checklist: [local],
      customItems: [local],
    });
    let pushedIds: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/sync/v2/join") {
        return jsonResponse({ space: joinedV2Space() });
      }
      if (url === "/api/sync/pull") {
        return jsonResponse({
          version: 1,
          updatedAt: "2026-08-18T00:00:00.000Z",
          data: portableV11({ checklist: [remote], customItems: [remote] }),
        });
      }
      if (url === "/api/sync/push") {
        const body = JSON.parse(init?.body as string) as {
          data: DadKitExportData;
        };
        pushedIds = body.data.checklist.map((item) => item.id).sort();
        return jsonResponse({
          version: 2,
          updatedAt: "2026-08-18T00:00:01.000Z",
          data: body.data,
        });
      }
      throw new Error(`unexpected url ${url}`);
    }));

    const outcome = await joinSyncSpaceByInvite("DK2.invite", "新设备", {
      replaceExisting: false,
      initialDataMode: "merge",
    });

    expect(outcome.ok).toBe(true);
    expect(pushedIds).toEqual(expect.arrayContaining(["local-only", "remote-only"]));
    expect(useDadKitStore.getState().checklist.map((item) => item.id)).toEqual(
      expect.arrayContaining(["local-only", "remote-only"]),
    );
    expect(loadSyncClientState().initialDataMode).toBeUndefined();
  });

  it("sends version 11 and removes retired hospital data on a v5 response", async () => {
    const { localValues } = installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify(localSyncSession()),
    });
    localValues.set("dadkit:v3:hospital-profile", "legacy");
    useDadKitStore.setState({ hydrated: true });
    const legacy = portableV5({
      checklist: [testItem("legacy-server", { updatedAt: 200 })],
    });
    const requestVersions: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        requestVersions.push(
          new Headers(init?.headers).get(DADKIT_DATA_VERSION_HEADER) ?? "",
        );

        if (url === "/api/sync/pull") {
          return jsonResponse({ version: 1, updatedAt: "", data: legacy });
        }
        if (url === "/api/sync/push") {
          return jsonResponse({ version: 2, updatedAt: "", data: legacy });
        }
        throw new Error(`unexpected url ${url}`);
      }),
    );

    await expect(syncNow()).resolves.toMatchObject({ ok: true });

    expect(requestVersions).toEqual(["11", "11"]);
    expect(localValues.has("dadkit:v3:hospital-profile")).toBe(false);
  });

  it("clears the session when the server reports it expired", async () => {
    installBrowserStorage();
    useDadKitStore.setState({ hydrated: true });
    useSyncStatusStore.setState({ joined: true });

    const { localValues } = installBrowserStorage();
    localValues.set(
      "dadkit:v3:sync-session",
      JSON.stringify(localSyncSession()),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ error: "同步会话已失效，请重新加入家庭。" }, 401),
      ),
    );

    const outcome = await syncNow();

    expect(outcome.ok).toBe(false);
    expect(loadSyncSession()).toBeUndefined();
    expect(useSyncStatusStore.getState().joined).toBe(false);
    expect(useSyncStatusStore.getState().lastError).toContain("会话已失效");
    expect(getSyncSessionStatus()).toEqual({
      expired: true,
      message: "家庭同步会话已失效，请重新加入后继续同步。",
    });
  });

  it("keeps the local session when the server cannot confirm leaving", async () => {
    installBrowserStorage();
    const { localValues } = installBrowserStorage();
    localValues.set(
      "dadkit:v3:sync-session",
      JSON.stringify(localSyncSession()),
    );
    refreshSyncStatus();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    const outcome = await leaveSpace();

    expect(outcome.ok).toBe(false);
    expect(loadSyncSession()).toBeDefined();
    expect(useSyncStatusStore.getState().joined).toBe(true);
  });

  it("rebases a local edit made after the first sync snapshot", async () => {
    installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify(localSyncSession()),
    });
    const repository = new MemoryBabyRepository();
    setBabyRepositoryForTests(repository);
    const baseChecklist = generateChecklist();
    const raceItem = { ...baseChecklist[0]!, status: "todo" as const, updatedAt: 10 };
    const localChecklist = baseChecklist.map((item, index) => index === 0 ? raceItem : item);
    saveChecklist(localChecklist);
    useDadKitStore.setState({ hydrated: true, checklist: localChecklist });
    const remote = await buildLatestPortableData();
    remote.checklist = remote.checklist.map((item) =>
      item.id === raceItem.id ? { ...item, status: "bought", updatedAt: 20 } : item,
    );

    const originalRead = repository.getAllBabyData.bind(repository);
    let readCount = 0;
    let releaseSecondRead!: () => void;
    let secondReadStarted!: () => void;
    const secondReadGate = new Promise<void>((resolve) => { releaseSecondRead = resolve; });
    const secondReadSignal = new Promise<void>((resolve) => { secondReadStarted = resolve; });
    vi.spyOn(repository, "getAllBabyData").mockImplementation(async () => {
      readCount += 1;
      if (readCount === 2) {
        secondReadStarted();
        await secondReadGate;
      }
      return originalRead();
    });

    let pushed: DadKitExportData | undefined;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/sync/pull") return jsonResponse({ version: 1, data: remote });
      if (url === "/api/sync/push") {
        pushed = (JSON.parse(init?.body as string) as { data: DadKitExportData }).data;
        return jsonResponse({ version: 2, data: pushed });
      }
      throw new Error(`unexpected url ${url}`);
    }));

    const syncing = syncNow();
    await secondReadSignal;
    useDadKitStore.getState().updateItem(raceItem.id, { status: "packed" });
    releaseSecondRead();
    await expect(syncing).resolves.toMatchObject({ ok: true });

    expect(useDadKitStore.getState().checklist.find((item) => item.id === raceItem.id)?.status).toBe("packed");
    expect(pushed?.checklist.find((item) => item.id === raceItem.id)?.status).toBe("packed");
  });

  it("does not let an in-flight sync restore status after leaving", async () => {
    installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify(localSyncSession()),
    });
    useDadKitStore.setState({ hydrated: true });
    refreshSyncStatus();
    let releasePull!: () => void;
    let pullStarted!: () => void;
    const pullGate = new Promise<void>((resolve) => { releasePull = resolve; });
    const pullSignal = new Promise<void>((resolve) => { pullStarted = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/sync/pull") {
        pullStarted();
        await pullGate;
        return jsonResponse({ version: 1, data: null });
      }
      if (url === "/api/sync/leave") return jsonResponse({ ok: true });
      throw new Error(`unexpected url ${url}`);
    }));

    const syncing = syncNow();
    await pullSignal;
    await expect(leaveSpace()).resolves.toMatchObject({ ok: true });
    releasePull();
    await syncing;

    expect(loadSyncSession()).toBeUndefined();
    expect(useSyncStatusStore.getState().joined).toBe(false);
    expect(loadSyncClientState()).toEqual({});
  });
});
