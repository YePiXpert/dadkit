import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import {
  joinSpace,
  leaveSpace,
  refreshSyncStatus,
  syncNow,
  useSyncStatusStore,
} from "@/lib/sync/client";
import {
  loadSyncClientState,
  loadSyncSession,
  saveChecklist,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";

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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function resetStores() {
  useDadKitStore.setState({
    hydrated: false,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
  });
  useSyncStatusStore.setState({
    joined: false,
    syncing: false,
    lastSyncAt: undefined,
    lastError: undefined,
  });
}

afterEach(() => {
  resetStores();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("family sync client", () => {
  it("is a no-op without a session", async () => {
    installBrowserStorage();
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const outcome = await syncNow();

    expect(outcome.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(loadSyncClientState().lastSyncAt).toBeTruthy();

    const push = requests.find((request) => request.url === "/api/sync/push");

    expect(push?.body).toContain("seed");
    expect(useSyncStatusStore.getState().joined).toBe(true);
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
