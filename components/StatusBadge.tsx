import { Badge } from "@/components/ui/badge";
import {
  COMPLETED_STATUSES,
  getStatusLabel,
  type ItemKind,
  type PackStatus,
} from "@/lib/types";

type StatusBadgeProps = {
  itemKind?: ItemKind;
  status: PackStatus;
};

export function StatusBadge({ itemKind = "item", status }: StatusBadgeProps) {
  const variant =
    COMPLETED_STATUSES.includes(status)
      ? "calm"
      : status === "last_minute"
        ? "soft"
        : "outline";

  return <Badge variant={variant}>{getStatusLabel(status, itemKind)}</Badge>;
}
