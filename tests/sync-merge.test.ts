import { describe, expect, it } from "vitest";

import { mergeExportData } from "@/lib/sync/merge";
import type { DadKitExportData } from "@/lib/storage";
import type { ChecklistItem } from "@/lib/types";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import {
  createEmptyItemPlanning,
  createEmptyItemPlanningRecord,
} from "@/lib/planning/defaults";
import { portableV6 } from "@/tests/helpers/portable-data";

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
    version: 7,
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
    hospital: createEmptyHospitalProfile(),
    planning: createEmptyItemPlanning(),
    ...patch,
  };
}

describe("mergeExportData", () => {
  it("keeps changes made on both sides for different items", () => {
    const local = exportData({
      checklist: [testItem("a", { status: "packed", updatedAt: 100 })],
      customItems: [testItem("custom-local", { updatedAt: 100 })],
    });
    const remote = exportData({
      checklist: [testItem("b", { status: "bought", updatedAt: 200 })],
      customItems: [testItem("custom-remote", { updatedAt: 200 })],
    });

    const merged = mergeExportData(local, remote);

    expect(merged.checklist.map((item) => item.id).sort()).toEqual(["a", "b"]);
    expect(merged.customItems.map((item) => item.id).sort()).toEqual([
      "custom-local",
      "custom-remote",
    ]);
  });

  it("lets the newer item win on the same id", () => {
    const local = exportData({
      checklist: [testItem("a", { status: "todo", updatedAt: 100 })],
    });
    const remote = exportData({
      checklist: [
        testItem("a", { status: "packed", quantity: "2 包", updatedAt: 300 }),
      ],
    });

    const merged = mergeExportData(local, remote);

    expect(merged.checklist).toHaveLength(1);
    expect(merged.checklist[0]?.status).toBe("packed");
    expect(merged.checklist[0]?.quantity).toBe("2 包");
  });

  it("keeps the local item when timestamps tie", () => {
    const local = exportData({
      checklist: [testItem("a", { status: "packed", updatedAt: 100 })],
    });
    const remote = exportData({
      checklist: [testItem("a", { status: "todo", updatedAt: 100 })],
    });

    expect(mergeExportData(local, remote).checklist[0]?.status).toBe("packed");
  });

  it("treats items without updatedAt as oldest", () => {
    const local = exportData({
      checklist: [testItem("a", { status: "todo" })],
    });
    const remote = exportData({
      checklist: [testItem("a", { status: "packed", updatedAt: 50 })],
    });

    expect(mergeExportData(local, remote).checklist[0]?.status).toBe("packed");
  });

  it("drops a custom item when a newer tombstone exists, and resurrects it when the item is newer", () => {
    const local = exportData({
      customItems: [testItem("custom", { updatedAt: 100 })],
      deletedCustomItems: { custom: 200 },
    });

    expect(mergeExportData(local, exportData()).customItems).toHaveLength(0);

    const resurrected = mergeExportData(
      exportData({ deletedCustomItems: { custom: 200 } }),
      exportData({ customItems: [testItem("custom", { updatedAt: 300 })] }),
    );

    expect(resurrected.customItems.map((item) => item.id)).toEqual(["custom"]);
  });

  it("removes tombstoned custom items from the merged checklist too", () => {
    const local = exportData({
      checklist: [testItem("custom", { updatedAt: 100 })],
      customItems: [testItem("custom", { updatedAt: 100 })],
    });
    const remote = exportData({ deletedCustomItems: { custom: 400 } });

    const merged = mergeExportData(local, remote);

    expect(merged.customItems).toHaveLength(0);
    expect(merged.checklist).toHaveLength(0);
    expect(merged.deletedCustomItems).toEqual({ custom: 400 });
  });

  it("merges hidden stamps per id and derives the hidden id list", () => {
    const local = exportData({
      hiddenTemplateItemIds: ["tpl-a"],
      hiddenTemplateItemStamps: {
        "tpl-a": { hidden: true, updatedAt: 100 },
        "tpl-b": { hidden: true, updatedAt: 100 },
      },
    });
    const remote = exportData({
      hiddenTemplateItemStamps: {
        "tpl-b": { hidden: false, updatedAt: 300 },
        "tpl-c": { hidden: true, updatedAt: 200 },
      },
    });

    const merged = mergeExportData(local, remote);

    expect(merged.hiddenTemplateItemIds).toEqual(["tpl-a", "tpl-c"]);
    expect(merged.hiddenTemplateItemStamps["tpl-b"]).toEqual({
      hidden: false,
      updatedAt: 300,
    });
  });

  it("picks the newer growth payload as a whole", () => {
    const local = exportData({
      growth: {
        version: 1,
        profile: { nickname: "旧", dueDate: "" },
        progress: { completedTaskIds: [] },
      },
      growthUpdatedAt: 100,
    });
    const remote = exportData({
      growth: {
        version: 1,
        profile: { nickname: "新", dueDate: "2026-09-01" },
        progress: { completedTaskIds: ["first-prenatal-contact"] },
      },
      growthUpdatedAt: 500,
    });

    const merged = mergeExportData(local, remote);

    expect(merged.growth.profile.nickname).toBe("新");
    expect(merged.growthUpdatedAt).toBe(500);
  });

  it("keeps the local checklistMode regardless of remote", () => {
    const merged = mergeExportData(
      exportData({ checklistMode: "full" }),
      exportData({ checklistMode: "lean" }),
    );

    expect(merged.checklistMode).toBe("full");
  });

  it("merges a legacy v4 backup that has no merge metadata", () => {
    const local = exportData({
      customItems: [testItem("custom", { updatedAt: 100 })],
    });
    const remoteV4 = {
      version: 4 as const,
      exportedAt: "2026-07-26T00:00:00.000Z",
      checklistMode: "lean" as const,
      checklist: [testItem("tpl", { status: "packed", updatedAt: 50 })],
      customItems: [testItem("remote-custom")],
      hiddenTemplateItemIds: ["tpl-hidden"],
      growth: {
        version: 1 as const,
        profile: { nickname: "v4", dueDate: "" },
        progress: { completedTaskIds: [] },
      },
    };

    const merged = mergeExportData(local, remoteV4);

    expect(merged.customItems.map((item) => item.id).sort()).toEqual([
      "custom",
      "remote-custom",
    ]);
    expect(merged.checklist.map((item) => item.id)).toEqual(["tpl"]);
    // v4 的隐藏列表按 ts=0 迁移,不与本地冲突时保留
    expect(merged.hiddenTemplateItemIds).toEqual(["tpl-hidden"]);
    // v4 没有 growth 时间戳,本地 growth 不变
    expect(merged.growth.profile.nickname).toBe("");
  });

  it("keeps local planning when a new client receives a v6 document", () => {
    const planning = createEmptyItemPlanning();
    planning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "dad", updatedAt: 100 },
    };
    const merged = mergeExportData(exportData({ planning }), portableV6());
    expect(merged.planning).toEqual(planning);
  });
});
