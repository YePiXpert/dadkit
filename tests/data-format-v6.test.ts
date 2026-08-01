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
import { portableTestItem, portableV5, portableV6 } from "@/tests/helpers/portable-data";

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

describe("DadKit v6 portable format", () => {
  it.each([
    ["v3", v3],
    ["v4", v4],
    ["v5", portableV5({ checklist: [portableTestItem("v5")] })],
  ])("upgrades %s data with an empty timestamp-zero hospital", (_, input) => {
    const upgraded = upgradeExportDataToLatest(input);

    expect(upgraded.version).toBe(6);
    expect(upgraded.hospital.fields.hospitalName).toEqual({
      value: "",
      updatedAt: 0,
    });
    expect(isDadKitImportData(upgraded)).toBe(true);
  });

  it("round-trips a complete v6 payload without losing hospital fields", () => {
    const base = portableV6();
    const values = hospitalValuesFromPortable(base.hospital);
    values.hospitalName = "市妇幼保健院";
    values.address = "健康路 1 号";
    const data = portableV6({
      hospital: updateHospitalProfile(base.hospital, values, 123).profile,
    });

    expect(isDadKitImportData(data)).toBe(true);
    expect(sanitizeDadKitImportData(data)).toEqual(data);
    expect(upgradeExportDataToLatest(data)).toEqual(data);
  });

  it("projects canonical v6 to a legal v5 payload without mutating canonical data", () => {
    const data = portableV6();
    const before = structuredClone(data);
    const projected = projectExportDataForVersion(data, 5);

    expect(projected.version).toBe(5);
    expect(projected).not.toHaveProperty("hospital");
    expect(isDadKitImportData(projected)).toBe(true);
    expect(data).toEqual(before);
  });

  it("returns the complete hospital profile to a v6 client", () => {
    const base = portableV6();
    const values = hospitalValuesFromPortable(base.hospital);
    values.hospitalName = "市妇幼保健院";
    const canonical = portableV6({
      hospital: updateHospitalProfile(base.hospital, values, 99).profile,
    });

    const projected = projectExportDataForVersion(canonical, 6);

    expect(projected.version).toBe(6);
    expect(projected).toHaveProperty(
      "hospital.fields.hospitalName.value",
      "市妇幼保健院",
    );
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
    expect(
      isDadKitImportData({
        ...portableV6(),
        unexpected: { nested: true },
      }),
    ).toBe(false);
  });
});
