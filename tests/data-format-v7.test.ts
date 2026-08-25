import { describe, expect, it } from "vitest";

import {
  isDadKitImportData,
  projectExportDataForVersion,
  sanitizeDadKitImportData,
  upgradeExportDataToLatest,
} from "@/lib/data/format";
import { createEmptyLegacyPlanningRecordV1 } from "@/lib/data/legacy-planning";
import { calculateChecksum } from "@/lib/webdav/checksum";
import {
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
      ...createEmptyLegacyPlanningRecordV1(),
      assignee: { value: "shared", updatedAt: 10 },
      actualPriceFen: { value: 1_299, updatedAt: 11 },
    };
    const clean = sanitizeDadKitImportData(data);
    expect(clean).toEqual(data);
    expect(clean).not.toBe(data);
    expect(isDadKitImportData(clean)).toBe(true);
  });

  it("rejects malformed v7 planning while tolerating unknown top-level fields", () => {
    expect(isDadKitImportData({ ...portableV7(), unexpected: true })).toBe(true);
    expect(
      isDadKitImportData({
        ...portableV7(),
        planning: { version: 1, clearedAt: 0, items: [] },
      }),
    ).toBe(false);
    const missing = structuredClone(portableV7()) as unknown as {
      planning: { items: Record<string, Record<string, unknown>> };
    };
    missing.planning.items.bag = createEmptyLegacyPlanningRecordV1() as unknown as Record<string, unknown>;
    delete missing.planning.items.bag.storageLocation;
    expect(isDadKitImportData(missing)).toBe(false);
  });

  it("projects v5, v6 and v7 without mutating canonical data", () => {
    const canonical = portableV7();
    canonical.planning.items.bag = {
      ...createEmptyLegacyPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 10 },
    };
    const before = structuredClone(canonical);
    const v5 = projectExportDataForVersion(canonical, 5);
    const v6 = projectExportDataForVersion(canonical, 6);
    const v7 = projectExportDataForVersion(canonical, 7);

    expect(v5.version).toBe(5);
    expect(v5).not.toHaveProperty("hospital");
    expect(v5).not.toHaveProperty("planning");
    expect(v6.version).toBe(6);
    expect(v6).toHaveProperty("hospital");
    expect(v6).not.toHaveProperty("planning");
    expect(v7.version).toBe(7);
    if (v7.version !== 7) throw new Error("v7 投影失败");
    expect(v7.planning).toEqual({ version: 1, clearedAt: 0, items: {} });
    expect(canonical).toEqual(before);
  });

  it("includes planning in portable checksums", () => {
    const empty = portableV7();
    const changed = portableV7();
    changed.planning.items.bag = {
      ...createEmptyLegacyPlanningRecordV1(),
      assignee: { value: "dad", updatedAt: 10 },
    };
    expect(calculateChecksum(changed)).not.toBe(calculateChecksum(empty));
  });
});
