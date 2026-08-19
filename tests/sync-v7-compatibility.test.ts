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

import { createEmptyLegacyPlanningRecordV1 } from "@/lib/data/legacy-planning";
import type {
  DadKitExportData,
  DadKitExportDataV5,
  DadKitExportDataV6,
  DadKitExportDataV7,
} from "@/lib/data/format";
import {
  createRandomSpace,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
import {
  portableTestItem,
  portableV5,
  portableV6,
  portableV7,
} from "@/tests/helpers/portable-data";

let dataDir: string;

function currentSpacePath() {
  const filename = readdirSync(dataDir).find((entry) => entry.endsWith(".json"));
  if (!filename) throw new Error("测试同步空间文件不存在");
  return path.join(dataDir, filename);
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v7-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v5/v6/v7 family sync compatibility", () => {
  it("returns legal projections with empty retired planning fields", async () => {
    const device = await createRandomSpace("三版本投影家庭", "v7 设备");
    const data = portableV7();
    data.hospital.fields.hospitalName = {
      value: "市妇幼保健院",
      updatedAt: 10,
    };
    data.planning.items.bag = {
      ...createEmptyLegacyPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 20 },
    };
    await pushSpace(device.token, data, 7);

    const forV5 = (await pullSpace(device.token, 5))?.data as DadKitExportDataV5;
    const forV6 = (await pullSpace(device.token, 6))?.data as DadKitExportDataV6;
    const forV7 = (await pullSpace(device.token, 7))?.data as DadKitExportDataV7;

    expect(forV5.version).toBe(5);
    expect(forV5).not.toHaveProperty("hospital");
    expect(forV5).not.toHaveProperty("planning");
    expect(forV6.hospital.fields.hospitalName.value).toBe("市妇幼保健院");
    expect(forV6).not.toHaveProperty("planning");
    expect(forV7.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
  });

  it("merges supported fields from old clients", async () => {
    const device = await createRandomSpace("旧设备字段兼容家庭", "v7 设备");
    const initial = portableV7();
    initial.hospital.fields.hospitalName = { value: "市妇幼", updatedAt: 10 };
    await pushSpace(device.token, initial, 7);
    await pushSpace(
      device.token,
      portableV5({
        checklist: [portableTestItem("v5", { updatedAt: 100 })],
      }),
      5,
    );
    const v6Update = portableV6();
    v6Update.hospital.fields.address = { value: "健康路 2 号", updatedAt: 200 };
    await pushSpace(device.token, v6Update, 6);

    const latest = (await pullSpace(device.token, 10))?.data as DadKitExportData;
    expect(latest.checklist.some((item) => item.id === "v5")).toBe(true);
    expect(latest.hospital.fields.hospitalName.value).toBe("市妇幼");
    expect(latest.hospital.fields.address.value).toBe("健康路 2 号");
    expect(latest).not.toHaveProperty("planning");
  });

  it("upgrades a stored v6 file to canonical v10 on write", async () => {
    const device = await createRandomSpace("旧v6空间升级家庭", "v7 设备");
    const file = currentSpacePath();
    const stored = JSON.parse(readFileSync(file, "utf8")) as { data: unknown };
    stored.data = portableV6({ checklist: [portableTestItem("stored-v6")] });
    writeFileSync(file, JSON.stringify(stored), "utf8");

    const projected = (await pullSpace(device.token, 7))?.data;
    expect(projected?.version).toBe(7);
    if (!projected || projected.version !== 7) throw new Error("v7 投影失败");
    expect(projected.planning).toEqual({ version: 1, clearedAt: 0, items: {} });

    await pushSpace(device.token, portableV7(), 7);
    const persisted = JSON.parse(readFileSync(file, "utf8")) as {
      data: DadKitExportData;
    };
    expect(persisted.data.version).toBe(10);
    expect(persisted.data).not.toHaveProperty("planning");
  });
});
