import { afterEach, describe, expect, it, vi } from "vitest";

import {
  exportData,
  loadSnapshots,
  loadWebDavSecret,
  saveChecklist,
  saveWebDavConfig,
  saveWebDavSecret,
  STORAGE_KEYS,
  WEBDAV_SESSION_SECRET_KEY,
} from "@/lib/storage";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import {
  hospitalValuesFromPortable,
  updateHospitalProfile,
} from "@/lib/hospital/portable";
import {
  loadHospitalProfile,
  saveHospitalProfile,
} from "@/lib/hospital/repository";
import type { ChecklistItem } from "@/lib/types";
import {
  isBlockedHostname,
  isPrivateIpAddress,
  parseProxyPayload,
  sanitizeProxyHeaders,
} from "@/lib/webdav/proxy";
import {
  buildAuthHeader,
  buildDadKitWebDavBackup,
  calculateChecksum,
  downloadWebDavBackup,
  importDadKitWebDavBackup,
  joinWebDavPath,
  normalizeWebDavEndpoint,
  selectWebDavTransport,
  testWebDavConnection,
  uploadWebDavBackup,
  webDavStatusMessage,
} from "@/lib/webdav/client";
import { DEFAULT_WEBDAV_CONFIG } from "@/lib/webdav/types";
import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { loadItemPlanning, saveItemPlanning } from "@/lib/planning/repository";

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

function testItem(
  id = "item-1",
  patch: Partial<ChecklistItem> = {},
): ChecklistItem {
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
    ...patch,
  };
}

function hospitalProfile(
  patch: Partial<Record<"hospitalName" | "address", string>>,
  updatedAt: number,
) {
  const profile = createEmptyHospitalProfile();
  const values = hospitalValuesFromPortable(profile);

  Object.assign(values, patch);
  return updateHospitalProfile(profile, values, updatedAt).profile;
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

  it("rejects cleartext WebDAV before sending credentials", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await testWebDavConnection(
      {
        ...DEFAULT_WEBDAV_CONFIG,
        endpoint: "http://webdav.example/dav",
        username: "dad",
      },
      "secret",
    );

    expect(result).toEqual({
      ok: false,
      message: "WebDAV 地址必须使用 https。",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("joins webdav paths without duplicate slashes", () => {
    expect(
      joinWebDavPath(
        "https://example.com/dav/",
        "/DadKit/",
        "dadkit-backup-v3.json",
      ),
    ).toBe("https://example.com/dav/DadKit/dadkit-backup-v3.json");
  });

  it("builds a Basic auth header", () => {
    expect(buildAuthHeader("dad", "secret")).toBe(
      `Basic ${Buffer.from("dad:secret", "utf-8").toString("base64")}`,
    );
  });

  it("turns common WebDAV status codes into actionable Chinese guidance", () => {
    expect(webDavStatusMessage("上传备份", 401)).toContain("应用专用密码");
    expect(webDavStatusMessage("下载远端备份", 404)).toContain("远端目录");
    expect(webDavStatusMessage("上传备份", 500)).toContain("500");
  });

  it("builds a DadKit WebDAV backup envelope", () => {
    installStorage();
    saveChecklist([testItem()]);
    saveHospitalProfile(
      hospitalProfile(
        { hospitalName: "市妇幼保健院", address: "健康路 1 号" },
        100,
      ),
    );

    const data = exportData();
    const backup = buildDadKitWebDavBackup(data, "device-1");

    expect(backup.schemaVersion).toBe(3);
    expect(backup.data.version).toBe(7);
    expect(backup.app).toBe("DadKit");
    expect(backup.deviceId).toBe("device-1");
    expect(backup.checksum).toBe(calculateChecksum(data));
    expect(backup.data).toEqual(data);
    expect(backup.data).toHaveProperty(
      "hospital.fields.hospitalName.value",
      "市妇幼保健院",
    );
  });

  it("creates stable checksums for equal data and different checksums for changes", () => {
    expect(calculateChecksum({ b: 2, a: 1 })).toBe(
      calculateChecksum({ a: 1, b: 2 }),
    );
    expect(calculateChecksum({ a: 1 })).not.toBe(calculateChecksum({ a: 2 }));
  });

  it("rejects old WebDAV backups", async () => {
    installStorage();
    const currentBackup = buildDadKitWebDavBackup(exportData(), "device-1");
    const oldBackup = {
      ...currentBackup,
      schemaVersion: 2,
      data: {
        ...currentBackup.data,
        version: 2,
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(oldBackup), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-dadkit-webdav-proxy": "1",
          },
        }),
      ),
    );

    const result = await downloadWebDavBackup(
      {
        ...DEFAULT_WEBDAV_CONFIG,
        endpoint: "https://example.com/dav",
        username: "dad",
      },
      "secret",
    );

    expect(result).toEqual({
      ok: false,
      message: "远端文件不是 DadKit WebDAV 备份。",
    });
  });

  it("rejects a checksummed WebDAV envelope with an invalid portable payload", async () => {
    installStorage();
    const validBackup = buildDadKitWebDavBackup(exportData(), "device-1");
    const invalidData = {
      ...validBackup.data,
      growth: { version: 1, profile: {}, progress: {} },
    };
    const invalidBackup = {
      ...validBackup,
      data: invalidData,
      checksum: calculateChecksum(invalidData),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(invalidBackup), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-dadkit-webdav-proxy": "1",
          },
        }),
      ),
    );

    const result = await downloadWebDavBackup(
      {
        ...DEFAULT_WEBDAV_CONFIG,
        endpoint: "https://example.com/dav",
        username: "dad",
      },
      "secret",
    );

    expect(result).toEqual({
      ok: false,
      message: "远端备份内容无效，未下载。",
    });
    expect(loadSnapshots()).toEqual([]);
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

    saveChecklist([testItem("local-before-webdav")]);

    const remoteData = {
      ...exportData(),
      exportedAt: "2026-06-09T00:00:00.000Z",
      checklistMode: "full" as const,
      checklist: [testItem("remote")],
      customItems: [],
      hiddenTemplateItemIds: [],
    };
    const backup = buildDadKitWebDavBackup(remoteData, "remote-device");
    const result = importDadKitWebDavBackup(backup);
    const snapshots = loadSnapshots();

    expect(result.ok).toBe(true);
    expect(snapshots[0]?.reason).toBe("导入 WebDAV 备份前");
    expect(snapshots[0]?.data.checklist).toEqual([testItem("local-before-webdav")]);
  });

  it("merges the remote backup into local data before uploading", async () => {
    const local = {
      ...exportData(),
      checklist: [testItem("local", { updatedAt: 100 })],
      customItems: [testItem("local", { updatedAt: 100 })],
    };
    const remote = buildDadKitWebDavBackup(
      {
        ...exportData(),
        checklist: [testItem("remote", { updatedAt: 200 })],
        customItems: [testItem("remote", { updatedAt: 200 })],
      },
      "remote-device",
    );
    let uploaded: unknown;
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      if (init?.method === "GET") {
        return new Response(JSON.stringify(remote), { status: 200 });
      }
      if (init?.method === "PROPFIND") {
        return new Response(null, { status: 207 });
      }
      if (init?.method === "PUT") {
        uploaded = JSON.parse(String(init.body));
        return new Response(null, { status: 201 });
      }
      throw new Error("unexpected method");
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadWebDavBackup(
      { ...DEFAULT_WEBDAV_CONFIG, endpoint: "https://example.com/dav", username: "dad" },
      "secret",
      local,
    );

    expect(result).toEqual({ ok: true, message: "已合并本地与远端备份并上传" });
    expect((uploaded as { data: { checklist: ChecklistItem[] } }).data.checklist)
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "local" }),
          expect.objectContaining({ id: "remote" }),
        ]),
      );
  });

  it("treats a remote backup as current when only exportedAt differs", async () => {
    const remoteData = { ...exportData(), checklist: [testItem()] };
    const remote = buildDadKitWebDavBackup(remoteData, "remote-device");
    const localData = {
      ...remoteData,
      exportedAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      if (init?.method === "GET") {
        return new Response(JSON.stringify(remote), { status: 200 });
      }
      throw new Error("unexpected WebDAV method");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadWebDavBackup(
      { ...DEFAULT_WEBDAV_CONFIG, endpoint: "https://example.com/dav", username: "dad" },
      "secret",
      localData,
    );

    expect(result).toEqual({ ok: true, message: "远端已是最新" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("restores and merges hospital data from a v7 WebDAV backup", () => {
    installStorage();
    saveChecklist([testItem("local-hospital")]);
    saveHospitalProfile(
      hospitalProfile({ hospitalName: "本机医院", address: "旧地址" }, 100),
    );
    const remoteData = {
      ...exportData(),
      hospital: hospitalProfile(
        { hospitalName: "本机医院", address: "远端新地址" },
        300,
      ),
    };
    const backup = buildDadKitWebDavBackup(remoteData, "remote-hospital");

    const result = importDadKitWebDavBackup(backup);

    expect(result.ok).toBe(true);
    expect(loadHospitalProfile().fields.address).toEqual({
      value: "远端新地址",
      updatedAt: 300,
    });
    const rescueData = loadSnapshots()[0]?.data;
    expect(rescueData?.version).toBe(7);
    if (rescueData?.version !== 7) throw new Error("缺少 v7 恢复快照");
    expect(rescueData.hospital.fields.address.value).toBe("旧地址");
  });

  it("restores and field-merges planning from a v7 WebDAV backup", () => {
    installStorage();
    saveChecklist([testItem("bag")]);
    const local = createEmptyItemPlanning();
    local.items.bag = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "dad", updatedAt: 100 },
    };
    saveItemPlanning(local);
    const remote = createEmptyItemPlanning();
    remote.items.bag = {
      ...createEmptyItemPlanningRecord(),
      actualPriceFen: { value: 1_500, updatedAt: 200 },
    };
    const backup = buildDadKitWebDavBackup(
      { ...exportData(), planning: remote },
      "remote-planning",
    );

    expect(importDadKitWebDavBackup(backup).ok).toBe(true);
    expect(loadItemPlanning().items.bag.assignee.value).toBe("dad");
    expect(loadItemPlanning().items.bag.actualPriceFen.value).toBe(1_500);
  });

  it("prefills the default WebDAV target without storing secrets", () => {
    expect(DEFAULT_WEBDAV_CONFIG.endpoint).toBe("https://webdav.123pan.cn/webdav");
    expect(DEFAULT_WEBDAV_CONFIG.remoteDir).toBe("/DadKit");
    expect(DEFAULT_WEBDAV_CONFIG.filename).toBe("dadkit-backup-v3.json");
    expect(DEFAULT_WEBDAV_CONFIG.username).toBe("");
    expect(DEFAULT_WEBDAV_CONFIG.rememberSecret).toBe(false);
  });

  it("uses the same-origin proxy for browser WebDAV requests", async () => {
    installStorage();

    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(null, {
        status: 207,
        headers: {
          "x-dadkit-webdav-proxy": "1",
        },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await testWebDavConnection(
      {
        ...DEFAULT_WEBDAV_CONFIG,
        endpoint: "https://example.com/dav",
        username: "dad",
      },
      "secret",
    );
    const [url, init = {}] = fetchMock.mock.calls[0]!;
    const payload = JSON.parse(String(init.body));

    expect(result).toEqual({ ok: true, message: "WebDAV 连接成功" });
    expect(url).toBe("/api/webdav");
    expect(payload).toMatchObject({
      url: "https://example.com/dav/DadKit",
      method: "PROPFIND",
    });
    expect(payload.headers.authorization).toBe(buildAuthHeader("dad", "secret"));
    expect(payload.headers.depth).toBe("0");
  });

  it("selects only browser proxy or server-side direct fetch", () => {
    expect(selectWebDavTransport({ isBrowser: true })).toBe("browser-proxy");
    expect(selectWebDavTransport({ isBrowser: false })).toBe("direct-fetch");
  });

  it("uses direct fetch when running outside the browser", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(null, { status: 207 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await testWebDavConnection(
      {
        ...DEFAULT_WEBDAV_CONFIG,
        endpoint: "https://example.com/dav",
        username: "dad",
      },
      "secret",
    );

    const [url, init = {}] = fetchMock.mock.calls[0]!;

    expect(result).toEqual({ ok: true, message: "WebDAV 连接成功" });
    expect(url).toBe("https://example.com/dav/DadKit");
    expect(init.method).toBe("PROPFIND");
    expect(new Headers(init.headers).get("depth")).toBe("0");
  });

  it("surfaces same-origin proxy errors", async () => {
    installStorage();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("WebDAV 代理不允许访问本机或内网地址。", {
          status: 400,
          headers: {
            "x-dadkit-webdav-proxy": "1",
            "x-dadkit-webdav-proxy-error": "1",
          },
        });
      }),
    );

    const result = await testWebDavConnection(
      {
        ...DEFAULT_WEBDAV_CONFIG,
        endpoint: "https://example.com/dav",
        username: "dad",
      },
      "secret",
    );

    expect(result).toEqual({
      ok: false,
      message: "WebDAV 代理不允许访问本机或内网地址。",
    });
  });
});

describe("webdav same-origin proxy route helpers", () => {
  it("parses and normalizes supported proxy payloads", () => {
    expect(
      parseProxyPayload(
        JSON.stringify({
          url: "https://example.com/dav",
          method: "propfind",
          headers: { Depth: "0" },
        }),
      ),
    ).toMatchObject({
      url: "https://example.com/dav",
      method: "PROPFIND",
      headers: { Depth: "0" },
    });
  });

  it("rejects unsupported proxy methods", () => {
    expect(() =>
      parseProxyPayload(
        JSON.stringify({
          url: "https://example.com/dav",
          method: "POST",
        }),
      ),
    ).toThrow("WebDAV 代理方法不受支持。");
  });

  it("keeps only WebDAV request headers needed by the proxy", () => {
    const headers = sanitizeProxyHeaders({
      Authorization: "Basic token",
      Cookie: "session=bad",
      Depth: "0",
      "Content-Type": "application/json",
    });

    expect(headers.get("Authorization")).toBe("Basic token");
    expect(headers.get("Depth")).toBe("0");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Cookie")).toBeNull();
  });

  it("blocks localhost, local hostnames, and private IP addresses", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("nas.local")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);
    expect(isPrivateIpAddress("127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("10.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("172.16.0.1")).toBe(true);
    expect(isPrivateIpAddress("192.168.1.1")).toBe(true);
    expect(isPrivateIpAddress("::1")).toBe(true);
    expect(isPrivateIpAddress("fd00::1")).toBe(true);
    expect(isPrivateIpAddress("fe80::1")).toBe(true);
    expect(isPrivateIpAddress("fe81::1")).toBe(true);
    expect(isPrivateIpAddress("8.8.8.8")).toBe(false);
  });
});
