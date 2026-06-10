import {
  beijingGeneralHospitalTemplate,
  generalTemplate,
  hospitalTemplates,
  regionTemplates,
} from "@/lib/templates";
import { inferPreparationKind } from "@/lib/preparation";
import type {
  ChecklistBag,
  ChecklistCategory,
  ChecklistItem,
  ChecklistMode,
  ChecklistPersistence,
  HospitalProfile,
  ItemBulk,
  ItemKind,
  PackTier,
  Priority,
  TemplateChecklistItem,
  UserHospitalOverride,
  UserProfile,
} from "@/lib/types";
import { CATEGORY_ORDER } from "@/lib/types";

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

const PROVIDED_ITEM_MATCHERS: Record<string, string[]> = {
  "postpartum-pads": ["产褥垫", "产后卫生巾"],
  "baby-diapers": ["尿不湿", "宝宝尿不湿"],
  "baby-clothes": ["宝宝衣物", "宝宝出院衣物", "宝宝住院衣物"],
  blanket: ["包被", "小毯子"],
  "mom-care-kit": ["妈妈护理包", "产后护理", "一次性内裤"],
};

const PROVIDED_ITEM_LABELS: Record<string, string> = {
  "postpartum-pads": "产褥垫",
  "baby-diapers": "宝宝尿不湿",
  "baby-clothes": "宝宝衣物",
  blanket: "包被",
  "mom-care-kit": "妈妈护理包",
  other: "其他",
  unknown: "不确定",
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

const QUESTION_KEYWORDS = ["是否", "待确认", "需要哪些", "医院是否"];

function stableId(source: string, category: ChecklistCategory, name: string) {
  const compact = encodeURIComponent(name)
    .replace(/%/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return `${source}-${category}-${compact || "item"}`.toLowerCase();
}

function normalizeName(name: string) {
  return name.replace(/\s+/g, "").replace(/[？?]/g, "").toLowerCase();
}

function itemKey(item: Pick<ChecklistItem, "name" | "category">) {
  return `${item.category}:${normalizeName(item.name)}`;
}

function hasTaskKeyword(name: string) {
  return TASK_KEYWORDS.some((keyword) => name.includes(keyword));
}

function hasQuestionKeyword(name: string) {
  return QUESTION_KEYWORDS.some((keyword) => name.includes(keyword));
}

function inferItemKind(item: ChecklistItem): ItemKind {
  if (item.itemKind) {
    return item.itemKind;
  }

  if (item.category === "hospital_questions") {
    return "question";
  }

  if (hasQuestionKeyword(item.name)) {
    return "question";
  }

  if (item.category === "last_minute") {
    return "task";
  }

  if (item.category !== "documents" && hasTaskKeyword(item.name)) {
    return "task";
  }

  return "item";
}

function inferPackTier(item: ChecklistItem, itemKind: ItemKind): PackTier {
  if (item.packTier) {
    return item.packTier;
  }

  if (item.category === "hospital_questions" || itemKind === "question") {
    return "confirm";
  }

  if (item.category === "last_minute") {
    return "core";
  }

  if (item.priority === "must") {
    return "core";
  }

  return "optional";
}

function inferBag(item: ChecklistItem, itemKind: ItemKind): ChecklistBag {
  if (item.bag) {
    return item.bag;
  }

  if (item.category === "documents") {
    return "documents_folder";
  }

  if (item.category === "mom_labor" || item.category === "mom_postpartum") {
    return item.timing === "grab_before_leaving" ? "last_minute" : "mom_bag";
  }

  if (item.category === "baby") {
    return "baby_bag";
  }

  if (item.category === "partner") {
    return itemKind === "task" ? "none" : "dad_backpack";
  }

  if (item.category === "going_home") {
    return item.name.includes("安全座椅") || item.name.includes("交通")
      ? "car"
      : "mom_bag";
  }

  if (item.category === "last_minute") {
    return "last_minute";
  }

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

export function normalizeChecklistItem(item: ChecklistItem): ChecklistItem {
  const itemKind = inferItemKind(item);
  const packTier = inferPackTier(item, itemKind);
  const bag = inferBag(item, itemKind);
  const bulk = inferBulk(item);
  const baseItem = {
    ...item,
    itemKind,
    packTier,
    bag,
    bulk,
  };

  return {
    ...baseItem,
    itemKind,
    packTier,
    bag,
    bulk,
    preparationKind: inferPreparationKind(baseItem),
  };
}

function createTemplateItem(item: TemplateChecklistItem): ChecklistItem {
  return normalizeChecklistItem({
    status: item.status ?? "todo",
    ...item,
  });
}

function createGeneratedItem(
  source: ChecklistItem["source"],
  sourceLabel: string,
  category: ChecklistCategory,
  name: string,
  priority: Priority,
  note?: string,
  options: Partial<ChecklistItem> = {},
): ChecklistItem {
  return normalizeChecklistItem({
    id: stableId(source, category, name),
    name,
    category,
    priority,
    note,
    status: "todo",
    source,
    sourceLabel,
    editable: true,
    removable: source === "user",
    timing:
      category === "hospital_questions"
        ? "confirm_with_hospital"
        : category === "last_minute"
          ? "grab_before_leaving"
          : "pack_now",
    ...options,
  });
}

function getRegion(profile: UserProfile) {
  return (
    regionTemplates.find((region) => region.id === profile.regionId) ??
    regionTemplates[0]
  );
}

export function getHospitalForProfile(
  profile: UserProfile,
): HospitalProfile | undefined {
  if (profile.hospitalMode === "custom") {
    return profile.customHospital;
  }

  if (profile.hospitalMode === "unknown") {
    return undefined;
  }

  return (
    hospitalTemplates.find((hospital) => hospital.hospitalId === profile.hospitalId) ??
    beijingGeneralHospitalTemplate
  );
}

function getHospitalOverride(
  profile: UserProfile,
  overrides?: UserHospitalOverride[],
) {
  const id =
    profile.hospitalMode === "custom"
      ? profile.customHospital?.hospitalId
      : profile.hospitalId;

  if (!id) {
    return undefined;
  }

  return overrides?.find((override) => override.hospitalId === id);
}

function appliesToProfile(item: ChecklistItem, profile: UserProfile) {
  const appliesTo = item.appliesTo;

  if (!appliesTo) {
    return true;
  }

  if (
    appliesTo.deliveryMode &&
    !appliesTo.deliveryMode.includes(profile.deliveryMode)
  ) {
    return false;
  }

  if (
    typeof appliesTo.breastfeeding === "boolean" &&
    appliesTo.breastfeeding !== profile.breastfeeding
  ) {
    return false;
  }

  if (
    typeof appliesTo.partnerPresent === "boolean" &&
    appliesTo.partnerPresent !== profile.partnerPresent
  ) {
    return false;
  }

  if (
    typeof appliesTo.coldWeather === "boolean" &&
    appliesTo.coldWeather !== profile.coldWeather
  ) {
    return false;
  }

  return true;
}

function choosePackTier(
  current?: PackTier,
  incoming?: PackTier,
): PackTier | undefined {
  if (!current) {
    return incoming;
  }

  if (!incoming) {
    return current;
  }

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

    merged.set(key, {
      ...existing,
      priority,
      packTier: choosePackTier(existing.packTier, item.packTier),
      note: existing.note ?? item.note,
      quantity: existing.quantity ?? item.quantity,
      editable: existing.editable || item.editable,
      removable: existing.removable && item.removable,
      sourceLabel: sourceLabel || existing.sourceLabel,
    });
  }

  return Array.from(merged.values()).map(normalizeChecklistItem);
}

function buildRegionItems(profile: UserProfile) {
  const region = getRegion(profile);
  const items: ChecklistItem[] = [];

  for (const documentName of region.requiredDocuments) {
    items.push(
      createGeneratedItem(
        "region",
        region.name,
        "documents",
        documentName,
        "must",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "documents_folder",
        },
      ),
    );
  }

  for (const recommendedItem of region.recommendedItems) {
    items.push(
      createGeneratedItem(
        "region",
        region.name,
        "hospital_questions",
        recommendedItem,
        "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
  }

  for (const note of region.notes) {
    items.push(
      createGeneratedItem(
        "region",
        region.name,
        "hospital_questions",
        note,
        "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
  }

  return items;
}

function buildHospitalItems(
  profile: UserProfile,
  overrides?: UserHospitalOverride[],
) {
  const hospital = getHospitalForProfile(profile);
  const override = getHospitalOverride(profile, overrides);
  const items: ChecklistItem[] = [];

  if (!hospital) {
    items.push(
      createGeneratedItem(
        "hospital",
        "医院待确认",
        "hospital_questions",
        "生产医院暂未确定，请在确定医院后确认入院资料、提供物品、陪产规则和入院动线。",
        "must",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
    return items;
  }

  const sourceLabel = hospital.name ?? "医院模板";
  const requiredDocuments =
    override?.requiredDocumentsOverride?.length
      ? override.requiredDocumentsOverride
      : hospital.requiredDocuments;

  for (const documentName of requiredDocuments) {
    items.push(
      createGeneratedItem(
        "hospital",
        sourceLabel,
        "documents",
        documentName,
        "must",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "documents_folder",
        },
      ),
    );
  }

  for (const recommendedItem of hospital.recommendedItems) {
    items.push(
      createGeneratedItem(
        "hospital",
        sourceLabel,
        "hospital_questions",
        recommendedItem,
        "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
  }

  for (const notAllowedItem of hospital.notAllowedItems) {
    items.push(
      createGeneratedItem(
        "hospital",
        sourceLabel,
        "hospital_questions",
        `请确认医院是否不建议携带：${notAllowedItem}`,
        notAllowedItem === "待确认" ? "recommended" : "must",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
  }

  const hospitalNotes = [
    hospital.admissionNotes,
    hospital.partnerPolicyNotes,
    hospital.wardNotes,
    hospital.paymentNotes,
    hospital.parkingNotes,
    ...(hospital.sourceNotes ?? []),
    profile.hospitalNotes,
    override?.notesOverride,
  ].filter(Boolean) as string[];

  for (const note of hospitalNotes) {
    items.push(
      createGeneratedItem(
        "hospital",
        sourceLabel,
        "hospital_questions",
        note,
        "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
  }

  return items;
}

function buildDeliveryModeItems(profile: UserProfile) {
  const items: ChecklistItem[] = [];

  if (profile.deliveryMode === "c_section") {
    items.push(
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "高腰一次性内裤",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "宽松高腰出院裤",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "腹部不压迫的衣物",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "hospital_questions",
        "剖腹产术后护理问题待确认",
        "must",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
    );
  }

  if (profile.deliveryMode === "vaginal") {
    items.push(
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "会阴清洁用品",
        "optional",
        "自然产时按医院建议确认是否需要。",
        {
          packTier: "optional",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "会阴冷敷/清洁相关用品",
        "optional",
        "自然产时按医院建议确认是否需要。",
        {
          packTier: "optional",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_labor",
        "分娩舒缓用品",
        "optional",
        undefined,
        {
          packTier: "optional",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
    );
  }

  if (profile.deliveryMode === "unknown") {
    items.push(
      createGeneratedItem(
        "general",
        "用户条件",
        "hospital_questions",
        "自然产相关待产用品是否需要准备？",
        "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "hospital_questions",
        "剖腹产术后护理问题待确认",
        "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "高腰一次性内裤",
        "optional",
        undefined,
        {
          packTier: "optional",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
    );
  }

  return items;
}

function buildConditionItems(profile: UserProfile) {
  const items: ChecklistItem[] = [];

  if (profile.breastfeeding) {
    items.push(
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_postpartum",
        "哺乳巾",
        "optional",
        undefined,
        {
          packTier: "optional",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
    );
  }

  if (!profile.partnerPresent) {
    items.push(
      createGeneratedItem(
        "general",
        "用户条件",
        "going_home",
        "紧急联系人/接送人确认",
        "must",
        undefined,
        {
          packTier: "core",
          itemKind: "task",
          bag: "none",
        },
      ),
    );
  }

  if (profile.coldWeather) {
    items.push(
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_labor",
        "妈妈保暖外套",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "mom_labor",
        "袜子",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "baby",
        "宝宝厚包被",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "baby_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "baby",
        "宝宝帽子",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "baby_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "baby",
        "宝宝袜子",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "baby_bag",
        },
      ),
      createGeneratedItem(
        "general",
        "用户条件",
        "going_home",
        "返家保暖衣物",
        "recommended",
        undefined,
        {
          packTier: "core",
          itemKind: "item",
          bag: "mom_bag",
        },
      ),
    );
  }

  return items;
}

function applyStayDayQuantities(item: ChecklistItem, profile: UserProfile) {
  if (item.name === "一次性内裤") {
    return {
      ...item,
      quantity: `${Math.max(1, profile.expectedStayDays)} 天用量`,
    };
  }

  return item;
}

function shouldMarkHospitalProvided(
  item: ChecklistItem,
  providedIds: string[],
) {
  if (providedIds.includes("unknown") || item.itemKind !== "item") {
    return false;
  }

  const normalizedItemName = normalizeName(item.name);

  return providedIds.some((providedId) => {
    if (providedId === "other") {
      return false;
    }

    const matcherWords =
      PROVIDED_ITEM_MATCHERS[providedId] ?? [PROVIDED_ITEM_LABELS[providedId], providedId];

    return matcherWords
      .filter(Boolean)
      .some((word) => normalizedItemName.includes(normalizeName(word)));
  });
}

function buildHospitalProvidedTips(providedIds: string[]) {
  return providedIds
    .filter((providedId) => providedId !== "unknown")
    .map((providedId) => {
      const label = PROVIDED_ITEM_LABELS[providedId] ?? providedId;
      return createGeneratedItem(
        "hospital",
        "用户填写的医院提供物品",
        "hospital_questions",
        `已向医院确认提供：${label}。建议再确认具体规格、数量和是否仍需少量备用。`,
        providedId === "other" ? "optional" : "recommended",
        undefined,
        {
          packTier: "confirm",
          itemKind: "question",
          bag: "none",
        },
      );
    });
}

function applyHospitalProvided(
  items: ChecklistItem[],
  profile: UserProfile,
  overrides?: UserHospitalOverride[],
) {
  const override = getHospitalOverride(profile, overrides);
  const providedIds = Array.from(
    new Set([
      ...profile.hospitalProvidedItemIds,
      ...(override?.providedItemsOverride ?? []),
    ]),
  );

  if (providedIds.length === 0 || providedIds.includes("unknown")) {
    return items;
  }

  return [
    ...items.map((rawItem) => {
      const item = normalizeChecklistItem(rawItem);

      if (!shouldMarkHospitalProvided(item, providedIds)) {
        return item;
      }

      return {
        ...item,
        status: "hospital_provided" as const,
        note:
          item.note ??
          "用户标记为已向医院确认提供，仍建议确认具体规格、数量和是否需要少量备用。",
      };
    }),
    ...buildHospitalProvidedTips(providedIds),
  ];
}

function preserveCurrentItemState(
  generatedItems: ChecklistItem[],
  previousItems?: ChecklistItem[],
) {
  if (!previousItems?.length) {
    return generatedItems;
  }

  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const previousByKey = new Map(previousItems.map((item) => [itemKey(item), item]));

  return generatedItems.map((item) => {
    const previous = previousById.get(item.id) ?? previousByKey.get(itemKey(item));

    if (!previous) {
      return item;
    }

    return normalizeChecklistItem({
      ...item,
      status:
        previous.status === "todo" && item.status !== "todo"
          ? item.status
          : previous.status,
      quantity: previous.quantity ?? item.quantity,
      note: previous.note ?? item.note,
    });
  });
}

function sortItems(items: ChecklistItem[]) {
  return [...items].sort((a, b) => {
    const categoryDiff =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    const tierDiff =
      PACK_TIER_WEIGHT[b.packTier ?? "optional"] -
      PACK_TIER_WEIGHT[a.packTier ?? "optional"];

    if (tierDiff !== 0) {
      return tierDiff;
    }

    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  });
}

export function generateChecklist(
  profile: UserProfile,
  persistence: ChecklistPersistence = {},
): ChecklistItem[] {
  const hiddenTemplateItemIds = new Set(persistence.hiddenTemplateItemIds ?? []);
  const baseItems = generalTemplate
    .map(createTemplateItem)
    .filter((item) => appliesToProfile(item, profile));

  const generatedItems = [
    ...baseItems,
    ...buildRegionItems(profile),
    ...buildHospitalItems(profile, persistence.hospitalOverrides),
    ...buildDeliveryModeItems(profile),
    ...buildConditionItems(profile),
  ].map((item) => applyStayDayQuantities(item, profile));

  const withProvidedStatuses = applyHospitalProvided(
    generatedItems,
    profile,
    persistence.hospitalOverrides,
  );

  const visibleGeneratedItems = withProvidedStatuses.filter(
    (item) => !hiddenTemplateItemIds.has(item.id),
  );

  const withCustomItems = [
    ...visibleGeneratedItems,
    ...(persistence.customItems ?? []),
  ].map(normalizeChecklistItem);

  const deduped = mergeDuplicateItems(withCustomItems);
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
  const total = items.length;
  const completed = items.filter((item) =>
    ["packed", "hospital_provided", "not_needed"].includes(item.status),
  ).length;

  return completionResult(total, completed);
}

export function calculatePackingCompletion(items: ChecklistItem[]) {
  const packableItems = items
    .map(normalizeChecklistItem)
    .filter(
      (item) =>
        item.itemKind === "item" &&
        item.category !== "hospital_questions" &&
        item.category !== "last_minute" &&
        item.bag !== "none" &&
        item.bag !== "car" &&
        item.status !== "not_needed",
    );
  const completed = packableItems.filter((item) =>
    ["packed", "hospital_provided"].includes(item.status),
  ).length;

  return completionResult(packableItems.length, completed);
}

export function calculateConfirmationCompletion(items: ChecklistItem[]) {
  const questionItems = items
    .map(normalizeChecklistItem)
    .filter(
      (item) => item.itemKind === "question" || item.category === "hospital_questions",
    );
  const completed = questionItems.filter((item) =>
    ["packed", "hospital_provided", "not_needed"].includes(item.status),
  ).length;

  return completionResult(questionItems.length, completed);
}

export function calculateLastMinuteCompletion(items: ChecklistItem[]) {
  const lastMinuteItems = items
    .map(normalizeChecklistItem)
    .filter((item) => {
      if (item.category === "last_minute") {
        return true;
      }

      if (item.bag === "car") {
        return false;
      }

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
    return {
      category,
      ...calculateCompletion(categoryItems),
    };
  });
}
