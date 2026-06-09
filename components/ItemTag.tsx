import { Badge } from "@/components/ui/badge";
import type { ChecklistItem } from "@/lib/types";

type ItemTagProps = {
  item: ChecklistItem;
};

export function ItemTag({ item }: ItemTagProps) {
  const itemKind = item.itemKind ?? "item";
  const kindTag =
    itemKind === "task" ? (
      <Badge className="bg-secondary text-primary">任务</Badge>
    ) : itemKind === "question" ? (
      <Badge className="bg-amber-soft text-amber-foreground">问题</Badge>
    ) : null;

  if (item.status === "hospital_provided") {
    return (
      <>
        <Badge variant="calm">医院提供</Badge>
        {kindTag}
      </>
    );
  }

  if (item.status === "last_minute" || item.bag === "last_minute") {
    return (
      <>
        <Badge className="bg-coral-soft text-coral-foreground">临出门</Badge>
        {kindTag}
      </>
    );
  }

  if (item.packTier === "confirm" || item.itemKind === "question") {
    return (
      <>
        <Badge className="bg-amber-soft text-amber-foreground">待确认</Badge>
        {kindTag}
      </>
    );
  }

  if (item.packTier === "core") {
    return (
      <>
        <Badge variant="soft">核心</Badge>
        {kindTag}
      </>
    );
  }

  if (item.packTier === "hidden") {
    return (
      <>
        <Badge variant="outline">完整模式</Badge>
        {kindTag}
      </>
    );
  }

  return (
    <>
      <Badge variant="outline">可选</Badge>
      {kindTag}
    </>
  );
}
