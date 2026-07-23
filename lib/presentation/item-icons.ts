import {
  Activity,
  AlarmClock,
  Apple,
  Armchair,
  Baby,
  Backpack,
  Bandage,
  Banknote,
  BatteryCharging,
  BedDouble,
  BedSingle,
  BookMarked,
  BookOpen,
  BookUser,
  Brush,
  Cable,
  CarFront,
  CircleHelp,
  CircleParking,
  ClipboardCheck,
  Cloud,
  ContactRound,
  Cookie,
  CreditCard,
  Cross,
  CupSoda,
  DoorOpen,
  Droplet,
  Droplets,
  EyeClosed,
  Fan,
  FileCheck,
  FileText,
  FolderOpen,
  Footprints,
  GlassWater,
  Glasses,
  Hand,
  HandHeart,
  Headphones,
  Heart,
  HeartHandshake,
  HeartPulse,
  IdCard,
  Landmark,
  Layers,
  MessageSquare,
  Milk,
  Moon,
  NotebookPen,
  Package,
  PackageCheck,
  PhoneCall,
  Pill,
  PillBottle,
  PlugZap,
  Receipt,
  RectangleHorizontal,
  Scale,
  Scissors,
  Shield,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShowerHead,
  Smartphone,
  Snowflake,
  Sparkles,
  Sun,
  Toilet,
  UtensilsCrossed,
  Wallet,
  WashingMachine,
  Waves,
  type LucideIcon,
} from "lucide-react";

import type {
  ChecklistBag,
  ChecklistCategory,
  ChecklistItem,
  ItemKind,
} from "@/lib/types";

/**
 * Per-item icon overrides keyed by template item id. Custom user items and
 * template items without an override fall back to item-kind, then category.
 */
const ITEM_ICON_OVERRIDES: Record<string, LucideIcon> = {
  // documents
  "general-doc-id": IdCard,
  "general-doc-medical-card": CreditCard,
  "general-doc-prenatal-records": BookOpen,
  "general-doc-admission": FileCheck,
  "general-doc-birth-plan": NotebookPen,
  "general-doc-cash": Banknote,
  "general-doc-marriage-cert": HeartHandshake,
  "general-doc-hukou": BookUser,
  "general-doc-birth-registration": FileText,
  "general-doc-bank-card": Landmark,
  // mom_labor
  "general-labor-phone": Smartphone,
  "general-labor-long-cable": Cable,
  "general-labor-toiletries": ShowerHead,
  "general-labor-lip-balm": Droplet,
  "general-labor-cup": GlassWater,
  "general-labor-eye-mask": EyeClosed,
  "general-labor-pillow": BedSingle,
  "general-labor-cooling": Fan,
  "general-labor-relaxation": Headphones,
  "general-labor-tens": Activity,
  "general-labor-slippers": Footprints,
  "general-labor-glasses": Glasses,
  "general-labor-medicine-list": Pill,
  "general-labor-power-bank": BatteryCharging,
  "general-labor-energy-food": Cookie,
  "general-labor-towels": WashingMachine,
  "general-labor-clothes": Shirt,
  "general-labor-socks": Package,
  "general-labor-tissues": Droplets,
  "general-labor-ctg-belt": HeartPulse,
  "general-labor-straws": CupSoda,
  "general-labor-tableware": UtensilsCrossed,
  "general-labor-moon-toothbrush": Brush,
  // mom_postpartum
  "general-postpartum-pads": Layers,
  "general-postpartum-paper": Receipt,
  "general-postpartum-metered-pads": Scale,
  "general-postpartum-underwear": PackageCheck,
  "general-postpartum-toilet-seat-covers": Toilet,
  "general-postpartum-yuezi-hat-shoes": Moon,
  "general-postpartum-going-home-clothes": Shirt,
  "general-postpartum-storage-bags": Package,
  "general-postpartum-nursing-bra": Heart,
  "general-postpartum-breast-pads": Droplets,
  "general-postpartum-nipple-cream": PillBottle,
  "general-postpartum-pull-up-pants": ShieldCheck,
  "general-postpartum-peri-bottle": Waves,
  "general-postpartum-belly-wrap": Bandage,
  "general-postpartum-breast-pump": Milk,
  "general-postpartum-milk-bags": Snowflake,
  // baby
  "general-baby-home-clothes": Shirt,
  "general-baby-blanket": Cloud,
  "general-baby-diapers": Baby,
  "general-baby-wipes": Sparkles,
  "general-baby-hat": Sun,
  "general-baby-socks": Footprints,
  "general-baby-hospital-clothes": Shirt,
  "general-baby-towels": Layers,
  "general-baby-diaper-cream": Shield,
  "general-baby-changing-pads": RectangleHorizontal,
  "general-baby-formula-bottle": Milk,
  "general-baby-nail-clipper": Scissors,
  "general-baby-navel-care": Cross,
  "general-baby-cotton-swabs": Brush,
  "general-baby-lotion": Hand,
  "general-baby-bottle-brush": WashingMachine,
  // partner
  "general-partner-save-phone": PhoneCall,
  "general-partner-night-entrance": DoorOpen,
  "general-partner-parking-plan": CircleParking,
  "general-partner-doc-folder": FolderOpen,
  "general-partner-payment": Wallet,
  "general-partner-car-seat": Armchair,
  "general-partner-family-notice": MessageSquare,
  "general-partner-id": ContactRound,
  "general-partner-charger": PlugZap,
  "general-partner-water-snacks": Apple,
  "general-partner-clothes": Shirt,
  "general-partner-toiletries": ShowerHead,
  "general-partner-glasses": Glasses,
  "general-partner-medicine-list": Pill,
  "general-partner-bedding": BedDouble,
  // going_home
  "general-going-home-mom-clothes": Shirt,
  "general-going-home-baby-clothes": Shirt,
  "general-going-home-blanket": Cloud,
  "general-going-home-transport": CarFront,
  "general-going-home-car-seat": Armchair,
  // last_minute
  "general-last-id": IdCard,
  "general-last-medical-card": CreditCard,
  "general-last-maternal-book": BookMarked,
  "general-last-prenatal-records": BookOpen,
  "general-last-phone": Smartphone,
  "general-last-charger": PlugZap,
  "general-last-mom-bag": ShoppingBag,
  "general-last-baby-bag": Backpack,
  "general-last-medicine-list": Pill,
  "general-last-glasses": Glasses,
  "general-last-payment": Wallet,
  "general-last-car-seat": Armchair,
};

const ITEM_KIND_ICON_FALLBACK: Partial<Record<ItemKind, LucideIcon>> = {
  question: CircleHelp,
  task: ClipboardCheck,
};

const CATEGORY_ICON_FALLBACK: Record<ChecklistCategory, LucideIcon> = {
  documents: FolderOpen,
  mom_labor: Package,
  mom_postpartum: HandHeart,
  baby: Baby,
  partner: ClipboardCheck,
  going_home: CarFront,
  hospital_questions: CircleHelp,
  last_minute: AlarmClock,
};

export function getChecklistItemIcon(item: ChecklistItem): LucideIcon {
  return (
    ITEM_ICON_OVERRIDES[item.id] ??
    ITEM_KIND_ICON_FALLBACK[item.itemKind ?? "item"] ??
    CATEGORY_ICON_FALLBACK[item.category] ??
    Package
  );
}

export type ItemTileTone =
  | "mom"
  | "baby"
  | "docs"
  | "dad"
  | "car"
  | "lastminute"
  | "default";

const BAG_TILE_TONE: Record<ChecklistBag, ItemTileTone> = {
  documents_folder: "docs",
  mom_bag: "mom",
  baby_bag: "baby",
  dad_backpack: "dad",
  car: "car",
  last_minute: "lastminute",
  none: "default",
};

export function getItemTileTone(item: ChecklistItem): ItemTileTone {
  return BAG_TILE_TONE[item.bag ?? "none"];
}

export const ITEM_TILE_TONE_STYLES: Record<
  ItemTileTone,
  { backgroundColor: string; color: string }
> = {
  mom: {
    backgroundColor: "hsl(var(--tile-mom-bg))",
    color: "hsl(var(--tile-mom-fg))",
  },
  baby: {
    backgroundColor: "hsl(var(--tile-baby-bg))",
    color: "hsl(var(--tile-baby-fg))",
  },
  docs: {
    backgroundColor: "hsl(var(--tile-docs-bg))",
    color: "hsl(var(--tile-docs-fg))",
  },
  dad: {
    backgroundColor: "hsl(var(--tile-dad-bg))",
    color: "hsl(var(--tile-dad-fg))",
  },
  car: {
    backgroundColor: "hsl(var(--tile-car-bg))",
    color: "hsl(var(--tile-car-fg))",
  },
  lastminute: {
    backgroundColor: "hsl(var(--tile-lastminute-bg))",
    color: "hsl(var(--tile-lastminute-fg))",
  },
  default: {
    backgroundColor: "hsl(var(--muted))",
    color: "hsl(var(--muted-foreground))",
  },
};
