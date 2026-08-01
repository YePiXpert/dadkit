import {
  type DadKitExportData,
  type DadKitExportDataV5,
} from "@/lib/data/format";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import type { ChecklistItem } from "@/lib/types";

export function portableTestItem(
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

export function portableV5(
  patch: Partial<DadKitExportDataV5> = {},
): DadKitExportDataV5 {
  return {
    version: 5,
    exportedAt: "2026-08-01T00:00:00.000Z",
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

export function portableV6(
  patch: Partial<DadKitExportData> = {},
): DadKitExportData {
  return {
    ...portableV5(),
    version: 6,
    hospital: createEmptyHospitalProfile(),
    ...patch,
  };
}
