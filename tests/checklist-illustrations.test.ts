import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChecklistItemIllustration } from "@/components/ChecklistItemIllustration";
import {
  GENERAL_CHECKLIST_ILLUSTRATION_REGISTRY,
  getChecklistIllustrationDescriptor,
  inferChecklistIllustrationFamily,
  isKnownChecklistIllustrationId,
} from "@/lib/checklist-illustrations";
import { generalTemplate } from "@/lib/templates/general";

describe("checklist item illustrations", () => {
  it("covers all 141 bundled items without falling back to a custom descriptor", () => {
    const templateIds = generalTemplate.map((item) => item.id);
    const registeredIds = Object.keys(GENERAL_CHECKLIST_ILLUSTRATION_REGISTRY);

    expect(generalTemplate).toHaveLength(141);
    expect(registeredIds).toHaveLength(141);
    expect(new Set(registeredIds)).toEqual(new Set(templateIds));

    for (const item of generalTemplate) {
      const descriptor = getChecklistIllustrationDescriptor(item);

      expect(isKnownChecklistIllustrationId(item.id)).toBe(true);
      expect(descriptor.artKey).toBe(item.id);
      expect(descriptor.scope).toBe("builtin");
      expect(descriptor.signature).toContain(item.id);
    }
  });

  it("assigns every bundled item a unique signature and visible fingerprint", () => {
    const descriptors = generalTemplate.map((item) =>
      getChecklistIllustrationDescriptor(item),
    );

    expect(new Set(descriptors.map((descriptor) => descriptor.signature)).size).toBe(141);
    expect(new Set(descriptors.map((descriptor) => descriptor.markerCode)).size).toBe(141);
    expect(new Set(descriptors.map((descriptor) => descriptor.compositionKey)).size).toBe(
      141,
    );
    expect(
      new Set(
        descriptors.map(
          (descriptor) =>
            `${descriptor.family}:${descriptor.paletteIndex}:${descriptor.variant}:${descriptor.markerCode}`,
        ),
      ).size,
    ).toBe(141);
    expect(new Set(descriptors.map((descriptor) => descriptor.variant))).toEqual(
      new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    );
  });

  it("renders a unique, visible geometry composition for every bundled id", () => {
    const renderedCompositionKeys = new Set<string>();

    for (const item of generalTemplate) {
      const descriptor = getChecklistIllustrationDescriptor(item);
      const markup = renderToStaticMarkup(
        createElement(ChecklistItemIllustration, { item }),
      );

      expect(markup).toContain(`data-art-key="${item.id}"`);
      expect(markup).toContain(
        `data-composition-key="${descriptor.compositionKey}"`,
      );
      expect(markup).not.toMatch(/<image|href=|url\(/i);
      renderedCompositionKeys.add(descriptor.compositionKey);
    }

    // This uniqueness deliberately ignores palette, markerCode and the tiny fingerprint.
    // It is guaranteed by the large frame + symbol + symbol-position geometry.
    expect(renderedCompositionKeys.size).toBe(141);
  });

  it("keeps representative bundled objects semantically related", () => {
    const familyFor = (id: string) => {
      const item = generalTemplate.find((candidate) => candidate.id === id);
      expect(item).toBeDefined();
      return getChecklistIllustrationDescriptor(item!).family;
    };

    expect(familyFor("general-doc-id")).toBe("document");
    expect(familyFor("general-labor-phone")).toBe("phone");
    expect(familyFor("general-postpartum-breast-pump")).toBe("bottle");
    expect(familyFor("general-baby-diapers")).toBe("diaper");
    expect(familyFor("general-confinement-baby-bathtub")).toBe("bath");
    expect(familyFor("general-going-home-car-seat")).toBe("transport");
  });

  it("routes custom items by name and category, with a generic package fallback", () => {
    expect(
      inferChecklistIllustrationFamily({
        category: "baby",
        name: "备用奶瓶",
      }),
    ).toBe("bottle");
    expect(
      inferChecklistIllustrationFamily({
        category: "mom_postpartum",
        name: "自备防滑拖鞋",
      }),
    ).toBe("footwear");

    const custom = getChecklistIllustrationDescriptor({
      category: "mom_postpartum",
      id: "user-custom-1",
      name: "特别纪念物",
      source: "user",
    });

    expect(custom.family).toBe("package");
    expect(custom.scope).toBe("custom");
    expect(custom.signature).toMatch(/^custom:package:/);
    expect(isKnownChecklistIllustrationId("user-custom-1")).toBe(false);
  });
});
