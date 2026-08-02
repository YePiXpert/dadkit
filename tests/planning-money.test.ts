import { describe, expect, it } from "vitest";

import {
  formatPlanningMoney,
  parsePlanningMoney,
  planningMoneyInputValue,
} from "@/lib/planning/money";

describe("planning money helpers", () => {
  it.each([
    ["", null],
    ["0", 0],
    ["12", 1_200],
    ["12.3", 1_230],
    ["12.30", 1_230],
  ])("parses %s without floating-point rounding", (input, expected) => {
    expect(parsePlanningMoney(input)).toEqual({ ok: true, value: expected });
  });

  it.each(["-1", "1e3", "12.345", "1,000", "NaN", "Infinity", ".5", "01"])(
    "rejects unsafe amount %s",
    (input) => expect(parsePlanningMoney(input).ok).toBe(false),
  );

  it("enforces the maximum and formats CNY consistently", () => {
    expect(parsePlanningMoney("999999.99")).toEqual({
      ok: true,
      value: 99_999_999,
    });
    expect(parsePlanningMoney("1000000").ok).toBe(false);
    expect(formatPlanningMoney(0)).toBe("¥0.00");
    expect(formatPlanningMoney(123_456)).toBe("¥1,234.56");
    expect(planningMoneyInputValue(1_230)).toBe("12.30");
  });
});
