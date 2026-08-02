import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DadKitExportData,
  DadKitExportDataV5,
  DadKitExportDataV6,
} from "@/lib/data/format";
import { createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { joinSpace, pullSpace, pushSpace } from "@/lib/sync/server-store";
import {
  portableTestItem,
  portableV5,
  portableV6,
  portableV7,
} from "@/tests/helpers/portable-data";

let dataDir: string;

function canonicalV7() {
  const data = portableV7();
  data.hospital.fields.hospitalName = { value: "市妇幼保健院", updatedAt: 10 };
  data.planning.items.bag = {
    ...createEmptyItemPlanningRecord(),
    assignee: { value: "dad", updatedAt: 20 },
    estimatedPriceFen: { value: 2_000, updatedAt: 21 },
  };
  return data;
}

async function devices(name: string) {
  const v7 = await joinSpace(name, "v7兼容同步码", false, 7);
  const v6 = await joinSpace(name, "v7兼容同步码", false, 6);
  const v5 = await joinSpace(name, "v7兼容同步码", false, 5);
  if (!v7 || !v6 || !v5) throw new Error("测试同步空间创建失败");
  return { v7, v6, v5 };
}

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
  it("returns pure version-specific projections", async () => {
    const { v7 } = await devices("三版本投影家庭");
    await pushSpace(v7.token, canonicalV7(), 7);

    const forV5 = (await pullSpace(v7.token, 5))?.data as DadKitExportDataV5;
    const forV6 = (await pullSpace(v7.token, 6))?.data as DadKitExportDataV6;
    const forV7 = (await pullSpace(v7.token, 7))?.data as DadKitExportData;
    expect(forV5.version).toBe(5);
    expect(forV5).not.toHaveProperty("hospital");
    expect(forV5).not.toHaveProperty("planning");
    expect(forV6.version).toBe(6);
    expect(forV6.hospital.fields.hospitalName.value).toBe("市妇幼保健院");
    expect(forV6).not.toHaveProperty("planning");
    expect(forV7.version).toBe(7);
    expect(forV7.planning.items.bag.assignee.value).toBe("dad");
  });

  it("preserves hospital and planning after a v5 push", async () => {
    const { v7, v5 } = await devices("v5保留新字段家庭");
    await pushSpace(v7.token, canonicalV7(), 7);
    await pushSpace(
      v5.token,
      portableV5({ checklist: [portableTestItem("v5", { updatedAt: 100 })] }),
      5,
    );
    const final = (await pullSpace(v7.token, 7))?.data as DadKitExportData;
    expect(final.hospital.fields.hospitalName.value).toBe("市妇幼保健院");
    expect(final.planning.items.bag.assignee.value).toBe("dad");
  });

  it("merges hospital but preserves planning after a v6 push", async () => {
    const { v7, v6 } = await devices("v6保留planning家庭");
    await pushSpace(v7.token, canonicalV7(), 7);
    const update = portableV6();
    update.hospital.fields.address = { value: "健康路 2 号", updatedAt: 200 };
    await pushSpace(v6.token, update, 6);
    const final = (await pullSpace(v7.token, 7))?.data as DadKitExportData;
    expect(final.hospital.fields.address.value).toBe("健康路 2 号");
    expect(final.planning.items.bag.estimatedPriceFen.value).toBe(2_000);
  });

  it("combines offline edits to different items and fields", async () => {
    const { v7 } = await devices("v7离线字段合并家庭");
    const assigneeEdit = portableV7();
    assigneeEdit.planning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "mom", updatedAt: 100 },
    };
    const priceEdit = portableV7();
    priceEdit.planning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      actualPriceFen: { value: 3_000, updatedAt: 110 },
    };
    priceEdit.planning.items.car = {
      ...createEmptyItemPlanningRecord(),
      storageLocation: { value: "车内", updatedAt: 120 },
    };
    await pushSpace(v7.token, assigneeEdit, 7);
    await pushSpace(v7.token, priceEdit, 7);
    const final = (await pullSpace(v7.token, 7))?.data as DadKitExportData;
    expect(final.planning.items.bag.assignee.value).toBe("mom");
    expect(final.planning.items.bag.actualPriceFen.value).toBe(3_000);
    expect(final.planning.items.car.storageLocation.value).toBe("车内");
  });

  it("does not resurrect planning after a global clear and old-device pushes", async () => {
    const { v7, v6, v5 } = await devices("planning全局清空家庭");
    await pushSpace(v7.token, canonicalV7(), 7);
    const cleared = portableV7({
      planning: { version: 1, clearedAt: 500, items: {} },
    });
    await pushSpace(v7.token, cleared, 7);
    await pushSpace(v6.token, portableV6(), 6);
    await pushSpace(v5.token, portableV5(), 5);
    const final = (await pullSpace(v7.token, 7))?.data as DadKitExportData;
    expect(final.planning).toEqual({ version: 1, clearedAt: 500, items: {} });
  });

  it("upgrades a stored v6 file to canonical v7 on write", async () => {
    const { v7 } = await devices("旧v6空间升级家庭");
    const file = currentSpacePath();
    const stored = JSON.parse(readFileSync(file, "utf8")) as { data: unknown };
    stored.data = portableV6({ checklist: [portableTestItem("stored-v6")] });
    writeFileSync(file, JSON.stringify(stored), "utf8");

    const projected = (await pullSpace(v7.token, 7))?.data as DadKitExportData;
    expect(projected.version).toBe(7);
    expect(projected.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
    await pushSpace(v7.token, portableV7(), 7);
    const persisted = JSON.parse(readFileSync(file, "utf8")) as {
      data: DadKitExportData;
    };
    expect(persisted.data.version).toBe(7);
  });
});
