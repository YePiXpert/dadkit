import { afterEach, describe, expect, it, vi } from "vitest";

import { getChecklistViewItems } from "@/lib/checklist-v2";
import { STORAGE_KEYS } from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";

const pristineStoreState = useDadKitStore.getState();

const LEGACY_SENTINELS = {
  "dadkit:user-profile": JSON.stringify({
    dueDate: "1999-01-01",
    regionId: "cn-bj-general",
  }),
  "dadkit:checklist": JSON.stringify([
    {
      id: "legacy-sentinel-item",
      name: "旧清单哨兵",
      status: "packed",
    },
  ]),
  "dadkit:custom-items": JSON.stringify([{ id: "legacy-custom-sentinel" }]),
  "dadkit:checklist-mode": JSON.stringify("full"),
} as const;

function installBrowserStorage(initial: Record<string, string> = {}) {
  const localValues = new Map(Object.entries(initial));
  const sessionValues = new Map<string, string>();
  const reads: string[] = [];
  const writes: string[] = [];
  const removals: string[] = [];

  const localStorage = {
    getItem: (key: string) => {
      reads.push(key);
      return localValues.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      writes.push(key);
      localValues.set(key, value);
    },
    removeItem: (key: string) => {
      removals.push(key);
      localValues.delete(key);
    },
    clear: () => localValues.clear(),
  };
  const sessionStorage = {
    getItem: (key: string) => sessionValues.get(key) ?? null,
    setItem: (key: string, value: string) => sessionValues.set(key, value),
    removeItem: (key: string) => sessionValues.delete(key),
    clear: () => sessionValues.clear(),
  };

  vi.stubGlobal("window", { localStorage, sessionStorage });

  return { localValues, reads, removals, writes };
}

afterEach(() => {
  useDadKitStore.setState(pristineStoreState, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("V2 checklist store", () => {
  it("generates a neutral checklist from empty storage without creating a profile", () => {
    const browserStorage = installBrowserStorage();

    useDadKitStore.getState().hydrate();

    const state = useDadKitStore.getState();
    const visibleItems = getChecklistViewItems(state.checklist, "all");

    expect(state.hydrated).toBe(true);
    expect(state.profile).toBeUndefined();
    expect(visibleItems.length).toBeGreaterThan(0);
    expect(visibleItems.some((item) => item.name === "北京市母子健康手册或电子条形码")).toBe(
      false,
    );
    expect(browserStorage.localValues.has(STORAGE_KEYS.userProfile)).toBe(false);
  });

  it("uses only the dadkit:v2 namespace", () => {
    expect(Object.values(STORAGE_KEYS).every((key) => key.startsWith("dadkit:v2:"))).toBe(
      true,
    );

    const browserStorage = installBrowserStorage();
    useDadKitStore.getState().hydrate();

    expect(browserStorage.reads.length).toBeGreaterThan(0);
    expect(browserStorage.writes.length).toBeGreaterThan(0);
    expect(
      [...browserStorage.reads, ...browserStorage.writes].every((key) =>
        key.startsWith("dadkit:v2:"),
      ),
    ).toBe(true);
  });

  it("ignores legacy dadkit data and leaves every legacy sentinel untouched", () => {
    const browserStorage = installBrowserStorage(LEGACY_SENTINELS);

    useDadKitStore.getState().hydrate();

    const state = useDadKitStore.getState();
    expect(state.profile).toBeUndefined();
    expect(state.checklist.some((item) => item.id === "legacy-sentinel-item")).toBe(
      false,
    );
    expect(browserStorage.reads).not.toContain("dadkit:user-profile");
    expect(browserStorage.reads).not.toContain("dadkit:checklist");

    for (const [key, value] of Object.entries(LEGACY_SENTINELS)) {
      expect(browserStorage.localValues.get(key)).toBe(value);
    }
  });

  it("clearAll resets V2 data without deleting legacy dadkit sentinels", () => {
    const browserStorage = installBrowserStorage(LEGACY_SENTINELS);

    useDadKitStore.getState().hydrate();
    useDadKitStore.getState().clearAll();

    const state = useDadKitStore.getState();
    expect(state.profile).toBeUndefined();
    expect(getChecklistViewItems(state.checklist, "all").length).toBeGreaterThan(0);
    expect(browserStorage.removals.length).toBeGreaterThan(0);
    expect(
      browserStorage.removals.every((key) => key.startsWith("dadkit:v2:")),
    ).toBe(true);

    for (const [key, value] of Object.entries(LEGACY_SENTINELS)) {
      expect(browserStorage.localValues.get(key)).toBe(value);
    }
  });

  it("keeps checklist progress when optional profile details are added later", () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();

    const initialItem = getChecklistViewItems(
      useDadKitStore.getState().checklist,
      "all",
    )[0];
    expect(initialItem).toBeDefined();

    useDadKitStore.getState().updateItem(initialItem.id, { status: "packed" });
    useDadKitStore.getState().createProfile({
      babySex: "girl",
      dueDate: "2026-10-01",
    });
    useDadKitStore.getState().updateProfile({ dueDate: "2026-10-02" });

    const state = useDadKitStore.getState();
    expect(state.profile).toMatchObject({
      babySex: "girl",
      dueDate: "2026-10-02",
    });
    expect(state.checklist.find((item) => item.id === initialItem.id)?.status).toBe(
      "packed",
    );
  });
});
