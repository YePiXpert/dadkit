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
  isBlockedHostname,
  isPrivateIpAddress,
  parseProxyPayload,
  sanitizeProxyHeaders,
} from "@/lib/webdav/proxy";
import {
  buildAuthHeader,
  buildDadKitWebDavBackup,
  calculateChecksum,
  importDadKitWebDavBackup,
  joinWebDavPath,
  normalizeWebDavEndpoint,
  responseFromNativeWebDavResult,
  selectWebDavTransport,
  testWebDavConnection,
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
      hospitalAnswers: [],
      hospitalOverrides: [],
    };
    const backup = buildDadKitWebDavBackup(remoteData, "remote-device");
    const result = importDadKitWebDavBackup(backup);
    const snapshots = loadSnapshots();

    expect(result.ok).toBe(true);
    expect(snapshots[0]?.reason).toBe("导入 WebDAV 备份前");
    expect(snapshots[0]?.data.checklist).toEqual([testItem("local-before-webdav")]);
  });

  it("prefills the first native WebDAV target without storing secrets", () => {
    expect(DEFAULT_WEBDAV_CONFIG.endpoint).toBe("https://webdav.123pan.cn/webdav");
    expect(DEFAULT_WEBDAV_CONFIG.remoteDir).toBe("/DadKit");
    expect(DEFAULT_WEBDAV_CONFIG.filename).toBe("dadkit-backup.json");
    expect(DEFAULT_WEBDAV_CONFIG.username).toBe("");
    expect(DEFAULT_WEBDAV_CONFIG.rememberSecret).toBe(false);
  });

  it("uses the same-origin proxy for browser WebDAV requests", async () => {
    installStorage();

    const fetchMock = vi.fn(async () => {
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
    const [url, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit,
    ];
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

  it("selects the native WebDAV transport before browser proxy fallback", () => {
    expect(selectWebDavTransport({ isBrowser: true, isNative: true })).toBe(
      "native-http",
    );
    expect(selectWebDavTransport({ isBrowser: true, isNative: false })).toBe(
      "browser-proxy",
    );
    expect(selectWebDavTransport({ isBrowser: false, isNative: false })).toBe(
      "direct-fetch",
    );
  });

  it("normalizes native WebDAV HTTP responses to Fetch responses", async () => {
    const response = responseFromNativeWebDavResult({
      data: { ok: true },
      status: 207,
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status).toBe(207);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe(JSON.stringify({ ok: true }));
  });

  it("uses direct fetch when not running in a browser or native app", async () => {
    const fetchMock = vi.fn(async () => {
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

    const [url, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit,
    ];

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
