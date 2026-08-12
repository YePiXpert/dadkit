import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}): Promise<Metadata> {
  const { sectionId } = await params;
  const section = CHECKLIST_SECTIONS.find((candidate) => candidate.id === sectionId);

  return section
    ? {
        title: `${section.label} | DadKit`,
        description: `查看并管理${section.label}中的待产准备事项。`,
      }
    : { title: "清单分类 | DadKit", robots: { index: false, follow: false } };
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
