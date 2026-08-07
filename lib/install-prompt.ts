"use client";

export const INSTALL_PROMPT_DISMISS_KEY = "dadkit-install-prompt-dismissed";
export const OPEN_INSTALL_PROMPT_EVENT = "dadkit:open-install-prompt";
export const INSTALL_STATUS_CHANGED_EVENT =
  "dadkit:pwa-install-status-changed";

let installedThisSession = false;
let installPromptAvailableThisSession = false;

export type PwaInstallSignals = {
  displayModeStandalone: boolean;
  navigatorStandalone: boolean;
  installedThisSession: boolean;
};

export function resolvePwaInstalled({
  displayModeStandalone,
  navigatorStandalone,
  installedThisSession,
}: PwaInstallSignals) {
  return (
    displayModeStandalone || navigatorStandalone || installedThisSession
  );
}

export function isIosInstallGuideAvailable() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigator = window.navigator;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIosSafariBrowser() {
  if (typeof window === "undefined" || !isIosInstallGuideAvailable()) {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  return /safari/i.test(userAgent) && !/(crios|fxios|edgios)/i.test(userAgent);
}

export function isPwaInstallAvailable() {
  return installPromptAvailableThisSession || isIosInstallGuideAvailable();
}

export function setPwaInstallPromptAvailable(available: boolean) {
  if (installPromptAvailableThisSession === available) {
    return;
  }

  installPromptAvailableThisSession = available;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INSTALL_STATUS_CHANGED_EVENT));
  }
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isPwaInstalled() {
  if (typeof window === "undefined") {
    return false;
  }

  return resolvePwaInstalled({
    displayModeStandalone: window.matchMedia("(display-mode: standalone)")
      .matches,
    navigatorStandalone:
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true,
    installedThisSession,
  });
}

export function markPwaInstalled() {
  if (typeof window === "undefined") {
    return;
  }

  installedThisSession = true;
  window.dispatchEvent(new Event(INSTALL_STATUS_CHANGED_EVENT));
}

export function clearPwaInstalledSession() {
  if (typeof window === "undefined") {
    return;
  }

  installedThisSession = false;
  window.dispatchEvent(new Event(INSTALL_STATUS_CHANGED_EVENT));
}

export function openInstallPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(OPEN_INSTALL_PROMPT_EVENT));
}
