import { describe, expect, it } from "vitest";

import { createEmptyBabyData } from "@/lib/baby/defaults";
import { isBabyCarePortableData, isBabyPortableData, isBabyProfilePortableData } from "@/lib/baby/validation";
import { isDadKitImportData, projectExportDataForVersion, upgradeExportDataToLatest, type DadKitExportDataV3, type DadKitExportDataV4 } from "@/lib/data/format";
import { portableV5, portableV6, portableV7, portableV8, portableV9 } from "@/tests/helpers/portable-data";
import { exportData, validateImportData } from "@/lib/storage";
import { calculateChecksum } from "@/lib/webdav/checksum";

describe("DadKit v8 portable format", () => {
  it("validates empty baby data and a complete v8 document", () => {
    const baby = createEmptyBabyData();
    expect(isBabyProfilePortableData(baby.profile)).toBe(true);
    expect(isBabyCarePortableData(baby.care)).toBe(true);
    expect(isBabyPortableData(baby)).toBe(true);
    expect(isDadKitImportData(portableV9({ baby }))).toBe(true);
    expect(isDadKitImportData(exportData())).toBe(true);
    const parsed = JSON.parse(JSON.stringify(exportData())) as ReturnType<typeof exportData>;
    expect(isBabyPortableData(parsed.baby)).toBe(true);
    expect(isDadKitImportData(parsed)).toBe(true);
    const validation = validateImportData(JSON.stringify(parsed));
    if (!validation.ok) throw new Error(validation.message);
    expect(validation.ok).toBe(true);
  });

  it("upgrades v3-v7 with timestamp-zero baby data", () => {
    const v5 = portableV5();
    const v3: DadKitExportDataV3 = {
      version: 3,
      exportedAt: v5.exportedAt,
      checklistMode: v5.checklistMode,
      checklist: v5.checklist,
      customItems: v5.customItems,
      hiddenTemplateItemIds: v5.hiddenTemplateItemIds,
    };
    const v4: DadKitExportDataV4 = { ...v3, version: 4, growth: v5.growth };
    for (const input of [v3, v4, v5, portableV6(), portableV7()]) {
      const upgraded = upgradeExportDataToLatest(input);
      expect(upgraded.version).toBe(9);
      expect(upgraded.baby).toEqual(createEmptyBabyData());
    }
  });

  it("projects v5-v8 without mutating canonical data", () => {
    const canonical = portableV9();
    const before = structuredClone(canonical);
    expect(projectExportDataForVersion(canonical, 5)).not.toHaveProperty("baby");
    expect(projectExportDataForVersion(canonical, 6)).not.toHaveProperty("baby");
    expect(projectExportDataForVersion(canonical, 7)).not.toHaveProperty("baby");
    expect(projectExportDataForVersion(canonical, 8)).toHaveProperty("baby");
    expect(canonical).toEqual(before);
  });

  it("tolerates unknown top-level v8 fields", () => {
    expect(isDadKitImportData({ ...portableV8(), unexpected: true })).toBe(true);
  });

  it("keeps event order stable and includes edits and tombstones in checksums", () => {
    const data = portableV8();
    data.baby.care.events = [
      { id: "z-event", type: "diaper", note: "", createdAt: 10, updatedAt: 10, deletedAt: null, occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" },
      { id: "a-event", type: "diaper", note: "", createdAt: 20, updatedAt: 20, deletedAt: null, occurredAt: "2026-08-01T01:00:00.000Z", kind: "dirty" },
    ];
    const normalized = upgradeExportDataToLatest(data);
    expect(normalized.baby.care.events.map((event) => event.id)).toEqual(["a-event", "z-event"]);
    const originalChecksum = calculateChecksum(normalized);
    const edited = structuredClone(normalized);
    const first = edited.baby.care.events[0];
    if (first?.type !== "diaper") throw new Error("测试事件类型无效");
    first.kind = "both";
    first.updatedAt = 30;
    expect(calculateChecksum(edited)).not.toBe(originalChecksum);
    const deleted = structuredClone(normalized);
    deleted.baby.care.events[0]!.updatedAt = 40;
    deleted.baby.care.events[0]!.deletedAt = 40;
    expect(calculateChecksum(deleted)).not.toBe(originalChecksum);
  });
});
