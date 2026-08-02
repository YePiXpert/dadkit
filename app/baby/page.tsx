import type { Metadata } from "next";

import { BabyWorkspace } from "@/components/baby/BabyWorkspace";

export const metadata: Metadata = {
  title: "宝宝记录 | DadKit",
  description: "离线记录亲喂、瓶喂、吸奶、尿布和睡眠，并与家庭设备同步。",
};

export default function BabyPage() {
  return <BabyWorkspace />;
}
