import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const globals = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const button = readFileSync(
  join(process.cwd(), "components", "ui", "button.tsx"),
  "utf8",
);
const card = readFileSync(
  join(process.cwd(), "components", "ui", "card.tsx"),
  "utf8",
);
const header = readFileSync(
  join(process.cwd(), "components", "AppHeader.tsx"),
  "utf8",
);
const checklistPage = readFileSync(
  join(process.cwd(), "app", "checklist", "page.tsx"),
  "utf8",
);
const pageIntro = readFileSync(
  join(process.cwd(), "components", "PageIntro.tsx"),
  "utf8",
);
const cuteIllustration = readFileSync(
  join(process.cwd(), "components", "CuteIllustration.tsx"),
  "utf8",
);

describe("cute maternity app visual direction", () => {
  it("uses the warm DadKit palette and reusable cute markers", () => {
    expect(globals).toContain("--blush");
    expect(globals).toContain("--lavender");
    expect(globals).toContain("--coral");
    expect(globals).toContain(".cute-eyebrow");
    expect(header).toContain("温柔待产任务档案");
  });

  it("ships the Year-of-the-Horse illustration system used by page headers", () => {
    expect(
      existsSync(
        join(process.cwd(), "public", "illustrations", "dadkit-horse-family.webp"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(process.cwd(), "public", "illustrations", "dadkit-horse-mascot.webp"),
      ),
    ).toBe(true);
    expect(cuteIllustration).toContain("dadkit-horse-family.webp");
    expect(cuteIllustration).toContain("dadkit-horse-mascot.webp");
    expect(cuteIllustration).toContain("小马助手");
    expect(pageIntro).toContain("CuteIllustration");
  });

  it("keeps controls soft without reintroducing embedded page scrollers", () => {
    expect(button).toContain("rounded-full");
    expect(card).toContain("bg-card/95");
    expect(checklistPage).not.toContain("sticky top-0");
    expect(checklistPage).not.toContain("overflow-x-auto");
    expect(checklistPage).not.toContain("min-w-max");
  });
});
