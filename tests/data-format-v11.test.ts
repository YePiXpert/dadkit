import { describe, expect, it } from "vitest";

import {
  isDadKitImportData,
  upgradeExportDataToLatest,
} from "@/lib/data/format";
import { calculateChecksum } from "@/lib/checksum";
import {
  portablePlanningRecordV1,
  portableV8,
  portableV9,
  portableV11,
} from "@/tests/helpers/portable-data";

describe("DadKit v11 portable format", () => {
  it("upgrades legacy data while discarding retired planning records", () => {
    const legacy = portableV8();
    legacy.planning.items.bag = {
      ...portablePlanningRecordV1(),
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
    expect(latest).not.toHaveProperty("household");
    expect(latest.baby.care.events.map((event) => event.id)).toEqual(["event-a"]);
  });

  it("round trips v11 and tolerates unknown top-level fields", () => {
    const latest = portableV11();
    expect(isDadKitImportData(JSON.parse(JSON.stringify(latest)))).toBe(true);
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

  it("includes baby care changes in stable checksums", () => {
    const latest = portableV11();
    const base = calculateChecksum(latest);

    const recorded = structuredClone(latest);
    recorded.baby.care.events = [
      {
        id: "event-a",
        type: "diaper",
        note: "",
        createdAt: 3,
        updatedAt: 3,
        deletedAt: null,
        occurredAt: "2026-08-01T00:00:00.000Z",
        kind: "wet",
      },
    ];
    expect(calculateChecksum(recorded)).not.toBe(base);
    expect(calculateChecksum(JSON.parse(JSON.stringify(latest)))).toBe(base);
  });
});
