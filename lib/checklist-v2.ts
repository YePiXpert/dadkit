import { normalizeChecklistItem } from "@/lib/rules";
import { inferPreparationKind } from "@/lib/preparation";
import type { ChecklistItem, ChecklistMode } from "@/lib/types";

export type ChecklistView = "all" | "shopping" | "packing" | "packed";

export type ChecklistItemState = "todo" | "ready" | "packed" | "not_needed";

export const CHECKLIST_VIEWS: Array<{
  id: ChecklistView;
  label: string;
  shortLabel: string;
}> = [
  { id: "all", label: "全部物品", shortLabel: "全部" },
  { id: "shopping", label: "待购买", shortLabel: "待购买" },
  { id: "packing", label: "待装包", shortLabel: "待装包" },
  { id: "packed", label: "已装包", shortLabel: "已装包" },
];

export function isChecklistView(value: string | null): value is ChecklistView {
  return CHECKLIST_VIEWS.some((view) => view.id === value);
}

export type ChecklistSectionId =
  | "documents"
  | "mom"
  | "baby"
  | "confinementMom"
  | "confinementBaby"
  | "partner"
  | "home"
  | "lastMinute";

export const CHECKLIST_SECTIONS: Array<{
  id: ChecklistSectionId;
  label: string;
  caption: string;
}> = [
  { id: "documents", label: "证件包", caption: "入院和办理材料" },
  { id: "mom", label: "妈妈包", caption: "产房与住院用品" },
  { id: "baby", label: "宝宝包", caption: "住院与出院用品" },
  { id: "confinementMom", label: "月子妈妈包", caption: "产后恢复与哺乳，留在家里" },
  { id: "confinementBaby", label: "宝宝家中囤货", caption: "月子吃穿洗护，留在家里" },
  { id: "partner", label: "陪产人", caption: "家人随身与协作" },
  { id: "home", label: "返家准备", caption: "出院路上和到家后" },
  { id: "lastMinute", label: "临出门拿", caption: "最后放进行李" },
];

export function isChecklistSectionId(
  value: string,
): value is ChecklistSectionId {
  return CHECKLIST_SECTIONS.some((section) => section.id === value);
}

export function isChecklistItemComplete(item: ChecklistItem) {
  return getChecklistItemState(item) === "packed";
}

export function isChecklistItemSkipped(item: ChecklistItem) {
  return getChecklistItemState(item) === "not_needed";
}

export function getChecklistItemState(
  item: ChecklistItem,
): ChecklistItemState {
  if (item.status === "packed") {
    return "packed";
  }

  if (item.status === "not_needed") {
    return "not_needed";
  }

  if (item.status === "bought" || item.status === "washed") {
    return "ready";
  }

  return "todo";
}

export function isShoppingQueueItem(item: ChecklistItem) {
  const normalized = normalizeChecklistItem(item);

  if (
    normalized.itemKind !== "item" ||
    getChecklistItemState(normalized) !== "todo"
  ) {
    return false;
  }

  const preparationKind = inferPreparationKind(normalized);
  return preparationKind === "buy_and_pack" || preparationKind === "buy_for_home";
}

export function isPackingQueueItem(item: ChecklistItem) {
  const normalized = normalizeChecklistItem(item);
  const state = getChecklistItemState(normalized);

  if (
    normalized.itemKind !== "item" ||
    state === "packed" ||
    state === "not_needed"
  ) {
    return false;
  }

  if (normalized.bag === "none") {
    return false;
  }

  if (state === "ready") {
    return true;
  }

  const preparationKind = inferPreparationKind(normalized);
  return preparationKind !== "buy_and_pack" && preparationKind !== "buy_for_home";
}

export function isPackedViewItem(item: ChecklistItem) {
  const normalized = normalizeChecklistItem(item);
  return (
    normalized.itemKind === "item" &&
    getChecklistItemState(normalized) === "packed"
  );
}

export function getChecklistViewItems(
  items: ChecklistItem[],
  view: ChecklistView,
) {
  const normalizedItems = items.map(normalizeChecklistItem);

  if (view === "shopping") {
    return normalizedItems.filter(isShoppingQueueItem);
  }

  if (view === "packing") {
    return normalizedItems.filter(isPackingQueueItem);
  }

  if (view === "packed") {
    return normalizedItems.filter(isPackedViewItem);
  }

  return normalizedItems;
}

export function getChecklistSection(item: ChecklistItem): ChecklistSectionId {
  if (
    item.category === "last_minute" ||
    item.bag === "last_minute" ||
    item.status === "last_minute"
  ) {
    return "lastMinute";
  }

  if (item.category === "documents" || item.bag === "documents_folder") {
    return "documents";
  }

  if (
    item.category === "mom_labor" ||
    item.category === "mom_postpartum" ||
    item.bag === "mom_bag"
  ) {
    return "mom";
  }

  if (item.category === "confinement_mom") {
    return "confinementMom";
  }

  if (item.category === "confinement_baby") {
    return "confinementBaby";
  }

  if (item.category === "baby" || item.bag === "baby_bag") {
    return "baby";
  }

  if (item.category === "partner" || item.bag === "dad_backpack") {
    return "partner";
  }

  return "home";
}

export function groupChecklistViewItems(
  items: ChecklistItem[],
  options: { includeEmpty?: boolean } = {},
) {
  const sections = CHECKLIST_SECTIONS.map((section) => ({
    ...section,
    items: items
      .filter((item) => getChecklistSection(item) === section.id)
      .sort((left, right) => {
        const stateOrder: Record<ChecklistItemState, number> = {
          todo: 0,
          ready: 0,
          packed: 1,
          not_needed: 2,
        };
        const leftDone = stateOrder[getChecklistItemState(left)];
        const rightDone = stateOrder[getChecklistItemState(right)];

        if (leftDone !== rightDone) {
          return leftDone - rightDone;
        }

        const priorityOrder = { must: 0, recommended: 1, optional: 2 };
        return priorityOrder[left.priority] - priorityOrder[right.priority];
      }),
  }));

  return options.includeEmpty
    ? sections
    : sections.filter((section) => section.items.length > 0);
}

export function getChecklistViewCounts(items: ChecklistItem[]) {
  return {
    all: getChecklistViewItems(items, "all").length,
    shopping: getChecklistViewItems(items, "shopping").length,
    packing: getChecklistViewItems(items, "packing").length,
    packed: getChecklistViewItems(items, "packed").length,
  } satisfies Record<ChecklistView, number>;
}

type DerivedChecklistSection = (typeof CHECKLIST_SECTIONS)[number] & {
  items: ChecklistItem[];
};

export type DerivedChecklistView = {
  counts: Record<ChecklistView, number>;
  packing: { total: number; completed: number; percent: number };
  sections: DerivedChecklistSection[];
  visibleItems: ChecklistItem[];
};

const DERIVED_STATE_ORDER: Record<ChecklistItemState, number> = {
  todo: 0,
  ready: 0,
  packed: 1,
  not_needed: 2,
};
const DERIVED_PRIORITY_ORDER = {
  must: 0,
  recommended: 1,
  optional: 2,
} as const;

function matchesDerivedView(item: ChecklistItem, view: ChecklistView) {
  if (view === "all") {
    return true;
  }

  const state = getChecklistItemState(item);

  if (view === "packed") {
    return item.itemKind === "item" && state === "packed";
  }

  if (
    item.itemKind !== "item" ||
    state === "packed" ||
    state === "not_needed"
  ) {
    return false;
  }

  const preparationKind = inferPreparationKind(item);

  if (view === "shopping") {
    return (
      state === "todo" &&
      (preparationKind === "buy_and_pack" ||
        preparationKind === "buy_for_home")
    );
  }

  return (
    item.bag !== "none" &&
    (state === "ready" ||
      (preparationKind !== "buy_and_pack" &&
        preparationKind !== "buy_for_home"))
  );
}

function sortDerivedItems(items: ChecklistItem[]) {
  items.sort((left, right) => {
    const stateDifference =
      DERIVED_STATE_ORDER[getChecklistItemState(left)] -
      DERIVED_STATE_ORDER[getChecklistItemState(right)];

    return (
      stateDifference ||
      DERIVED_PRIORITY_ORDER[left.priority] -
        DERIVED_PRIORITY_ORDER[right.priority]
    );
  });
}

export function deriveChecklistView(
  items: ChecklistItem[],
  {
    mode,
    sectionId,
    view,
  }: {
    mode: ChecklistMode;
    sectionId?: ChecklistSectionId;
    view: ChecklistView;
  },
): DerivedChecklistView {
  const counts: Record<ChecklistView, number> = {
    all: 0,
    shopping: 0,
    packing: 0,
    packed: 0,
  };
  const sectionBuckets = new Map(
    CHECKLIST_SECTIONS.map((section) => [section.id, [] as ChecklistItem[]]),
  );
  const visibleItems: ChecklistItem[] = [];
  let packingTotal = 0;
  let packingCompleted = 0;

  for (const sourceItem of items) {
    const item = normalizeChecklistItem(sourceItem);

    if (
      mode !== "full" &&
      item.packTier !== "core" &&
      item.packTier !== "confirm" &&
      item.source !== "user" &&
      item.status === "todo"
    ) {
      continue;
    }

    const itemSection = getChecklistSection(item);

    if (sectionId && itemSection !== sectionId) {
      continue;
    }

    counts.all += 1;
    if (matchesDerivedView(item, "shopping")) counts.shopping += 1;
    if (matchesDerivedView(item, "packing")) counts.packing += 1;
    if (matchesDerivedView(item, "packed")) counts.packed += 1;

    if (
      item.itemKind === "item" &&
      item.category !== "last_minute" &&
      item.bag !== "none" &&
      item.bag !== "car" &&
      item.status !== "not_needed"
    ) {
      packingTotal += 1;
      if (item.status === "packed") {
        packingCompleted += 1;
      }
    }

    if (matchesDerivedView(item, view)) {
      visibleItems.push(item);
      sectionBuckets.get(itemSection)?.push(item);
    }
  }

  for (const bucket of sectionBuckets.values()) {
    sortDerivedItems(bucket);
  }

  return {
    counts,
    packing: {
      total: packingTotal,
      completed: packingCompleted,
      percent:
        packingTotal === 0
          ? 0
          : Math.round((packingCompleted / packingTotal) * 100),
    },
    sections: CHECKLIST_SECTIONS.map((section) => ({
      ...section,
      items: sectionBuckets.get(section.id) ?? [],
    })),
    visibleItems,
  };
}
