import { describe, expect, it } from "vitest";

import { createEmptyItemPlanningRecordV1 } from "@/lib/planning/defaults";
import { isDadKitImportData, projectExportDataForVersion, upgradeExportDataToLatest } from "@/lib/data/format";
import { calculateChecksum } from "@/lib/webdav/checksum";
import { portableV8, portableV9 } from "@/tests/helpers/portable-data";

describe("DadKit v9 portable format", () => {
  it("upgrades v8 planning and baby data", () => {
    const legacy = portableV8();
    legacy.planning.items.bag = { ...createEmptyItemPlanningRecordV1(), assignee: { value: "dad", updatedAt: 10 } };
    legacy.baby.care.events = [{ id: "event-a", type: "diaper", note: "", createdAt: 20, updatedAt: 20, deletedAt: null, occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" }];
    const latest = upgradeExportDataToLatest(legacy);
    expect(latest.version).toBe(9);
    expect(latest.planning.items.bag.assigneeIds.value).toEqual(["legacy-dad-v1"]);
    expect(latest.household.members["legacy-dad-v1"].displayName.value).toBe("爸爸");
    expect(latest.baby.care.events[0].recordedByMemberId).toBeNull();
  });

  it("round trips strict v9 and projects legal v8", () => {
    const latest = portableV9();
    expect(isDadKitImportData(JSON.parse(JSON.stringify(latest)))).toBe(true);
    const v8 = projectExportDataForVersion(latest, 8);
    if (v8.version !== 8) throw new Error("v8 投影失败");
    expect(v8.version).toBe(8);
    expect(v8).not.toHaveProperty("household");
    expect(v8.planning.version).toBe(1);
    expect(v8.baby.version).toBe(1);
    expect(isDadKitImportData(v8)).toBe(true);
    expect(isDadKitImportData({ ...latest, unexpected: true })).toBe(false);
  });

  it("includes household, multi assignees and recorder in stable checksums", () => {
    const latest = portableV9();
    latest.household.householdName = { value: "小满之家", updatedAt: 1 };
    const base = calculateChecksum(latest);
    const changed = structuredClone(latest);
    changed.household.householdName.value = "另一个家";
    expect(calculateChecksum(changed)).not.toBe(base);
    const assigned = structuredClone(latest);
    assigned.planning.items.bag = {
      assigneeIds: { value: ["member-a", "member-b"], updatedAt: 2 },
      dueDate: { value: "", updatedAt: 0 },
      estimatedPriceFen: { value: null, updatedAt: 0 },
      actualPriceFen: { value: null, updatedAt: 0 },
      purchaseChannel: { value: "", updatedAt: 0 },
      storageLocation: { value: "", updatedAt: 0 },
    };
    expect(calculateChecksum(assigned)).not.toBe(base);
    const recorded = structuredClone(latest);
    recorded.baby.care.events = [{ id: "event-a", type: "diaper", note: "", createdAt: 3, updatedAt: 3, deletedAt: null, recordedByMemberId: "member-a", occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" }];
    expect(calculateChecksum(recorded)).not.toBe(base);
    expect(calculateChecksum(JSON.parse(JSON.stringify(latest)))).toBe(base);
  });
});
