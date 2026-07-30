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

type TemplateTextDefaults = Partial<
  Pick<ChecklistItem, "note" | "quantity">
>;

const PREVIOUS_TEMPLATE_TEXT_DEFAULTS = {
  "general-confinement-mom-nursing-pads-stock": {
    quantity: "1-2 盒，约 100 片",
    note: "用于母乳量稳定前防止溢奶弄脏衣物；住院带的小包用完后按溢奶量补充。常见品牌：bbc、诺绵、嫚熙。",
  },
  "general-confinement-mom-milk-bags-stock": {
    quantity: "1 盒，约 50 片",
    note: "用于确有存奶需求时分装冷冻；建议小月龄选 100-120 毫升小袋，按宝宝食量补充。常见品牌：bbc、嫚熙。",
  },
  "general-confinement-baby-diapers-stock": {
    quantity: "NB 约 200 片 + S 码 1 包",
    note: "用于月子里每天约十至十二片；预估八斤以上可直接囤 S 码，建议先囤试用装锁定适合的品牌。常见品牌：大王光羽、好奇小森林、露安适、bbc。",
  },
  "general-confinement-baby-formula": {
    note: "用于母乳不够时衔接；建议提前做功课选定，小宝宝肠胃脆弱不要随意转奶，母乳顺利可不开封。",
  },
  "general-confinement-baby-crib": {
    note: "用于宝宝在家独立安睡；拼接床更实用，尽量与大床同高，建议提前一至两个月买好散味。",
  },
  "general-confinement-baby-stroller": {
    note: "用于出月子后遛娃；月子里基本用不到，建议选可坐可躺的轻便款，之后再买。常见品牌：bebebus、好孩子、逸乐途。",
  },
  "general-partner-car-seat": {
    note: "用于提前熟悉宝宝返家乘车安排；建议按座椅说明书和车辆条件完成后向安装，并练习一次固定与卡扣操作。",
  },
  "general-going-home-car-seat": {
    note: "用于宝宝出院返程时提供合适约束；建议按座椅说明书后向安装，并在出院前复核固定状态和卡扣路径。",
  },
  "general-last-car-seat": {
    note: "出门前按安全座椅说明书检查安装方向、固定状态和卡扣路径，发现松动先重新调整。",
  },
} as const satisfies Record<string, TemplateTextDefaults>;

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

  const normalized: ChecklistItem = {
    ...baseItem,
    preparationKind: persistedPreparationKind(baseItem),
  };

  // Keep the in-memory shape identical to the JSON shape written to storage.
  // Optional fields with an explicit `undefined` would disappear on disk and
  // then fail strict backup/snapshot validation while still in memory.
  for (const key of [
    "quantity",
    "note",
    "sourceLabel",
    "updatedAt",
  ] as const) {
    if (normalized[key] === undefined) {
      delete normalized[key];
    }
  }

  return normalized;
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
      quantity: preserveTemplateTextField(item, previous, "quantity"),
      note: preserveTemplateTextField(item, previous, "note"),
      updatedAt: previous.updatedAt ?? item.updatedAt,
    });
  });
}

function preserveTemplateTextField(
  item: ChecklistItem,
  previous: ChecklistItem,
  field: keyof TemplateTextDefaults,
) {
  const previousDefaults =
    PREVIOUS_TEMPLATE_TEXT_DEFAULTS[
      item.id as keyof typeof PREVIOUS_TEMPLATE_TEXT_DEFAULTS
    ];
  const previousDefault = (
    previousDefaults as TemplateTextDefaults | undefined
  )?.[field];
  const previousValue = previous[field];

  if (previousDefault !== undefined && previousValue === previousDefault) {
    return item[field];
  }

  return previousValue ?? item[field];
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
