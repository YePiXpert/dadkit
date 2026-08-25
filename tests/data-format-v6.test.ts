import { describe, expect, it } from "vitest";

import {
  isDadKitImportData,
  projectExportDataForVersion,
  sanitizeDadKitImportData,
  upgradeExportDataToLatest,
  type DadKitExportDataV3,
  type DadKitExportDataV4,
} from "@/lib/data/format";
import { hospitalValuesFromPortable, updateHospitalProfile } from "@/lib/hospital/portable";
import { portableTestItem, portableV5, portableV6, portableV11 } from "@/tests/helpers/portable-data";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { createEmptyHousehold } from "@/lib/household/defaults";

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
    const base = portableV6();
    const values = hospitalValuesFromPortable(base.hospital);
    values.hospitalName = "市妇幼保健院";
    values.address = "健康路 1 号";
    const data = portableV6({
      hospital: updateHospitalProfile(base.hospital, values, 123).profile,
    });

    expect(isDadKitImportData(data)).toBe(true);
    expect(sanitizeDadKitImportData(data)).toEqual(data);
    const { hospital: _hospital, ...withoutHospital } = data;
    void _hospital;
    expect(upgradeExportDataToLatest(data)).toEqual({
      ...withoutHospital,
      version: 11,
      household: createEmptyHousehold(),
      baby: createEmptyBabyData(),
    });
  });

  it("projects canonical v6 to a legal v5 payload without mutating canonical data", () => {
    const data = portableV11();
    const before = structuredClone(data);
    const projected = projectExportDataForVersion(data, 5);

    expect(projected.version).toBe(5);
    expect(projected).not.toHaveProperty("hospital");
    expect(isDadKitImportData(projected)).toBe(true);
    expect(data).toEqual(before);
  });

  it("returns an empty legacy compatibility field to a v6 client", () => {
    const projected = projectExportDataForVersion(portableV11(), 6);

    expect(projected.version).toBe(6);
    expect(projected).toHaveProperty(
      "hospital.fields.hospitalName.value",
      "",
    );
    expect(projected).not.toHaveProperty("planning");
  });

  it("rejects invalid or incomplete hospital structures", () => {
    const missing = structuredClone(portableV6()) as unknown as {
      hospital: { fields: Record<string, unknown> };
    };
    delete missing.hospital.fields.address;

    expect(isDadKitImportData(missing)).toBe(false);
    expect(
      isDadKitImportData({
        ...portableV6(),
        hospital: { version: 1, fields: { __proto__: {} } },
      }),
    ).toBe(false);
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
