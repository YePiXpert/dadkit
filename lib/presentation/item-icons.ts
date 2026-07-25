import type { ChecklistBag, ChecklistItem } from "@/lib/types";

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
