import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import { hospitalValuesFromPortable } from "@/lib/hospital/portable";
import { HOSPITAL_STORAGE_KEY } from "@/lib/hospital/repository";
import { useHospitalProfileStore } from "@/lib/hospital/store";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";

beforeEach(() => {
  useHospitalProfileStore.setState({
    hydrated: true,
    profile: createEmptyHospitalProfile(),
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T08:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("hospital profile store persistence", () => {
  it("normalizes once, updates only changed fields and writes one document", () => {
    const storage = installBrowserStorage();
    const draft = hospitalValuesFromPortable(
      useHospitalProfileStore.getState().profile,
    );
    draft.hospitalName = "  市妇幼保健院  ";
    draft.address = "  健康路 1 号  ";

    const result = useHospitalProfileStore.getState().saveDraft(draft);
    const saved = useHospitalProfileStore.getState().profile;

    expect(result).toEqual({ ok: true, changed: true });
    expect(storage.writes).toEqual([HOSPITAL_STORAGE_KEY]);
    expect(saved.fields.hospitalName.value).toBe("市妇幼保健院");
    expect(saved.fields.address.value).toBe("健康路 1 号");
    expect(saved.fields.hospitalName.updatedAt).toBe(Date.now());
    expect(saved.fields.address.updatedAt).toBe(Date.now());
    expect(saved.fields.generalNote.updatedAt).toBe(0);

    expect(
      useHospitalProfileStore
        .getState()
        .saveDraft(hospitalValuesFromPortable(saved)),
    ).toEqual({ ok: true, changed: false });
    expect(storage.writes).toEqual([HOSPITAL_STORAGE_KEY]);
  });

  it("keeps an empty field tombstone and leaves unchanged timestamps intact", () => {
    const storage = installBrowserStorage();
    const initial = hospitalValuesFromPortable(
      useHospitalProfileStore.getState().profile,
    );
    initial.hospitalName = "中心医院";
    initial.maternityPhone = "010-12345678";
    useHospitalProfileStore.getState().saveDraft(initial);
    const hospitalNameTimestamp =
      useHospitalProfileStore.getState().profile.fields.hospitalName.updatedAt;

    vi.setSystemTime(new Date("2026-08-01T08:01:00.000Z"));
    const cleared = hospitalValuesFromPortable(
      useHospitalProfileStore.getState().profile,
    );
    cleared.maternityPhone = "";
    useHospitalProfileStore.getState().saveDraft(cleared);
    const profile = useHospitalProfileStore.getState().profile;

    expect(profile.fields.maternityPhone).toEqual({
      value: "",
      updatedAt: Date.now(),
    });
    expect(profile.fields.hospitalName.updatedAt).toBe(hospitalNameTimestamp);
    expect(storage.writes).toEqual([
      HOSPITAL_STORAGE_KEY,
      HOSPITAL_STORAGE_KEY,
    ]);
  });

  it("does not write an invalid draft", () => {
    const storage = installBrowserStorage();
    const draft = hospitalValuesFromPortable(
      useHospitalProfileStore.getState().profile,
    );
    draft.address = "只有地址";

    const result = useHospitalProfileStore.getState().saveDraft(draft);

    expect(result.ok).toBe(false);
    expect(result.errors?.hospitalName).toContain("医院名称");
    expect(storage.writes).toEqual([]);
  });

  it("makes a local clear newer than a future timestamp already received", () => {
    installBrowserStorage();
    const profile = createEmptyHospitalProfile();
    profile.fields.hospitalName = {
      value: "远端医院",
      updatedAt: Date.now() + 10_000,
    };
    profile.fields.maternityPhone = {
      value: "010-12345678",
      updatedAt: Date.now() + 10_000,
    };
    useHospitalProfileStore.setState({ profile });

    expect(useHospitalProfileStore.getState().clearProfile()).toBe(true);
    expect(
      useHospitalProfileStore.getState().profile.fields.maternityPhone,
    ).toEqual({ value: "", updatedAt: Date.now() + 10_001 });
  });
});
