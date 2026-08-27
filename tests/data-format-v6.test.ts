import { describe, expect, it } from "vitest";

import {
  isDadKitImportData,
  sanitizeDadKitImportData,
  upgradeExportDataToLatest,
  type DadKitExportDataV3,
  type DadKitExportDataV4,
} from "@/lib/data/format";
import { portableTestItem, portableV5, portableV6 } from "@/tests/helpers/portable-data";
import { createEmptyBabyData } from "@/lib/baby/defaults";

const v3: DadKitExportDataV3 = {
  version: 3,
  exportedAt: "2026-08-01T00:00:00.000Z",
  checklistMode: "full",
  checklist: [portableTestItem("v3")],
  customItems: [],
  hiddenTemplateItemIds: ["hidden-v3"],
};

const v4: DadKitExportDataV4 = {
  ...v3,
  version: 4,
  growth: {
    version: 1,
    profile: { nickname: "小满", dueDate: "2026-09-01" },
    progress: { completedTaskIds: ["first-prenatal-contact"] },
  },
};

describe("DadKit v6 hospital compatibility inside the v11 portable format", () => {
  it.each([
    ["v3", v3],
    ["v4", v4],
    ["v5", portableV5({ checklist: [portableTestItem("v5")] })],
  ])("upgrades %s data without restoring the retired hospital feature", (_, input) => {
    const upgraded = upgradeExportDataToLatest(input);

    expect(upgraded.version).toBe(11);
    expect(upgraded).not.toHaveProperty("hospital");
    expect(upgraded).not.toHaveProperty("planning");
    expect(isDadKitImportData(upgraded)).toBe(true);
  });

  it("validates v6 hospital data but drops it during the v11 upgrade", () => {
    const hospital = portableV6().hospital;
    hospital.fields.hospitalName = { value: "市妇幼保健院", updatedAt: 123 };
    hospital.fields.address = { value: "健康路 1 号", updatedAt: 123 };
    const data = portableV6({ hospital });

    expect(isDadKitImportData(data)).toBe(true);
    expect(sanitizeDadKitImportData(data)).toEqual(data);
    const { hospital: _hospital, ...withoutHospital } = data;
    void _hospital;
    expect(upgradeExportDataToLatest(data)).toEqual({
      ...withoutHospital,
      version: 11,
      baby: createEmptyBabyData(),
    });
  });

  it("tolerates malformed legacy hospital structures while importing the checklist", () => {
    const missing = structuredClone(portableV6());
    delete missing.hospital.fields.address;

    expect(isDadKitImportData(missing)).toBe(true);
    expect(
      isDadKitImportData({
        ...portableV6(),
        hospital: { version: 1, fields: {} },
      }),
    ).toBe(true);
    expect(upgradeExportDataToLatest(missing)).not.toHaveProperty("hospital");
  });

  it("tolerates unknown top-level v6 fields and strips them before saving", () => {
    const withFutureField = {
      ...portableV6(),
      unexpected: { nested: true },
    };

    expect(isDadKitImportData(withFutureField)).toBe(true);
    expect(sanitizeDadKitImportData(withFutureField)).not.toHaveProperty(
      "unexpected",
    );
  });
});
