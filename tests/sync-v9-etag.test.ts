import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createRoute } from "@/app/api/sync/create/route";
import { POST as joinRoute } from "@/app/api/sync/join/route";
import { GET as pullRoute } from "@/app/api/sync/pull/route";
import { POST as pushRoute } from "@/app/api/sync/push/route";
import type { DadKitSyncDataVersion } from "@/lib/data/format";
import {
  DADKIT_DATA_VERSION_HEADER,
  createSyncEtag,
} from "@/lib/sync/data-version";
import { joinSpace, pullSpace, pushSpace } from "@/lib/sync/server-store";
import { portableV5, portableV6, portableV7, portableV8, portableV9 } from "@/tests/helpers/portable-data";

let dataDir: string;

function pullRequest(token: string, version: DadKitSyncDataVersion, etag?: string) {
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    [DADKIT_DATA_VERSION_HEADER]: String(version),
    "x-forwarded-for": `203.0.113.${90 + version}`,
  });
  if (etag) headers.set("if-none-match", etag);
  return new Request("https://dadkit.test/api/sync/pull", { headers });
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v9-etag-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v9 representation ETags", () => {
  it("returns 304 for v5-v9 only when the requested representation matches", async () => {
    const device = await joinSpace("v9 ETag 家庭", "v9 ETag 同步码", false, 9);
    if (!device) throw new Error("测试同步空间创建失败");
    await pushSpace(device.token, portableV9(), 9);

    const etags = new Map<DadKitSyncDataVersion, string>();
    for (const version of [5, 6, 7, 8, 9] as const) {
      const response = await pullRoute(pullRequest(device.token, version));
      expect(response.status).toBe(200);
      expect(response.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
      const etag = response.headers.get("etag");
      expect(etag).toMatch(new RegExp(`-v${version}\\"$`));
      etags.set(version, etag!);

      const unchanged = await pullRoute(pullRequest(device.token, version, etag!));
      expect(unchanged.status).toBe(304);
      expect(unchanged.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
    }

    expect((await pullRoute(pullRequest(device.token, 9, etags.get(8)))).status).toBe(200);
    expect((await pullRoute(pullRequest(device.token, 9, etags.get(7)))).status).toBe(200);
    expect((await pullRoute(pullRequest(device.token, 8, etags.get(9)))).status).toBe(200);
  });

  it("adds v9 ETag and Vary to create, join and push", async () => {
    const createResponse = await createRoute(new Request("https://dadkit.test/api/sync/create", {
      method: "POST",
      headers: { "content-type": "application/json", [DADKIT_DATA_VERSION_HEADER]: "9", "x-forwarded-for": "203.0.113.101" },
      body: JSON.stringify({ name: "v9 响应头家庭" }),
    }));
    const created = await createResponse.json() as { invite: { code: string }; token: string; version: number };
    expect(createResponse.headers.get("etag")).toBe(createSyncEtag(created.version, 9));
    expect(createResponse.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);

    const joinResponse = await joinRoute(new Request("https://dadkit.test/api/sync/join", {
      method: "POST",
      headers: { "content-type": "application/json", [DADKIT_DATA_VERSION_HEADER]: "9", "x-forwarded-for": "203.0.113.102" },
      body: JSON.stringify({ name: "v9 响应头家庭", code: created.invite.code, existingOnly: true }),
    }));
    const joined = await joinResponse.json() as { version: number };
    expect(joinResponse.headers.get("etag")).toBe(createSyncEtag(joined.version, 9));
    expect(joinResponse.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);

    const pushResponse = await pushRoute(new Request("https://dadkit.test/api/sync/push", {
      method: "POST",
      headers: { authorization: `Bearer ${created.token}`, "content-type": "application/json", [DADKIT_DATA_VERSION_HEADER]: "9", "x-forwarded-for": "203.0.113.103" },
      body: JSON.stringify({ data: portableV9() }),
    }));
    const pushed = await pushResponse.json() as { version: number };
    expect(pushResponse.headers.get("etag")).toBe(createSyncEtag(pushed.version, 9));
    expect(pushResponse.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
  });

  it("preserves a canonical recorder when an actual v8 device edits the event", async () => {
    const device = await joinSpace("v8 记录人兼容家庭", "v8 记录人同步码", false, 9);
    if (!device) throw new Error("测试同步空间创建失败");
    const canonical = portableV9();
    canonical.household.members["member-a"] = {
      id: "member-a",
      createdAt: 1,
      displayName: { value: "小江", updatedAt: 1 },
      relationshipLabel: { value: "家长", updatedAt: 1 },
      deleted: { value: false, updatedAt: 1 },
    };
    canonical.baby.care.events = [{
      id: "event-a",
      type: "diaper",
      note: "v9 原备注",
      recordedByMemberId: "member-a",
      createdAt: 10,
      updatedAt: 10,
      deletedAt: null,
      occurredAt: "2026-08-01T00:00:00.000Z",
      kind: "wet",
    }];
    await pushSpace(device.token, canonical, 9);

    const legacy = await pullSpace(device.token, 8);
    const legacyData = legacy?.data;
    if (!legacyData || legacyData.version !== 8) throw new Error("v8 投影失败");
    legacyData.baby.care.events[0]!.note = "v8 已编辑";
    legacyData.baby.care.events[0]!.updatedAt = 20;
    await pushSpace(device.token, legacyData, 8);

    const latest = await pullSpace(device.token, 9);
    const latestData = latest?.data;
    if (!latestData || latestData.version !== 9) throw new Error("v9 拉取失败");
    expect(latestData.baby.care.events[0]!.note).toBe("v8 已编辑");
    expect(latestData.baby.care.events[0]!.recordedByMemberId).toBe("member-a");
  });

  it("preserves household after v5, v6, v7 and v8 pushes", async () => {
    const device = await joinSpace("旧设备 household 兼容家庭", "旧设备 household 同步码", false, 9);
    if (!device) throw new Error("测试同步空间创建失败");
    const canonical = portableV9();
    canonical.household.members["member-custom"] = {
      id: "member-custom",
      createdAt: 10,
      displayName: { value: "王阿姨", updatedAt: 10 },
      relationshipLabel: { value: "月嫂", updatedAt: 10 },
      deleted: { value: false, updatedAt: 10 },
    };
    await pushSpace(device.token, canonical, 9);

    for (const [version, data] of [
      [5, portableV5()],
      [6, portableV6()],
      [7, portableV7()],
      [8, portableV8()],
    ] as const) {
      await pushSpace(device.token, data, version);
      const latest = await pullSpace(device.token, 9);
      const latestData = latest?.data;
      if (!latestData || latestData.version !== 9) throw new Error("v9 拉取失败");
      expect(latestData.household.members["member-custom"].displayName.value).toBe("王阿姨");
    }
  });
});
