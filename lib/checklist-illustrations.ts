import { generalTemplate } from "@/lib/templates/general";
import type {
  ChecklistBag,
  ChecklistCategory,
  ChecklistItem,
} from "@/lib/types";

export type ChecklistIllustrationFamily =
  | "bag"
  | "baby-care"
  | "bath"
  | "bedding"
  | "bottle"
  | "card"
  | "clothing"
  | "cosmetic"
  | "diaper"
  | "document"
  | "electronics"
  | "eyewear"
  | "food"
  | "footwear"
  | "furniture"
  | "home"
  | "hygiene"
  | "laundry"
  | "medical"
  | "money"
  | "package"
  | "phone"
  | "sleep"
  | "task"
  | "textile"
  | "transport";

export type ChecklistIllustrationPalette = {
  ink: string;
  primary: string;
  secondary: string;
  highlight: string;
  wash: string;
};

export type ChecklistIllustrationSymbol =
  | "bow"
  | "check"
  | "cross"
  | "drop"
  | "flower"
  | "heart"
  | "leaf"
  | "moon"
  | "shield"
  | "sparkle"
  | "star"
  | "sun";

export type ChecklistIllustrationFrame =
  | "arch"
  | "orbit"
  | "pedestal"
  | "postcard";

export type ChecklistIllustrationSymbolPlacement =
  | "lower-left"
  | "lower-right"
  | "upper-right";

export type ChecklistIllustrationDescriptor = {
  artKey: string;
  compositionFrame: ChecklistIllustrationFrame;
  compositionKey: string;
  compositionSymbol: ChecklistIllustrationSymbol;
  family: ChecklistIllustrationFamily;
  markerCode: number;
  palette: ChecklistIllustrationPalette;
  paletteIndex: number;
  scope: "builtin" | "custom";
  signature: string;
  symbolPlacement: ChecklistIllustrationSymbolPlacement;
  variant: number;
};

type IllustrationInput = Pick<ChecklistItem, "category" | "id" | "name"> &
  Partial<Pick<ChecklistItem, "bag" | "source">>;

export const CHECKLIST_ILLUSTRATION_PALETTES = [
  {
    ink: "#76554F",
    primary: "#E7A098",
    secondary: "#F5D6B8",
    highlight: "#FFF5E8",
    wash: "#F8EAE2",
  },
  {
    ink: "#526D68",
    primary: "#94C7B8",
    secondary: "#D7E9C8",
    highlight: "#FFF8E9",
    wash: "#EAF2E9",
  },
  {
    ink: "#586D80",
    primary: "#91BED4",
    secondary: "#D7E6EF",
    highlight: "#FFF7E7",
    wash: "#EAF1F4",
  },
  {
    ink: "#76637D",
    primary: "#B9A6CB",
    secondary: "#E3D8E8",
    highlight: "#FFF6E5",
    wash: "#F0EAF2",
  },
  {
    ink: "#7A6047",
    primary: "#D9AA72",
    secondary: "#F0DDB4",
    highlight: "#FFF9EC",
    wash: "#F4EDDF",
  },
  {
    ink: "#6B5C73",
    primary: "#D5A9BA",
    secondary: "#EFD7D9",
    highlight: "#FFF7EA",
    wash: "#F5E9E9",
  },
  {
    ink: "#4F6E76",
    primary: "#8FC7C9",
    secondary: "#CDE7DF",
    highlight: "#FFF5DF",
    wash: "#E7F1EE",
  },
  {
    ink: "#75614F",
    primary: "#C8B184",
    secondary: "#E7DDC1",
    highlight: "#FFF8EC",
    wash: "#F2EEE3",
  },
] as const satisfies readonly ChecklistIllustrationPalette[];

export const CHECKLIST_ILLUSTRATION_SYMBOLS = [
  "flower",
  "heart",
  "star",
  "check",
  "cross",
  "leaf",
  "drop",
  "moon",
  "sparkle",
  "bow",
  "shield",
  "sun",
] as const satisfies readonly ChecklistIllustrationSymbol[];

export const CHECKLIST_ILLUSTRATION_FRAMES = [
  "arch",
  "pedestal",
  "orbit",
  "postcard",
] as const satisfies readonly ChecklistIllustrationFrame[];

export const CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS = [
  "upper-right",
  "lower-right",
  "lower-left",
] as const satisfies readonly ChecklistIllustrationSymbolPlacement[];

function normalizeName(name: string) {
  return name.replace(/[\s/（）()，、+·]/g, "").toLowerCase();
}

export function inferChecklistIllustrationFamily(
  item: Pick<IllustrationInput, "bag" | "category" | "name">,
): ChecklistIllustrationFamily {
  const name = normalizeName(item.name);

  if (/(身份证|证件|户口|结婚证|出生计划|登记凭证|产检资料|健康手册|资料)/.test(name)) {
    return "document";
  }
  if (/(医保卡|社保卡|银行卡)/.test(name)) return "card";
  if (/(现金|支付|押金)/.test(name)) return "money";
  if (/(手机)/.test(name)) return "phone";
  if (/(充电|电源|耳机|风扇|喷雾瓶|理发器|洗衣机)/.test(name)) {
    return "electronics";
  }
  if (/(眼镜|隐形眼镜)/.test(name)) return "eyewear";
  if (/(药|镇痛|监护|冷敷|体温|温计|维生素|碘伏|氧化锌|炉甘石|护脐)/.test(name)) {
    return "medical";
  }
  if (/(护唇|护臀|乳头膏|润肤|抚触油|面霜|身体乳|桃子水)/.test(name)) {
    return "cosmetic";
  }
  if (/(奶瓶|奶粉|硅胶小勺|奶嘴|吸奶器|储奶|温奶|调奶|恒温水壶|消毒器)/.test(name)) {
    return "bottle";
  }
  if (/(纸尿裤|尿不湿|隔尿|尿垫|拉拉裤|安心裤|成人纸尿裤|卫生巾|产褥垫|溢乳垫|马桶垫)/.test(name)) {
    return "diaper";
  }
  if (/(洗澡盆|浴网|脸盆|冲洗器|洗发沐浴)/.test(name)) return "bath";
  if (/(牙刷|漱口|洗漱|纸巾|湿巾|棉柔巾|云柔巾|棉签|奶瓶刷|指甲剪)/.test(name)) {
    return "hygiene";
  }
  if (/(洗衣液|洗衣皂|衣架)/.test(name)) return "laundry";
  if (/(衣|裤|袜|帽|文胸|肚围|月子服|连体衣|包屁衣)/.test(name)) {
    return "clothing";
  }
  if (/(鞋|拖鞋)/.test(name)) return "footwear";
  if (/(毛巾|浴巾|纱布巾|口水巾)/.test(name)) return "textile";
  if (/(枕|包被|毯|被褥|睡袋|床上用品)/.test(name)) return "bedding";
  if (/(婴儿床|尿布台|置物小推车)/.test(name)) return "furniture";
  if (/(安全座椅|推车|返家交通|车辆|停车|接送)/.test(name) || item.bag === "car") {
    return "transport";
  }
  if (/(水杯|吸管|水和零食|补能食品|饮料|餐具|饭盒|筷勺)/.test(name)) {
    return "food";
  }
  if (/(妈咪包|收纳袋|脏衣袋|妈妈包|宝宝包|证件包)/.test(name)) return "bag";
  if (/(夜灯|眼罩)/.test(name)) return "sleep";
  if (/(黑白卡|安抚)/.test(name)) return "baby-care";
  if (/(确认|安排|通知|放到固定位置|清单)/.test(name)) return "task";
  if (item.category === "documents") return "document";
  if (item.category === "going_home") return "home";
  if (item.category === "partner" || item.category === "last_minute") return "task";
  if (item.category === "baby" || item.category === "confinement_baby") return "baby-care";
  return "package";
}

function stableHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createBuiltinDescriptor(
  item: (typeof generalTemplate)[number],
  index: number,
): ChecklistIllustrationDescriptor {
  const family = inferChecklistIllustrationFamily(item);
  const paletteIndex = index % CHECKLIST_ILLUSTRATION_PALETTES.length;
  const markerCode = index + 1;
  const variant = Math.floor(index / CHECKLIST_ILLUSTRATION_PALETTES.length) % 9;
  const compositionSymbol =
    CHECKLIST_ILLUSTRATION_SYMBOLS[
      index % CHECKLIST_ILLUSTRATION_SYMBOLS.length
    ];
  const symbolPlacement =
    CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS[
      Math.floor(index / CHECKLIST_ILLUSTRATION_SYMBOLS.length) %
        CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS.length
    ];
  const compositionFrame =
    CHECKLIST_ILLUSTRATION_FRAMES[
      Math.floor(
        index /
          (CHECKLIST_ILLUSTRATION_SYMBOLS.length *
            CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS.length),
      ) % CHECKLIST_ILLUSTRATION_FRAMES.length
    ];
  const compositionKey = `${compositionFrame}:${compositionSymbol}:${symbolPlacement}`;

  return Object.freeze({
    artKey: item.id,
    compositionFrame,
    compositionKey,
    compositionSymbol,
    family,
    markerCode,
    palette: CHECKLIST_ILLUSTRATION_PALETTES[paletteIndex],
    paletteIndex,
    scope: "builtin" as const,
    signature: `${item.id}:${family}:${compositionKey}:p${paletteIndex}`,
    symbolPlacement,
    variant,
  });
}

/**
 * One in-memory, inline-safe registry for every bundled checklist item.
 * No image URL is stored or requested: the descriptor drives a single SVG renderer.
 */
export const GENERAL_CHECKLIST_ILLUSTRATION_REGISTRY: Readonly<
  Record<string, ChecklistIllustrationDescriptor>
> = Object.freeze(
  Object.fromEntries(
    generalTemplate.map((item, index) => [item.id, createBuiltinDescriptor(item, index)]),
  ),
);

export function isKnownChecklistIllustrationId(id: string) {
  return Object.prototype.hasOwnProperty.call(
    GENERAL_CHECKLIST_ILLUSTRATION_REGISTRY,
    id,
  );
}

export function getChecklistIllustrationDescriptor(
  item: IllustrationInput,
): ChecklistIllustrationDescriptor {
  const builtIn = GENERAL_CHECKLIST_ILLUSTRATION_REGISTRY[item.id];
  if (builtIn) return builtIn;

  const family = inferChecklistIllustrationFamily(item);
  const hash = stableHash(`${item.category}:${item.name}`);
  const paletteIndex = hash % CHECKLIST_ILLUSTRATION_PALETTES.length;
  const compositionSymbol =
    CHECKLIST_ILLUSTRATION_SYMBOLS[hash % CHECKLIST_ILLUSTRATION_SYMBOLS.length];
  const symbolPlacement =
    CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS[
      Math.floor(hash / CHECKLIST_ILLUSTRATION_SYMBOLS.length) %
        CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS.length
    ];
  const compositionFrame =
    CHECKLIST_ILLUSTRATION_FRAMES[
      Math.floor(
        hash /
          (CHECKLIST_ILLUSTRATION_SYMBOLS.length *
            CHECKLIST_ILLUSTRATION_SYMBOL_PLACEMENTS.length),
      ) % CHECKLIST_ILLUSTRATION_FRAMES.length
    ];
  const compositionKey = `${compositionFrame}:${compositionSymbol}:${symbolPlacement}`;

  return {
    artKey: `custom:${hash.toString(36)}`,
    compositionFrame,
    compositionKey,
    compositionSymbol,
    family,
    markerCode: (hash % 215) + 1,
    palette: CHECKLIST_ILLUSTRATION_PALETTES[paletteIndex],
    paletteIndex,
    scope: "custom",
    signature: `custom:${family}:${hash.toString(36)}`,
    symbolPlacement,
    variant: Math.floor(hash / CHECKLIST_ILLUSTRATION_PALETTES.length) % 9,
  };
}

export type ChecklistIllustrationItem = Pick<
  ChecklistItem,
  "category" | "id" | "name"
> & {
  bag?: ChecklistBag;
  source?: ChecklistItem["source"];
};

export type ChecklistIllustrationCategory = ChecklistCategory;
