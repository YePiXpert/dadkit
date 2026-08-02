import { Suspense } from "react";

import {
  HomeDashboard,
  HomeDashboardSkeleton,
} from "@/components/HomeDashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeDashboardSkeleton />}>
      <HomeDashboard />
    </Suspense>
  );
}
