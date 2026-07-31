import type { PreparationKind } from "@/lib/types";

export const CUSTOM_PREPARATION_OPTIONS: Array<{
  label: string;
  value: PreparationKind;
}> = [
  { label: "家里已有", value: "pack_existing" },
  { label: "需要购买", value: "buy_and_pack" },
  { label: "买了放家里", value: "buy_for_home" },
  { label: "需要清洗", value: "wash_then_pack" },
];
