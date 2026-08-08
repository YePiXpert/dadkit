import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY } from "@/lib/theme";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function listSourceFiles(...segments: string[]): string[] {
  const root = join(process.cwd(), ...segments);
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);

    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(...segments, entry));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

const sourceFiles = ["app", "components", "lib"].flatMap((dir) =>
  listSourceFiles(dir).map((path) => ({
    path,
    source: readFileSync(path, "utf8").replace(/\r\n/g, "\n"),
  })),
);

const globals = readSource("app", "globals.css");
const tailwindConfig = readSource("tailwind.config.ts");
const layout = readSource("app", "layout.tsx");
const themeModule = readSource("lib", "theme.ts");
const useTheme = readSource("lib", "use-theme.ts");
const addItemDialog = readSource("components", "AddItemDialog.tsx");
const celebrationOverlay = readSource("components", "CelebrationOverlay.tsx");
const checklistCategoryCard = readSource(
  "components",
  "ChecklistCategoryCard.tsx",
);
const checklistItemArt = readSource("components", "ChecklistItemArt.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const growthAnalogyIllustration = readSource(
  "components",
  "GrowthAnalogyIllustration.tsx",
);
const homeHeroIllustration = readSource(
  "components",
  "HomeHeroIllustration.tsx",
);
const badge = readSource("components", "ui", "badge.tsx");
const backupSettingsPage = readSource("app", "settings", "backup", "page.tsx");

const darkBlock = globals.slice(globals.indexOf(".dark {"));
const rootBlock = globals.slice(0, globals.indexOf(".dark {"));

describe("three-tier border radius convergence", () => {
  it("registers card and inset radii in the tailwind theme", () => {
    expect(tailwindConfig).toContain('card: "1.75rem"');
    expect(tailwindConfig).toContain('inset: "1.35rem"');
    expect(globals).toContain("--radius: 1.75rem");
  });

  it("keeps arbitrary radius values out of the interface sources", () => {
    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toMatch(/rounded-\[[\d.]+(rem|px)\]/);
    }
  });

  it("reserves rounded-3xl for the floating mobile dock", () => {
    const offenders = sourceFiles
      .filter(({ source }) => source.includes("rounded-3xl"))
      .map(({ path }) => path);

    expect(offenders).toHaveLength(1);
    expect(offenders[0].endsWith(join("components", "MobileNav.tsx"))).toBe(
      true,
    );
  });
});

describe("color tokens instead of hardcoded hexes", () => {
  it("defines art and confetti tokens in both light and dark themes", () => {
    for (const token of [
      "--surface-art:",
      "--surface-growth:",
      "--confetti-coral:",
      "--confetti-gold:",
      "--confetti-green:",
      "--confetti-blue:",
      "--confetti-pink:",
    ]) {
      expect(rootBlock).toContain(token);
      expect(darkBlock).toContain(token);
    }

    expect(tailwindConfig).toContain('"surface-art"');
    expect(tailwindConfig).toContain('"surface-growth"');
  });

  it("consumes the tokens in illustrations and the celebration overlay", () => {
    expect(checklistItemArt).toContain("bg-surface-art");
    expect(growthAnalogyIllustration).toContain("bg-surface-growth");
    expect(celebrationOverlay).toContain("hsl(var(--confetti-");
  });

  it("keeps the old hardcoded hexes and brightness filters out", () => {
    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toContain("brightness-[0.82]");
      for (const hex of [
        "#f8eeda",
        "#241f18",
        "#f7f0e2",
        "#f9536f",
        "#ffc94d",
        "#4caf7d",
        "#7fb3e8",
      ]) {
        expect(source, path).not.toContain(hex);
      }
    }
  });
});

describe("home hero illustration dark adaptation", () => {
  it("paints the SVG from CSS variables only", () => {
    expect(homeHeroIllustration).toContain("hsl(var(--hero-");
    expect(homeHeroIllustration).not.toMatch(/(fill|stroke|stopColor)="#/);
  });

  it("ships a dark value for every hero token", () => {
    for (const token of [
      "--hero-board-start:",
      "--hero-milk-start:",
      "--hero-bottle:",
      "--hero-paper:",
      "--hero-check:",
      "--hero-heart:",
    ]) {
      expect(rootBlock).toContain(token);
      expect(darkBlock).toContain(token);
    }
  });
});

describe("dead CSS and repeated pattern cleanup", () => {
  it("drops the unreferenced illustration wash and frame styles", () => {
    expect(globals).not.toContain("illustration-wash");
    expect(globals).not.toContain("illustration-frame");
  });

  it("uses the registered tile color classes instead of arbitrary values", () => {
    expect(tailwindConfig).toContain('"tile-mom-bg"');
    expect(checklistCategoryCard).toContain("bg-tile-mom-bg");

    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toContain("bg-[hsl(var(--tile-");
      expect(source, path).not.toContain("text-[hsl(var(--tile-");
    }
  });

  it("shares the icon-tile component class instead of hand-written copies", () => {
    expect(globals).toContain(".icon-tile");
    expect(backupSettingsPage).toContain('className="icon-tile"');

    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toContain(
        "flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary",
      );
    }
  });
});

describe("unified breakpoints", () => {
  it("relies on the tailwind sm breakpoint plus a custom xs 360px", () => {
    expect(tailwindConfig).toContain('xs: "360px"');
    expect(globals).toContain("@screen sm");
    expect(globals).not.toMatch(/@media \(min-width/);
  });

  it("keeps handwritten media queries and legacy widths out of components", () => {
    expect(addItemDialog).not.toContain("[@media");

    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toContain("430px");
      expect(source, path).not.toContain("672px");
    }
  });
});

describe("font size and contrast floor", () => {
  it("keeps arbitrary text sizes at 12px or above", () => {
    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toMatch(/text-\[(?:[1-9]|1[01])px\]/);
    }
  });

  it("keeps badges at the 12px floor", () => {
    expect(badge).toContain("text-xs");
  });

  it("avoids opacity modifiers that dilute key text colors", () => {
    for (const { path, source } of sourceFiles) {
      expect(source, path).not.toMatch(
        /text-(?:muted-foreground|foreground)\/\d+/,
      );
    }
  });
});

describe("checklist skeleton isomorphism", () => {
  it("mirrors the real shell, hero, tabs and category cards", () => {
    expect(checklistWorkspace).toContain("ChecklistWorkspaceSkeleton");
    expect(checklistWorkspace).toContain('aria-label="正在准备清单"');

    const skeleton = checklistWorkspace.slice(
      checklistWorkspace.indexOf("export function ChecklistWorkspaceSkeleton"),
    );
    expect(skeleton).toContain("page-shell page-shell-with-nav");
    expect(skeleton).toContain("rounded-card bg-muted");
    expect(skeleton).toContain("grid-cols-4");
    expect(skeleton.match(/h-28 rounded-card/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
  });
});

describe("theme initialization single source", () => {
  it("defines the storage key once and shares it with the inline script", () => {
    expect(themeModule).toContain(
      'export const THEME_STORAGE_KEY = "dadkit-theme"',
    );
    expect(THEME_STORAGE_KEY).toBe("dadkit-theme");
    expect(layout).toContain('from "@/lib/theme"');
    expect(layout).toContain('getItem("${THEME_STORAGE_KEY}")');
    expect(useTheme).toContain('from "@/lib/theme"');
  });

  it("keeps the raw key literal out of every other source file", () => {
    const offenders = sourceFiles
      .filter(
        ({ path, source }) =>
          source.includes('"dadkit-theme"') &&
          !path.endsWith(join("lib", "theme.ts")),
      )
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("anchors the themeColor values to the globals.css background tokens", () => {
    expect(layout).toContain(
      "与 app/globals.css 的浅色 --background: 40 43% 97% 保持一致。",
    );
    expect(layout).toContain(
      "与 app/globals.css 的深色 --background: 28 14% 9% 保持一致。",
    );
  });
});
