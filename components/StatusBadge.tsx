import { Badge } from "@/components/ui/badge";
import { getStatusLabelForItem } from "@/lib/preparation";
import {
  COMPLETED_STATUSES,
  getStatusLabel,
  type ChecklistItem,
  type ItemKind,
  type PackStatus,
} from "@/lib/types";

type StatusBadgeProps = {
  item?: ChecklistItem;
  itemKind?: ItemKind;
  status: PackStatus;
};

export function StatusBadge({ item, itemKind = "item", status }: StatusBadgeProps) {
  const variant =
    COMPLETED_STATUSES.includes(status)
      ? "calm"
      : status === "last_minute"
        ? "soft"
        : "outline";
  const label = item
    ? getStatusLabelForItem(status, item)
    : getStatusLabel(status, itemKind);

  return <Badge variant={variant}>{label}</Badge>;
}
