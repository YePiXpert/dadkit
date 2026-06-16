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
const homePage = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
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
const timelineDashboard = readFileSync(
  join(process.cwd(), "components", "TimelineDashboard.tsx"),
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
const checklistCategoryCard = readFileSync(
  join(process.cwd(), "components", "ChecklistCategoryCard.tsx"),
  "utf8",
);
const pwaRegister = readFileSync(
  join(process.cwd(), "components", "PwaRegister.tsx"),
  "utf8",
);
const emptyState = readFileSync(
  join(process.cwd(), "components", "EmptyState.tsx"),
  "utf8",
);
const banned = (...parts: string[]) => parts.join("");

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
    expect(globals).toContain("max-w-[390px]");
    expect(globals).toContain("max-width: min(100%, 390px)");
    expect(globals).toContain("overflow-x: hidden");
    expect(globals).toContain("touch-action: pan-x pan-y");
    expect(header).toContain("待产准备");
    expect(header).not.toContain(banned("安心", "待产清单"));
    expect(header).toContain("getBabyMascot");
    expect(layout).toContain("#FF5C7A");
    expect(layout).toContain("maximumScale: 1");
    expect(layout).toContain("userScalable: false");
    expect(layout).toContain('viewportFit: "cover"');
    expect(pwaRegister).toContain("gesturestart");
    expect(pwaRegister).toContain("touchmove");
    expect(pwaRegister).toContain("touchend");
    expect(pwaRegister).toContain("preventDoubleTapZoom");
    expect(pwaRegister).toContain("passive: false");
    expect(mobileNav).toContain("bg-card/95");
    expect(mobileNav).toContain("after:bg-primary");
    expect(mobileNav).toContain("h-[3.25rem]");
    expect(mobileNav).toContain("mobile-shell grid");
    expect(mobileNav).toContain('label: "设置"');
    expect(mobileNav).toContain("hiddenRoutes");
    expect(mobileNav).toContain('"/setup"');
    expect(mobileNav).toContain("secondaryRouteOwners");
    expect(mobileNav).toContain('"/contractions"');
    expect(mobileNav).toContain('"/go"');
    expect(mobileNav).not.toContain('"/postpartum"');
    expect(header).toContain('label: "设置"');
    expect(header).toContain("secondaryRouteOwners");
    expect(header).not.toContain('"/postpartum"');
    expect(layout).not.toContain("<MobileTopBar");
    expect(layout).not.toContain("@/components/MobileTopBar");
    expect(
      existsSync(join(process.cwd(), "components", "MobileTopBar.tsx")),
    ).toBe(false);
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
          "dadkit-horse-girl.png",
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
    expect(
      existsSync(
        join(
          process.cwd(),
          "public",
          "illustrations",
          "dadkit-go-bunny.png",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          process.cwd(),
          "public",
          "illustrations",
          "dadkit-baby-girl-timer.png",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(
          process.cwd(),
          "public",
          "illustrations",
          "dadkit-dad-avatar.png",
        ),
      ),
    ).toBe(true);
    expect(cuteIllustration).toContain("dadkit-family-transparent.png");
    expect(cuteIllustration).toContain("dadkit-horse-girl.png");
    expect(cuteIllustration).toContain("dadkit-bear-transparent.png");
    expect(cuteIllustration).toContain('variant = "horse"');
    expect(cuteIllustration).toContain("小马宝宝插图");
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
    expect(checklistPage).toContain("ChecklistProgressCard");
    expect(checklistPage).toContain("ChecklistGroupSummaryCard");
    expect(checklistPage).toContain("待产包进度");
    expect(checklistPage).not.toContain("清单总进度");
    expect(hospitalPage).toContain("macaron-panel");
    expect(settingsPage).toContain("macaron-panel");
    expect(checklistPage).toContain("macaron-note");
    expect(hospitalPage).toContain("soft-detail");
    expect(settingsPage).toContain("soft-detail");
  });

  it("uses app-like hero, checklist and timer patterns on action pages", () => {
    expect(goPage).toContain("准备就绪度");
    expect(goPage).toContain("必带物品");
    expect(goPage).toContain("GO_DISPLAY_ITEMS");
    expect(goPage).toContain("GoAdmissionInfoCard");
    expect(goPage).toContain("hospitalRouteNotes");
    expect(goPage).toContain("nightEntranceNotes");
    expect(goPage).toContain("parkingNotes");
    expect(goPage).toContain("全部确认，出发");
    expect(goPage).not.toContain(banned("全部 ", "OK", "，出发！"));
    expect(goPage).toContain("markAllDone");
    expect(goPage).toContain("bg-[linear-gradient(100deg,#ff8385");
    expect(goPage).toContain("dadkit-horse-girl.png");
    expect(goPage).not.toContain("CuteIllustration");
    expect(contractionsPage).toContain("本次宫缩计时圆盘");
    expect(contractionsPage).toContain("conic-gradient");
    expect(contractionsPage).toContain("dadkit-baby-girl-timer.png");
    expect(contractionsPage).toContain("LABOR_URGENT_SIGNAL_CARDS");
    expect(contractionsPage).toContain("WATER_BREAK_STEPS");
    expect(contractionsPage).toContain('id="labor-alerts"');
    expect(contractionsPage).not.toContain("CuteIllustration");
  });

  it("keeps setup and hospital confirmation close to the mobile app mockups", () => {
    expect(setupPage).toContain("保存后可随时修改");
    expect(setupPage).toContain("SetupFieldRow");
    expect(setupPage).toContain("SetupHeader");
    expect(setupPage).toContain("填写基础信息，生成待产清单");
    expect(setupPage).toContain("生成待产清单");
    expect(setupPage).not.toContain(banned("只需 ", "2 分钟"));
    expect(setupPage).not.toContain(banned("专属", "待产方案"));
    expect(setupPage).not.toContain("生成我的待产清单");
    expect(setupPage).toContain("宝宝性别");
    expect(setupPage).toContain("生肖会自动计算");
    expect(setupPage).toContain("首次生产？");
    expect(setupPage).toContain("更多医院信息（可选）");
    expect(setupPage).toContain("SegmentButton");
    expect(setupPage).toContain("grid grid-cols-2");
    expect(setupPage).toContain("grid-cols-3");
    expect(hospitalPage).toContain("pony-soft-card");
    expect(hospitalPage).toContain(
      "入院流程、医院提供物品、陪产和缴费信息提前确认",
    );
    expect(hospitalPage).toContain("医院规则确认表");
    expect(hospitalPage).toContain("趁早确认，入院更从容");
    expect(hospitalPage).not.toContain("dadkit-hospital-clipboard.png");
    expect(hospitalPage).toContain("HospitalQuickGrid");
    expect(hospitalPage).not.toContain("CuteIllustration");
    expect(hospitalPage).not.toContain("TabsTrigger");
    expect(hospitalQuestionCard).toContain("app-icon-tile");
    expect(hospitalQuestionCard).toContain("ClipboardList");
    expect(hospitalQuestionCard).toContain("Hospital");
  });

  it("uses app-like timeline and profile navigation patterns", () => {
    expect(timelinePage).toContain("TimelineDashboard");
    expect(timelinePage).not.toContain("max-w-[390px]");
    expect(timelineDashboard).toContain("generateTimeline");
    expect(timelineDashboard).toContain("calculateTimelineStageStatus");
    expect(timelineDashboard).toContain("generateTodayTasks");
    expect(timelineDashboard).toContain("CurrentStagePanel");
    expect(timelineDashboard).toContain("PriorityTasksPanel");
    expect(timelineDashboard).toContain("TimelineStageRow");
    expect(timelineDashboard).toContain("currentStageList");
    expect(timelineDashboard).toContain("otherStageList");
    expect(timelineDashboard).toContain("TimelineDueDateCard");
    expect(timelineDashboard).toContain("formatDueDateLabel");
    expect(timelineDashboard).toContain("mobile-shell grid gap-3 overflow-hidden");
    expect(timelineDashboard).toContain("formatBabyZodiacLine");
    expect(timelineDashboard).toContain("getBabyMascot");
    expect(timelineDashboard).toContain("打开临出门检查");
    expect(timelineDashboard).toContain("阶段安排");
    expect(timelineDashboard).toContain("查看其他阶段");
    expect(timelineDashboard).toMatch(/<details[\s\S]*查看其他阶段/);
    expect(timelineDashboard).toContain("flex min-w-0 gap-3");
    expect(timelineDashboard).not.toContain(
      "grid-cols-[2.75rem_minmax(0,1fr)]",
    );
    expect(timelineDashboard).toContain("w-full min-w-0 max-w-full");
    expect(timelineDashboard).toContain("whitespace-normal break-words");
    expect(timelinePage).not.toContain("lg:max-w-none");
    expect(timelinePage).not.toContain("TIMELINE_MILESTONES");
    expect(timelineDashboard).not.toContain("TimelineMilestoneRow");
    expect(timelineDashboard).not.toContain("CuteIllustration");
    expect(settingsPage).toContain("formatBabyZodiacLine");
    expect(settingsPage).toContain("getBabyMascot");
    expect(settingsPage).not.toContain("dadkit-dad-avatar.png");
    expect(settingsPage).toContain("备份与恢复");
    expect(settingsPage).toContain("应用信息");
    expect(settingsPage).toContain("SettingsDetailsSection");
    expect(settingsPage).toContain("<details");
    expect(settingsPage).toMatch(/<SettingsDetailsSection[\s\S]*title="最近备份"/);
    expect(settingsPage).toMatch(/<SettingsDetailsSection[\s\S]*title="WebDAV 备份"/);
    expect(settingsPage).not.toContain("常用小工具");
    expect(settingsPage).not.toContain("完整工具目录");
  });

  it("keeps controls soft without reintroducing embedded page scrollers", () => {
    expect(button).toContain("rounded-full");
    expect(card).toContain("bg-card/95");
    expect(checklistPage).not.toContain("sticky top-0");
    expect(checklistPage).not.toContain("overflow-x-auto");
    expect(checklistPage).not.toContain("min-w-max");
  });

  it("lets compact mobile row text wrap on narrow PWA screens", () => {
    expect(homePage).not.toContain("block truncate text-sm font-bold leading-5");
    expect(goPage).not.toContain(
      "min-w-0 truncate text-base font-bold tracking-normal",
    );
    expect(hospitalPage).not.toContain("truncate text-base font-black");
    expect(hospitalPage).not.toContain("block truncate text-sm font-bold");
    expect(settingsPage).not.toContain(
      "block truncate text-xs text-muted-foreground",
    );
    expect(setupPage).not.toContain("truncate text-xs text-muted-foreground");
    expect(checklistCategoryCard).not.toContain(
      "block truncate text-base font-bold tracking-normal",
    );
    expect(homePage).toContain("break-words text-sm font-bold leading-5");
    expect(goPage).toContain(
      "min-w-0 break-words text-base font-bold leading-5 tracking-normal",
    );
    expect(hospitalPage).toContain("break-words text-base font-black");
    expect(settingsPage).toContain(
      "block break-words text-xs leading-4 text-muted-foreground",
    );
    expect(setupPage).toContain(
      "break-words text-xs leading-4 text-muted-foreground",
    );
    expect(checklistCategoryCard).toContain(
      "block break-words text-base font-bold leading-5 tracking-normal",
    );
  });
});
