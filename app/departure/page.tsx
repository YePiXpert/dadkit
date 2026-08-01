import type { Metadata } from "next";

import { DepartureWorkspace } from "@/components/DepartureWorkspace";

export const metadata: Metadata = {
  title: "准备出发 | DadKit",
  description: "临产出发前快速核对证件、随手物品、随车准备和关键行李。",
};

export default function DeparturePage() {
  return <DepartureWorkspace />;
}
