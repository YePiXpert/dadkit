import { Badge } from "@/components/ui/badge";
import type { ChecklistItem } from "@/lib/types";

type ItemTagProps = {
  item: ChecklistItem;
};

export function ItemTag({ item }: ItemTagProps) {
  if (item.status === "hospital_provided") {
    return <Badge variant="calm">医院提供</Badge>;
  }

  if (item.status === "last_minute" || item.bag === "last_minute") {
    return <Badge className="bg-coral-soft text-coral-foreground">临出门</Badge>;
  }

  if (item.packTier === "confirm" || item.itemKind === "question") {
    return <Badge className="bg-amber-soft text-amber-foreground">待确认</Badge>;
  }

  if (item.packTier === "core") {
    return <Badge variant="soft">核心</Badge>;
  }

  if (item.packTier === "hidden") {
    return <Badge variant="outline">完整模式</Badge>;
  }

  return <Badge variant="outline">可选</Badge>;
}
