import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { DEFAULT_GROWTH_WEEK, GROWTH_WEEKS } from "@/lib/growth";
import {
  DEFAULT_GROWTH_PROFILE,
  DEFAULT_GROWTH_PROGRESS,
  DEFAULT_GROWTH_VIEW,
  GROWTH_STORAGE_KEYS,
  applyGrowthPortableData,
  exportGrowthData,
  resetGrowthData,
  useGrowthStore,
  validateGrowthPortableData,
  type GrowthPortableData,
} from "@/lib/growth-store";

function installLocalStorage() {
  return installBrowserStorage().localValues;
}

function resetStoreState() {
  useGrowthStore.setState({
    ...DEFAULT_GROWTH_PROFILE,
    ...DEFAULT_GROWTH_PROGRESS,
    ...DEFAULT_GROWTH_VIEW,
    hydrated: false,
  });
}

function portableData(
  patch: Partial<GrowthPortableData> = {},
): GrowthPortableData {
  return {
    version: 1,
    profile: {
      nickname: "小栗子",
      dueDate: "2026-08-01",
    },
    progress: {
      completedTaskIds: [
        GROWTH_WEEKS[0].checkupTaskId,
        GROWTH_WEEKS[1].checkupTaskId,
      ],
    },
    ...patch,
  };
}

afterEach(() => {
  resetStoreState();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("growth store", () => {
  it("hydrates an empty browser to week 36", () => {
    installLocalStorage();

    useGrowthStore.getState().hydrate();

    expect(useGrowthStore.getState()).toMatchObject({
      hydrated: true,
      nickname: "",
      dueDate: "",
      completedTaskIds: [],
      lastViewedWeek: DEFAULT_GROWTH_WEEK,
    });
  });

  it("exports persisted profile and progress before the growth page hydrates", () => {
    const values = installLocalStorage();
    values.set(
      GROWTH_STORAGE_KEYS.profile,
      JSON.stringify({ nickname: "小满", dueDate: "2026-09-09" }),
    );
    values.set(
      GROWTH_STORAGE_KEYS.progress,
      JSON.stringify({
        completedTaskIds: [GROWTH_WEEKS[0].checkupTaskId],
      }),
    );

    expect(useGrowthStore.getState().hydrated).toBe(false);
    expect(exportGrowthData()).toEqual({
      version: 1,
      profile: { nickname: "小满", dueDate: "2026-09-09" },
      progress: {
        completedTaskIds: [GROWTH_WEEKS[0].checkupTaskId],
      },
    });
    expect(exportGrowthData()).not.toHaveProperty("lastViewedWeek");
  });

  it("keeps profile, task progress and last view in separate keys", () => {
    const values = installLocalStorage();
    const taskId = GROWTH_WEEKS[4].checkupTaskId;

    useGrowthStore.getState().setNickname("小栗子");
    useGrowthStore.getState().setDueDate("2026-08-01");
    useGrowthStore.getState().toggleCompletedTask(taskId);
    useGrowthStore.getState().setLastViewedWeek(40);

    expect(JSON.parse(values.get(GROWTH_STORAGE_KEYS.profile) ?? "{}")).toEqual({
      nickname: "小栗子",
      dueDate: "2026-08-01",
    });
    expect(JSON.parse(values.get(GROWTH_STORAGE_KEYS.progress) ?? "{}")).toEqual({
      completedTaskIds: [taskId],
    });
    expect(JSON.parse(values.get(GROWTH_STORAGE_KEYS.view) ?? "{}")).toEqual({
      lastViewedWeek: 40,
    });
  });

  it("hydrates before a first interaction so existing task progress is retained", () => {
    const values = installLocalStorage();
    const firstTaskId = GROWTH_WEEKS[0].checkupTaskId;
    const secondTaskId = GROWTH_WEEKS[1].checkupTaskId;
    values.set(
      GROWTH_STORAGE_KEYS.progress,
      JSON.stringify({ completedTaskIds: [firstTaskId] }),
    );

    useGrowthStore.getState().toggleCompletedTask(secondTaskId);

    expect(useGrowthStore.getState().completedTaskIds).toEqual([
      firstTaskId,
      secondTaskId,
    ]);
  });

  it("strictly validates portable data and rejects week-shaped legacy progress", () => {
    expect(validateGrowthPortableData(portableData())).toBe(true);
    expect(
      validateGrowthPortableData({
        ...portableData(),
        progress: { completedWeeks: [8] },
      }),
    ).toBe(false);
    expect(
      validateGrowthPortableData({
        ...portableData(),
        profile: { nickname: "小栗子", dueDate: "2026-02-30" },
      }),
    ).toBe(false);
    expect(
      validateGrowthPortableData({
        ...portableData(),
        progress: {
          completedTaskIds: ["unknown-task"],
        },
      }),
    ).toBe(false);
    expect(
      validateGrowthPortableData({
        ...portableData(),
        unexpected: true,
      }),
    ).toBe(false);
  });

  it("applies portable profile and task progress without replacing the view", () => {
    const values = installLocalStorage();
    useGrowthStore.setState({ lastViewedWeek: 31 });

    applyGrowthPortableData(portableData());

    expect(useGrowthStore.getState()).toMatchObject({
      nickname: "小栗子",
      dueDate: "2026-08-01",
      completedTaskIds: [
        GROWTH_WEEKS[0].checkupTaskId,
        GROWTH_WEEKS[1].checkupTaskId,
      ],
      lastViewedWeek: 31,
      hydrated: true,
    });
    expect(values.has(GROWTH_STORAGE_KEYS.profile)).toBe(true);
    expect(values.has(GROWTH_STORAGE_KEYS.progress)).toBe(true);
    expect(values.has(GROWTH_STORAGE_KEYS.view)).toBe(false);
  });

  it("throws before changing data when portable input is invalid", () => {
    const values = installLocalStorage();
    const before = portableData();
    applyGrowthPortableData(before);

    const invalid = {
      ...before,
      progress: { completedTaskIds: ["unknown-task"] },
    } as GrowthPortableData;

    expect(() => applyGrowthPortableData(invalid)).toThrow("格式无效");
    expect(exportGrowthData()).toEqual(before);
    expect(values.get(GROWTH_STORAGE_KEYS.profile)).toBeTruthy();
  });

  it("resets profile, progress and view together", () => {
    const values = installLocalStorage();
    values.set(GROWTH_STORAGE_KEYS.profile, "{}");
    values.set(GROWTH_STORAGE_KEYS.progress, "{}");
    values.set(GROWTH_STORAGE_KEYS.view, "{}");

    resetGrowthData();

    expect(values.size).toBe(0);
    expect(useGrowthStore.getState()).toMatchObject({
      nickname: "",
      dueDate: "",
      completedTaskIds: [],
      lastViewedWeek: DEFAULT_GROWTH_WEEK,
      hydrated: true,
    });
  });
});
