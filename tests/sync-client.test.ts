import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import {
  alignExportDataToServerTime,
  createInvite,
  createSpace,
  getSyncRetryDelay,
  joinSpace,
  leaveSpace,
  refreshSyncStatus,
  syncNow,
  useSyncStatusStore,
} from "@/lib/sync/client";
import {
  exportData,
  loadSnapshots,
  loadSyncClientState,
  loadSyncSession,
  saveChecklist,
  STORAGE_KEYS,
} from "@/lib/storage";
import { mergeExportData } from "@/lib/sync/merge";
import { getSyncClockTimelineInitialized } from "@/lib/sync-clock";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import {
  hospitalValuesFromPortable,
  updateHospitalProfile,
} from "@/lib/hospital/portable";
import {
  loadHospitalProfile,
  saveHospitalProfile,
} from "@/lib/hospital/repository";
import { useHospitalProfileStore } from "@/lib/hospital/store";
import { DADKIT_DATA_VERSION_HEADER } from "@/lib/sync/data-version";
import { portableV5 } from "@/tests/helpers/portable-data";

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
  useHospitalProfileStore.setState({
    hydrated: false,
    profile: createEmptyHospitalProfile(),
  });
}

afterEach(() => {
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
        JSON.stringify({ token: "space.clock", joinedAt: new Date().toISOString() }),
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
      expect(loadSnapshots()[0]?.reason).toBe("首次同步时间校准前");
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
      "dadkit:v3:sync-session": JSON.stringify({
        token: "space.pending",
        joinedAt: "2026-07-26T00:00:00.000Z",
      }),
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

  it("joins a space while a removal is waiting and treats deferred sync as success", async () => {
    installBrowserStorage();
    useDadKitStore.setState({
      hydrated: true,
      checklist: [],
      customItems: [],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: ["item-1"],
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/sync/join") {
        return jsonResponse({ token: "space.deferred" });
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await joinSpace("我们的家", "家庭暗号-1");

    expect(outcome.ok).toBe(true);
    expect(outcome.message).toBeUndefined();
    expect(loadSyncSession()?.token).toBe("space.deferred");
    expect(useSyncStatusStore.getState().joined).toBe(true);
  });

  it("creates a space while a removal is waiting and treats deferred sync as success", async () => {
    installBrowserStorage();
    useDadKitStore.setState({
      hydrated: true,
      checklist: [],
      customItems: [],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: ["item-1"],
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/sync/create") {
        return jsonResponse({
          token: "space.deferred",
          invite: { code: "7K9M-3XQF", expiresAt: "2026-07-29T12:10:00.000Z" },
        });
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await createSpace("新的家庭");

    expect(outcome.ok).toBe(true);
    expect(outcome.message).toBeUndefined();
    expect(outcome.invite).toMatchObject({ code: "7K9M-3XQF" });
    expect(loadSyncSession()?.token).toBe("space.deferred");
    expect(useSyncStatusStore.getState().joined).toBe(true);
  });

  it("joins a space, seeds local data and records sync state", async () => {
    installBrowserStorage();
    saveChecklist([testItem("seed", { status: "packed", updatedAt: 10 })]);
    useDadKitStore.setState({ hydrated: true });

    const requests: Array<{ url: string; body?: string }> = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, body: typeof init?.body === "string" ? init.body : undefined });

      if (url === "/api/sync/join") {
        return jsonResponse({ token: "space.secret", version: 0, updatedAt: "", data: null });
      }

      if (url === "/api/sync/pull") {
        return jsonResponse({ version: 1, updatedAt: "", data: null });
      }

      if (url === "/api/sync/push") {
        const payload = JSON.parse(init?.body as string) as { data: unknown };
        return jsonResponse({ version: 1, updatedAt: "", data: payload.data });
      }

      throw new Error(`unexpected url ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const outcome = await joinSpace("我们的家", "家庭暗号-1");

    expect(outcome.ok).toBe(true);
    expect(loadSyncSession()?.token).toBe("space.secret");
    expect(loadSyncSession()?.spaceName).toBe("我们的家");
    expect(loadSyncClientState().lastSyncAt).toBeTruthy();
    expect(requests[0]?.body).toContain('"existingOnly":true');

    const push = requests.find((request) => request.url === "/api/sync/push");

    expect(push?.body).toContain("seed");
    expect(useSyncStatusStore.getState().joined).toBe(true);
  });

  it("sends version 6 on every request and preserves hospital on a v5 response", async () => {
    const { localValues } = installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify({
        token: "space.compat",
        joinedAt: "2026-08-01T00:00:00.000Z",
      }),
    });
    const hospital = createEmptyHospitalProfile();
    const hospitalValues = hospitalValuesFromPortable(hospital);
    hospitalValues.hospitalName = "市妇幼保健院";
    hospitalValues.address = "健康路 1 号";
    saveHospitalProfile(
      updateHospitalProfile(hospital, hospitalValues, 100).profile,
    );
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

    expect(requestVersions).toEqual(["6", "6"]);
    expect(loadHospitalProfile().fields.hospitalName.value).toBe(
      "市妇幼保健院",
    );
    expect(loadHospitalProfile().fields.address.value).toBe("健康路 1 号");
    expect(localValues.get(STORAGE_KEYS.hospital)).toBeTruthy();
  });

  it("creates a family, stores its name and returns the first invite", async () => {
    installBrowserStorage();
    useDadKitStore.setState({ hydrated: true });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/sync/create") {
        expect(init?.body).toBe(JSON.stringify({ name: "新的家庭" }));
        return jsonResponse(
          {
            token: "space.created",
            invite: {
              code: "7K9M-3XQF",
              expiresAt: "2026-07-29T12:10:00.000Z",
            },
          },
          201,
        );
      }
      if (url === "/api/sync/pull") {
        return jsonResponse({ version: 0, updatedAt: "", data: null });
      }
      if (url === "/api/sync/push") {
        const payload = JSON.parse(init?.body as string) as { data: unknown };
        return jsonResponse({ version: 1, updatedAt: "", data: payload.data });
      }

      throw new Error(`unexpected url ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const outcome = await createSpace(" 新的家庭 ");

    expect(outcome).toMatchObject({
      ok: true,
      invite: { code: "7K9M-3XQF" },
    });
    expect(loadSyncSession()).toMatchObject({
      token: "space.created",
      spaceName: "新的家庭",
    });
    expect(useSyncStatusStore.getState().joined).toBe(true);
  });

  it("generates a replacement invite for an existing session", async () => {
    const { localValues } = installBrowserStorage();
    localValues.set(
      "dadkit:v3:sync-session",
      JSON.stringify({
        token: "space.secret",
        joinedAt: "2026-07-29T00:00:00.000Z",
      }),
    );
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("/api/sync/invite");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer space.secret",
      );
      expect(init?.body).toBe(JSON.stringify({ name: "现有家庭" }));
      return jsonResponse({
        code: "ABCD-2345",
        expiresAt: "2026-07-29T12:10:00.000Z",
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const outcome = await createInvite("现有家庭");

    expect(outcome).toMatchObject({
      ok: true,
      invite: { code: "ABCD-2345" },
    });
    expect(loadSyncSession()?.spaceName).toBe("现有家庭");
  });

  it("rejects a wrong code without storing a session", async () => {
    installBrowserStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "同步码不正确。" }, 401)),
    );

    const outcome = await joinSpace("我们的家", "错误暗号");

    expect(outcome.ok).toBe(false);
    expect(outcome.message).toBe("同步码不正确。");
    expect(loadSyncSession()).toBeUndefined();
    expect(useSyncStatusStore.getState().joined).toBe(false);
  });

  it("clears the session when the server reports it expired", async () => {
    installBrowserStorage();
    useDadKitStore.setState({ hydrated: true });
    useSyncStatusStore.setState({ joined: true });

    const { localValues } = installBrowserStorage();
    localValues.set(
      "dadkit:v3:sync-session",
      JSON.stringify({ token: "space.expired", joinedAt: "2026-07-26T00:00:00.000Z" }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ error: "同步会话已失效，请重新输入同步码。" }, 401),
      ),
    );

    const outcome = await syncNow();

    expect(outcome.ok).toBe(false);
    expect(loadSyncSession()).toBeUndefined();
    expect(useSyncStatusStore.getState().joined).toBe(false);
    expect(useSyncStatusStore.getState().lastError).toContain("会话已失效");
  });

  it("leaves the space locally even when the revoke request fails", async () => {
    installBrowserStorage();
    const { localValues } = installBrowserStorage();
    localValues.set(
      "dadkit:v3:sync-session",
      JSON.stringify({ token: "space.secret", joinedAt: "2026-07-26T00:00:00.000Z" }),
    );
    refreshSyncStatus();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    await leaveSpace();

    expect(loadSyncSession()).toBeUndefined();
    expect(useSyncStatusStore.getState().joined).toBe(false);
  });
});
