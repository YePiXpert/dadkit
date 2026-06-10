import { afterEach, describe, expect, it, vi } from "vitest";

import { inferPreparationKind } from "@/lib/preparation";
import { generateChecklist } from "@/lib/rules";
import {
  STORAGE_KEYS,
  exportData,
  importData,
  loadTimelineTaskStatuses,
  saveTimelineTaskStatuses,
  updateTimelineTaskStatus,
} from "@/lib/storage";
import {
  generateGoModeTasks,
  generateTimeline,
  generateTodayTasks,
  isTimelineTaskComplete,
} from "@/lib/timeline";
import type { ChecklistItem, UserProfile } from "@/lib/types";

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };

  vi.stubGlobal("window", { localStorage });

  return store;
}

function dueDateIn(days: number) {
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const year = dueDate.getFullYear();
  const month = String(dueDate.getMonth() + 1).padStart(2, "0");
  const day = String(dueDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    dueDate: dueDateIn(42),
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

function checklistFor(profile = makeProfile()) {
  return generateChecklist(profile);
}

function relatedItems(taskIds: string[] | undefined, checklist: ChecklistItem[]) {
  const ids = new Set(taskIds ?? []);

  return checklist.filter((item) => ids.has(item.id));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("timeline", () => {
  it("generates five stages when dueDate is present", () => {
    const profile = makeProfile();

    expect(generateTimeline(profile, checklistFor(profile)).map((stage) => stage.id)).toEqual(
      ["six_weeks", "four_weeks", "three_weeks", "one_week", "go_time"],
    );
  });

  it("includes hospital confirmation tasks around 42 days before due", () => {
    const profile = makeProfile({ dueDate: dueDateIn(42) });
    const titles = generateTodayTasks(profile, checklistFor(profile)).map(
      (task) => task.title,
    );

    expect(titles).toContain("到下次产检问清楚医院是否提供产褥垫");
    expect(titles).toContain("保存产科/住院处电话");
  });

  it("includes shopping and washing tasks around 28 days before due", () => {
    const profile = makeProfile({ dueDate: dueDateIn(28) });
    const titles = generateTodayTasks(profile, checklistFor(profile)).map(
      (task) => task.title,
    );

    expect(titles).toContain("处理购物清单中的未完成物品");
    expect(titles).toContain("清洗宝宝出院衣物");
  });

  it("includes core packing tasks around 21 days before due", () => {
    const profile = makeProfile({ dueDate: dueDateIn(21) });
    const titles = generateTodayTasks(profile, checklistFor(profile)).map(
      (task) => task.title,
    );

    expect(titles).toContain("妈妈包核心物品完成打包");
    expect(titles).toContain("宝宝包核心物品完成打包");
  });

  it("includes admission route, deposit, and car seat tasks around 7 days before due", () => {
    const profile = makeProfile({ dueDate: dueDateIn(7) });
    const titles = generateTodayTasks(profile, checklistFor(profile)).map(
      (task) => task.title,
    );

    expect(titles).toContain("确认夜间入院路线");
    expect(titles).toContain("确认支付方式和住院押金");
    expect(titles).toContain("确认安全座椅安装");
  });

  it("includes core go-time tasks", () => {
    const profile = makeProfile();
    const goStage = generateTimeline(profile, checklistFor(profile)).find(
      (stage) => stage.id === "go_time",
    );
    const titles = goStage?.tasks.map((task) => task.title) ?? [];

    expect(titles).toContain("证件包");
    expect(titles).toContain("手机");
    expect(titles).toContain("充电器");
    expect(titles).toContain("安全座椅确认");
  });

  it("does not associate shopping tasks with documents or hospital questions", () => {
    const profile = makeProfile();
    const checklist = checklistFor(profile);
    const shoppingTask = generateTimeline(profile, checklist)
      .flatMap((stage) => stage.tasks)
      .find((task) => task.id === "timeline-shopping");
    const items = relatedItems(shoppingTask?.relatedItemIds, checklist);

    expect(items.length).toBeGreaterThan(0);
    expect(items.some((item) => item.category === "documents")).toBe(false);
    expect(items.some((item) => item.itemKind === "question")).toBe(false);
  });

  it("only associates washing tasks with wash_then_pack items", () => {
    const profile = makeProfile();
    const checklist = checklistFor(profile);
    const washingTasks = generateTimeline(profile, checklist)
      .flatMap((stage) => stage.tasks)
      .filter((task) => task.kind === "washing");
    const items = washingTasks.flatMap((task) =>
      relatedItems(task.relatedItemIds, checklist),
    );

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => inferPreparationKind(item) === "wash_then_pack")).toBe(
      true,
    );
  });

  it("saves, loads, exports, and imports timeline task statuses", () => {
    installLocalStorage();
    const statuses = [
      {
        taskId: "timeline-confirm-hospital",
        status: "done" as const,
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    ];

    saveTimelineTaskStatuses(statuses);

    expect(loadTimelineTaskStatuses()).toEqual(statuses);
    expect(exportData().timelineTaskStatuses).toEqual(statuses);

    const updated = updateTimelineTaskStatus("timeline-go-phone", "not_needed");

    expect(updated).toContainEqual(
      expect.objectContaining({
        taskId: "timeline-go-phone",
        status: "not_needed",
      }),
    );

    const imported = [
      {
        taskId: "timeline-shopping",
        status: "done" as const,
        updatedAt: "2026-06-11T00:00:00.000Z",
      },
    ];
    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-11T00:00:00.000Z",
        timelineTaskStatuses: imported,
      }),
    );

    expect(result.ok).toBe(true);
    expect(loadTimelineTaskStatuses()).toEqual(imported);
  });

  it("can toggle a timeline task from done and not_needed back to todo", () => {
    installLocalStorage();
    const profile = makeProfile();
    const checklist = checklistFor(profile);
    const task = generateGoModeTasks(profile, checklist).find(
      (candidate) => candidate.id === "timeline-go-phone",
    );

    expect(task).toBeDefined();

    let statuses = updateTimelineTaskStatus("timeline-go-phone", "done");
    expect(isTimelineTaskComplete(task!, checklist, statuses)).toBe(true);

    statuses = updateTimelineTaskStatus("timeline-go-phone", "todo");
    expect(isTimelineTaskComplete(task!, checklist, statuses)).toBe(false);

    statuses = updateTimelineTaskStatus("timeline-go-phone", "not_needed");
    expect(isTimelineTaskComplete(task!, checklist, statuses)).toBe(true);

    statuses = updateTimelineTaskStatus("timeline-go-phone", "todo");
    expect(isTimelineTaskComplete(task!, checklist, statuses)).toBe(false);
  });

  it("shares the same timelineTaskStatuses for timeline and go mode tasks", () => {
    installLocalStorage();
    const profile = makeProfile();
    const checklist = checklistFor(profile);
    const timelineTask = generateTimeline(profile, checklist)
      .flatMap((stage) => stage.tasks)
      .find((task) => task.id === "timeline-go-car-seat");
    const goTask = generateGoModeTasks(profile, checklist).find(
      (task) => task.id === "timeline-go-car-seat",
    );

    expect(timelineTask).toBeDefined();
    expect(goTask).toBeDefined();

    const statuses = updateTimelineTaskStatus("timeline-go-car-seat", "done");

    expect(isTimelineTaskComplete(timelineTask!, checklist, statuses)).toBe(true);
    expect(isTimelineTaskComplete(goTask!, checklist, statuses)).toBe(true);
  });

  it("keeps timeline statuses when import omits them", () => {
    installLocalStorage();
    const statuses = [
      {
        taskId: "timeline-go-phone",
        status: "done" as const,
        updatedAt: "2026-06-10T00:00:00.000Z",
      },
    ];

    saveTimelineTaskStatuses(statuses);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-11T00:00:00.000Z",
        checklistMode: "full",
      }),
    );

    expect(result.ok).toBe(true);
    expect(loadTimelineTaskStatuses()).toEqual(statuses);
  });

  it("rejects non-array timeline task statuses", () => {
    installLocalStorage({
      [STORAGE_KEYS.timelineTaskStatuses]: JSON.stringify([]),
    });

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-11T00:00:00.000Z",
        timelineTaskStatuses: {},
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("uses go mode tasks without shopping items or hospital questions", () => {
    const profile = makeProfile();
    const checklist = checklistFor(profile);
    const goTasks = generateGoModeTasks(profile, checklist);
    const items = goTasks.flatMap((task) =>
      relatedItems(task.relatedItemIds, checklist),
    );

    expect(goTasks.every((task) => task.kind === "go")).toBe(true);
    expect(
      items.some(
        (item) =>
          inferPreparationKind(item) === "buy_and_pack" ||
          item.itemKind === "question" ||
          item.category === "hospital_questions",
      ),
    ).toBe(false);
  });
});
