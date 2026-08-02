import { Suspense } from "react";
import type { Metadata } from "next";

import {
  ChecklistWorkspace,
  ChecklistWorkspaceSkeleton,
} from "@/components/ChecklistWorkspace";

export const metadata: Metadata = {
  title: "待产包清单 | DadKit",
  description: "按全部、待购买、待装包和已装包管理待产物品，支持搜索、复制和批量装包。",
};

export default function ChecklistPage() {
  return (
    <Suspense fallback={<ChecklistWorkspaceSkeleton />}>
      <ChecklistWorkspace />
    </Suspense>
  );
}
