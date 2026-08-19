import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  exportData,
  loadSnapshots,
  loadSnapshotsAsync,
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
  parseProxyV2Metadata,
  sanitizeProxyHeaders,
} from "@/lib/webdav/proxy";
import {
  WEBDAV_PROXY_METADATA_HEADER,
  WEBDAV_PROXY_VERSION_HEADER,
  encodeWebDavProxyMetadata,
  decodeWebDavProxyMetadata,
} from "@/lib/webdav/limits";
import {
  buildAuthHeader,
  buildDadKitWebDavBackup,
  calculateChecksum,
  downloadWebDavBackup,
  importDadKitWebDavBackup,
  joinWebDavPath,
  normalizeWebDavEndpoint,
  readLimitedWebDavResponseText,
  selectWebDavTransport,
  testWebDavConnection,
  uploadWebDavBackup,
  webDavStatusMessage,
} from "@/lib/webdav/client";
import { DEFAULT_WEBDAV_CONFIG } from "@/lib/webdav/types";
import { MemoryBabyRepository, setBabyRepositoryForTests } from "@/lib/baby/repository";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { loadHousehold, saveHousehold } from "@/lib/household/repository";
import { portableV8 } from "@/tests/helpers/portable-data";
import type { DadKitWebDavBackup } from "@/lib/webdav/types";

function installStorage() {
  const babyRepository = new MemoryBabyRepository();
  setBabyRepositoryForTests(babyRepository);
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

  return { localStore, sessionStore, babyRepository };
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
  setBabyRepositoryForTests(undefined);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("webdav helpers", () => {
  it("keeps the plaintext credential warning next to the remember switch", () => {
    const backupPage = readFileSync(
      join(process.cwd(), "app", "settings", "backup", "page.tsx"),
      "utf8",
    );
    expect(backupPage).toContain("开启后会明文保存在此设备的本地存储");
    expect(DEFAULT_WEBDAV_CONFIG.rememberSecret).toBe(false);
  });

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
    expect(backup.data.version).toBe(10);
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

  it("creates a snapshot before importing a WebDAV backup", async () => {
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
    const result = await importDadKitWebDavBackup(backup);
    const snapshots = await loadSnapshotsAsync();

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

  it("restores and merges hospital data from a v7 WebDAV backup", async () => {
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

    const result = await importDadKitWebDavBackup(backup);

    expect(result.ok).toBe(true);
    expect(loadHospitalProfile().fields.address).toEqual({
      value: "远端新地址",
      updatedAt: 300,
    });
    const rescueData = (await loadSnapshotsAsync())[0]?.data;
    expect(rescueData?.version).toBe(10);
    if (rescueData?.version !== 10) throw new Error("缺少 v10 恢复快照");
    expect(rescueData.hospital.fields.address.value).toBe("旧地址");
  });

  it("restores and event-merges v8 baby timers, events and tombstones", async () => {
    const { babyRepository } = installStorage();
    const localBaby = await babyRepository.getAllBabyData();
    localBaby.profile.fields.birthDate = { value: "2026-08-01", updatedAt: 10 };
    localBaby.care.events = [
      { id: "active-sleep", type: "sleep", note: "", createdAt: 20, updatedAt: 20, deletedAt: null, recordedByMemberId: null, startAt: "2026-08-01T00:00:00.000Z", endAt: null },
      { id: "deleted-diaper", type: "diaper", note: "", createdAt: 21, updatedAt: 40, deletedAt: 40, recordedByMemberId: null, occurredAt: "2026-08-01T00:10:00.000Z", kind: "wet" },
    ];
    await babyRepository.replaceBabyDataTransaction(localBaby);

    const remote = exportData();
    remote.baby.care.events = [
      { id: "active-pumping", type: "pumping", note: "", createdAt: 30, updatedAt: 30, deletedAt: null, recordedByMemberId: null, startAt: "2026-08-01T00:20:00.000Z", endAt: null, side: "both", amountMl: null },
      { id: "deleted-diaper", type: "diaper", note: "", createdAt: 21, updatedAt: 21, deletedAt: null, recordedByMemberId: null, occurredAt: "2026-08-01T00:10:00.000Z", kind: "wet" },
    ];
    const backup = buildDadKitWebDavBackup(remote, "remote-baby");

    expect((await importDadKitWebDavBackup(backup)).ok).toBe(true);
    const merged = await babyRepository.getAllBabyData();
    expect(merged.care.events.map((event) => event.id)).toEqual([
      "active-pumping",
      "active-sleep",
      "deleted-diaper",
    ]);
    expect(merged.care.events.find((event) => event.id === "deleted-diaper")?.deletedAt).toBe(40);
    expect((await babyRepository.getActiveEvents()).map((event) => event.type).sort()).toEqual(["pumping", "sleep"]);
  });

  it("merges an actual v8 WebDAV backup without clearing v10 household or recorder", async () => {
    const { babyRepository } = installStorage();
    const household = createEmptyHousehold();
    household.members["member-a"] = {
      id: "member-a",
      createdAt: 1,
      displayName: { value: "小江", updatedAt: 1 },
      relationshipLabel: { value: "家长", updatedAt: 1 },
      deleted: { value: false, updatedAt: 1 },
    };
    saveHousehold(household);
    const localBaby = await babyRepository.getAllBabyData();
    localBaby.care.events = [{
      id: "shared-event",
      type: "diaper",
      note: "v10 原备注",
      recordedByMemberId: "member-a",
      createdAt: 10,
      updatedAt: 10,
      deletedAt: null,
      occurredAt: "2026-08-01T00:00:00.000Z",
      kind: "wet",
    }];
    await babyRepository.replaceBabyDataTransaction(localBaby);

    const legacy = portableV8();
    legacy.baby.care.events = [{
      id: "shared-event",
      type: "diaper",
      note: "v8 WebDAV 编辑",
      createdAt: 10,
      updatedAt: 20,
      deletedAt: null,
      occurredAt: "2026-08-01T00:00:00.000Z",
      kind: "wet",
    }];
    const backup: DadKitWebDavBackup = {
      schemaVersion: 3,
      app: "DadKit",
      deviceId: "legacy-v8-device",
      backupId: "legacy-v8-backup",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      checksum: calculateChecksum(legacy),
      data: legacy,
    };

    expect((await importDadKitWebDavBackup(backup)).ok).toBe(true);
    expect(loadHousehold().members["member-a"].displayName.value).toBe("小江");
    const event = (await babyRepository.getAllBabyData()).care.events[0];
    expect(event.note).toBe("v8 WebDAV 编辑");
    expect(event.recordedByMemberId).toBe("member-a");
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
    const headers = new Headers(init.headers);
    const payload = decodeWebDavProxyMetadata(
      headers.get(WEBDAV_PROXY_METADATA_HEADER) ?? "",
    ) as { url: string; method: string; headers: Record<string, string> };

    expect(result).toEqual({ ok: true, message: "WebDAV 连接成功" });
    expect(url).toBe("/api/webdav");
    expect(headers.get(WEBDAV_PROXY_VERSION_HEADER)).toBe("2");
    expect(init.body).toBeUndefined();
    expect(payload).toMatchObject({
      url: "https://example.com/dav/DadKit",
      method: "PROPFIND",
    });
    expect(payload.headers.authorization).toBe(buildAuthHeader("dad", "secret"));
    expect(payload.headers.depth).toBe("0");
  });

  it("parses the v2 proxy metadata without embedding the backup body", () => {
    const payload = parseProxyV2Metadata(encodeWebDavProxyMetadata({
      url: "https://example.com/dav/backup.json",
      method: "PUT",
      headers: { authorization: "Basic secret" },
    }));

    expect(payload).toEqual({
      url: "https://example.com/dav/backup.json",
      method: "PUT",
      headers: { authorization: "Basic secret" },
      body: undefined,
    });
  });

  it("rejects oversized responses before or during streaming", async () => {
    await expect(readLimitedWebDavResponseText(new Response("small", {
      headers: { "content-length": "6" },
    }), 5)).rejects.toThrow("超过 32 MiB");

    const streamed = new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("abc"));
        controller.enqueue(new TextEncoder().encode("def"));
        controller.close();
      },
    }));
    await expect(readLimitedWebDavResponseText(streamed, 5)).rejects.toThrow("超过 32 MiB");
  });

  it("aborts a browser proxy request after 30 seconds", async () => {
    installStorage();
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    ));

    const resultPromise = testWebDavConnection(
      { ...DEFAULT_WEBDAV_CONFIG, endpoint: "https://example.com/dav", username: "dad" },
      "secret",
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("等待超过 30 秒"),
    });
    vi.useRealTimers();
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
