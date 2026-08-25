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
  "general-doc-medical-card": {
    quantity: "实体卡 1 张 + 电子凭证 1 份",
    note: "用于就诊与医保结算；建议携带本人实体卡，并提前登录或截图保存电子凭证。",
  },
  "general-doc-prenatal-records": {
    quantity: "原件 1 套",
    note: "用于医护人员了解孕期检查记录；建议把产检本、影像和化验单按日期整理成一套。",
  },
  "general-labor-power-bank": {
    quantity: "充电宝 1 个，约 10000-20000 毫安时",
    note: "用于插座不便时给手机补电；建议准备容量适中、状态正常且符合交通携带要求的一只。",
  },
  "general-labor-energy-food": {
    quantity: "允许携带后备 1-2 份小包装",
    note: "用于等待时间较长时按需补充；建议先确认医院规定，再选便携、易开启的小包装。",
  },
  "general-labor-clothes": {
    quantity: "2-3 套",
    note: "用于住院期间换洗和护理操作；建议准备两至三套宽松、前开或易穿脱的衣物。",
  },
  "general-labor-slippers": {
    quantity: "防滑、易穿脱拖鞋 1 双",
    note: "用于病房走动和洗漱；建议选鞋底防滑、脚面宽松且容易穿脱的一双。",
  },
  "general-labor-cup": {
    quantity: "带盖杯 1 个，约 500-800 毫升",
    note: "用于住院期间补充饮水；建议选带盖、可单手开启且约五百至八百毫升的杯子。",
  },
  "general-labor-straws": {
    quantity: "独立包装 5-10 根",
    note: "用于不便起身时饮水；建议带五至十根独立包装、与杯口匹配的吸管。",
  },
  "general-labor-ctg-belt": {
    quantity: "2 条",
    note: "用于医院明确要求自带时配合胎心监护；建议产检时先确认规格，需要时准备两条。",
  },
  "general-postpartum-nursing-bra": {
    quantity: "2-3 件",
    note: "用于计划哺乳时方便穿脱和换洗；建议准备两至三件可调节、无明显勒压感的款式，并按孕晚期实际胸围留余量。",
  },
  "general-labor-socks": {
    quantity: "1-2 双",
    note: "用于空调环境下保暖和换洗；建议准备一至两双袜口宽松、透气的袜子。",
  },
  "general-labor-towels": {
    quantity: "小毛巾 2 条",
  },
  "general-postpartum-belly-wrap": {
    note: "用于医护人员建议使用时提供适度支撑；建议先确认是否需要，再按孕晚期围度选择一条可调节款。",
  },
  "general-postpartum-yuezi-hat-shoes": {
    quantity: "帽子或软底鞋各 1 件，按需",
    note: "用于出院或病房内按个人习惯保暖；建议根据季节选轻便、透气的单件用品，不必成套购买。",
  },
  "general-postpartum-pads": {
    quantity: "10-20 片",
    note: "用于住院期间铺垫床面和按需更换；建议先备六十乘九十厘米产褥垫十至二十片，并向医院确认是否还需产后卫生巾。",
  },
  "general-postpartum-paper": {
    quantity: "1-2 提",
    note: "用于医院明确要求的产房或病房护理场景；建议先确认规格，再准备一至两提，医院提供则无需重复携带。",
  },
  "general-postpartum-pull-up-pants": {
    quantity: "1 包（5-8 片）",
    note: "用于住院初期方便穿脱和更换；建议先备五至八片小包装，并按孕晚期实际腰臀围选择尺码。",
  },
  "general-postpartum-underwear": {
    quantity: "预计住院天数 + 2 条，通常 5-7 条",
    note: "用于住院期间便捷换洗；建议按预计住院天数多备两条，并按孕晚期实际腰臀围选码，不照搬孕前尺码。",
  },
  "general-postpartum-toilet-seat-covers": {
    quantity: "独立包装 10-20 片",
    note: "用于使用病房公共马桶时按个人习惯铺垫；建议带十至二十片独立包装、大小合适的款式。",
  },
  "general-postpartum-peri-bottle": {
    note: "用于医院建议进行局部清洁时辅助冲洗；建议准备一个约三百至五百毫升、弯嘴且便于清洗的瓶子。",
  },
  "general-labor-toiletries": {
    quantity: "旅行装 1 套",
    note: "用于住院期间日常清洁；建议用一个小包分装牙刷、牙膏、洁面和发圈等个人用品。",
  },
  "general-labor-moon-toothbrush": {
    quantity: "软毛牙刷 1 支 + 小瓶漱口水 1 瓶",
    note: "用于住院期间保持口腔清洁；普通软毛牙刷即可，不必专门购买“月子牙刷”，漱口水按个人习惯带小瓶装。",
  },
  "general-postpartum-going-home-clothes": {
    note: "用于出院当天舒适穿着；建议准备一套适合季节、腹部宽松的衣物，并按孕晚期尺码试穿。",
  },
  "general-labor-tissues": {
    quantity: "各 1-2 包",
    note: "用于日常清洁和擦拭；建议纸巾、无香湿巾各带一至两小包，宝宝用品分开放。",
  },
  "general-labor-long-cable": {
    quantity: "长度约 2 米的线 1 条",
    note: "用于病床附近充电；建议准备约两米、接口匹配且外皮完好的充电线一条。",
  },
  "general-labor-eye-mask": {
    note: "用于病房灯光较亮时休息；建议选柔软、松紧可调且便于清洗的一只。",
  },
  "general-labor-pillow": {
    note: "用于提高住院休息舒适度；如决定携带，建议套上易识别、可清洗的枕套。",
  },
  "general-postpartum-basins": {
    quantity: "2 个，妈妈和宝宝分开",
    note: "用于妈妈局部清洁和宝宝洗脸洗屁屁；建议准备两个颜色可区分、易清洗的盆，折叠款更省空间。",
  },
  "general-baby-hospital-clothes": {
    quantity: "2-3 套",
    note: "用于医院要求自带时给宝宝住院换洗；建议先确认是否提供，再准备两至三套柔软、易穿脱的衣物。",
  },
  "general-baby-blanket": {
    quantity: "1 条，寒冷季节可备 2 条",
    note: "用于出院路上包裹和按需保暖；建议按季节准备一条透气、易清洗的款式，寒冷天气可加一条备用。",
  },
  "general-baby-socks": {
    quantity: "袜口宽松的袜子 1-2 双",
    note: "用于出院途中按季节保暖；建议准备一至两双袜口宽松、无线头明显残留的袜子。",
  },
  "general-baby-hat": {
    quantity: "柔软帽子 1 顶，按季节",
    note: "用于出院路上按天气挡风保暖；建议准备一顶无硬饰、松紧合适且与季节匹配的帽子。",
  },
  "general-baby-towels": {
    note: "用于喂奶垫巾、拍嗝和日常擦拭；建议准备三至五条颜色或图案易区分、洗后易干的小方巾。",
  },
  "general-baby-bottle-brush": {
    quantity: "确认使用奶瓶后，各 1 个小规格",
    note: "用于确实使用奶瓶时清洁接触奶液的配件；建议准备一把尺寸匹配的刷具和一小瓶清洗剂，用后按说明清洗晾干。",
  },
  "general-baby-formula-bottle": {
    quantity: "确认需要后，小包装 1 份 + 喂养工具 1 套",
    note: "用于医院明确允许且家庭决定准备备用喂养用品的场景；建议先确认医院政策，再准备最小包装和一套易清洗工具。",
  },
  "general-baby-wipes": {
    quantity: "无香型湿巾或棉柔巾 1-2 小包",
    note: "用于换洗时擦拭皮肤或清理台面；建议准备一至两小包无香型产品，并先确认医院是否提供。",
  },
  "general-baby-lotion": {
    quantity: "无香型 30-50 毫升小瓶 1 个",
    note: "用于干燥季节按需进行皮肤保湿；建议先备三十至五十毫升无香型小瓶，使用前按说明少量尝试。",
  },
  "general-baby-laundry": {
    quantity: "小衣架 2-3 个 + 洗衣皂 1 块",
    note: "用于住院期间手洗宝宝小件衣物并晾起来；建议准备两三个小衣架和一小块婴儿洗衣皂。",
  },
  "general-baby-home-clothes": {
    note: "用于宝宝出院当天穿着和临时替换；建议准备一主一备两套柔软连体衣，尺码按预估体重在五十二或五十九码中选择。",
  },
  "general-baby-navel-care": {
    note: "用于医院明确要求的脐部护理用品准备；建议先询问是否需要及具体规格，不自行增加处理步骤。",
  },
  "general-confinement-baby-kettle": {
    note: "用于奶粉喂养家庭随时冲奶；建议设在 45℃ 左右随取随冲，母乳亲喂为主可先不买。常见品牌：波咯咯、小白熊、可优比。",
  },
  "general-last-mom-bag": {
    note: "出门前从固定位置拿上妈妈包，拉好拉链并按清单快速复核证件和常用物品。",
  },
  "general-last-baby-bag": {
    note: "出门前从固定位置拿上宝宝包，确认出院衣物、尿不湿和包被已经装好。",
  },
  "general-going-home-mom-clothes": {
    quantity: "宽松衣物 1 套",
    note: "用于妈妈出院当天舒适穿着；建议准备一套适合天气、腹部宽松并按孕晚期尺码试穿的衣物。",
  },
  "general-going-home-baby-clothes": {
    quantity: "当日 1 套 + 备用 1 套",
    note: "用于宝宝出院当天穿着和临时替换；建议一主一备两套，并按预估体重和天气选择尺码厚度。",
  },
  "general-going-home-blanket": {
    quantity: "1 条",
    note: "用于宝宝出院途中按需包裹；建议准备一条与天气匹配、透气且不影响安全座椅约束带贴合的款式。",
  },
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

function itemKey(item: Pick<ChecklistItem, "category" | "name">) {
  return `${item.category}:${normalizeName(item.name)}`;
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
  const keyById = new Map<string, string>();

  for (const rawItem of items) {
    const item = normalizeChecklistItem(rawItem);
    const key = keyById.get(item.id) ?? itemKey(item);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
      keyById.set(item.id, key);
      continue;
    }

    const isTemplateOverlay =
      existing.id === item.id &&
      existing.source === "general" &&
      item.source === "user";
    const priority =
      !isTemplateOverlay &&
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
        packTier: isTemplateOverlay
          ? existing.packTier
          : choosePackTier(existing.packTier, item.packTier),
        note: userItem?.note ?? existing.note ?? item.note,
        quantity: userItem?.quantity ?? existing.quantity ?? item.quantity,
        editable: existing.editable || item.editable,
        removable: existing.removable && item.removable,
        sourceLabel: sourceLabel || existing.sourceLabel,
        updatedAt: Math.max(existing.updatedAt ?? 0, item.updatedAt ?? 0) || undefined,
      }),
    );
    keyById.set(item.id, key);
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
