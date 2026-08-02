import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as pullRoute } from "@/app/api/sync/pull/route";
import { POST as pushRoute } from "@/app/api/sync/push/route";
import type { DadKitExportDataV7 } from "@/lib/data/format";
import { createEmptyItemPlanningRecordV1 } from "@/lib/planning/defaults";
import {
  DADKIT_DATA_VERSION_HEADER,
  createSyncEtag,
} from "@/lib/sync/data-version";
import { joinSpace, pushSpace } from "@/lib/sync/server-store";
import { portableV7 } from "@/tests/helpers/portable-data";

let dataDir: string;

function request(token: string, dataVersion: 5 | 6 | 7, etag?: string) {
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    [DADKIT_DATA_VERSION_HEADER]: String(dataVersion),
    "x-forwarded-for": "203.0.113.77",
  });
  if (etag) headers.set("if-none-match", etag);
  return new Request("https://dadkit.test/api/sync/pull", { headers });
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v7-etag-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v7 representation ETags", () => {
  it("returns 200 for cross-version ETags and 304 only for v7", async () => {
    const device = await joinSpace("v7 ETag家庭", "v7 ETag同步码", false, 7);
    if (!device) throw new Error("测试同步空间创建失败");
    const data = portableV7();
    data.planning.items.bag = {
      ...createEmptyItemPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 10 },
    };
    await pushSpace(device.token, data, 7);

    const v6 = await pullRoute(request(device.token, 6));
    const v6Etag = v6.headers.get("etag") ?? undefined;
    expect(v6.status).toBe(200);
    expect(v6Etag).toMatch(/-v6"$/);

    const upgraded = await pullRoute(request(device.token, 7, v6Etag));
    const upgradedPayload = (await upgraded.json()) as {
      data: DadKitExportDataV7;
      version: number;
    };
    const v7Etag = upgraded.headers.get("etag") ?? undefined;
    expect(upgraded.status).toBe(200);
    expect(upgradedPayload.data.planning.items.bag.assignee.value).toBe("dad");
    expect(v7Etag).toBe(createSyncEtag(upgradedPayload.version, 7));

    const unchanged = await pullRoute(request(device.token, 7, v7Etag));
    expect(unchanged.status).toBe(304);

    const v5CrossVersion = await pullRoute(
      request(device.token, 7, createSyncEtag(upgradedPayload.version, 5)),
    );
    expect(v5CrossVersion.status).toBe(200);

    for (const response of [v6, upgraded, unchanged, v5CrossVersion]) {
      expect(response.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
    }
  });

  it("returns a v7 ETag and Vary header after a v7 push", async () => {
    const device = await joinSpace("v7 push ETag家庭", "v7 push同步码", false, 7);
    if (!device) throw new Error("测试同步空间创建失败");
    const data = portableV7();
    data.planning.items.bag = {
      ...createEmptyItemPlanningRecordV1(),
      actualPriceFen: { value: 880, updatedAt: 20 },
    };
    const response = await pushRoute(
      new Request("https://dadkit.test/api/sync/push", {
        method: "POST",
        headers: {
          authorization: `Bearer ${device.token}`,
          "content-type": "application/json",
          [DADKIT_DATA_VERSION_HEADER]: "7",
          "x-forwarded-for": "203.0.113.78",
        },
        body: JSON.stringify({ data }),
      }),
    );
    const payload = (await response.json()) as {
      data: DadKitExportDataV7;
      version: number;
    };
    expect(payload.data.planning.items.bag.actualPriceFen.value).toBe(880);
    expect(response.headers.get("etag")).toBe(createSyncEtag(payload.version, 7));
    expect(response.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
  });
});
