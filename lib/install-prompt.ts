"use client";

export const INSTALL_PROMPT_DISMISS_KEY = "dadkit-install-prompt-dismissed";
export const OPEN_INSTALL_PROMPT_EVENT = "dadkit:open-install-prompt";

export function openInstallPrompt() {
  window.dispatchEvent(new Event(OPEN_INSTALL_PROMPT_EVENT));
}
