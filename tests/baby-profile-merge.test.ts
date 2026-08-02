import { describe, expect, it } from "vitest";

import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { mergeBabyProfiles } from "@/lib/baby/profile";

describe("baby profile merge", () => {
  it("keeps edits to different fields and newer edits to the same field", () => {
    const local = createEmptyBabyProfile();
    local.fields.nickname = { value: "满满", updatedAt: 20 };
    const remote = createEmptyBabyProfile();
    remote.fields.birthDate = { value: "2026-08-01", updatedAt: 30 };
    remote.fields.nickname = { value: "新名字", updatedAt: 21 };
    const merged = mergeBabyProfiles(local, remote);
    expect(merged.fields.nickname.value).toBe("新名字");
    expect(merged.fields.birthDate.value).toBe("2026-08-01");
  });

  it("keeps local on equal timestamps", () => {
    const local = createEmptyBabyProfile();
    const remote = createEmptyBabyProfile();
    local.fields.nickname = { value: "本机", updatedAt: 10 };
    remote.fields.nickname = { value: "远端", updatedAt: 10 };
    expect(mergeBabyProfiles(local, remote).fields.nickname.value).toBe("本机");
  });

  it("uses clearedAt to prevent old fields from returning and accepts newer refill", () => {
    const local = createEmptyBabyProfile(100);
    const remote = createEmptyBabyProfile();
    remote.fields.nickname = { value: "旧名字", updatedAt: 99 };
    expect(mergeBabyProfiles(local, remote).fields.nickname.value).toBe("");
    remote.fields.nickname = { value: "新名字", updatedAt: 101 };
    expect(mergeBabyProfiles(local, remote).fields.nickname.value).toBe("新名字");
  });
});
