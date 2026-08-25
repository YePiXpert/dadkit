import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isDadKitImportData,
  type DadKitExportData,
  type DadKitExportDataV5,
  type DadKitExportDataV6,
} from "@/lib/data/format";
import { getRequestedDataVersion } from "@/lib/sync/data-version";
import {
  createRandomSpace,
  createV2Invite,
  joinWithInvite,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
import {
  portableTestItem,
  portableV5,
  portableV6,
} from "@/tests/helpers/portable-data";

let dataDir: string;

async function twoDevices(name: string) {
  const first = await createRandomSpace(name, "v6 设备");
  const invite = await createV2Invite(first.token, 60);
  const second = await joinWithInvite(invite!.code, "v5 设备");

  if (!first || !second) throw new Error("测试同步空间创建失败");
  return { v6: first, v5: second };
}

function currentSpacePath() {
  const filename = readdirSync(dataDir).find((entry) => entry.endsWith(".json"));
  if (!filename) throw new Error("测试同步空间文件不存在");
  return path.join(dataDir, filename);
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v11-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v5/v6/v11 family sync compatibility", () => {
  it("drops retired hospital data and returns an empty field only to v6 clients", async () => {
    const { v6 } = await twoDevices("医院字段退役兼容家庭");
    const legacy = portableV6();
    legacy.hospital.fields.hospitalName = {
      value: "市妇幼保健院",
      updatedAt: 100,
    };

    await pushSpace(v6.token, legacy, 6);
    const forV11 = (await pullSpace(v6.token, 11))?.data as DadKitExportData;
    const forV6 = (await pullSpace(v6.token, 6))?.data as DadKitExportDataV6;
    const forV5 = (await pullSpace(v6.token, 5))?.data as DadKitExportDataV5;

    expect(forV11.version).toBe(11);
    expect(forV11).not.toHaveProperty("hospital");
    expect(forV6.hospital.fields.hospitalName).toEqual({
      value: "",
      updatedAt: 0,
    });
    expect(forV5).not.toHaveProperty("hospital");
    expect(isDadKitImportData(forV6)).toBe(true);
    expect(isDadKitImportData(forV5)).toBe(true);
  });

  it("merges checklist edits from v5 and v6 clients into canonical v11", async () => {
    const { v6, v5 } = await twoDevices("旧设备清单合并家庭");

    await pushSpace(
      v6.token,
      portableV6({
        checklist: [portableTestItem("from-v6", { updatedAt: 100 })],
      }),
      6,
    );
    await pushSpace(
      v5.token,
      portableV5({
        checklist: [portableTestItem("from-v5", { updatedAt: 200 })],
      }),
      5,
    );

    const latest = (await pullSpace(v6.token, 11))?.data as DadKitExportData;
    expect(latest.version).toBe(11);
    expect(latest.checklist.map((item) => item.id).sort()).toEqual([
      "from-v5",
      "from-v6",
    ]);
    expect(latest).not.toHaveProperty("hospital");
  });

  it("upgrades a stored v5 space to canonical v11 on its next valid push", async () => {
    const { v6 } = await twoDevices("旧空间升级家庭");
    const file = currentSpacePath();
    const stored = JSON.parse(readFileSync(file, "utf8")) as {
      data: DadKitExportDataV5 | DadKitExportData | null;
    };
    stored.data = portableV5({
      checklist: [portableTestItem("stored-v5", { updatedAt: 100 })],
    });
    writeFileSync(file, JSON.stringify(stored), "utf8");

    await pushSpace(
      v6.token,
      portableV6({
        checklist: [portableTestItem("new-v6", { updatedAt: 200 })],
      }),
      6,
    );
    const persisted = JSON.parse(readFileSync(file, "utf8")) as {
      data: DadKitExportData;
    };

    expect(persisted.data.version).toBe(11);
    expect(persisted.data).not.toHaveProperty("hospital");
    expect(persisted.data.checklist.map((item) => item.id).sort()).toEqual([
      "new-v6",
      "stored-v5",
    ]);
  });

  it("recognizes v11 and defaults missing or unknown headers to v5", () => {
    expect(getRequestedDataVersion(new Headers())).toBe(5);
    for (const version of [5, 6, 7, 8, 9, 10, 11] as const) {
      expect(
        getRequestedDataVersion(
          new Headers({ "X-DadKit-Data-Version": String(version) }),
        ),
      ).toBe(version);
    }
    expect(
      getRequestedDataVersion(
        new Headers({ "X-DadKit-Data-Version": "999" }),
      ),
    ).toBe(5);
  });
});
