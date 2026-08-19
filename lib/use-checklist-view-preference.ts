"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export type ChecklistViewMode = "cards" | "list";

export const CHECKLIST_VIEW_PREFERENCE_KEY =
  "dadkit:ui:checklist:view-mode";

const CHECKLIST_VIEW_PREFERENCE_EVENT =
  "dadkit:checklist-view-preference-change";
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function readChecklistViewPreference(): ChecklistViewMode {
  if (typeof window === "undefined") return "cards";

  try {
    return window.localStorage.getItem(CHECKLIST_VIEW_PREFERENCE_KEY) === "list"
      ? "list"
      : "cards";
  } catch {
    return "cards";
  }
}

function writeChecklistViewPreference(viewMode: ChecklistViewMode) {
  try {
    window.localStorage.setItem(CHECKLIST_VIEW_PREFERENCE_KEY, viewMode);
    window.dispatchEvent(new Event(CHECKLIST_VIEW_PREFERENCE_EVENT));
  } catch {
    // The optional UI preference still works for the current session.
  }
}

export function useChecklistViewPreference() {
  const [viewMode, setViewModeState] = useState<ChecklistViewMode>("cards");

  useClientLayoutEffect(() => {
    const syncPreference = () => {
      setViewModeState(readChecklistViewPreference());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CHECKLIST_VIEW_PREFERENCE_KEY) {
        syncPreference();
      }
    };

    syncPreference();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHECKLIST_VIEW_PREFERENCE_EVENT, syncPreference);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        CHECKLIST_VIEW_PREFERENCE_EVENT,
        syncPreference,
      );
    };
  }, []);

  const setViewMode = useCallback((mode: ChecklistViewMode) => {
    setViewModeState(mode);
    writeChecklistViewPreference(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === "cards" ? "list" : "cards");
  }, [setViewMode, viewMode]);

  return {
    setViewMode,
    toggleViewMode,
    viewMode,
  };
}
