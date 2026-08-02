import { describe, expect, it } from "vitest";

import { createEmptyItemPlanningRecordV1 } from "@/lib/planning/defaults";
import { mergeExportData } from "@/lib/sync/merge";
import { projectExportDataForVersion } from "@/lib/data/format";
import { portableV8, portableV9 } from "@/tests/helpers/portable-data";

describe("v8/v9 canonical compatibility", () => {
  it("preserves household and recorder when v8 edits an existing event", () => {
    const canonical = portableV9();
    canonical.household.members["member-a"] = { id: "member-a", createdAt: 1, displayName: { value: "小江", updatedAt: 1 }, relationshipLabel: { value: "家长", updatedAt: 1 }, deleted: { value: false, updatedAt: 1 } };
    canonical.baby.care.events = [{ id: "event-a", type: "diaper", note: "原备注", createdAt: 10, updatedAt: 10, deletedAt: null, recordedByMemberId: "member-a", occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" }];
    const legacy = projectExportDataForVersion(canonical, 8);
    if (legacy.version !== 8) throw new Error("v8 投影失败");
    legacy.baby.care.events[0].note = "旧设备编辑";
    legacy.baby.care.events[0].updatedAt = 20;
    const merged = mergeExportData(canonical, legacy);
    expect(merged.household.members["member-a"].displayName.value).toBe("小江");
    expect(merged.baby.care.events[0].note).toBe("旧设备编辑");
    expect(merged.baby.care.events[0].recordedByMemberId).toBe("member-a");
  });

  it("keeps custom assignees after unchanged v8 projection round trip", () => {
    const canonical = portableV9();
    canonical.planning.items.bag = { assigneeIds: { value: ["member-custom"], updatedAt: 50 }, dueDate: { value: "", updatedAt: 0 }, estimatedPriceFen: { value: null, updatedAt: 0 }, actualPriceFen: { value: null, updatedAt: 0 }, purchaseChannel: { value: "", updatedAt: 0 }, storageLocation: { value: "", updatedAt: 0 } };
    const legacy = projectExportDataForVersion(canonical, 8);
    if (legacy.version !== 8) throw new Error("v8 投影失败");
    expect(legacy.planning.items.bag.assignee.value).toBe("family");
    const merged = mergeExportData(canonical, legacy);
    expect(merged.planning.items.bag.assigneeIds.value).toEqual(["member-custom"]);
    expect(merged.household.members["legacy-family-v1"]).toBeUndefined();
  });

  it("applies a newer explicit v8 assignee change", () => {
    const canonical = portableV9();
    canonical.planning.items.bag = { assigneeIds: { value: ["member-custom"], updatedAt: 50 }, dueDate: { value: "", updatedAt: 0 }, estimatedPriceFen: { value: null, updatedAt: 0 }, actualPriceFen: { value: null, updatedAt: 0 }, purchaseChannel: { value: "", updatedAt: 0 }, storageLocation: { value: "", updatedAt: 0 } };
    const legacy = portableV8();
    legacy.planning.items.bag = { ...createEmptyItemPlanningRecordV1(), assignee: { value: "dad", updatedAt: 60 } };
    expect(mergeExportData(canonical, legacy).planning.items.bag.assigneeIds.value).toEqual(["legacy-dad-v1"]);
  });

  it("keeps a full 12-member household valid when a v8 device changes the assignee", () => {
    const canonical = portableV9();
    for (let index = 0; index < 12; index += 1) {
      const id = `member-${index}`;
      canonical.household.members[id] = {
        id,
        createdAt: index + 1,
        displayName: { value: `成员${index}`, updatedAt: index + 1 },
        relationshipLabel: { value: "", updatedAt: index + 1 },
        deleted: { value: false, updatedAt: index + 1 },
      };
    }
    canonical.planning.items.bag = { assigneeIds: { value: ["member-0"], updatedAt: 50 }, dueDate: { value: "", updatedAt: 0 }, estimatedPriceFen: { value: null, updatedAt: 0 }, actualPriceFen: { value: null, updatedAt: 0 }, purchaseChannel: { value: "", updatedAt: 0 }, storageLocation: { value: "", updatedAt: 0 } };
    const legacy = portableV8();
    legacy.planning.items.bag = { ...createEmptyItemPlanningRecordV1(), assignee: { value: "dad", updatedAt: 60 } };

    const merged = mergeExportData(canonical, legacy);
    expect(merged.planning.items.bag.assigneeIds.value).toEqual(["legacy-dad-v1"]);
    expect(Object.keys(merged.household.members)).toHaveLength(12);
    expect(merged.household.members["legacy-dad-v1"]).toBeUndefined();
  });
});
