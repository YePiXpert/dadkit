"use client";

import { createEmptyItemPlanning } from "@/lib/planning/defaults";
import { migratePlanningV1ToV2 } from "@/lib/household/migration";
import { loadHousehold, saveHousehold } from "@/lib/household/repository";
import { cloneItemPlanning } from "@/lib/planning/portable";
import type { ItemPlanningPortableData } from "@/lib/planning/types";
import {
  isItemPlanningPortableData,
  isItemPlanningPortableDataV1,
} from "@/lib/planning/validation";
import { publishDataChange } from "@/lib/data/change-bus";

export const ITEM_PLANNING_STORAGE_KEY = "dadkit:v3:item-planning";

export function loadItemPlanning(): ItemPlanningPortableData {
  if (typeof window === "undefined") return createEmptyItemPlanning();
  try {
    const raw = window.localStorage.getItem(ITEM_PLANNING_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : undefined;
    if (isItemPlanningPortableData(parsed)) return cloneItemPlanning(parsed);
    if (isItemPlanningPortableDataV1(parsed)) {
      const migrated = migratePlanningV1ToV2(parsed, loadHousehold());
      saveHousehold(migrated.household);
      saveItemPlanning(migrated.planning);
      return cloneItemPlanning(migrated.planning);
    }
    return createEmptyItemPlanning();
  } catch {
    return createEmptyItemPlanning();
  }
}

export function saveItemPlanning(planning: ItemPlanningPortableData) {
  if (typeof window === "undefined") return;
  if (!isItemPlanningPortableData(planning)) throw new Error("家庭分工与采购数据无效，未保存。");
  const serialized = JSON.stringify(cloneItemPlanning(planning));
  if (window.localStorage.getItem(ITEM_PLANNING_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(ITEM_PLANNING_STORAGE_KEY, serialized);
    publishDataChange("planning");
  }
}
