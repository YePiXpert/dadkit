"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export const CHECKLIST_DESCRIPTION_PREFERENCE_KEY =
  "dadkit:ui:checklist:show-full-descriptions";

const CHECKLIST_DESCRIPTION_PREFERENCE_EVENT =
  "dadkit:checklist-description-preference-change";
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function readChecklistDescriptionPreference() {
  if (typeof window === "undefined") return true;

  try {
    return (
      window.localStorage.getItem(CHECKLIST_DESCRIPTION_PREFERENCE_KEY) !==
      "false"
    );
  } catch {
    return true;
  }
}

function writeChecklistDescriptionPreference(showFullDescriptions: boolean) {
  try {
    window.localStorage.setItem(
      CHECKLIST_DESCRIPTION_PREFERENCE_KEY,
      String(showFullDescriptions),
    );
    window.dispatchEvent(new Event(CHECKLIST_DESCRIPTION_PREFERENCE_EVENT));
  } catch {
    // The optional UI preference still works for the current session.
  }
}

export function useChecklistDescriptionPreference() {
  const [showFullDescriptions, setShowFullDescriptionsState] = useState(true);

  useClientLayoutEffect(() => {
    const syncPreference = () => {
      setShowFullDescriptionsState(readChecklistDescriptionPreference());
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === CHECKLIST_DESCRIPTION_PREFERENCE_KEY
      ) {
        syncPreference();
      }
    };

    syncPreference();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      CHECKLIST_DESCRIPTION_PREFERENCE_EVENT,
      syncPreference,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        CHECKLIST_DESCRIPTION_PREFERENCE_EVENT,
        syncPreference,
      );
    };
  }, []);

  const setShowFullDescriptions = useCallback((show: boolean) => {
    setShowFullDescriptionsState(show);
    writeChecklistDescriptionPreference(show);
  }, []);

  const toggleShowFullDescriptions = useCallback(() => {
    setShowFullDescriptionsState((current) => {
      const next = !current;
      writeChecklistDescriptionPreference(next);
      return next;
    });
  }, []);

  return {
    showFullDescriptions,
    setShowFullDescriptions,
    toggleShowFullDescriptions,
  };
}
