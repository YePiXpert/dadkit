import type { ChecklistItem } from "@/lib/types";

const BASE_CHECKLIST_ITEM_ART_KEYS = [
  "general-baby-blanket",
  "general-baby-bottle-brush",
  "general-baby-diaper-cream",
  "general-baby-diapers",
  "general-baby-formula-bottle",
  "general-baby-hat",
  "general-baby-nail-clipper",
  "general-baby-navel-care",
  "general-baby-towels",
  "general-baby-wipes",
  "general-confinement-baby-bathtub",
  "general-confinement-baby-black-white-cards",
  "general-confinement-baby-bodysuit",
  "general-confinement-baby-bottle-warmer",
  "general-confinement-baby-crib",
  "general-confinement-baby-kettle",
  "general-confinement-baby-medicine-syringe",
  "general-confinement-baby-nasal-care",
  "general-confinement-baby-night-light",
  "general-confinement-baby-pacifier",
  "general-confinement-baby-sleep-sack",
  "general-confinement-baby-sterilizer",
  "general-confinement-baby-storage-cart",
  "general-confinement-baby-stroller",
  "general-confinement-baby-thermometer",
  "general-confinement-baby-washer",
  "general-confinement-mom-diaper-bag",
  "general-confinement-mom-nursing-pillow",
  "general-confinement-mom-pumping-bra",
  "general-doc-admission",
  "general-doc-birth-plan",
  "general-doc-birth-registration",
  "general-doc-cash",
  "general-doc-hukou",
  "general-doc-id",
  "general-doc-marriage-cert",
  "general-doc-medical-card",
  "general-doc-prenatal-records",
  "general-going-home-car-seat",
  "general-labor-clothes",
  "general-labor-cooling",
  "general-labor-cup",
  "general-labor-energy-food",
  "general-labor-eye-mask",
  "general-labor-glasses",
  "general-labor-lip-balm",
  "general-labor-long-cable",
  "general-labor-medicine-list",
  "general-labor-phone",
  "general-labor-pillow",
  "general-labor-relaxation",
  "general-labor-slippers",
  "general-labor-socks",
  "general-labor-tens",
  "general-labor-toiletries",
  "general-labor-towels",
  "general-postpartum-basins",
  "general-postpartum-belly-wrap",
  "general-postpartum-breast-pads",
  "general-postpartum-breast-pump",
  "general-postpartum-cold-pack",
  "general-postpartum-milk-bags",
  "general-postpartum-nipple-cream",
  "general-postpartum-nursing-bra",
  "general-postpartum-pads",
  "general-postpartum-peri-bottle",
  "general-postpartum-underwear",
] as const;

type BaseChecklistItemArtKey =
  (typeof BASE_CHECKLIST_ITEM_ART_KEYS)[number];

const BUNDLED_ART_ALIASES = {
  "general-doc-bank-card": "general-doc-medical-card",
  "general-labor-power-bank": "general-labor-long-cable",
  "general-labor-tissues": "general-baby-wipes",
  "general-labor-ctg-belt": "general-labor-tens",
  "general-labor-straws": "general-labor-cup",
  "general-labor-tableware": "general-labor-energy-food",
  "general-labor-moon-toothbrush": "general-labor-toiletries",
  "general-postpartum-paper": "general-postpartum-pads",
  "general-postpartum-metered-pads": "general-postpartum-pads",
  "general-postpartum-toilet-seat-covers": "general-postpartum-pads",
  "general-postpartum-yuezi-hat-shoes": "general-labor-slippers",
  "general-postpartum-going-home-clothes": "general-labor-clothes",
  "general-postpartum-storage-bags": "general-confinement-mom-diaper-bag",
  "general-postpartum-pull-up-pants": "general-postpartum-underwear",
  "general-postpartum-adult-diapers": "general-postpartum-underwear",
  "general-baby-home-clothes": "general-confinement-baby-bodysuit",
  "general-baby-socks": "general-baby-hat",
  "general-baby-hospital-clothes": "general-confinement-baby-bodysuit",
  "general-baby-changing-pads": "general-baby-diapers",
  "general-baby-cotton-swabs": "general-baby-navel-care",
  "general-baby-lotion": "general-baby-diaper-cream",
  "general-baby-laundry": "general-confinement-baby-washer",
  "general-confinement-mom-yuezi-clothes": "general-labor-clothes",
  "general-confinement-mom-pads-stock": "general-postpartum-pads",
  "general-confinement-mom-underwear-stock": "general-postpartum-underwear",
  "general-confinement-mom-nursing-pads-stock":
    "general-postpartum-breast-pads",
  "general-confinement-mom-milk-bags-stock":
    "general-postpartum-milk-bags",
  "general-confinement-baby-diapers-stock": "general-baby-diapers",
  "general-confinement-baby-bottles": "general-baby-formula-bottle",
  "general-confinement-baby-formula": "general-baby-formula-bottle",
  "general-confinement-baby-wash": "general-baby-diaper-cream",
  "general-confinement-baby-face-cream": "general-baby-diaper-cream",
  "general-confinement-baby-body-lotion": "general-baby-diaper-cream",
  "general-confinement-baby-peach-water": "general-baby-diaper-cream",
  "general-confinement-baby-bath-towels": "general-baby-towels",
  "general-confinement-baby-bibs": "general-baby-towels",
  "general-confinement-baby-bath-thermometer":
    "general-confinement-baby-thermometer",
  "general-confinement-baby-soft-tissues": "general-baby-wipes",
  "general-confinement-baby-changing-pads-stock": "general-baby-diapers",
  "general-confinement-baby-washable-pads": "general-baby-diapers",
  "general-confinement-baby-laundry-detergent":
    "general-confinement-baby-washer",
  "general-confinement-baby-hangers": "general-confinement-baby-washer",
  "general-confinement-baby-rompers": "general-confinement-baby-bodysuit",
  "general-confinement-baby-belly-band": "general-confinement-baby-bodysuit",
  "general-confinement-baby-vitamin-ad": "general-baby-navel-care",
  "general-confinement-baby-zinc-oxide": "general-baby-diaper-cream",
  "general-confinement-baby-calamine": "general-baby-diaper-cream",
  "general-confinement-baby-hair-clipper": "general-baby-nail-clipper",
  "general-confinement-baby-changing-table":
    "general-confinement-baby-storage-cart",
  "general-partner-doc-folder": "general-doc-admission",
  "general-partner-payment": "general-doc-cash",
  "general-partner-car-seat": "general-going-home-car-seat",
  "general-partner-family-notice": "general-labor-phone",
  "general-partner-id": "general-doc-id",
  "general-partner-charger": "general-labor-long-cable",
  "general-partner-water-snacks": "general-labor-energy-food",
  "general-partner-clothes": "general-labor-clothes",
  "general-partner-toiletries": "general-labor-toiletries",
  "general-partner-glasses": "general-labor-glasses",
  "general-partner-medicine-list": "general-labor-medicine-list",
  "general-partner-bedding": "general-labor-pillow",
  "general-going-home-mom-clothes": "general-labor-clothes",
  "general-going-home-baby-clothes": "general-confinement-baby-bodysuit",
  "general-going-home-blanket": "general-baby-blanket",
  "general-going-home-transport": "general-going-home-car-seat",
  "general-last-id": "general-doc-id",
  "general-last-medical-card": "general-doc-medical-card",
  "general-last-maternal-book": "general-doc-prenatal-records",
  "general-last-prenatal-records": "general-doc-prenatal-records",
  "general-last-phone": "general-labor-phone",
  "general-last-charger": "general-labor-long-cable",
  "general-last-mom-bag": "general-confinement-mom-diaper-bag",
  "general-last-baby-bag": "general-confinement-mom-diaper-bag",
  "general-last-medicine-list": "general-labor-medicine-list",
  "general-last-glasses": "general-labor-glasses",
  "general-last-payment": "general-doc-cash",
  "general-last-car-seat": "general-going-home-car-seat",
} as const satisfies Record<string, BaseChecklistItemArtKey>;

export const CHECKLIST_ITEM_ART_KEYS = [
  ...BASE_CHECKLIST_ITEM_ART_KEYS,
  ...(Object.keys(BUNDLED_ART_ALIASES) as Array<
    keyof typeof BUNDLED_ART_ALIASES
  >),
] as const;

export type ChecklistItemArtKey =
  | BaseChecklistItemArtKey
  | keyof typeof BUNDLED_ART_ALIASES;

const ART_KEY_SET = new Set<string>(CHECKLIST_ITEM_ART_KEYS);

type ItemArtInput = Pick<ChecklistItem, "category" | "id" | "name">;

const MACARON_ART_PALETTE = [
  { backgroundColor: "#f8dfe3", tone: "草莓奶霜" },
  { backgroundColor: "#f9e3d2", tone: "蜜桃奶油" },
  { backgroundColor: "#f5ebc9", tone: "柠檬曲奇" },
  { backgroundColor: "#e5efd1", tone: "青提奶绿" },
  { backgroundColor: "#dcebd8", tone: "开心果绿" },
  { backgroundColor: "#d9ece7", tone: "薄荷牛乳" },
  { backgroundColor: "#dcecf4", tone: "苏打浅蓝" },
  { backgroundColor: "#dfe5f5", tone: "云朵蓝莓" },
  { backgroundColor: "#e5e0f3", tone: "香芋奶昔" },
  { backgroundColor: "#ecddf0", tone: "淡紫马卡龙" },
  { backgroundColor: "#f1dce8", tone: "樱花牛奶" },
  { backgroundColor: "#f6dfc7", tone: "杏仁奶糖" },
] as const;

const ART_PLACEMENTS = [
  { objectPosition: "50% 50%", transform: "scale(1.01)" },
  { objectPosition: "48% 50%", transform: "scale(1.035)" },
  { objectPosition: "52% 49%", transform: "scale(1.02)" },
  { objectPosition: "50% 52%", transform: "scale(1.045)" },
] as const;

const ART_VARIANT_BY_ID = createBundledArtVariants();

export function getChecklistItemArtPresentation(item: ItemArtInput) {
  const artKey = getChecklistItemArtKey(item);
  const variant = ART_VARIANT_BY_ID.get(item.id) ?? stableHash(item.id);
  const artKeyOffset = CHECKLIST_ITEM_ART_KEYS.indexOf(artKey);
  const palette =
    MACARON_ART_PALETTE[
      (Math.max(artKeyOffset, 0) + variant) % MACARON_ART_PALETTE.length
    ];
  const placement = ART_PLACEMENTS[variant % ART_PLACEMENTS.length];

  return {
    ...palette,
    ...placement,
    variant,
  };
}

export function getChecklistItemArtKey(
  item: ItemArtInput,
): ChecklistItemArtKey {
  if (ART_KEY_SET.has(item.id)) {
    return item.id as ChecklistItemArtKey;
  }

  return inferChecklistItemArtKey(item);
}

export function getChecklistItemArtSrc(item: ItemArtInput) {
  return `/item-art/${getChecklistItemArtKey(item)}.webp`;
}

function createBundledArtVariants() {
  const variants = new Map<string, number>();
  const nextVariant = new Map<ChecklistItemArtKey, number>();

  for (const key of CHECKLIST_ITEM_ART_KEYS) {
    variants.set(key, 0);
    nextVariant.set(key, 1);
  }

  for (const [itemId, artKey] of Object.entries(BUNDLED_ART_ALIASES)) {
    const variant = nextVariant.get(artKey) ?? 1;
    variants.set(itemId, variant);
    nextVariant.set(artKey, variant + 1);
  }

  return variants;
}

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function inferChecklistItemArtKey(
  item: Pick<ItemArtInput, "category" | "name">,
): ChecklistItemArtKey {
  const name = item.name.toLowerCase().replace(/[\s/／、，,（）()·+]/g, "");

  if (hasAny(name, "安全座椅", "返家交通", "交通安排")) {
    return "general-going-home-car-seat";
  }
  if (hasAny(name, "身份证", "证件")) return "general-doc-id";
  if (hasAny(name, "医保", "社保", "银行卡")) {
    return "general-doc-medical-card";
  }
  if (hasAny(name, "产检", "母子健康", "孕产资料")) {
    return "general-doc-prenatal-records";
  }
  if (hasAny(name, "分娩偏好", "出生计划")) {
    return "general-doc-birth-plan";
  }
  if (hasAny(name, "支付", "押金", "现金")) return "general-doc-cash";
  if (name.includes("结婚证")) return "general-doc-marriage-cert";
  if (name.includes("户口")) return "general-doc-hukou";
  if (hasAny(name, "生育服务", "生育登记")) {
    return "general-doc-birth-registration";
  }

  if (name.includes("手机")) return "general-labor-phone";
  if (hasAny(name, "充电", "数据线")) return "general-labor-long-cable";
  if (hasAny(name, "洗漱", "牙刷", "漱口")) {
    return "general-labor-toiletries";
  }
  if (name.includes("护唇")) return "general-labor-lip-balm";
  if (hasAny(name, "吸管杯", "水杯", "吸管")) return "general-labor-cup";
  if (name.includes("眼罩")) return "general-labor-eye-mask";
  if (name.includes("哺乳枕")) return "general-confinement-mom-nursing-pillow";
  if (hasAny(name, "枕头", "被褥", "折叠床")) return "general-labor-pillow";
  if (hasAny(name, "风扇", "喷雾")) return "general-labor-cooling";
  if (hasAny(name, "耳机", "音频")) return "general-labor-relaxation";
  if (hasAny(name, "tens", "胎心监护")) return "general-labor-tens";
  if (hasAny(name, "拖鞋", "月子鞋")) return "general-labor-slippers";
  if (name.includes("眼镜")) return "general-labor-glasses";
  if (hasAny(name, "药清单", "确认用药", "常用药")) {
    return "general-labor-medicine-list";
  }
  if (hasAny(name, "补能", "零食", "饭盒", "餐具", "筷勺", "饮料")) {
    return "general-labor-energy-food";
  }

  if (hasAny(name, "产褥垫", "卫生巾", "刀纸", "马桶垫")) {
    return "general-postpartum-pads";
  }
  if (hasAny(name, "一次性内裤", "拉拉裤", "安心裤", "成人纸尿裤")) {
    return "general-postpartum-underwear";
  }
  if (name.includes("哺乳内衣")) return "general-postpartum-nursing-bra";
  if (hasAny(name, "溢乳垫", "防溢乳垫")) {
    return "general-postpartum-breast-pads";
  }
  if (name.includes("乳头膏")) return "general-postpartum-nipple-cream";
  if (name.includes("冲洗器")) return "general-postpartum-peri-bottle";
  if (name.includes("冷敷")) return "general-postpartum-cold-pack";
  if (hasAny(name, "脸盆", "折叠盆")) return "general-postpartum-basins";
  if (name.includes("收腹带")) return "general-postpartum-belly-wrap";
  if (name.includes("吸奶器")) return "general-postpartum-breast-pump";
  if (name.includes("储奶袋")) return "general-postpartum-milk-bags";
  if (hasAny(name, "妈咪包", "妈妈包", "宝宝包", "收纳袋", "脏衣袋")) {
    return "general-confinement-mom-diaper-bag";
  }

  if (hasAny(name, "奶瓶刷", "清洗剂")) return "general-baby-bottle-brush";
  if (hasAny(name, "奶瓶", "奶粉", "硅胶小勺")) {
    return "general-baby-formula-bottle";
  }
  if (hasAny(name, "安抚奶嘴", "奶嘴")) {
    return "general-confinement-baby-pacifier";
  }
  if (hasAny(name, "纸尿裤", "尿不湿", "隔尿垫")) {
    return "general-baby-diapers";
  }
  if (hasAny(name, "湿巾", "棉柔巾", "云柔巾", "纸巾")) {
    return "general-baby-wipes";
  }
  if (hasAny(name, "包被", "小毯子", "毛毯")) {
    return "general-baby-blanket";
  }
  if (hasAny(name, "宝宝帽", "宝宝袜")) return "general-baby-hat";
  if (hasAny(name, "纱布巾", "浴巾", "口水巾", "小方巾")) {
    return "general-baby-towels";
  }
  if (hasAny(name, "护臀", "润肤", "抚触油", "面霜", "身体乳", "桃子水", "氧化锌", "炉甘石", "沐浴")) {
    return "general-baby-diaper-cream";
  }
  if (hasAny(name, "指甲剪", "理发器")) {
    return "general-baby-nail-clipper";
  }
  if (hasAny(name, "护脐", "棉签", "维生素")) {
    return "general-baby-navel-care";
  }
  if (hasAny(name, "恒温水壶", "调奶器")) {
    return "general-confinement-baby-kettle";
  }
  if (name.includes("消毒")) return "general-confinement-baby-sterilizer";
  if (name.includes("温奶")) return "general-confinement-baby-bottle-warmer";
  if (hasAny(name, "洗澡盆", "浴网")) {
    return "general-confinement-baby-bathtub";
  }
  if (hasAny(name, "体温计", "水温计", "耳温枪")) {
    return "general-confinement-baby-thermometer";
  }
  if (name.includes("睡袋")) return "general-confinement-baby-sleep-sack";
  if (name.includes("黑白卡")) {
    return "general-confinement-baby-black-white-cards";
  }
  if (name.includes("夜灯")) return "general-confinement-baby-night-light";
  if (name.includes("婴儿床")) return "general-confinement-baby-crib";
  if (name.includes("推车")) return "general-confinement-baby-stroller";
  if (hasAny(name, "洗衣", "衣架")) return "general-confinement-baby-washer";
  if (hasAny(name, "置物", "尿布台")) {
    return "general-confinement-baby-storage-cart";
  }
  if (hasAny(name, "宝宝衣", "婴儿衣", "连体衣", "包屁衣", "和尚服", "肚围")) {
    return "general-confinement-baby-bodysuit";
  }

  if (name.includes("毛巾")) return "general-labor-towels";
  if (name.includes("袜")) return "general-labor-socks";
  if (hasAny(name, "衣物", "睡衣", "月子服")) return "general-labor-clothes";

  const categoryFallbacks: Record<
    ItemArtInput["category"],
    ChecklistItemArtKey
  > = {
    documents: "general-doc-admission",
    mom_labor: "general-labor-toiletries",
    mom_postpartum: "general-postpartum-underwear",
    baby: "general-confinement-baby-bodysuit",
    confinement_mom: "general-confinement-mom-diaper-bag",
    confinement_baby: "general-confinement-baby-storage-cart",
    partner: "general-labor-phone",
    going_home: "general-going-home-car-seat",
    last_minute: "general-confinement-mom-diaper-bag",
  };

  return categoryFallbacks[item.category];
}

function hasAny(value: string, ...needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}
