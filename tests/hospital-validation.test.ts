import { describe, expect, it } from "vitest";

import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import {
  HOSPITAL_FIELD_KEYS,
  type HospitalProfileValues,
} from "@/lib/hospital/types";
import {
  hospitalTelHref,
  isHospitalProfilePortableData,
  normalizeHospitalValues,
  validateHospitalDraft,
} from "@/lib/hospital/validation";

function validValues(
  patch: Partial<HospitalProfileValues> = {},
): HospitalProfileValues {
  return {
    ...normalizeHospitalValues({ hospitalName: "市妇幼保健院" }),
    ...patch,
  };
}

describe("hospital profile validation", () => {
  it("accepts a valid partial hospital profile", () => {
    const result = validateHospitalDraft(
      validValues({
        campusName: "滨江院区",
        maternityPhone: "+86 (010) 1234-5678",
        address: "健康路 1 号",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("requires hospitalName before a profile is configured", () => {
    const result = validateHospitalDraft(
      normalizeHospitalValues({ address: "健康路 1 号" }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.hospitalName).toContain("医院名称");
  });

  it("allows international phone punctuation and creates a safe tel href", () => {
    const phone = "+86 (010) 1234-5678";
    const result = validateHospitalDraft(
      validValues({ maternityPhone: phone }),
    );

    expect(result.ok).toBe(true);
    expect(hospitalTelHref(phone)).toBe("tel:+8601012345678");
    expect(hospitalTelHref("123;alert(1)")).toBeUndefined();
  });

  it("rejects overlong fields consistently", () => {
    const result = validateHospitalDraft(
      validValues({ hospitalName: "医".repeat(81) }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.hospitalName).toContain("80");
  });

  it("removes control characters and collapses meaningless blank lines", () => {
    const result = validateHospitalDraft(
      validValues({
        generalNote: "  第一段\u0001\n\n\n\n  第二段  ",
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.values.generalNote).toBe("第一段\n\n第二段");
  });

  it("rejects invalid field timestamps and unknown portable fields", () => {
    const profile = createEmptyHospitalProfile();
    const invalidTimestamp = structuredClone(profile);
    invalidTimestamp.fields.address.updatedAt = Number.NaN;

    expect(isHospitalProfilePortableData(invalidTimestamp)).toBe(false);
    expect(
      isHospitalProfilePortableData({
        ...profile,
        fields: { ...profile.fields, injected: { value: "x", updatedAt: 0 } },
      }),
    ).toBe(false);
  });

  it("validates every required portable field", () => {
    const profile = createEmptyHospitalProfile();

    expect(isHospitalProfilePortableData(profile)).toBe(true);
    expect(Object.keys(profile.fields)).toEqual([...HOSPITAL_FIELD_KEYS]);

    const missing = structuredClone(profile) as unknown as {
      fields: Record<string, unknown>;
    };
    delete missing.fields.generalNote;
    expect(isHospitalProfilePortableData(missing)).toBe(false);
  });

  it("does not mutate draft or portable inputs", () => {
    const draft = validValues({ address: "  健康路 1 号  " });
    const draftBefore = structuredClone(draft);
    const profile = createEmptyHospitalProfile();
    const profileBefore = structuredClone(profile);

    validateHospitalDraft(draft);
    isHospitalProfilePortableData(profile);

    expect(draft).toEqual(draftBefore);
    expect(profile).toEqual(profileBefore);
  });
});
