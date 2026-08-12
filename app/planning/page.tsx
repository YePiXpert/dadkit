import type { Metadata } from "next";

import { PlanningWorkspace } from "@/components/PlanningWorkspace";

export const metadata: Metadata = {
  title: "家庭分工与采购 | DadKit",
  description: "管理待产物品负责人、期限、价格、渠道和存放位置。",
};

export default function PlanningPage() {
  return <PlanningWorkspace />;
}
