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

  it("uses redundant transports and deduplicates the received message", async () => {
    vi.resetModules();
    let broadcastListener:
      | ((event: { data: DataChangeMessage }) => void)
      | undefined;
    let storageListener:
      | ((event: { key: string; newValue: string }) => void)
      | undefined;
    const postMessage = vi.fn();
    const setItem = vi.fn();

    class MockBroadcastChannel {
      constructor() {}

      addEventListener(
        type: string,
        listener: (event: { data: DataChangeMessage }) => void,
      ) {
        if (type === "message") broadcastListener = listener;
      }

      postMessage(message: DataChangeMessage) {
        postMessage(message);
      }
    }

    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: typeof storageListener) => {
        if (type === "storage") storageListener = listener;
      }),
      localStorage: { setItem },
    });

    const changeBus = await import("@/lib/data/change-bus");
    const received: DataChangeMessage[] = [];
    changeBus.subscribeToDataChanges((message) => received.push(message));
    changeBus.publishDataChange("checklist", "item-a");

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(
      changeBus.DATA_CHANGE_SIGNAL_KEY,
      expect.any(String),
    );

    const external: DataChangeMessage = {
      domain: "checklist",
      entityId: "item-b",
      sourceId: "another-tab",
      version: 42,
    };
    broadcastListener?.({ data: external });
    storageListener?.({
      key: changeBus.DATA_CHANGE_SIGNAL_KEY,
      newValue: JSON.stringify(external),
    });

    expect(received).toEqual([external]);
  });
});
