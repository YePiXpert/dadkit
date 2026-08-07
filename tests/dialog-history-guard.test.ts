import { describe, expect, it, vi } from "vitest";

import {
  createDialogHistoryGuard,
  type DialogHistoryBrowser,
} from "@/lib/use-dialog-history-guard";

function fakeBrowser() {
  let popStateListener: (() => void) | undefined;
  const history = {
    back: vi.fn(),
    pushState: vi.fn((data: unknown) => {
      history.state = data;
    }),
    state: { page: "checklist" } as unknown,
  };
  const browser: DialogHistoryBrowser = {
    addEventListener: vi.fn((_type, listener) => {
      popStateListener = listener;
    }),
    history,
    removeEventListener: vi.fn(),
  };
  return { browser, history, pop: () => popStateListener?.() };
}

describe("dialog history guard", () => {
  it("turns a browser back gesture into one dialog close", () => {
    const { browser, history, pop } = fakeBrowser();
    const close = vi.fn();
    const cleanup = createDialogHistoryGuard(close, browser);

    expect(history.pushState).toHaveBeenCalledOnce();
    expect(history.state).toMatchObject({ page: "checklist" });
    pop();
    pop();
    expect(close).toHaveBeenCalledOnce();

    cleanup();
    expect(history.back).not.toHaveBeenCalled();
  });

  it("removes its marker when the dialog closes normally", () => {
    const { browser, history } = fakeBrowser();
    const cleanup = createDialogHistoryGuard(vi.fn(), browser);

    cleanup();

    expect(history.back).toHaveBeenCalledOnce();
    expect(browser.removeEventListener).toHaveBeenCalledOnce();
  });
});
