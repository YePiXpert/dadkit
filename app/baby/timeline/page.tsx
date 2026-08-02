import type { Metadata } from "next";

import { CareTimelineWorkspace } from "@/components/baby/CareTimelineWorkspace";

export const metadata: Metadata = {
  title: "全部宝宝记录 | DadKit",
  description: "按日期查看、筛选、编辑和删除宝宝照护记录。",
};

export default function BabyTimelinePage() {
  return <CareTimelineWorkspace />;
}
