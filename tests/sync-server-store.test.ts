import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  joinSpace,
  leaveSpace,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
import type { DadKitExportData } from "@/lib/storage";
import type { ChecklistItem } from "@/lib/types";

let dir: string;

function testItem(
  id: string,
  patch: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id,
    name: `测试物品 ${id}`,
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind: "pack_existing",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

function exportData(patch: Partial<DadKitExportData> = {}): DadKitExportData {
  return {
    version: 5,
    exportedAt: "2026-07-26T00:00:00.000Z",
    checklistMode: "lean",
    checklist: [],
    customItems: [],
    hiddenTemplateItemIds: [],
    growth: {
      version: 1,
      profile: { nickname: "", dueDate: "" },
      progress: { completedTaskIds: [] },
    },
    hiddenTemplateItemStamps: {},
    deletedCustomItems: {},
    growthUpdatedAt: 0,
    ...patch,
  };
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-store-"));
  vi.stubEnv("DADKIT_DATA_DIR", dir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

describe("sync server store", () => {
  it("creates a space on first join and rejoins with the same code", () => {
    const first = joinSpace("测试家庭", " 家庭同步码-1 ");

    expect(first).toBeDefined();
    expect(first!.version).toBe(0);
    expect(first!.data).toBeNull();
    expect(first!.token).toContain(".");

    const second = joinSpace("测试家庭", "家庭同步码-1");

    expect(second).toBeDefined();
    expect(second!.token).not.toBe(first!.token);
  });

  it("rejects a wrong code for an existing space", () => {
    joinSpace("测试家庭", "正确的码");

    expect(joinSpace("测试家庭", "错误的码")).toBeUndefined();
  });

  it("does not name space files after the raw code", () => {
    joinSpace("隐私家庭", "隐私同步码");

    const entries = readdirSync(dir);

    expect(entries.length).toBe(1);
    expect(entries[0]).toMatch(/^space-[0-9a-f]{64}\.json$/);
    expect(entries[0]).not.toContain("隐私家庭");
    expect(entries[0]).not.toContain("隐私同步码");

    const stored = readFileSync(path.join(dir, entries[0]!), "utf8");

    expect(stored).not.toContain("隐私同步码");
  });

  it("authenticates pulls with the issued token only", () => {
    const { token } = joinSpace("拉取家庭", "拉取码")!;

    expect(pullSpace(token)).toMatchObject({ version: 0, data: null });
    expect(pullSpace("bad-token")).toBeUndefined();
    expect(pullSpace(`${token}x`)).toBeUndefined();
  });

  it("merges pushes from two devices item-wise", () => {
    const deviceA = joinSpace("合并家庭", "合并码")!;
    const deviceB = joinSpace("合并家庭", "合并码")!;

    const seeded = pushSpace(
      deviceA.token,
      exportData({ checklist: [testItem("a", { updatedAt: 100 })] }),
    );

    expect(seeded!.version).toBe(1);

    const fromB = exportData({
      checklist: [testItem("b", { updatedAt: 200 })],
      customItems: [testItem("custom-b", { updatedAt: 200 })],
    });

    const merged = pushSpace(deviceB.token, fromB);

    expect(merged!.version).toBe(2);
    expect(merged!.data).toMatchObject({ version: 5 });
    const mergedData = merged!.data as DadKitExportData;

    expect(mergedData.checklist.map((item) => item.id).sort()).toEqual([
      "a",
      "b",
    ]);
    expect(mergedData.customItems.map((item) => item.id)).toEqual([
      "custom-b",
    ]);

    // A 再拉取能看到 B 的数据
    const pulled = pullSpace(deviceA.token);

    expect((pulled!.data as DadKitExportData).checklist).toHaveLength(2);
  });

  it("lets the newer side win when both pushed the same item", () => {
    const deviceA = joinSpace("冲突家庭", "冲突码")!;
    const deviceB = joinSpace("冲突家庭", "冲突码")!;

    pushSpace(
      deviceA.token,
      exportData({
        checklist: [testItem("a", { status: "packed", updatedAt: 300 })],
      }),
    );
    const merged = pushSpace(
      deviceB.token,
      exportData({
        checklist: [testItem("a", { status: "todo", updatedAt: 100 })],
      }),
    );

    const data = merged!.data as DadKitExportData;

    expect(data.checklist).toHaveLength(1);
    expect(data.checklist[0]?.status).toBe("packed");
  });

  it("revokes sessions on leave", () => {
    const { token } = joinSpace("离开家庭", "离开码")!;

    expect(leaveSpace(token)).toBe(true);
    expect(pullSpace(token)).toBeUndefined();
    expect(leaveSpace(token)).toBe(false);
  });
});
