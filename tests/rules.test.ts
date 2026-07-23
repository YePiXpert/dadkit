import { describe, expect, it } from "vitest";

import {
  calculatePackingCompletion,
  filterItemsForChecklistMode,
  generateChecklist,
  getHospitalIdForProfile,
  isPackingProgressItem,
} from "@/lib/rules";
import { STATUS_FLOW } from "@/lib/store";
import { beijingRegionTemplate } from "@/lib/templates/regions";
import { yuquanHospitalTemplate } from "@/lib/templates/hospitals";
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

  it("does not generate payment as a documents item", () => {
    const items = generateChecklist(makeProfile());
    const documentPaymentItems = items.filter(
      (item) =>
        item.category === "documents" &&
        item.itemKind === "item" &&
        item.id !== "general-doc-bank-card" &&
        (item.name.includes("支付") ||
          item.name.includes("押金") ||
          item.name.includes("银行卡")),
    );

    expect(documentPaymentItems).toEqual([]);
  });

  it("keeps payment and deposit confirmation as tasks", () => {
    const items = generateChecklist(makeProfile({ partnerPresent: true }));
    const partnerPayment = items.find(
      (item) => item.name === "确认支付方式和住院押金",
    );
    const lastPayment = items.find((item) => item.name === "支付 / 押金确认");

    expect(partnerPayment).toMatchObject({
      category: "partner",
      itemKind: "task",
      bag: "none",
    });
    expect(lastPayment).toMatchObject({
      category: "last_minute",
      itemKind: "task",
      bag: "none",
    });
  });

  it("does not count payment and deposit tasks toward packing completion", () => {
    const result = calculatePackingCompletion([
      testItem({ id: "packed-item", status: "packed" }),
      testItem({
        id: "payment-task",
        name: "确认支付方式和住院押金",
        category: "partner",
        itemKind: "task",
        bag: "none",
        status: "packed",
      }),
      testItem({
        id: "last-payment-task",
        name: "支付 / 押金确认",
        category: "last_minute",
        itemKind: "task",
        bag: "none",
        status: "packed",
      }),
    ]);

    expect(result).toEqual({ total: 1, completed: 1, percent: 100 });
  });

  it("keeps Beijing template payment confirmation out of required documents", () => {
    expect(beijingRegionTemplate.requiredDocuments).not.toContain("支付方式");
    expect(
      beijingRegionTemplate.requiredDocuments.some((document) =>
        document.includes("支付"),
      ),
    ).toBe(false);
  });

  it("keeps Yuquan payment confirmation out of required documents", () => {
    expect(yuquanHospitalTemplate.requiredDocuments).not.toContain(
      "银行卡 / 支付方式",
    );
    expect(
      yuquanHospitalTemplate.requiredDocuments.some((document) =>
        document.includes("支付"),
      ),
    ).toBe(false);
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

  it("keeps authority-aligned hospital bag essentials in the general template", () => {
    const items = generateChecklist(makeProfile({ breastfeeding: true }));
    const names = items.map((item) => item.name);

    expect(names).toContain("分娩偏好卡 / 出生计划");
    expect(names).toContain("眼罩");
    expect(names).toContain("自用枕头，如需要");
    expect(names).toContain("小风扇 / 喷雾瓶");
    expect(names).toContain("耳机 / 放松音频");
    expect(names).toContain("TENS 镇痛仪，如已决定使用");
    expect(names).toContain("宝宝住院衣物（连体衣/和尚服），如医院不提供");
    expect(names).toContain("纱布巾 / 小方巾");
    expect(items.find((item) => item.name === "一次性内裤")?.quantity).toBe(
      "5-6 条或按预计住院天数准备",
    );
    expect(items.find((item) => item.name === "哺乳内衣")?.quantity).toBe(
      "2-3 件",
    );
  });

  it("adds warm items when coldWeather is true", () => {
    const items = generateChecklist(makeProfile({ coldWeather: true }));

    expect(items.some((item) => item.name === "妈妈保暖外套")).toBe(true);
    expect(items.some((item) => item.name === "宝宝厚包被")).toBe(true);
    expect(items.some((item) => item.name === "返家保暖衣物")).toBe(true);
  });

  it("adds c-section items when deliveryMode is c_section", () => {
    const items = generateChecklist(makeProfile({ deliveryMode: "c_section" }));

    expect(items.some((item) => item.name === "收腹带")).toBe(true);
    expect(items.some((item) => item.name === "高腰一次性内裤")).toBe(true);
    expect(items.some((item) => item.name === "宽松高腰出院裤")).toBe(true);
    expect(items.some((item) => item.name === "剖腹产术后护理问题待确认")).toBe(
      true,
    );
  });

  it("covers hospital bag staples learned from mature checklists", () => {
    const items = generateChecklist(makeProfile({ breastfeeding: true }));
    const names = items.map((item) => item.name);

    expect(names).toContain("结婚证");
    expect(names).toContain("户口本");
    expect(names).toContain("生育服务单 / 生育登记凭证");
    expect(names).toContain("刀纸 / 产褥卫生纸");
    expect(names).toContain("计量型卫生巾");
    expect(names).toContain("一次性马桶垫");
    expect(names).toContain("月子帽 / 月子鞋");
    expect(names).toContain("小罐奶粉 + 奶瓶 / 硅胶小勺（备用）");
    expect(names).toContain("医院是否要求购买本院无菌待产包？");
    expect(names).toContain("医院对奶粉、奶瓶的政策是什么？");
    expect(names).toContain("陪产家属的陪护床 / 被褥是否提供？");
    expect(names).toContain("无痛分娩是否需要提前预约？麻醉师是否 24 小时在岗？");
    expect(names).toContain("病房类型有哪些？单人间如何预约？");
    expect(names).toContain("是否需要自带便盆 / 胎心监护带？");
    expect(
      items.find((item) => item.name === "产褥垫 / 产后卫生巾")?.quantity,
    ).toBe("10-20 片");
    expect(items.find((item) => item.name === "尿不湿")?.note).toContain(
      "NB 码",
    );
  });

  it("marks explicitly confirmed hospital-provided items as hospital_provided", () => {
    const items = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
    );
    const padItem = items.find((item) => item.name === "产褥垫 / 产后卫生巾");

    expect(padItem?.status).toBe("hospital_provided");
    expect(padItem?.hospitalProvidedByRule).toBe(true);
  });

  it("reverts a derived hospital-provided status when the hospital rule is removed", () => {
    const providedItems = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
    );
    const regenerated = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: [] }),
      { currentItems: providedItems },
    );
    const padItem = regenerated.find(
      (item) => item.name === "产褥垫 / 产后卫生巾",
    );

    expect(padItem?.status).toBe("todo");
    expect(padItem?.hospitalProvidedByRule).toBeUndefined();
    expect(padItem?.note).not.toContain("用户标记为已向医院确认提供");
  });

  it("preserves a manually selected hospital-provided status", () => {
    const currentItems = generateChecklist(makeProfile()).map((item) =>
      item.name === "产褥垫 / 产后卫生巾"
        ? { ...item, status: "hospital_provided" as const }
        : item,
    );
    const regenerated = generateChecklist(makeProfile(), { currentItems });

    expect(
      regenerated.find((item) => item.name === "产褥垫 / 产后卫生巾")?.status,
    ).toBe("hospital_provided");
  });

  it("does not take control back from an explicit manual hospital-provided status", () => {
    const manualItems = generateChecklist(makeProfile()).map((item) =>
      item.name === "产褥垫 / 产后卫生巾"
        ? {
            ...item,
            status: "hospital_provided" as const,
            hospitalProvidedByRule: false,
          }
        : item,
    );
    const whileRuleMatches = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
      { currentItems: manualItems },
    );
    const afterRuleRemoval = generateChecklist(makeProfile(), {
      currentItems: whileRuleMatches,
    });
    const padItem = afterRuleRemoval.find(
      (item) => item.name === "产褥垫 / 产后卫生巾",
    );

    expect(padItem?.status).toBe("hospital_provided");
    expect(padItem?.hospitalProvidedByRule).toBe(false);
  });

  it.each(["todo", "packed"] as const)(
    "preserves an explicit manual %s status while a hospital rule matches",
    (status) => {
      const manualItems = generateChecklist(makeProfile()).map((item) =>
        item.name === "产褥垫 / 产后卫生巾"
          ? { ...item, status, hospitalProvidedByRule: false }
          : item,
      );
      const regenerated = generateChecklist(
        makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
        { currentItems: manualItems },
      );
      const padItem = regenerated.find(
        (item) => item.name === "产褥垫 / 产后卫生巾",
      );

      expect(padItem?.status).toBe(status);
      expect(padItem?.hospitalProvidedByRule).toBe(false);
    },
  );

  it("lets a new hospital rule apply to legacy todo data without provenance", () => {
    const legacyItems = generateChecklist(makeProfile()).map((item) => ({
      ...item,
      hospitalProvidedByRule: undefined,
    }));
    const regenerated = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
      { currentItems: legacyItems },
    );
    const padItem = regenerated.find(
      (item) => item.name === "产褥垫 / 产后卫生巾",
    );

    expect(padItem?.status).toBe("hospital_provided");
    expect(padItem?.hospitalProvidedByRule).toBe(true);
  });

  it("preserves a genuine user packing status across hospital rule changes", () => {
    const initialItems = generateChecklist(makeProfile()).map((item) =>
      item.name === "产褥垫 / 产后卫生巾"
        ? { ...item, status: "packed" as const }
        : item,
    );
    const withProvidedRule = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["postpartum-pads"] }),
      { currentItems: initialItems },
    );
    const withoutProvidedRule = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: [] }),
      { currentItems: withProvidedRule },
    );

    expect(
      withProvidedRule.find((item) => item.name === "产褥垫 / 产后卫生巾")
        ?.status,
    ).toBe("packed");
    expect(
      withoutProvidedRule.find((item) => item.name === "产褥垫 / 产后卫生巾")
        ?.status,
    ).toBe("packed");
  });

  it("uses the selected preset hospital even when a stale custom hospital remains", () => {
    const profile = makeProfile({
      hospitalMode: "preset",
      hospitalId: "cn-bj-yuquan-hospital",
      customHospital: {
        mode: "custom",
        hospitalId: "stale-custom-hospital",
        name: "旧自定义医院",
        country: "CN",
        verificationStatus: "user_entered",
        requiredDocuments: [],
        hospitalProvidedItems: [],
        recommendedItems: [],
        notAllowedItems: [],
      },
    });

    expect(getHospitalIdForProfile(profile)).toBe("cn-bj-yuquan-hospital");
  });

  it("does not mark any item as hospital_provided when provided items are unknown", () => {
    const items = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["unknown"] }),
    );

    expect(items.some((item) => item.status === "hospital_provided")).toBe(false);
  });

  it("does not mark any item as hospital_provided when provided ids contain unknown", () => {
    const items = generateChecklist(
      makeProfile({ hospitalProvidedItemIds: ["unknown", "postpartum-pads"] }),
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
      items.some((item) => item.name === "产科 / 住院处联系电话是否已保存？"),
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

  it("exposes the same packable predicate used by packing progress", () => {
    const item = testItem({ status: "todo" });
    const hospitalQuestion = testItem({
      id: "question",
      category: "hospital_questions",
      itemKind: "question",
    });
    const lastMinute = testItem({
      id: "last",
      category: "last_minute",
      itemKind: "task",
      bag: "last_minute",
    });

    expect(isPackingProgressItem(item)).toBe(true);
    expect(isPackingProgressItem(hospitalQuestion)).toBe(false);
    expect(isPackingProgressItem(lastMinute)).toBe(false);
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

  it("keeps safety seat checks as car tasks outside packing completion", () => {
    const safetySeatItems = generateChecklist(makeProfile()).filter((item) =>
      item.name.includes("安全座椅"),
    );
    const result = calculatePackingCompletion([
      testItem({ id: "packed-item", status: "packed" }),
      ...safetySeatItems.map((item) => ({ ...item, status: "packed" as const })),
    ]);

    expect(safetySeatItems.length).toBeGreaterThan(0);
    expect(
      safetySeatItems.every(
        (item) =>
          item.itemKind === "task" &&
          item.bag === "car" &&
          item.packTier === "core",
      ),
    ).toBe(true);
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
