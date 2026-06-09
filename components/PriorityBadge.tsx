import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, type Priority } from "@/lib/types";

type PriorityBadgeProps = {
  priority: Priority;
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const variant =
    priority === "must" ? "soft" : priority === "recommended" ? "calm" : "outline";

  return <Badge variant={variant}>{PRIORITY_LABELS[priority]}</Badge>;
}
