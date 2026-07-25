import { Suspense } from "react";

import {
  ChecklistWorkspace,
  ChecklistWorkspaceSkeleton,
} from "@/components/ChecklistWorkspace";

export default function HomePage() {
  return (
    <Suspense fallback={<ChecklistWorkspaceSkeleton />}>
      <ChecklistWorkspace />
    </Suspense>
  );
}
