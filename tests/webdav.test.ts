import { afterEach, describe, expect, it, vi } from "vitest";

import {
  exportData,
  loadSnapshots,
  loadWebDavSecret,
  saveChecklist,
  saveUserProfile,
  saveWebDavConfig,
  saveWebDavSecret,
  STORAGE_KEYS,
  WEBDAV_SESSION_SECRET_KEY,
} from "@/lib/storage";
import type { ChecklistItem, UserProfile } from "@/lib/types";
import {
  buildAuthHeader,
  buildDadKitWebDavBackup,
  calculateChecksum,
  importDadKitWebDavBackup,
  joinWebDavPath,
  normalizeWebDavEndpoint,
} from "@/lib/webdav/client";
import { DEFAULT_WEBDAV_CONFIG } from "@/lib/webdav/types";

function installStorage() {
  const localStore = new Map<string, string>();
  const sessionStore = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => localStore.get(key) ?? null,
    setItem: (key: string, value: string) => localStore.set(key, value),
    removeItem: (key: string) => localStore.delete(key),
    clear: () => localStore.clear(),
  };
  const sessionStorage = {
    getItem: (key: string) => sessionStore.get(key) ?? null,
    setItem: (key: string, value: string) => sessionStore.set(key, value),
    removeItem: (key: string) => sessionStore.delete(key),
    clear: () => sessionStore.clear(),
  };

  vi.stubGlobal("window", { localStorage, sessionStorage });

  return { localStore, sessionStore };
}

function testItem(id = "item-1"): ChecklistItem {
  return {
    id,
    name: "测试物品",
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    sourceLabel: "测试",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
  };
}

function testProfile(dueDate = "2026-07-21"): UserProfile {
  return {
    dueDate,
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("webdav helpers", () => {
  it("normalizes endpoint trailing slashes", () => {
    expect(normalizeWebDavEndpoint(" https://example.com/dav/// ")).toBe(
      "https://example.com/dav",
    );
  });

  it("joins webdav paths without duplicate slashes", () => {
    expect(
      joinWebDavPath("https://example.com/dav/", "/DadKit/", "dadkit-backup.json"),
    ).toBe("https://example.com/dav/DadKit/dadkit-backup.json");
  });

  it("builds a Basic auth header", () => {
    expect(buildAuthHeader("dad", "secret")).toBe(
      `Basic ${Buffer.from("dad:secret", "utf-8").toString("base64")}`,
    );
  });

  it("builds a DadKit WebDAV backup envelope", () => {
    installStorage();
    saveUserProfile(testProfile());
    saveChecklist([testItem()]);

    const data = exportData();
    const backup = buildDadKitWebDavBackup(data, "device-1");

    expect(backup.schemaVersion).toBe(1);
    expect(backup.app).toBe("DadKit");
    expect(backup.deviceId).toBe("device-1");
    expect(backup.checksum).toBe(calculateChecksum(data));
    expect(backup.data).toEqual(data);
  });

  it("creates stable checksums for equal data and different checksums for changes", () => {
    expect(calculateChecksum({ b: 2, a: 1 })).toBe(
      calculateChecksum({ a: 1, b: 2 }),
    );
    expect(calculateChecksum({ a: 1 })).not.toBe(calculateChecksum({ a: 2 }));
  });

  it("does not include WebDAV secret in exported JSON", () => {
    installStorage();

    saveWebDavConfig({
      ...DEFAULT_WEBDAV_CONFIG,
      endpoint: "https://example.com/dav",
      username: "dad",
      rememberSecret: true,
    });
    saveWebDavSecret("app-secret", true);

    expect(JSON.stringify(exportData())).not.toContain("app-secret");
  });

  it("stores secret in sessionStorage when rememberSecret is false", () => {
    const { localStore, sessionStore } = installStorage();

    saveWebDavSecret("session-secret", false);

    expect(sessionStore.get(WEBDAV_SESSION_SECRET_KEY)).toBe("session-secret");
    expect(localStore.get(STORAGE_KEYS.webDavSecret)).toBeUndefined();
    expect(loadWebDavSecret(false)).toBe("session-secret");
  });

  it("stores secret in localStorage when rememberSecret is true", () => {
    const { localStore, sessionStore } = installStorage();

    saveWebDavSecret("local-secret", true);

    expect(localStore.get(STORAGE_KEYS.webDavSecret)).toBe("local-secret");
    expect(sessionStore.get(WEBDAV_SESSION_SECRET_KEY)).toBeUndefined();
    expect(loadWebDavSecret(true)).toBe("local-secret");
  });

  it("creates a snapshot before importing a WebDAV backup", () => {
    installStorage();

    saveUserProfile(testProfile("2026-07-21"));
    saveChecklist([testItem("local-before-webdav")]);

    const remoteData = {
      version: 1 as const,
      exportedAt: "2026-06-09T00:00:00.000Z",
      userProfile: testProfile("2026-08-01"),
      checklistMode: "full" as const,
      checklist: [testItem("remote")],
      customItems: [],
      hiddenTemplateItemIds: [],
      hospitalOverrides: [],
    };
    const backup = buildDadKitWebDavBackup(remoteData, "remote-device");
    const result = importDadKitWebDavBackup(backup);
    const snapshots = loadSnapshots();

    expect(result.ok).toBe(true);
    expect(snapshots[0]?.reason).toBe("导入 WebDAV 备份前");
    expect(snapshots[0]?.data.checklist).toEqual([testItem("local-before-webdav")]);
  });
});
