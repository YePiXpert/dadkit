import {
  type DadKitExportData,
  type DadKitExportDataV5,
  type DadKitExportDataV6,
  type DadKitExportDataV7,
  type DadKitExportDataV8,
} from "@/lib/data/format";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { projectBabyV2ToV1 } from "@/lib/baby/portable";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import { createEmptyItemPlanning, createEmptyItemPlanningV1 } from "@/lib/planning/defaults";
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
  patch: Partial<DadKitExportDataV6> = {},
): DadKitExportDataV6 {
  return {
    ...portableV5(),
    version: 6,
    hospital: createEmptyHospitalProfile(),
    ...patch,
  };
}

export function portableV7(
  patch: Partial<DadKitExportDataV7> = {},
): DadKitExportDataV7 {
  return {
    ...portableV6(),
    version: 7,
    planning: createEmptyItemPlanningV1(),
    ...patch,
  };
}

export function portableV8(
  patch: Partial<DadKitExportDataV8> = {},
): DadKitExportDataV8 {
  return {
    ...portableV7(),
    version: 8,
    baby: projectBabyV2ToV1(createEmptyBabyData()),
    ...patch,
  };
}

export function portableV9(
  patch: Partial<DadKitExportData> = {},
): DadKitExportData {
  return {
    ...portableV8(),
    version: 9,
    household: createEmptyHousehold(),
    planning: createEmptyItemPlanning(),
    baby: createEmptyBabyData(),
    ...patch,
  };
}
