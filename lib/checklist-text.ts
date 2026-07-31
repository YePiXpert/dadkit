import {
  CHECKLIST_SECTIONS,
  getChecklistItemState,
  getChecklistSection,
} from "@/lib/checklist-v2";
import type { ChecklistItem } from "@/lib/types";

function getTextStatus(item: ChecklistItem) {
  const state = getChecklistItemState(item);

  if (state === "packed") return "☑";
  if (state === "not_needed") return "⊘";
  return "☐";
}

export function formatChecklistAsText(items: ChecklistItem[]) {
  const sections = CHECKLIST_SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => getChecklistSection(item) === section.id),
  })).filter((section) => section.items.length > 0);

  return sections
    .map((section) => {
      const rows = section.items.map((item) => {
        const quantity = item.quantity?.trim() ? ` · ${item.quantity.trim()}` : "";
        const skipped = getChecklistItemState(item) === "not_needed" ? "（不需要）" : "";

        return `${getTextStatus(item)} ${item.name}${quantity}${skipped}`;
      });

      return `${section.label}\n${rows.join("\n")}`;
    })
    .join("\n\n");
}
