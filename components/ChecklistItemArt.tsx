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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn("size-full object-cover", className)}
      decoding="async"
      fetchPriority="low"
      height={384}
      loading="lazy"
      src={getChecklistItemArtSrc(item)}
      width={512}
    />
  );
}
