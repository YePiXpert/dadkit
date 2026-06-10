import { describe, expect, it } from "vitest";

import {
  getHospitalAnswerOptions,
  getProvidedIdForQuestion,
} from "@/lib/hospital/answers";
import type { ChecklistItem } from "@/lib/types";

function testQuestion(name: string): ChecklistItem {
  return {
    id: name,
    name,
    category: "hospital_questions",
    priority: "must",
    status: "todo",
    source: "general",
    editable: true,
    removable: false,
    itemKind: "question",
    bag: "none",
    timing: "confirm_with_hospital",
  };
}

describe("hospital answer helpers", () => {
  it("maps provided questions to provided item ids", () => {
    expect(getProvidedIdForQuestion("医院是否提供产褥垫？")).toBe(
      "postpartum-pads",
    );
    expect(getProvidedIdForQuestion("医院是否提供宝宝尿不湿？")).toBe(
      "baby-diapers",
    );
    expect(getProvidedIdForQuestion("医院是否提供宝宝衣物？")).toBe(
      "baby-clothes",
    );
  });

  it("shows provided statuses for hospital-provided item questions", () => {
    expect(
      getHospitalAnswerOptions(testQuestion("医院是否提供产褥垫？")),
    ).toEqual(["todo", "provided", "not_provided", "partial", "not_needed"]);
  });

  it("shows confirmation statuses for route and payment questions", () => {
    expect(getHospitalAnswerOptions(testQuestion("夜间路线是否已确认？"))).toEqual([
      "todo",
      "confirmed",
      "not_needed",
    ]);
  });
});

