import { inferPreparationKind } from "@/lib/preparation";
import type { ChecklistItem } from "@/lib/types";

export type DepartureGroupId =
  | "documents"
  | "lastMinute"
  | "car"
  | "criticalLuggage";

export const DEPARTURE_GROUPS = [
  {
    id: "documents",
    label: "证件资料",
    description: "入院、建档和办理手续会用到的资料",
  },
  {
    id: "lastMinute",
    label: "临出门拿",
    description: "平时仍在使用，出门前最后放进行李",
  },
  {
    id: "car",
    label: "上车和随车确认",
    description: "需要安装、放车上或上车前确认",
  },
  {
    id: "criticalLuggage",
    label: "关键行李",
    description: "妈妈包、宝宝包和爸爸背包里的必带物品",
  },
] as const satisfies ReadonlyArray<{
  id: DepartureGroupId;
  label: string;
  description: string;
}>;

export type DepartureGroup = (typeof DEPARTURE_GROUPS)[number] & {
  items: ChecklistItem[];
  completed: number;
  total: number;
};

export type DepartureProgress = {
  completed: number;
  percent: number;
  remaining: number;
  total: number;
};

export function isDepartureRelevantItem(item: ChecklistItem) {
  return getDepartureGroupId(item) !== undefined;
}

export function deriveDepartureGroups(items: readonly ChecklistItem[]) {
  const buckets: Record<
    DepartureGroupId,
    Array<{ item: ChecklistItem; sourceIndex: number }>
  > = {
    documents: [],
    lastMinute: [],
    car: [],
    criticalLuggage: [],
  };

  items.forEach((item, sourceIndex) => {
    const groupId = getDepartureGroupId(item);

    if (groupId) {
      buckets[groupId].push({ item, sourceIndex });
    }
  });

  return DEPARTURE_GROUPS.map((group) => {
    const groupItems = buckets[group.id]
      .slice()
      .sort(
        (left, right) =>
          Number(left.item.status === "packed") -
            Number(right.item.status === "packed") ||
          left.sourceIndex - right.sourceIndex,
      )
      .map(({ item }) => item);
    const completed = groupItems.filter(
      (item) => item.status === "packed",
    ).length;

    return {
      ...group,
      items: groupItems,
      completed,
      total: groupItems.length,
    };
  }).filter((group) => group.total > 0) as DepartureGroup[];
}

export function getDepartureProgress(
  items: readonly ChecklistItem[],
): DepartureProgress {
  const departureItems = deriveDepartureGroups(items).flatMap(
    (group) => group.items,
  );
  const total = departureItems.length;
  const completed = departureItems.filter(
    (item) => item.status === "packed",
  ).length;

  return {
    completed,
    total,
    remaining: total - completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

function getDepartureGroupId(
  item: ChecklistItem,
): DepartureGroupId | undefined {
  if (item.status === "not_needed") {
    return undefined;
  }

  const preparationKind = inferPreparationKind(item);

  if (
    item.category === "documents" ||
    item.bag === "documents_folder" ||
    preparationKind === "document"
  ) {
    return "documents";
  }

  if (
    item.category === "last_minute" ||
    item.bag === "last_minute" ||
    item.timing === "grab_before_leaving" ||
    item.status === "last_minute" ||
    preparationKind === "last_minute"
  ) {
    return "lastMinute";
  }

  if (item.bag === "car" || preparationKind === "install_or_place") {
    return "car";
  }

  if (
    item.itemKind === "item" &&
    (item.bag === "mom_bag" ||
      item.bag === "baby_bag" ||
      item.bag === "dad_backpack") &&
    (item.priority === "must" || item.packTier === "core")
  ) {
    return "criticalLuggage";
  }

  return undefined;
}
