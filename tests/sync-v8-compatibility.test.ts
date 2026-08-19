import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DadKitExportData,
  DadKitExportDataV5,
  DadKitExportDataV6,
  DadKitExportDataV7,
  DadKitExportDataV8,
} from "@/lib/data/format";
import {
  createRandomSpace,
  createV2Invite,
  joinWithInvite,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
import type { CareEventV1 } from "@/lib/baby/types";
import {
  portableTestItem,
  portableV5,
  portableV6,
  portableV7,
  portableV8,
} from "@/tests/helpers/portable-data";

let dataDir: string;

function diaper(id: string, updatedAt: number, deletedAt: number | null = null): CareEventV1 {
  return {
    id,
    type: "diaper",
    note: "",
    createdAt: Math.min(10, updatedAt),
    updatedAt,
    deletedAt,
    occurredAt: "2026-08-01T00:00:00.000Z",
    kind: "wet",
  };
}

function canonicalV8() {
  const data = portableV8();
  data.hospital.fields.hospitalName = { value: "市妇幼保健院", updatedAt: 10 };
  data.baby.profile.fields.birthDate = { value: "2026-08-01", updatedAt: 30 };
  data.baby.profile.fields.nickname = { value: "满满", updatedAt: 31 };
  data.baby.care.events = [diaper("canonical-diaper", 40)];
  return data;
}

async function devices(name: string) {
  const v8 = await createRandomSpace(name, "v8 设备");
  const v7Invite = await createV2Invite(v8.token, 60);
  const v7 = await joinWithInvite(v7Invite!.code, "v7 设备");
  const v6Invite = await createV2Invite(v8.token, 60);
  const v6 = await joinWithInvite(v6Invite!.code, "v6 设备");
  const v5Invite = await createV2Invite(v8.token, 60);
  const v5 = await joinWithInvite(v5Invite!.code, "v5 设备");
  if (!v8 || !v7 || !v6 || !v5) throw new Error("测试同步空间创建失败");
  return { v8, v7, v6, v5 };
}

function currentSpacePath() {
  const filename = readdirSync(dataDir).find((entry) => entry.endsWith(".json"));
  if (!filename) throw new Error("测试同步空间文件不存在");
  return path.join(dataDir, filename);
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v8-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v5/v6/v7/v8 family sync compatibility", () => {
  it("returns legal version projections without changing canonical data", async () => {
    const { v8 } = await devices("四版本投影家庭");
    await pushSpace(v8.token, canonicalV8(), 8);
    const storedBefore = readFileSync(currentSpacePath(), "utf8");

    const v5 = (await pullSpace(v8.token, 5))?.data as DadKitExportDataV5;
    const v6 = (await pullSpace(v8.token, 6))?.data as DadKitExportDataV6;
    const v7 = (await pullSpace(v8.token, 7))?.data as DadKitExportDataV7;
    const v8Data = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;

    expect(v5.version).toBe(5);
    expect(v5).not.toHaveProperty("hospital");
    expect(v5).not.toHaveProperty("planning");
    expect(v5).not.toHaveProperty("baby");
    expect(v6.version).toBe(6);
    expect(v6.hospital.fields.hospitalName.value).toBe("市妇幼保健院");
    expect(v6).not.toHaveProperty("planning");
    expect(v6).not.toHaveProperty("baby");
    expect(v7.version).toBe(7);
    expect(v7.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
    expect(v7).not.toHaveProperty("baby");
    expect(v8Data.baby.profile.fields.nickname.value).toBe("满满");
    expect(v8Data.baby.care.events).toHaveLength(1);
    expect(readFileSync(currentSpacePath(), "utf8")).toBe(storedBefore);
  });

  it("preserves baby data after v5, v6 and v7 pushes", async () => {
    const { v8, v7, v6, v5 } = await devices("旧设备保留宝宝家庭");
    await pushSpace(v8.token, canonicalV8(), 8);
    await pushSpace(v5.token, portableV5({ checklist: [portableTestItem("from-v5", { updatedAt: 100 })] }), 5);

    const v6Update = portableV6();
    v6Update.hospital.fields.address = { value: "健康路 2 号", updatedAt: 110 };
    await pushSpace(v6.token, v6Update, 6);

    await pushSpace(v7.token, portableV7(), 7);

    const final = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;
    expect(final.checklist.some((item) => item.id === "from-v5")).toBe(true);
    expect(final.hospital.fields.address.value).toBe("健康路 2 号");
    expect(final.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
    expect(final.baby.profile.fields.nickname.value).toBe("满满");
    expect(final.baby.care.events.map((event) => event.id)).toEqual(["canonical-diaper"]);
  });

  it("merges offline events and prevents deletion or global-clear resurrection", async () => {
    const { v8 } = await devices("宝宝事件合并家庭");
    const first = portableV8();
    first.baby.care.events = [diaper("device-a", 20)];
    const second = portableV8();
    second.baby.care.events = [diaper("device-b", 30)];

    await pushSpace(v8.token, first, 8);
    await pushSpace(v8.token, second, 8);
    let final = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;
    expect(final.baby.care.events.map((event) => event.id)).toEqual(["device-a", "device-b"]);

    const deletion = portableV8();
    deletion.baby.care.events = [diaper("device-a", 50, 50)];
    await pushSpace(v8.token, deletion, 8);
    await pushSpace(v8.token, first, 8);
    final = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;
    expect(final.baby.care.events.find((event) => event.id === "device-a")?.deletedAt).toBe(50);

    const cleared = portableV8();
    cleared.baby.care.clearedAt = 100;
    await pushSpace(v8.token, cleared, 8);
    await pushSpace(v8.token, second, 8);
    final = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;
    expect(final.baby.care).toEqual({ version: 1, clearedAt: 100, events: [] });

    const afterClear = portableV8();
    afterClear.baby.care.clearedAt = 100;
    afterClear.baby.care.events = [diaper("after-clear", 101)];
    await pushSpace(v8.token, afterClear, 8);
    final = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;
    expect(final.baby.care.events.map((event) => event.id)).toEqual(["after-clear"]);
  });

  it("upgrades a stored v7 space to canonical v8 without inventing baby timestamps", async () => {
    const { v8 } = await devices("旧v7空间升级v8家庭");
    const file = currentSpacePath();
    const stored = JSON.parse(readFileSync(file, "utf8")) as { data: unknown };
    stored.data = portableV7({ checklist: [portableTestItem("stored-v7")] });
    writeFileSync(file, JSON.stringify(stored), "utf8");

    const projected = (await pullSpace(v8.token, 8))?.data as DadKitExportDataV8;
    expect(projected.baby.profile.clearedAt).toBe(0);
    expect(projected.baby.care).toEqual({ version: 1, clearedAt: 0, events: [] });
    await pushSpace(v8.token, portableV8(), 8);
    const persisted = JSON.parse(readFileSync(file, "utf8")) as { data: DadKitExportData };
    expect(persisted.data.version).toBe(10);
  });
});
