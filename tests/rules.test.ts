import { describe, expect, it } from "vitest";

import {
  calculatePackingCompletion,
  filterItemsForChecklistMode,
  generateChecklist,
} from "@/lib/rules";
import { STATUS_FLOW } from "@/lib/store";
import type { ChecklistItem, UserProfile } from "@/lib/types";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    dueDate: "2026-08-01",
    regionId: "cn-bj-general",
    hospitalMode: "preset",
    hospitalId: "cn-bj-yuquan-hospital",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...overrides,
  };
}

function testItem(patch: Partial<ChecklistItem>): ChecklistItem {
  return {
    id: "test-item",
    name: "测试物品",
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "general",
    sourceLabel: "测试",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

describe("generateChecklist", () => {
  it("adds Beijing and Yuquan maternal handbook requirements", () => {
    const items = generateChecklist(makeProfile());

    expect(
      items.some((item) => item.name === "北京市母子健康手册或电子条形码"),
    ).toBe(true);
  });

  it("does not show baby nail clipper in lean mode by default", () => {
    const leanItems = filterItemsForChecklistMode(
      generateChecklist(makeProfile()),
      "lean",
    );

    expect(leanItems.some((item) => item.name === "宝宝指甲剪")).toBe(false);
  });

  it("hides many optional items in lean mode without deleting them", () => {
    const fullItems = generateChecklist(makeProfile());
    const leanItems = filterItemsForChecklistMode(fullItems, "lean");

    expect(fullItems.length).toBeGreaterThan(leanItems.length);
    expect(fullItems.some((item) => item.name === "充电宝")).toBe(true);
    expect(leanItems.some((item) => item.name === "充电宝")).toBe(false);
    expect(leanItems.some((item) => item.name === "毛巾")).toBe(false);
  });

  it("keeps the core lean checklist small and executable", () => {
    const leanItems = filterItemsForChecklistMode(
      generateChecklist(makeProfile()),
      "lean",
    );
    const names = leanItems.map((item) => item.name);

    expect(names).toContain("身份证件");
    expect(names).toContain("医保卡 / 社保卡");
    expect(names).toContain("产检资料");
    expect(names).toContain("手机");
    expect(names).toContain("长充电线");
    expect(names).toContain("水杯 / 吸管杯");
    expect(names).toContain("产褥垫 / 产后卫生巾");
    expect(names).toContain("一次性内裤");
    expect(names).toContain("宝宝出院衣物");
    expect(names).toContain("安全座椅确认");
  });

  it("adds dad tasks when partnerPresent is true", () => {
    const items = generateChecklist(makeProfile({ partnerPresent: true }));
    const dadTasks = items.filter(
      (item) => item.category === "partner" && item.itemKind === "task",
    );

    expect(dadTasks.some((item) => item.name === "保存产科/住院处电话")).toBe(true);
    expect(dadTasks.some((item) => item.name === "确认夜间入院入口")).toBe(true);
    expect(dadTasks.some((item) => item.name === "确认安全座椅安装")).toBe(true);
  });

  it("hides partner items when partnerPresent is false but keeps emergency contact task", () => {
    const items = generateChecklist(makeProfile({ partnerPresent: false }));

    expect(items.some((item) => item.category === "partner")).toBe(false);
    expect(items.some((item) => item.name === "紧急联系人/接送人确认")).toBe(true);
  });

  it("adds breastfeeding items when breastfeeding is true", () => {
    const items = generateChecklist(makeProfile({ breastfeeding: true }));

    expect(items.some((item) => item.name === "哺乳内衣")).toBe(true);
    expect(items.some((item) => item.name === "溢乳垫")).toBe(true);
    expect(items.some((item) => item.name === "乳头膏")).toBe(true);
    expect(items.some((item) => item.name === "吸奶器是否需要带？")).toBe(true);
  });

  it("adds warm items when coldWeather is true", () => {
    const items = generateChecklist(makeProfile({ coldWeather: true }));

    expect(items.some((item) => item.name === "妈妈保暖外套")).toBe(true);
    expect(items.some((item) => item.name === "宝宝厚包被")).toBe(true);
    expect(items.some((item) => item.name === "返家保暖衣物")).toBe(true);
  });

  it("adds c-section items when deliveryMode is c_section", () => {
    const items = generateChecklist(makeProfile({ deliveryMode: "c_section" }));

    expect(items.some((item) => item.name === "高腰一次性内裤")).toBe(true);
    expect(items.some((item) => item.name === "宽松高腰出院裤")).toBe(true);
    expect(items.some((item) => item.name === "剖腹产术后护理问题待确认")).toBe(
      true,
    );
  });

  it("marks explicitly confirmed hospital-provided items as hospital_provided", () => {
    const items = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
    );
    const padItem = items.find((item) => item.name === "产褥垫 / 产后卫生巾");

    expect(padItem?.status).toBe("hospital_provided");
  });

  it("does not mark any item as hospital_provided when provided items are unknown", () => {
    const items = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["unknown"] }),
    );

    expect(items.some((item) => item.status === "hospital_provided")).toBe(false);
  });

  it("keeps birth certificate material question", () => {
    const items = generateChecklist(makeProfile());

    expect(
      items.some((item) =>
        item.name.includes("出生医学证明办理需要哪些材料"),
      ),
    ).toBe(true);
  });

  it("keeps obstetrics or admission phone question", () => {
    const items = generateChecklist(makeProfile());

    expect(
      items.some((item) => item.name === "产科/住院处联系电话是否已保存？"),
    ).toBe(true);
  });

  it("does not count hospital questions toward packing completion", () => {
    const result = calculatePackingCompletion([
      testItem({ status: "packed" }),
      testItem({
        id: "question",
        name: "医院是否提供产褥垫？",
        category: "hospital_questions",
        itemKind: "question",
      }),
    ]);

    expect(result).toEqual({ total: 1, completed: 1, percent: 100 });
  });

  it("does not count last-minute checks toward packing completion", () => {
    const result = calculatePackingCompletion([
      testItem({ status: "packed" }),
      testItem({
        id: "last",
        name: "身份证件",
        category: "last_minute",
        itemKind: "task",
        bag: "last_minute",
      }),
    ]);

    expect(result).toEqual({ total: 1, completed: 1, percent: 100 });
  });

  it("deduplicates items by same name and category", () => {
    const items = generateChecklist(makeProfile());
    const keys = items.map((item) => `${item.category}:${item.name}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("quick status flow does not enter special statuses", () => {
    expect(STATUS_FLOW).toEqual(["todo", "bought", "washed", "packed"]);
    expect(STATUS_FLOW).not.toContain("last_minute");
    expect(STATUS_FLOW).not.toContain("hospital_provided");
    expect(STATUS_FLOW).not.toContain("not_needed");
  });
});
