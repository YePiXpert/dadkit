import { inferPreparationKind } from "@/lib/preparation";
import { generalTemplate } from "@/lib/templates/general";
import {
  CATEGORY_ORDER,
  type ChecklistBag,
  type ChecklistItem,
  type ChecklistMode,
  type ChecklistPersistence,
  type ItemKind,
  type ItemBulk,
  type PackTier,
  type PreparationKind,
  type Priority,
  type TemplateChecklistItem,
} from "@/lib/types";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  must: 3,
  recommended: 2,
  optional: 1,
};

const PACK_TIER_WEIGHT: Record<PackTier, number> = {
  core: 4,
  confirm: 3,
  optional: 2,
  hidden: 1,
};

const TASK_KEYWORDS = [
  "确认",
  "保存",
  "通知",
  "路线",
  "入口",
  "停车",
  "安全座椅",
  "电话",
  "押金",
  "医保结算",
  "支付",
  "接送",
  "安排",
];

function normalizeName(name: string) {
  return name.replace(/\s+/g, "").replace(/[？?]/g, "").toLowerCase();
}

function itemKey(item: Pick<ChecklistItem, "name">) {
  return normalizeName(item.name);
}

function inferItemKind(item: ChecklistItem): ItemKind {
  if (item.itemKind === "task") {
    return "task";
  }

  if (item.itemKind === "item") {
    return "item";
  }

  if (
    item.category === "last_minute" ||
    (item.category !== "documents" &&
      TASK_KEYWORDS.some((keyword) => item.name.includes(keyword)))
  ) {
    return "task";
  }

  return "item";
}

function inferPackTier(
  item: ChecklistItem,
  itemKind: ItemKind,
): PackTier {
  if (item.packTier) {
    return item.packTier;
  }

  if (item.category === "last_minute" || item.priority === "must") {
    return "core";
  }

  return itemKind === "task" ? "confirm" : "optional";
}

function inferBag(
  item: ChecklistItem,
  itemKind: ItemKind,
): ChecklistBag {
  if (item.bag) {
    return item.bag;
  }

  if (item.category === "documents") return "documents_folder";
  if (item.category === "mom_labor" || item.category === "mom_postpartum") {
    return item.timing === "grab_before_leaving" ? "last_minute" : "mom_bag";
  }
  if (item.category === "baby") return "baby_bag";
  if (item.category === "partner") {
    return itemKind === "task" ? "none" : "dad_backpack";
  }
  if (item.category === "going_home") {
    return item.name.includes("安全座椅") || item.name.includes("交通")
      ? "car"
      : "mom_bag";
  }
  if (item.category === "last_minute") return "last_minute";

  return "none";
}

function inferBulk(item: ChecklistItem): ItemBulk {
  if (item.bulk) {
    return item.bulk;
  }

  if (
    item.name.includes("衣物") ||
    item.name.includes("包被") ||
    item.name.includes("毯子") ||
    item.name.includes("拖鞋")
  ) {
    return "large";
  }

  if (
    item.name.includes("尿不湿") ||
    item.name.includes("纸巾") ||
    item.name.includes("湿巾") ||
    item.name.includes("水杯")
  ) {
    return "medium";
  }

  return "small";
}

function persistedPreparationKind(
  item: ChecklistItem,
): PreparationKind {
  return inferPreparationKind(item);
}

export function normalizeChecklistItem(item: ChecklistItem): ChecklistItem {
  const itemKind = inferItemKind(item);
  const baseItem: ChecklistItem = {
    ...item,
    id: item.id.trim(),
    name: item.name.trim(),
    itemKind,
    packTier: inferPackTier(item, itemKind),
    bag: inferBag(item, itemKind),
    bulk: inferBulk(item),
  };

  return {
    ...baseItem,
    preparationKind: persistedPreparationKind(baseItem),
  };
}

function isSupportedTemplateItem(item: TemplateChecklistItem) {
  return (
    CATEGORY_ORDER.includes(item.category) &&
    item.source === "general"
  );
}

function createTemplateItem(item: TemplateChecklistItem): ChecklistItem {
  return normalizeChecklistItem({
    ...item,
    status: item.status ?? "todo",
  });
}

function choosePackTier(
  current?: PackTier,
  incoming?: PackTier,
): PackTier | undefined {
  if (!current) return incoming;
  if (!incoming) return current;

  return PACK_TIER_WEIGHT[incoming] > PACK_TIER_WEIGHT[current]
    ? incoming
    : current;
}

function mergeDuplicateItems(items: ChecklistItem[]) {
  const merged = new Map<string, ChecklistItem>();

  for (const rawItem of items) {
    const item = normalizeChecklistItem(rawItem);
    const key = itemKey(item);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
      continue;
    }

    const priority =
      PRIORITY_WEIGHT[item.priority] > PRIORITY_WEIGHT[existing.priority]
        ? item.priority
        : existing.priority;
    const sourceLabel = Array.from(
      new Set([existing.sourceLabel, item.sourceLabel].filter(Boolean)),
    ).join(" + ");
    const userItem = item.source === "user" ? item : undefined;

    merged.set(
      key,
      normalizeChecklistItem({
        ...existing,
        priority,
        packTier: choosePackTier(existing.packTier, item.packTier),
        note: userItem?.note ?? existing.note ?? item.note,
        quantity: userItem?.quantity ?? existing.quantity ?? item.quantity,
        editable: existing.editable || item.editable,
        removable: existing.removable && item.removable,
        sourceLabel: sourceLabel || existing.sourceLabel,
        updatedAt: Math.max(existing.updatedAt ?? 0, item.updatedAt ?? 0) || undefined,
      }),
    );
  }

  return Array.from(merged.values());
}

function preserveCurrentItemState(
  generatedItems: ChecklistItem[],
  previousItems?: ChecklistItem[],
) {
  if (!previousItems?.length) {
    return generatedItems;
  }

  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const previousByKey = new Map(
    previousItems.map((item) => [itemKey(item), item]),
  );

  return generatedItems.map((item) => {
    const previous =
      previousById.get(item.id) ?? previousByKey.get(itemKey(item));

    if (!previous) {
      return item;
    }

    return normalizeChecklistItem({
      ...item,
      status: previous.status,
      quantity: previous.quantity ?? item.quantity,
      note: previous.note ?? item.note,
      updatedAt: previous.updatedAt ?? item.updatedAt,
    });
  });
}

function sortItems(items: ChecklistItem[]) {
  return [...items].sort((left, right) => {
    const categoryDiff =
      CATEGORY_ORDER.indexOf(left.category) -
      CATEGORY_ORDER.indexOf(right.category);

    if (categoryDiff !== 0) return categoryDiff;

    const tierDiff =
      PACK_TIER_WEIGHT[right.packTier ?? "optional"] -
      PACK_TIER_WEIGHT[left.packTier ?? "optional"];

    if (tierDiff !== 0) return tierDiff;

    return PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
  });
}

export function generateChecklist(
  persistence: ChecklistPersistence = {},
): ChecklistItem[] {
  const hiddenTemplateItemIds = new Set(persistence.hiddenTemplateItemIds ?? []);
  const generatedItems = generalTemplate
    .filter(isSupportedTemplateItem)
    .map(createTemplateItem)
    .filter((item) => !hiddenTemplateItemIds.has(item.id));
  const customItems = (persistence.customItems ?? [])
    .filter(
      (item) =>
        item.source === "user" &&
        CATEGORY_ORDER.includes(item.category),
    )
    .map(normalizeChecklistItem);
  const deduped = mergeDuplicateItems([...generatedItems, ...customItems]);
  const preserved = preserveCurrentItemState(deduped, persistence.currentItems);

  return sortItems(preserved.map(normalizeChecklistItem));
}

export function isVisibleInChecklistMode(
  item: ChecklistItem,
  mode: ChecklistMode,
) {
  if (mode === "full") {
    return true;
  }

  const normalized = normalizeChecklistItem(item);

  return (
    normalized.packTier === "core" ||
    normalized.packTier === "confirm" ||
    normalized.source === "user" ||
    normalized.status !== "todo"
  );
}

export function filterItemsForChecklistMode(
  items: ChecklistItem[],
  mode: ChecklistMode,
) {
  return items.filter((item) => isVisibleInChecklistMode(item, mode));
}

function completionResult(total: number, completed: number) {
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function calculateCompletion(items: ChecklistItem[]) {
  const completed = items.filter((item) =>
    ["packed", "not_needed"].includes(item.status),
  ).length;

  return completionResult(items.length, completed);
}

export function isPackingProgressItem(item: ChecklistItem) {
  const normalized = normalizeChecklistItem(item);

  return (
    normalized.itemKind === "item" &&
    normalized.category !== "last_minute" &&
    normalized.bag !== "none" &&
    normalized.bag !== "car" &&
    normalized.status !== "not_needed"
  );
}

export function calculatePackingCompletion(items: ChecklistItem[]) {
  const packableItems = items.filter(isPackingProgressItem);
  const completed = packableItems.filter((item) =>
    item.status === "packed",
  ).length;

  return completionResult(packableItems.length, completed);
}

export function calculateLastMinuteCompletion(items: ChecklistItem[]) {
  const lastMinuteItems = items.map(normalizeChecklistItem).filter((item) => {
    if (item.category === "last_minute") return true;
    if (item.bag === "car") return false;

    return (
      item.bag === "last_minute" ||
      (item.timing === "grab_before_leaving" && item.itemKind === "task")
    );
  });
  const completed = lastMinuteItems.filter((item) =>
    ["packed", "not_needed"].includes(item.status),
  ).length;

  return completionResult(lastMinuteItems.length, completed);
}

export function calculateCategoryCompletion(items: ChecklistItem[]) {
  return CATEGORY_ORDER.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);

    return { category, ...calculateCompletion(categoryItems) };
  });
}
