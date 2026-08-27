import { describe, expect, it } from "vitest";

import {
  isDadKitImportData,
  sanitizeDadKitImportData,
  upgradeExportDataToLatest,
} from "@/lib/data/format";
import { calculateChecksum } from "@/lib/checksum";
import {
  portablePlanningRecordV1,
  portableTestItem,
  portableV5,
  portableV6,
  portableV7,
} from "@/tests/helpers/portable-data";

describe("DadKit v7 portable format", () => {
  it("upgrades v3-v6 without adding retired planning data", () => {
    const v3 = {
      version: 3 as const,
      exportedAt: "2026-08-01T00:00:00.000Z",
      checklistMode: "lean" as const,
      checklist: [portableTestItem("v3")],
      customItems: [],
      hiddenTemplateItemIds: [],
    };
    const v4 = {
      ...v3,
      version: 4 as const,
      growth: {
        version: 1 as const,
        profile: { nickname: "", dueDate: "" },
        progress: { completedTaskIds: [] },
      },
    };

    for (const input of [v3, v4, portableV5(), portableV6()]) {
      const upgraded = upgradeExportDataToLatest(input);
      expect(upgraded.version).toBe(11);
      expect(upgraded).not.toHaveProperty("planning");
      expect(isDadKitImportData(upgraded)).toBe(true);
    }
  });

  it("drops retired v6 hospital data during upgrade", () => {
    const v6 = portableV6();
    v6.hospital.fields.hospitalName = { value: "市妇幼", updatedAt: 20 };
    const upgraded = upgradeExportDataToLatest(v6);
    expect(upgraded).not.toHaveProperty("hospital");
    expect(upgraded).not.toHaveProperty("planning");
  });

  it("round-trips and clones a complete v7 payload", () => {
    const data = portableV7();
    data.planning.items.bag = {
      ...portablePlanningRecordV1(),
      assignee: { value: "shared", updatedAt: 10 },
      actualPriceFen: { value: 1_299, updatedAt: 11 },
    };
    const clean = sanitizeDadKitImportData(data);
    expect(clean).toEqual(data);
    expect(clean).not.toBe(data);
    expect(isDadKitImportData(clean)).toBe(true);
  });

  it("tolerates malformed legacy planning while importing the checklist", () => {
    expect(isDadKitImportData({ ...portableV7(), unexpected: true })).toBe(true);
    expect(
      isDadKitImportData({
        ...portableV7(),
        planning: { version: 1, clearedAt: 0, items: [] },
      }),
    ).toBe(true);
    const missing = structuredClone(portableV7());
    missing.planning.items.bag = portablePlanningRecordV1();
    const record = missing.planning.items.bag as unknown as Record<string, unknown>;
    delete record.storageLocation;
    expect(isDadKitImportData(missing)).toBe(true);
    expect(upgradeExportDataToLatest(missing)).not.toHaveProperty("planning");
  });

  it("includes planning in portable checksums", () => {
    const empty = portableV7();
    const changed = portableV7();
    changed.planning.items.bag = {
      ...portablePlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 10 },
    };
    expect(calculateChecksum(changed)).not.toBe(calculateChecksum(empty));
  });
});
