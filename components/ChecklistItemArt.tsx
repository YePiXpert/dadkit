"use client";

import * as React from "react";

import {
  getChecklistItemArtPresentation,
  getChecklistItemArtSrc,
} from "@/lib/checklist-item-art";
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
  const presentation = getChecklistItemArtPresentation(item);

  return (
    <span
      className={cn("block size-full overflow-hidden", className)}
      data-art-tone={presentation.tone}
      style={{ backgroundColor: presentation.backgroundColor }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className="size-full object-cover mix-blend-multiply"
        decoding="async"
        fetchPriority="low"
        height={384}
        loading="lazy"
        src={getChecklistItemArtSrc(item)}
        style={{
          objectPosition: presentation.objectPosition,
          transform: presentation.transform,
        }}
        width={512}
      />
    </span>
  );
}
