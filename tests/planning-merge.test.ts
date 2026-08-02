import { describe, expect, it } from "vitest";

import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { mergeItemPlanning } from "@/lib/planning/merge";
import { getItemPlanningValues } from "@/lib/planning/selectors";

function planningWith(
  itemId: string,
  patch: Partial<ReturnType<typeof createEmptyItemPlanningRecord>>,
) {
  const planning = createEmptyItemPlanning();
  planning.items[itemId] = { ...createEmptyItemPlanningRecord(), ...patch };
  return planning;
}

describe("planning field-level merge", () => {
  it("keeps dad's assignee and mom's actual price on the same item", () => {
    const dad = planningWith("bag", {
      assignee: { value: "dad", updatedAt: 100 },
    });
    const mom = planningWith("bag", {
      actualPriceFen: { value: 2_000, updatedAt: 200 },
    });
    const values = getItemPlanningValues(mergeItemPlanning(dad, mom), "bag");
    expect(values.assignee).toBe("dad");
    expect(values.actualPriceFen).toBe(2_000);
  });

  it("uses the newer same-field value and keeps local on ties", () => {
    const local = planningWith("bag", {
      assignee: { value: "dad", updatedAt: 100 },
    });
    const newer = planningWith("bag", {
      assignee: { value: "mom", updatedAt: 200 },
    });
    const tied = planningWith("bag", {
      assignee: { value: "shared", updatedAt: 100 },
    });
    expect(getItemPlanningValues(mergeItemPlanning(local, newer), "bag").assignee).toBe("mom");
    expect(getItemPlanningValues(mergeItemPlanning(local, tied), "bag").assignee).toBe("dad");
  });

  it("does not resurrect a channel cleared by a newer tombstone", () => {
    const cleared = planningWith("bag", {
      purchaseChannel: { value: "", updatedAt: 300 },
    });
    const old = planningWith("bag", {
      purchaseChannel: { value: "淘宝", updatedAt: 100 },
    });
    expect(getItemPlanningValues(mergeItemPlanning(cleared, old), "bag").purchaseChannel).toBe("");
  });

  it("does not resurrect any old field after clearing one item", () => {
    const cleared = planningWith("bag", createEmptyItemPlanningRecord(300));
    const old = planningWith("bag", {
      assignee: { value: "mom", updatedAt: 100 },
      actualPriceFen: { value: 500, updatedAt: 100 },
    });
    const values = getItemPlanningValues(mergeItemPlanning(cleared, old), "bag");
    expect(values.assignee).toBe("unassigned");
    expect(values.actualPriceFen).toBeNull();
  });

  it("uses clearedAt to block old offline records globally", () => {
    const cleared = { version: 1 as const, clearedAt: 500, items: {} };
    const old = planningWith("bag", {
      assignee: { value: "family", updatedAt: 400 },
    });
    const merged = mergeItemPlanning(cleared, old);
    expect(merged.items).toEqual({});
    expect(getItemPlanningValues(merged, "bag").assignee).toBe("unassigned");
  });

  it("keeps a value written after global clear", () => {
    const local = planningWith("bag", {
      assignee: { value: "dad", updatedAt: 501 },
    });
    local.clearedAt = 500;
    const remote = { version: 1 as const, clearedAt: 500, items: {} };
    expect(getItemPlanningValues(mergeItemPlanning(local, remote), "bag").assignee).toBe("dad");
  });

  it("treats fields at or below clearedAt as empty", () => {
    const local = planningWith("bag", {
      actualPriceFen: { value: 200, updatedAt: 100 },
    });
    local.clearedAt = 100;
    expect(getItemPlanningValues(mergeItemPlanning(local, createEmptyItemPlanning()), "bag").actualPriceFen).toBeNull();
  });

  it("combines different offline items and does not mutate inputs", () => {
    const local = planningWith("a", { assignee: { value: "dad", updatedAt: 10 } });
    const remote = planningWith("b", { assignee: { value: "mom", updatedAt: 20 } });
    const localBefore = structuredClone(local);
    const remoteBefore = structuredClone(remote);
    const merged = mergeItemPlanning(local, remote);
    expect(Object.keys(merged.items).sort()).toEqual(["a", "b"]);
    expect(local).toEqual(localBefore);
    expect(remote).toEqual(remoteBefore);
  });
});
