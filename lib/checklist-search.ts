import type { ChecklistItem } from "@/lib/types";

export function normalizeChecklistSearch(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

export function matchesChecklistSearch(item: ChecklistItem, query: string) {
  const normalizedQuery = normalizeChecklistSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  return [item.name, item.note ?? ""].some((value) =>
    normalizeChecklistSearch(value).includes(normalizedQuery),
  );
}
