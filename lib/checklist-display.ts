import type {
  ChecklistSectionId,
  ChecklistView,
} from "@/lib/checklist-v2";

/**
 * Turns slash-separated alternatives into natural Chinese for display only.
 * Stored checklist values are deliberately left untouched.
 */
type ChecklistDisplayTextOptions = {
  transformAlternatives?: boolean;
};

export function formatChecklistDisplayText(
  value?: string,
  { transformAlternatives = true }: ChecklistDisplayTextOptions = {},
) {
  if (!value || !transformAlternatives) return value ?? "";

  const parts = value
    .split(/\s*[\/／]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return value;
  if (parts.length === 2) return `${parts[0]}或${parts[1]}`;

  return `${parts.slice(0, -1).join("、")}或${parts.at(-1)}`;
}

export function preserveChecklistStorageText(
  displayedValue: string,
  storedValue?: string,
  options?: ChecklistDisplayTextOptions,
) {
  return displayedValue === formatChecklistDisplayText(storedValue, options)
    ? storedValue
    : displayedValue;
}

export function getChecklistSectionHref(
  sectionId: ChecklistSectionId,
  query = "",
) {
  return appendQuery(`/checklist/${sectionId}`, query);
}

export function getChecklistHomeHref(query = "") {
  return appendQuery("/", query);
}

export function setChecklistViewInQuery(query: string, view: ChecklistView) {
  const params = new URLSearchParams(normalizeQuery(query));

  if (view === "all") {
    params.delete("view");
  } else {
    params.set("view", view);
  }

  return params.toString();
}

function appendQuery(pathname: string, query: string) {
  const normalized = normalizeQuery(query);
  return normalized ? `${pathname}?${normalized}` : pathname;
}

function normalizeQuery(query: string) {
  return query.startsWith("?") ? query.slice(1) : query;
}
