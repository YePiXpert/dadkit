import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ITEM_REF_PHOTOS } from "@/lib/item-refs";
import { generalTemplate } from "@/lib/templates/general";

describe("item reference photos", () => {
  it("only maps items that exist in the bundled template", () => {
    const templateIds = new Set(generalTemplate.map((item) => item.id));

    for (const id of Object.keys(ITEM_REF_PHOTOS)) {
      expect(templateIds.has(id), `未知物品 id: ${id}`).toBe(true);
    }
  });

  it("points every mapping at an existing optimized webp asset", () => {
    for (const [id, photo] of Object.entries(ITEM_REF_PHOTOS)) {
      expect(photo.src).toBe(`/item-refs/${id}.webp`);
      expect(photo.alt.length).toBeGreaterThan(0);
      expect(
        existsSync(join(process.cwd(), "public", photo.src)),
        `缺少参考图文件: ${photo.src}`,
      ).toBe(true);
    }
  });
});
