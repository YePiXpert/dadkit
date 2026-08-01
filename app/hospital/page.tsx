import type { Metadata } from "next";
import { Suspense } from "react";

import { HospitalProfileWorkspace } from "@/components/HospitalProfileWorkspace";

export const metadata: Metadata = {
  title: "医院档案 | DadKit",
  description: "集中保存生产医院地址、电话和入院要求，离线也能查看。",
};

export default function HospitalPage() {
  return (
    <Suspense>
      <HospitalProfileWorkspace />
    </Suspense>
  );
}
