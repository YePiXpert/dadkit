import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DATA_CHANGE_SIGNAL_KEY,
  publishDataChange,
  subscribeToDataChanges,
  type DataChangeMessage,
} from "@/lib/data/change-bus";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cross-tab data change bus", () => {
  it("delivers domain-only storage signals from another tab", () => {
    let storageListener: ((event: { key: string; newValue: string }) => void) | undefined;
    const setItem = vi.fn();
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: typeof storageListener) => {
        if (type === "storage") storageListener = listener;
      }),
      localStorage: { setItem },
    });
    const received: DataChangeMessage[] = [];
    const unsubscribe = subscribeToDataChanges((message) => received.push(message));

    storageListener?.({
      key: DATA_CHANGE_SIGNAL_KEY,
      newValue: JSON.stringify({
        domain: "hospital",
        entityId: "profile",
        sourceId: "another-tab",
        version: 12,
      }),
    });

    expect(received).toEqual([
      {
        domain: "hospital",
        entityId: "profile",
        sourceId: "another-tab",
        version: 12,
      },
    ]);
    expect(JSON.stringify(received)).not.toContain("市妇幼");
    unsubscribe();
  });

  it("never lets a partial browser mock make a successful write fail", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });

    expect(() => publishDataChange("checklist", "item-a")).not.toThrow();
    expect(setItem).not.toHaveBeenCalled();
  });
});
