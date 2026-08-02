"use client";

import { createEmptyItemPlanning } from "@/lib/planning/defaults";
import { cloneItemPlanning } from "@/lib/planning/portable";
import type { ItemPlanningPortableData } from "@/lib/planning/types";
import { isItemPlanningPortableData } from "@/lib/planning/validation";

export const ITEM_PLANNING_STORAGE_KEY = "dadkit:v3:item-planning";

export function loadItemPlanning(): ItemPlanningPortableData {
  if (typeof window === "undefined") return createEmptyItemPlanning();

  try {
    const raw = window.localStorage.getItem(ITEM_PLANNING_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : undefined;
    return isItemPlanningPortableData(parsed)
      ? cloneItemPlanning(parsed)
      : createEmptyItemPlanning();
  } catch {
    return createEmptyItemPlanning();
  }
}

export function saveItemPlanning(planning: ItemPlanningPortableData) {
  if (typeof window === "undefined") return;
  if (!isItemPlanningPortableData(planning)) {
    throw new Error("家庭分工与采购数据无效，未保存。");
  }

  const serialized = JSON.stringify(planning);
  if (window.localStorage.getItem(ITEM_PLANNING_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(ITEM_PLANNING_STORAGE_KEY, serialized);
  }
}
