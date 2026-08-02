import { describe, expect, it } from "vitest";

import { createEmptyItemPlanning } from "@/lib/planning/defaults";
import type { ItemPlanningDraft } from "@/lib/planning/types";
import {
  isItemPlanningPortableData,
  validateItemPlanningDraft,
} from "@/lib/planning/validation";

function draft(patch: Partial<ItemPlanningDraft> = {}): ItemPlanningDraft {
  return {
    assignee: "dad",
    dueDate: "2028-02-29",
    estimatedPrice: "12.30",
    actualPrice: "0",
    purchaseChannel: "  京东\u0001   自营  ",
    storageLocation: "  妈妈包  ",
    ...patch,
  };
}

describe("planning strict validation", () => {
  it("normalizes a valid draft without mutating it", () => {
    const input = draft();
    const before = structuredClone(input);
    const result = validateItemPlanningDraft(input);

    expect(result.ok).toBe(true);
    expect(result.values).toMatchObject({
      estimatedPriceFen: 1_230,
      actualPriceFen: 0,
      purchaseChannel: "京东 自营",
      storageLocation: "妈妈包",
    });
    expect(input).toEqual(before);
  });

  it("rejects invalid assignee, date, amount and overlong text", () => {
    const result = validateItemPlanningDraft(
      draft({
        assignee: "other" as ItemPlanningDraft["assignee"],
        dueDate: "2026-02-29",
        estimatedPrice: "-1",
        purchaseChannel: "渠".repeat(81),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toMatchObject({
      assignee: expect.any(String),
      dueDate: expect.any(String),
      estimatedPrice: expect.any(String),
      purchaseChannel: expect.any(String),
    });
  });

  it("accepts a valid strict portable payload", () => {
    const planning = createEmptyItemPlanning();
    planning.items.item1 = {
      assignee: { value: "shared", updatedAt: 1 },
      dueDate: { value: "2026-08-01", updatedAt: 1 },
      estimatedPriceFen: { value: 0, updatedAt: 1 },
      actualPriceFen: { value: null, updatedAt: 0 },
      purchaseChannel: { value: "医院", updatedAt: 1 },
      storageLocation: { value: "证件包", updatedAt: 1 },
    };
    expect(isItemPlanningPortableData(planning)).toBe(true);
  });

  it("rejects arrays, unknown fields, unsafe ids and timestamps", () => {
    expect(isItemPlanningPortableData({ version: 1, clearedAt: 0, items: [] })).toBe(false);
    expect(
      isItemPlanningPortableData({ ...createEmptyItemPlanning(), injected: true }),
    ).toBe(false);

    const dangerous = JSON.parse(
      '{"version":1,"clearedAt":0,"items":{"__proto__":{}}}',
    );
    expect(isItemPlanningPortableData(dangerous)).toBe(false);

    const invalid = createEmptyItemPlanning();
    invalid.clearedAt = Number.NaN;
    expect(isItemPlanningPortableData(invalid)).toBe(false);
  });
});
