import type { DataChangeOrigin } from "@/lib/data/action-result";
import type { ChecklistItem, ChecklistMode } from "@/lib/types";

export type ChecklistRuntimeDocument = {
  checklist: ChecklistItem[];
  checklistMode: ChecklistMode;
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
};

type ChecklistRuntimeHandler = (
  document: ChecklistRuntimeDocument,
  origin: DataChangeOrigin,
) => void;

let runtimeHandler: ChecklistRuntimeHandler | undefined;

export function registerChecklistRuntimeHandler(
  handler: ChecklistRuntimeHandler,
) {
  runtimeHandler = handler;
}

export function applyChecklistRuntimeDocument(
  document: ChecklistRuntimeDocument,
  origin: DataChangeOrigin,
) {
  try {
    runtimeHandler?.(document, origin);
  } catch {
    // Persistence has already committed; a mounted store can rehydrate later.
  }
}
