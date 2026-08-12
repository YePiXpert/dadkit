"use client";

import { useEffect, useRef } from "react";

export function shouldInitializeOpenDraft(
  wasOpen: boolean,
  open: boolean,
  previousKey: string | null | undefined,
  key: string | null | undefined,
) {
  return open && (!wasOpen || previousKey !== key);
}

/**
 * Initializes a local form draft only when a dialog opens or switches to a
 * different entity. Store updates for the currently open entity must not
 * replace unsaved user input.
 */
export function useOpenDraftInitializer(
  open: boolean,
  key: string | null | undefined,
  initialize: () => void,
) {
  const wasOpenRef = useRef(false);
  const previousKeyRef = useRef<string | null | undefined>(undefined);
  const initializeRef = useRef(initialize);
  initializeRef.current = initialize;

  useEffect(() => {
    if (
      shouldInitializeOpenDraft(
        wasOpenRef.current,
        open,
        previousKeyRef.current,
        key,
      )
    ) {
      initializeRef.current();
    }

    wasOpenRef.current = open;
    if (open) previousKeyRef.current = key;
  }, [key, open]);
}
