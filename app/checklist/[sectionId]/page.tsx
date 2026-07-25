import { Suspense } from "react";
import { notFound } from "next/navigation";

import {
  ChecklistSectionWorkspace,
  ChecklistSectionWorkspaceSkeleton,
} from "@/components/ChecklistSectionWorkspace";
import {
  CHECKLIST_SECTIONS,
  isChecklistSectionId,
} from "@/lib/checklist-v2";

export function generateStaticParams() {
  return CHECKLIST_SECTIONS.map((section) => ({ sectionId: section.id }));
}

export default async function ChecklistSectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;

  if (!isChecklistSectionId(sectionId)) {
    notFound();
  }

  return (
    <Suspense fallback={<ChecklistSectionWorkspaceSkeleton />}>
      <ChecklistSectionWorkspace sectionId={sectionId} />
    </Suspense>
  );
}
