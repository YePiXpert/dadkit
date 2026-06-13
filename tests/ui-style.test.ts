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
const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
const checklistPage = readFileSync(
  join(process.cwd(), "app", "checklist", "page.tsx"),
  "utf8",
);
const hospitalPage = readFileSync(
  join(process.cwd(), "app", "hospital", "page.tsx"),
  "utf8",
);
const goPage = readFileSync(
  join(process.cwd(), "app", "go", "page.tsx"),
  "utf8",
);
const contractionsPage = readFileSync(
  join(process.cwd(), "app", "contractions", "page.tsx"),
  "utf8",
);
const setupPage = readFileSync(
  join(process.cwd(), "app", "setup", "page.tsx"),
  "utf8",
);
const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);
const hospitalQuestionCard = readFileSync(
  join(process.cwd(), "components", "HospitalQuestionCard.tsx"),
  "utf8",
);
const timelinePage = readFileSync(
  join(process.cwd(), "app", "timeline", "page.tsx"),
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
const mobileNav = readFileSync(
  join(process.cwd(), "components", "MobileNav.tsx"),
  "utf8",
);
const mobileTopBar = readFileSync(
  join(process.cwd(), "components", "MobileTopBar.tsx"),
  "utf8",
);
const emptyState = readFileSync(
  join(process.cwd(), "components", "EmptyState.tsx"),
  "utf8",
);

describe("cute maternity app visual direction", () => {
  it("uses the warm DadKit palette and reusable cute markers", () => {
    expect(globals).toContain("--blush");
    expect(globals).toContain("--lavender");
    expect(globals).toContain("--coral");
    expect(globals).toContain("--cream");
    expect(globals).toContain("--peach");
    expect(globals).toContain("--mint");
    expect(globals).toContain(".cute-eyebrow");
    expect(globals).toContain(".macaron-panel");
    expect(globals).toContain(".macaron-note");
    expect(globals).toContain(".app-hero-card");
    expect(globals).toContain(".app-list-row");
    expect(header).toContain("准爸爸好帮手");
    expect(layout).toContain("#247A73");
    expect(mobileNav).toContain("bg-mint");
    expect(mobileNav).toContain("after:bg-mint");
    expect(mobileNav).toContain("h-[3.25rem]");
    expect(mobileNav).toContain('label: "我的"');
    expect(mobileNav).toContain("hiddenRoutes");
    expect(mobileNav).toContain('"/setup"');
    expect(mobileNav).toContain("secondaryRouteOwners");
    expect(mobileNav).toContain('"/contractions"');
    expect(mobileNav).toContain('"/go"');
    expect(header).toContain('label: "我的"');
    expect(header).toContain("secondaryRouteOwners");
    expect(layout).toContain("<MobileTopBar");
    expect(mobileTopBar).toContain("准爸爸好帮手");
    expect(mobileTopBar).toContain("返回上一页");
    expect(mobileTopBar).toContain("{isHome ? (");
    expect(mobileTopBar).toContain("{copy.title}");
    expect(mobileTopBar).toContain("{copy.subtitle}");
    expect(mobileTopBar).toContain("生成专属待产清单");
    expect(mobileTopBar).toContain("ArrowRight");
    expect(mobileTopBar).toContain("CalendarClock");
  });

  it("ships transparent cute illustration assets used by page headers", () => {
    expect(
      existsSync(
        join(
          process.cwd(),
          "public",
          "illustrations",
          "dadkit-family-transparent.png",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          process.cwd(),
          "public",
          "illustrations",
          "dadkit-bear-transparent.png",
        ),
      ),
    ).toBe(true);
    expect(cuteIllustration).toContain("dadkit-family-transparent.png");
    expect(cuteIllustration).toContain("dadkit-bear-transparent.png");
    expect(cuteIllustration).toContain("小熊助手");
    expect(pageIntro).toContain("CuteIllustration");
    expect(pageIntro).toContain("sm:hidden");
    expect(pageIntro).toContain("sm:block");
    expect(pageIntro).toContain("section-kicker");
    expect(pageIntro).toContain("bg-peach");
    expect(pageIntro).toContain("bg-mint");
    expect(pageIntro).not.toContain("hidden size-24");
    expect(emptyState).toContain("macaron-panel");
  });

  it("extends the cute macaron treatment beyond the home page", () => {
    expect(checklistPage).toContain("macaron-panel");
    expect(hospitalPage).toContain("macaron-panel");
    expect(settingsPage).toContain("macaron-panel");
    expect(checklistPage).toContain("macaron-note");
    expect(hospitalPage).toContain("soft-detail");
    expect(settingsPage).toContain("soft-detail");
  });

  it("uses app-like hero, checklist and timer patterns on action pages", () => {
    expect(goPage).toContain("准备就绪度");
    expect(goPage).toContain("全部 OK，出发！");
    expect(goPage).toContain("markAllDone");
    expect(goPage).toContain("CuteIllustration");
    expect(contractionsPage).toContain("本次宫缩计时圆盘");
    expect(contractionsPage).toContain("conic-gradient");
    expect(contractionsPage).toContain("CuteIllustration");
  });

  it("keeps setup and hospital confirmation close to the mobile app mockups", () => {
    expect(setupPage).toContain("只需 2 分钟");
    expect(setupPage).toContain("SetupFieldRow");
    expect(setupPage).toContain("SetupHeader");
    expect(setupPage).toContain("完善信息，生成专属待产方案");
    expect(setupPage).toContain("生成我的待产清单");
    expect(setupPage).toContain("首次生产？");
    expect(setupPage).toContain("更多医院信息（可选）");
    expect(setupPage).toContain("SegmentButton");
    expect(setupPage).toContain("grid grid-cols-2");
    expect(hospitalPage).toContain("bg-blush/85");
    expect(hospitalPage).not.toContain("TabsTrigger");
    expect(hospitalQuestionCard).toContain("app-icon-tile");
    expect(hospitalQuestionCard).toContain("ClipboardList");
    expect(hospitalQuestionCard).toContain("Hospital");
  });

  it("uses app-like timeline and profile navigation patterns", () => {
    expect(timelinePage).toContain("bg-gradient-to-b from-mint");
    expect(timelinePage).toContain("grid-cols-[2.25rem_1fr]");
    expect(timelinePage).toContain("stageStatus.percent === 100");
    expect(timelinePage).toContain("预产期 {profile.dueDate}");
    expect(timelinePage).toContain("CuteIllustration");
    expect(settingsPage).toContain("准爸爸头像");
    expect(settingsPage).toContain("数据与备份");
  });

  it("keeps controls soft without reintroducing embedded page scrollers", () => {
    expect(button).toContain("rounded-full");
    expect(card).toContain("bg-card/95");
    expect(checklistPage).not.toContain("sticky top-0");
    expect(checklistPage).not.toContain("overflow-x-auto");
    expect(checklistPage).not.toContain("min-w-max");
  });
});
