import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DATA_CHANGE_SIGNAL_KEY,
  publishDataChange,
  subscribeToDataChanges,
  type DataChangeMessage,
} from "@/lib/data/change-bus";

afterEach(() => {
  vi.useRealTimers();
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
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(setItem).toHaveBeenNthCalledWith(
      1,
      changeBus.DATA_CHANGE_SIGNAL_KEY,
      expect.any(String),
    );
    expect(setItem).toHaveBeenNthCalledWith(
      2,
      `${changeBus.DATA_CHANGE_SIGNAL_KEY}:checklist`,
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

  it("replays the retained signal when a tab subscribes after it was published", async () => {
    vi.resetModules();
    let storageListener:
      | ((event: { key: string; newValue: string }) => void)
      | undefined;
    let retained: DataChangeMessage = {
      domain: "checklist",
      entityId: "late-item",
      sourceId: "already-open-tab",
      version: 84,
    };

    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: typeof storageListener) => {
        if (type === "storage") storageListener = listener;
      }),
      localStorage: {
        getItem: vi.fn((key: string) =>
          key === DATA_CHANGE_SIGNAL_KEY ? JSON.stringify(retained) : null,
        ),
      },
    });

    const changeBus = await import("@/lib/data/change-bus");
    const received: DataChangeMessage[] = [];
    // Initialize the transport, then receive the external signal before an
    // application consumer has subscribed.
    changeBus.publishDataChange("growth");
    storageListener?.({
      key: changeBus.DATA_CHANGE_SIGNAL_KEY,
      newValue: JSON.stringify(retained),
    });
    let unsubscribe = changeBus.subscribeToDataChanges((message) =>
      received.push(message),
    );

    expect(received).toEqual([retained]);

    storageListener?.({
      key: changeBus.DATA_CHANGE_SIGNAL_KEY,
      newValue: JSON.stringify(retained),
    });
    expect(received).toEqual([retained]);
    unsubscribe();

    retained = { ...retained, entityId: "later-item", version: 85 };
    unsubscribe = changeBus.subscribeToDataChanges((message) =>
      received.push(message),
    );
    expect(received).toEqual([
      { ...retained, entityId: "late-item", version: 84 },
      retained,
    ]);
    unsubscribe();
  });

  it("polls per-domain retained signals after every live transport was missed", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const retained = new Map<string, string>();
    let storageListener:
      | ((event: { key: string; newValue: string }) => void)
      | undefined;

    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("window", {
      addEventListener: vi.fn((type: string, listener: typeof storageListener) => {
        if (type === "storage") storageListener = listener;
      }),
      clearInterval,
      setInterval,
      localStorage: {
        getItem: vi.fn((key: string) => retained.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => retained.set(key, value)),
      },
    });

    const changeBus = await import("@/lib/data/change-bus");
    const received: DataChangeMessage[] = [];
    const unsubscribe = changeBus.subscribeToDataChanges((message) =>
      received.push(message),
    );
    const hospital: DataChangeMessage = {
      domain: "hospital",
      sourceId: "background-tab",
      version: 91,
    };
    const checklist: DataChangeMessage = {
      domain: "checklist",
      sourceId: "background-tab",
      version: 92,
    };

    // Simulate durable writes whose BroadcastChannel and storage events were
    // both dropped. Separate slots ensure neither domain overwrites the other.
    retained.set(
      `${changeBus.DATA_CHANGE_SIGNAL_KEY}:hospital`,
      JSON.stringify(hospital),
    );
    retained.set(
      `${changeBus.DATA_CHANGE_SIGNAL_KEY}:checklist`,
      JSON.stringify(checklist),
    );
    await vi.advanceTimersByTimeAsync(1_000);

    expect(received).toEqual([checklist, hospital]);
    expect(storageListener).toBeTypeOf("function");
    unsubscribe();
  });
});
