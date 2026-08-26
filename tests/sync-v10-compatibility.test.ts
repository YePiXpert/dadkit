import { describe, expect, it } from "vitest";

import { createEmptyLegacyPlanningRecordV1 } from "@/lib/data/legacy-planning";
import { projectExportDataForVersion } from "@/lib/data/format";
import { mergeExportData } from "@/lib/sync/merge";
import {
  portableV8,
  portableV9,
  portableV11,
} from "@/tests/helpers/portable-data";

describe("v8/v9/v11 canonical compatibility", () => {
  it("keeps the v8 edit when it merges into a canonical document", () => {
    const canonical = portableV11();
    canonical.baby.care.events = [
      {
        id: "event-a",
        type: "diaper",
        note: "原备注",
        createdAt: 10,
        updatedAt: 10,
        deletedAt: null,
        occurredAt: "2026-08-01T00:00:00.000Z",
        kind: "wet",
      },
    ];
    const legacy = projectExportDataForVersion(canonical, 8);
    if (legacy.version !== 8) throw new Error("v8 投影失败");
    legacy.baby.care.events[0].note = "旧设备编辑";
    legacy.baby.care.events[0].updatedAt = 20;

    const merged = mergeExportData(canonical, legacy);

    expect(merged).not.toHaveProperty("household");
    expect(merged.baby.care.events[0].note).toBe("旧设备编辑");
  });

  it("discards planning sent by v8 and v9 clients", () => {
    const v8 = portableV8();
    v8.planning.items.bag = {
      ...createEmptyLegacyPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 60 },
    };
    const v9 = portableV9();
    v9.planning.items.bag = {
      assigneeIds: { value: ["member-custom"], updatedAt: 70 },
      dueDate: { value: "", updatedAt: 0 },
      estimatedPriceFen: { value: null, updatedAt: 0 },
      actualPriceFen: { value: null, updatedAt: 0 },
      purchaseChannel: { value: "", updatedAt: 0 },
      storageLocation: { value: "", updatedAt: 0 },
    };

    expect(mergeExportData(portableV11(), v8)).not.toHaveProperty("planning");
    expect(mergeExportData(portableV11(), v9)).not.toHaveProperty("planning");
  });

  it("projects empty planning placeholders only for legacy clients", () => {
    const canonical = portableV11();
    const v9 = projectExportDataForVersion(canonical, 9);
    const v8 = projectExportDataForVersion(canonical, 8);

    expect(v9.version).toBe(9);
    if (v9.version !== 9) throw new Error("v9 投影失败");
    expect(v9.planning).toEqual({ version: 2, clearedAt: 0, items: {} });
    expect(v8.version).toBe(8);
    if (v8.version !== 8) throw new Error("v8 投影失败");
    expect(v8.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
    expect(canonical).not.toHaveProperty("planning");
  });
});
