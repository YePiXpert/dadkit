import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DadKitExportData } from "@/lib/data/format";
import {
  joinSpace,
  leaveSpace,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
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

function exportData(
  patch: Partial<DadKitExportData> = {},
): DadKitExportData {
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

describe("async sync server store", () => {
  it("creates and rejoins a space with the same code", async () => {
    const first = await joinSpace("测试家庭", "家庭同步码-1");
    const second = await joinSpace("测试家庭", "家庭同步码-1");

    expect(first).toMatchObject({ version: 0, data: null });
    expect(second?.token).not.toBe(first?.token);
  });

  it("rejects a wrong code", async () => {
    await joinSpace("测试家庭", "正确的同步码");
    await expect(joinSpace("测试家庭", "错误的同步码")).resolves.toBeUndefined();
  });

  it("never stores raw space names or codes and uses private permissions", async () => {
    await joinSpace("隐私家庭", "隐私同步码");

    const entries = readdirSync(dir);
    const file = path.join(dir, entries[0]!);
    const stored = readFileSync(file, "utf8");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^space-[0-9a-f]{64}\.json$/);
    expect(stored).not.toContain("隐私家庭");
    expect(stored).not.toContain("隐私同步码");
    if (process.platform !== "win32") {
      expect(statSync(file).mode & 0o777).toBe(0o600);
    }
  });

  it("rejects invalid stored structures", async () => {
    const joined = await joinSpace("损坏测试", "安全同步码");
    const file = path.join(dir, readdirSync(dir)[0]!);

    writeFileSync(file, JSON.stringify({ unsafe: true }), "utf8");
    await expect(pullSpace(joined!.token)).rejects.toThrow(
      "同步空间数据结构无效",
    );
  });

  it("authenticates pulls with the issued token only", async () => {
    const { token } = (await joinSpace("拉取家庭", "拉取同步码"))!;

    await expect(pullSpace(token)).resolves.toMatchObject({
      version: 0,
      data: null,
    });
    await expect(pullSpace("bad-token")).resolves.toBeUndefined();
    await expect(pullSpace(`${token}x`)).resolves.toBeUndefined();
  });

  it("serializes concurrent pushes and merges them item-wise", async () => {
    const deviceA = (await joinSpace("合并家庭", "合并同步码"))!;
    const deviceB = (await joinSpace("合并家庭", "合并同步码"))!;

    const [fromA, fromB] = await Promise.all([
      pushSpace(
        deviceA.token,
        exportData({ checklist: [testItem("a", { updatedAt: 100 })] }),
      ),
      pushSpace(
        deviceB.token,
        exportData({
          checklist: [testItem("b", { updatedAt: 200 })],
          customItems: [testItem("custom-b", { updatedAt: 200 })],
        }),
      ),
    ]);

    expect([fromA?.version, fromB?.version].sort()).toEqual([1, 2]);
    const pulled = await pullSpace(deviceA.token);
    const data = pulled!.data as DadKitExportData;

    expect(data.checklist.map((item) => item.id).sort()).toEqual(["a", "b"]);
    expect(data.customItems.map((item) => item.id)).toEqual(["custom-b"]);
  });

  it("lets the newer side win and revokes sessions", async () => {
    const deviceA = (await joinSpace("冲突家庭", "冲突同步码"))!;
    const deviceB = (await joinSpace("冲突家庭", "冲突同步码"))!;

    await pushSpace(
      deviceA.token,
      exportData({
        checklist: [testItem("a", { status: "packed", updatedAt: 300 })],
      }),
    );
    const merged = await pushSpace(
      deviceB.token,
      exportData({
        checklist: [testItem("a", { status: "todo", updatedAt: 100 })],
      }),
    );

    expect((merged!.data as DadKitExportData).checklist[0]?.status).toBe(
      "packed",
    );
    await expect(leaveSpace(deviceA.token)).resolves.toBe(true);
    await expect(pullSpace(deviceA.token)).resolves.toBeUndefined();
    await expect(leaveSpace(deviceA.token)).resolves.toBe(false);
  });
});
