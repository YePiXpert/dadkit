import { describe, expect, it } from "vitest";

import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import { mergeHospitalProfiles } from "@/lib/hospital/merge";
import {
  clearHospitalProfile,
  hospitalValuesFromPortable,
  updateHospitalProfile,
} from "@/lib/hospital/portable";

function profileWith(
  patch: Partial<Record<"hospitalName" | "address" | "maternityPhone", string>>,
  updatedAt: number,
) {
  const profile = createEmptyHospitalProfile();
  const values = hospitalValuesFromPortable(profile);

  Object.assign(values, patch);
  return updateHospitalProfile(profile, values, updatedAt).profile;
}

describe("hospital field-level merge", () => {
  it("combines changes made to different fields on two devices", () => {
    const local = profileWith({ hospitalName: "市妇幼" }, 100);
    const remote = profileWith({ address: "健康路 1 号" }, 200);
    const merged = mergeHospitalProfiles(local, remote);

    expect(merged.fields.hospitalName.value).toBe("市妇幼");
    expect(merged.fields.address.value).toBe("健康路 1 号");
  });

  it("lets the newer timestamp win for the same field", () => {
    const local = profileWith({ address: "旧地址" }, 100);
    const remote = profileWith({ address: "新地址" }, 200);

    expect(mergeHospitalProfiles(local, remote).fields.address.value).toBe(
      "新地址",
    );
  });

  it("keeps the local value when timestamps tie", () => {
    const local = profileWith({ address: "本机地址" }, 100);
    const remote = profileWith({ address: "远端地址" }, 100);

    expect(mergeHospitalProfiles(local, remote).fields.address.value).toBe(
      "本机地址",
    );
  });

  it("updates timestamps only for fields whose values changed", () => {
    const current = profileWith(
      { hospitalName: "市妇幼", address: "旧地址" },
      100,
    );
    const values = hospitalValuesFromPortable(current);
    values.address = "新地址";
    const next = updateHospitalProfile(current, values, 300).profile;

    expect(next.fields.address.updatedAt).toBe(300);
    expect(next.fields.hospitalName.updatedAt).toBe(100);
  });

  it("records clearing as a newer empty-value tombstone", () => {
    const current = profileWith({ maternityPhone: "010-12345678" }, 100);
    const values = hospitalValuesFromPortable(current);
    values.maternityPhone = "";
    const cleared = updateHospitalProfile(current, values, 300).profile;

    expect(cleared.fields.maternityPhone).toEqual({ value: "", updatedAt: 300 });
  });

  it("does not resurrect an old value after a field is cleared", () => {
    const oldValue = profileWith({ maternityPhone: "010-12345678" }, 100);
    const cleared = clearHospitalProfile(oldValue, 300).profile;
    const merged = mergeHospitalProfiles(cleared, oldValue);

    expect(merged.fields.maternityPhone.value).toBe("");
    expect(merged.fields.maternityPhone.updatedAt).toBe(300);
  });

  it("does not mutate either merge input", () => {
    const local = profileWith({ hospitalName: "市妇幼" }, 100);
    const remote = profileWith({ address: "健康路 1 号" }, 200);
    const localBefore = structuredClone(local);
    const remoteBefore = structuredClone(remote);

    mergeHospitalProfiles(local, remote);

    expect(local).toEqual(localBefore);
    expect(remote).toEqual(remoteBefore);
  });
});
