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
import { createRandomSpace, pushSpace } from "@/lib/sync/server-store";
import { portableV8 } from "@/tests/helpers/portable-data";

let dataDir: string;

function pullRequest(token: string, version: DadKitSyncDataVersion, etag?: string) {
  const headers = new Headers({
    cookie: `dadkit_sync_session=${encodeURIComponent(token)}`,
    [DADKIT_DATA_VERSION_HEADER]: String(version),
    "x-forwarded-for": `203.0.113.${version}`,
  });
  if (etag) headers.set("if-none-match", etag);
  return new Request("https://dadkit.test/api/sync/pull", { headers });
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v8-etag-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
  vi.stubEnv("DADKIT_PUBLIC_ORIGIN", "https://dadkit.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v8 representation ETags", () => {
  it("returns 304 only for the same requested representation", async () => {
    const device = await createRandomSpace("v8 ETag家庭", "v8 设备");
    if (!device) throw new Error("测试同步空间创建失败");
    const data = portableV8();
    data.baby.profile.fields.nickname = { value: "ETag宝宝", updatedAt: 10 };
    await pushSpace(device.token, data, 8);

    const etags = new Map<DadKitSyncDataVersion, string>();
    for (const version of [5, 6, 7, 8] as const) {
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

    for (const oldVersion of [5, 6, 7] as const) {
      const upgraded = await pullRoute(pullRequest(device.token, 8, etags.get(oldVersion)));
      expect(upgraded.status).toBe(200);
    }
    const downgraded = await pullRoute(pullRequest(device.token, 7, etags.get(8)));
    expect(downgraded.status).toBe(200);
  });

  it("adds v8 ETag and Vary to push", async () => {
    const device = await createRandomSpace("v8 响应头家庭", "v8 设备");
    const pushResponse = await pushRoute(new Request("https://dadkit.test/api/sync/push", {
      method: "POST",
      headers: { cookie: `dadkit_sync_session=${encodeURIComponent(device.token)}`, origin: "https://dadkit.test", "content-type": "application/json", [DADKIT_DATA_VERSION_HEADER]: "8", "x-forwarded-for": "203.0.113.82" },
      body: JSON.stringify({ data: portableV8() }),
    }));
    const pushed = await pushResponse.json() as { version: number };
    expect(pushResponse.headers.get("etag")).toBe(createSyncEtag(pushed.version, 8));
    expect(pushResponse.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
  });
});
