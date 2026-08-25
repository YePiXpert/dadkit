import { describe, expect, it } from "vitest";

import { createEmptyLegacyPlanningRecordV1 } from "@/lib/data/legacy-planning";
import {
  isDadKitImportData,
  projectExportDataForVersion,
  upgradeExportDataToLatest,
} from "@/lib/data/format";
import { calculateChecksum } from "@/lib/webdav/checksum";
import {
  portableV8,
  portableV9,
  portableV11,
} from "@/tests/helpers/portable-data";

describe("DadKit v11 portable format", () => {
  it("upgrades legacy data while discarding retired planning records", () => {
    const legacy = portableV8();
    legacy.planning.items.bag = {
      ...createEmptyLegacyPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 10 },
    };
    legacy.baby.care.events = [
      {
        id: "event-a",
        type: "diaper",
        note: "",
        createdAt: 20,
        updatedAt: 20,
        deletedAt: null,
        occurredAt: "2026-08-01T00:00:00.000Z",
        kind: "wet",
      },
    ];

    const latest = upgradeExportDataToLatest(legacy);

    expect(latest.version).toBe(11);
    expect(latest).not.toHaveProperty("planning");
    expect(latest.household.members).toEqual({});
    expect(latest.baby.care.events[0].recordedByMemberId).toBeNull();
  });

  it("round trips v11 and projects empty compatibility fields for v10/v9/v8", () => {
    const latest = portableV11();
    expect(isDadKitImportData(JSON.parse(JSON.stringify(latest)))).toBe(true);

    const v10 = projectExportDataForVersion(latest, 10);
    if (v10.version !== 10) throw new Error("v10 投影失败");
    expect(v10.hospital.fields.hospitalName.value).toBe("");
    expect(isDadKitImportData(v10)).toBe(true);

    const v9 = projectExportDataForVersion(latest, 9);
    if (v9.version !== 9) throw new Error("v9 投影失败");
    expect(v9.planning).toEqual({ version: 2, clearedAt: 0, items: {} });
    expect(isDadKitImportData(v9)).toBe(true);

    const v8 = projectExportDataForVersion(latest, 8);
    if (v8.version !== 8) throw new Error("v8 投影失败");
    expect(v8).not.toHaveProperty("household");
    expect(v8.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
    expect(v8.baby.version).toBe(1);
    expect(isDadKitImportData(v8)).toBe(true);
    expect(isDadKitImportData({ ...latest, unexpected: true })).toBe(true);
  });

  it("accepts a v9 document but removes planning during upgrade", () => {
    const legacy = portableV9();
    legacy.planning.items.bag = {
      assigneeIds: { value: ["member-a"], updatedAt: 2 },
      dueDate: { value: "", updatedAt: 0 },
      estimatedPriceFen: { value: null, updatedAt: 0 },
      actualPriceFen: { value: null, updatedAt: 0 },
      purchaseChannel: { value: "", updatedAt: 0 },
      storageLocation: { value: "", updatedAt: 0 },
    };

    const latest = upgradeExportDataToLatest(legacy);
    expect(latest).not.toHaveProperty("planning");
    expect(latest.version).toBe(11);
  });

  it("includes household and baby recorder changes in stable checksums", () => {
    const latest = portableV11();
    latest.household.householdName = { value: "小满之家", updatedAt: 1 };
    const base = calculateChecksum(latest);

    const changed = structuredClone(latest);
    changed.household.householdName.value = "另一个家";
    expect(calculateChecksum(changed)).not.toBe(base);

    const recorded = structuredClone(latest);
    recorded.baby.care.events = [
      {
        id: "event-a",
        type: "diaper",
        note: "",
        createdAt: 3,
        updatedAt: 3,
        deletedAt: null,
        recordedByMemberId: "member-a",
        occurredAt: "2026-08-01T00:00:00.000Z",
        kind: "wet",
      },
    ];
    expect(calculateChecksum(recorded)).not.toBe(base);
    expect(calculateChecksum(JSON.parse(JSON.stringify(latest)))).toBe(base);
  });
});
