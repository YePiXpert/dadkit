import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChecklistItemArt } from "@/components/ChecklistItemArt";
import {
  CHECKLIST_ITEM_ART_KEYS,
  getChecklistItemArtKey,
  getChecklistItemArtSrc,
} from "@/lib/checklist-item-art";
import { generalTemplate } from "@/lib/templates/general";

describe("checklist item artwork", () => {
  it("maps every bundled item to an existing reviewed WebP illustration", () => {
    const reviewedKeys = new Set<string>(CHECKLIST_ITEM_ART_KEYS);
    const usedKeys = new Set<string>();

    expect(generalTemplate).toHaveLength(164);
    expect(CHECKLIST_ITEM_ART_KEYS).toHaveLength(144);

    for (const item of generalTemplate) {
      const key = getChecklistItemArtKey(item);
      const src = getChecklistItemArtSrc(item);
      const assetPath = join(process.cwd(), "public", src);

      expect(CHECKLIST_ITEM_ART_KEYS).toContain(key);
      expect(src).toBe(`/item-art/${key}.webp`);
      expect(
        existsSync(assetPath),
        `缺少物品插画: ${src}`,
      ).toBe(true);
      usedKeys.add(key);
    }

    expect(usedKeys.size).toBeGreaterThan(0);
    expect([...usedKeys].every((key) => reviewedKeys.has(key))).toBe(true);
  });

  it("keeps every optimized asset below 20 KiB and the full set below 1 MiB", () => {
    const sizes = CHECKLIST_ITEM_ART_KEYS.map((key) =>
      statSync(
        join(process.cwd(), "public", "item-art", `${key}.webp`),
      ).size,
    );

    expect(Math.max(...sizes)).toBeLessThan(20 * 1024);
    expect(sizes.reduce((total, size) => total + size, 0)).toBeLessThan(
      1024 * 1024,
    );
  });

  it("renders a lazy, fixed-size image instead of inline SVG artwork", () => {
    const item = generalTemplate.find(
      (candidate) => candidate.id === "general-baby-diapers",
    );
    expect(item).toBeDefined();

    const markup = renderToStaticMarkup(
      createElement(ChecklistItemArt, {
        alt: "尿不湿的物品插画",
        item: item!,
      }),
    );

    expect(markup).toContain('src="/item-art/general-baby-diapers.webp"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('width="512"');
    expect(markup).toContain('height="384"');
    expect(markup).toContain("bg-surface-art");
    expect(markup).not.toContain("mix-blend-multiply");
    expect(markup).not.toContain("<svg");
  });

  it("routes custom items to the closest reviewed artwork", () => {
    expect(
      getChecklistItemArtKey({
        category: "baby",
        id: "user-bottle",
        name: "备用奶瓶",
      }),
    ).toBe("general-baby-formula-bottle");

    expect(
      getChecklistItemArtKey({
        category: "mom_postpartum",
        id: "user-slippers",
        name: "自备防滑拖鞋",
      }),
    ).toBe("general-labor-slippers");

    expect(
      getChecklistItemArtKey({
        category: "baby",
        id: "user-keepsake",
        name: "特别纪念物",
      }),
    ).toBe("general-confinement-baby-bodysuit");
  });
});
