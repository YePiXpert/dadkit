const CHECKLIST_KEY = "dadkit:v3:checklist";
const CHECKLIST_MODE_KEY = "dadkit:v3:checklist-mode";

type StoredChecklistItem = {
  bag?: string;
  itemKind?: string;
  packTier?: string;
  source?: string;
  status?: string;
  category?: string;
};

function readStoredChecklist() {
  if (typeof window === "undefined") {
    return [] as StoredChecklistItem[];
  }

  try {
    const value = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) ?? "[]");
    return Array.isArray(value) ? (value as StoredChecklistItem[]) : [];
  } catch {
    return [] as StoredChecklistItem[];
  }
}

function readChecklistMode() {
  return typeof window !== "undefined" &&
    window.localStorage.getItem(CHECKLIST_MODE_KEY) === "full"
    ? "full"
    : "lean";
}

/** A small, storage-only counterpart of the home-page packing-progress rule. */
export function getStoredPackingPercent() {
  const mode = readChecklistMode();
  let total = 0;
  let completed = 0;

  for (const item of readStoredChecklist()) {
    if (
      mode !== "full" &&
      item.packTier !== "core" &&
      item.packTier !== "confirm" &&
      item.source !== "user" &&
      item.status === "todo"
    ) {
      continue;
    }

    if (
      item.itemKind !== "item" ||
      item.category === "last_minute" ||
      item.bag === "none" ||
      item.bag === "car" ||
      item.status === "not_needed"
    ) {
      continue;
    }

    total += 1;
    if (item.status === "packed") {
      completed += 1;
    }
  }

  return total === 0 ? 0 : Math.round((completed / total) * 100);
}
