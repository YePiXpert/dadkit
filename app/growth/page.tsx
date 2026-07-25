import type { Metadata } from "next";

import { GrowthWorkspace } from "@/components/GrowthWorkspace";

export const metadata: Metadata = {
  title: "宝宝成长记 · DadKit",
  description: "孕 8–40 周的宝宝成长、大小参考与常见产检提醒。",
};

export default function GrowthPage() {
  return <GrowthWorkspace />;
}
