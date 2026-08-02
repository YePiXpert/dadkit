import { PLANNING_MAX_PRICE_FEN } from "@/lib/planning/types";

export type PlanningMoneyParseResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

export function parsePlanningMoney(
  input: string,
): PlanningMoneyParseResult {
  const value = input.trim();

  if (!value) {
    return { ok: true, value: null };
  }

  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) {
    return {
      ok: false,
      message: "请输入非负金额，最多保留两位小数。",
    };
  }

  const [yuan, decimals = ""] = value.split(".");
  const fen = Number(yuan) * 100 + Number(decimals.padEnd(2, "0"));

  if (!Number.isSafeInteger(fen) || fen > PLANNING_MAX_PRICE_FEN) {
    return { ok: false, message: "金额不能超过 ¥999,999.99。" };
  }

  return { ok: true, value: fen };
}

export function formatPlanningMoney(fen: number | null) {
  if (fen === null) return "";
  return `¥${(fen / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function planningMoneyInputValue(fen: number | null) {
  if (fen === null) return "";
  return `${Math.floor(fen / 100)}.${String(fen % 100).padStart(2, "0")}`;
}
