import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as pullRoute } from "@/app/api/sync/pull/route";
import { POST as pushRoute } from "@/app/api/sync/push/route";
import type { DadKitSyncDataVersion } from "@/lib/data/format";
import {
  DADKIT_DATA_VERSION_HEADER,
  createSyncEtag,
} from "@/lib/sync/data-version";
import { createRandomSpace, pullSpace, pushSpace } from "@/lib/sync/server-store";
import { portableV5, portableV6, portableV7, portableV8, portableV10 } from "@/tests/helpers/portable-data";

let dataDir: string;

function pullRequest(token: string, version: DadKitSyncDataVersion, etag?: string) {
  const headers = new Headers({
    cookie: `dadkit_sync_session=${encodeURIComponent(token)}`,
    [DADKIT_DATA_VERSION_HEADER]: String(version),
    "x-forwarded-for": `203.0.113.${90 + version}`,
  });
  if (etag) headers.set("if-none-match", etag);
  return new Request("https://dadkit.test/api/sync/pull", { headers });
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v10-etag-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
  vi.stubEnv("DADKIT_PUBLIC_ORIGIN", "https://dadkit.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v10 representation ETags", () => {
  it("returns 304 for v5-v10 only when the requested representation matches", async () => {
    const device = await createRandomSpace("v10 ETag 家庭", "v10 设备");
    if (!device) throw new Error("测试同步空间创建失败");
    await pushSpace(device.token, portableV10(), 10);

    const etags = new Map<DadKitSyncDataVersion, string>();
    for (const version of [5, 6, 7, 8, 9, 10] as const) {
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

    expect((await pullRoute(pullRequest(device.token, 10, etags.get(9)))).status).toBe(200);
    expect((await pullRoute(pullRequest(device.token, 10, etags.get(8)))).status).toBe(200);
    expect((await pullRoute(pullRequest(device.token, 9, etags.get(10)))).status).toBe(200);
  });

  it("adds v10 ETag and Vary to push", async () => {
    const device = await createRandomSpace("v10 响应头家庭", "v10 设备");
    const pushResponse = await pushRoute(new Request("https://dadkit.test/api/sync/push", {
      method: "POST",
      headers: { cookie: `dadkit_sync_session=${encodeURIComponent(device.token)}`, origin: "https://dadkit.test", "content-type": "application/json", [DADKIT_DATA_VERSION_HEADER]: "10", "x-forwarded-for": "203.0.113.103" },
      body: JSON.stringify({ data: portableV10() }),
    }));
    const pushed = await pushResponse.json() as { version: number };
    expect(pushResponse.headers.get("etag")).toBe(createSyncEtag(pushed.version, 10));
    expect(pushResponse.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
  });

  it("keeps baby events intact after v5, v6, v7 and v8 pushes", async () => {
    const device = await createRandomSpace("旧设备兼容家庭", "v10 设备");
    if (!device) throw new Error("测试同步空间创建失败");
    const canonical = portableV10();
    canonical.baby.care.events = [{
      id: "event-a",
      type: "diaper",
      note: "v10 原备注",
      createdAt: 10,
      updatedAt: 10,
      deletedAt: null,
      occurredAt: "2026-08-01T00:00:00.000Z",
      kind: "wet",
    }];
    await pushSpace(device.token, canonical, 10);

    for (const [version, data] of [
      [5, portableV5()],
      [6, portableV6()],
      [7, portableV7()],
      [8, portableV8()],
    ] as const) {
      await pushSpace(device.token, data, version);
      const latest = await pullSpace(device.token, 10);
      const latestData = latest?.data;
      if (!latestData || latestData.version !== 10) throw new Error("v10 拉取失败");
      expect(latestData.baby.care.events[0]!.id).toBe("event-a");
      expect(latestData).not.toHaveProperty("household");
    }
  });
});
