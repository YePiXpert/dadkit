import { Badge } from "@/components/ui/badge";
import type { ChecklistItem } from "@/lib/types";

type ItemTagProps = {
  item: ChecklistItem;
};

export function ItemTag({ item }: ItemTagProps) {
  const itemKind = item.itemKind ?? "item";
  const kindTag =
    itemKind === "task" ? (
      <Badge variant="outline">任务</Badge>
    ) : itemKind === "question" ? (
      <Badge variant="warning">问题</Badge>
    ) : null;

  if (item.status === "hospital_provided") {
    return (
      <>
        <Badge variant="success">医院提供</Badge>
        {kindTag}
      </>
    );
  }

  if (item.status === "last_minute" || item.bag === "last_minute") {
    return (
      <>
        <Badge variant="warning">临出门</Badge>
        {kindTag}
      </>
    );
  }

  if (item.packTier === "confirm" || item.itemKind === "question") {
    return (
      <>
        <Badge variant="warning">待确认</Badge>
        {kindTag}
      </>
    );
  }

  if (item.packTier === "core") {
    return (
      <>
        <Badge variant="secondary">核心</Badge>
        {kindTag}
      </>
    );
  }

  if (item.packTier === "hidden") {
    return (
      <>
        <Badge variant="muted">完整模式</Badge>
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
