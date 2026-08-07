"use client";

import { useEffect, useRef } from "react";

const DIALOG_HISTORY_KEY = "__dadkitDialogGuard";
let dialogHistorySequence = 0;

export type DialogHistoryBrowser = {
  addEventListener: (type: "popstate", listener: () => void) => void;
  history: {
    back: () => void;
    pushState: (data: unknown, unused: string) => void;
    state: unknown;
  };
  removeEventListener: (type: "popstate", listener: () => void) => void;
};

export function createDialogHistoryGuard(
  onBack: () => void,
  browser: DialogHistoryBrowser = window,
) {
  const currentState = isStateRecord(browser.history.state)
    ? browser.history.state
    : {};
  const existingMarker = currentState[DIALOG_HISTORY_KEY];
  const marker =
    typeof existingMarker === "string"
      ? existingMarker
      : `dialog-${++dialogHistorySequence}`;
  let active = true;

  if (typeof existingMarker !== "string") {
    browser.history.pushState(
      { ...currentState, [DIALOG_HISTORY_KEY]: marker },
      "",
    );
  }

  function handlePopState() {
    if (!active) return;
    active = false;
    onBack();
  }

  browser.addEventListener("popstate", handlePopState);

  return (restorePreviousEntry = true) => {
    browser.removeEventListener("popstate", handlePopState);
    if (
      restorePreviousEntry &&
      active &&
      isStateRecord(browser.history.state) &&
      browser.history.state[DIALOG_HISTORY_KEY] === marker
    ) {
      active = false;
      browser.history.back();
    }
  };
}

export function useDialogHistoryGuard(open: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  const openRef = useRef(open);
  onBackRef.current = onBack;
  openRef.current = open;

  useEffect(() => {
    if (!open) return;
    const cleanup = createDialogHistoryGuard(() => onBackRef.current());
    return () => cleanup(!openRef.current);
  }, [open]);
}

function isStateRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
