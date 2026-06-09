import { addDays, format } from "date-fns";

import { generateChecklist } from "@/lib/rules";
import type { ChecklistItem, UserProfile } from "@/lib/types";

export function createDemoProfile(): UserProfile {
  const timestamp = new Date().toISOString();

  return {
    dueDate: format(addDays(new Date(), 42), "yyyy-MM-dd"),
    regionId: "cn-bj-general",
    hospitalMode: "preset",
    hospitalId: "cn-bj-yuquan-hospital",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: ["unknown"],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDemoChecklist(): ChecklistItem[] {
  const demoProfile = createDemoProfile();

  return generateChecklist(demoProfile, {});
}
