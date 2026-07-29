"use client";

import * as React from "react";

import { getChecklistItemArtSrc } from "@/lib/checklist-item-art";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ChecklistItemArt({
  alt = "",
  className,
  item,
}: {
  alt?: string;
  className?: string;
  item: Pick<ChecklistItem, "category" | "id" | "name">;
}) {
  return (
    <span
      className={cn(
        "block size-full overflow-hidden bg-[#f8eeda] dark:bg-[#241f18]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className="size-full object-cover dark:brightness-[0.82] dark:saturate-[0.9]"
        decoding="async"
        fetchPriority="low"
        height={384}
        loading="lazy"
        src={getChecklistItemArtSrc(item)}
        width={512}
      />
    </span>
  );
}
