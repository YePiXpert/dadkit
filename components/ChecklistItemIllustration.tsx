import React, { type ReactNode } from "react";

import {
  getChecklistIllustrationDescriptor,
  type ChecklistIllustrationDescriptor,
  type ChecklistIllustrationFamily,
  type ChecklistIllustrationItem,
} from "@/lib/checklist-illustrations";
import { cn } from "@/lib/utils";

type Palette = ChecklistIllustrationDescriptor["palette"];

function IllustrationObject({
  family,
  palette,
}: {
  family: ChecklistIllustrationFamily;
  palette: Palette;
}) {
  const { highlight, ink, primary, secondary } = palette;
  const common = {
    stroke: ink,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
  };

  const art: Record<ChecklistIllustrationFamily, () => ReactNode> = {
    document: () => (
      <>
        <path d="M30 16h25l12 12v36H30z" fill={highlight} {...common} />
        <path d="M55 16v13h12" fill={secondary} {...common} />
        <path d="M37 39h22M37 47h17M37 55h20" {...common} />
        <circle cx="39" cy="27" r="4" fill={primary} stroke="none" />
      </>
    ),
    card: () => (
      <>
        <rect x="23" y="24" width="50" height="34" rx="6" fill={highlight} {...common} />
        <path d="M23 34h50" {...common} />
        <rect x="30" y="41" width="12" height="9" rx="2" fill={secondary} stroke="none" />
        <path d="M49 44h16M49 50h11" {...common} />
      </>
    ),
    money: () => (
      <>
        <path d="M23 29h47v29H23z" fill={secondary} {...common} />
        <path d="M28 34c4 0 6-2 6-5h25c0 3 2 5 6 5v19c-4 0-6 2-6 5H34c0-3-2-5-6-5z" fill={highlight} {...common} />
        <circle cx="47" cy="43.5" r="8" fill={primary} {...common} />
        <path d="M43 43.5h8M47 39v9" {...common} />
      </>
    ),
    phone: () => (
      <>
        <rect x="33" y="12" width="30" height="55" rx="7" fill={highlight} {...common} />
        <rect x="37" y="20" width="22" height="36" rx="3" fill={secondary} stroke="none" />
        <path d="M43 16h10" {...common} />
        <circle cx="48" cy="62" r="2" fill={primary} stroke="none" />
      </>
    ),
    electronics: () => (
      <>
        <rect x="25" y="22" width="39" height="36" rx="8" fill={highlight} {...common} />
        <path d="m47 27-10 17h9l-4 13 15-20h-9z" fill={primary} {...common} />
        <path d="M64 34h7v13h-7M71 38h4M71 44h4" {...common} />
      </>
    ),
    eyewear: () => (
      <>
        <circle cx="34" cy="42" r="12" fill={highlight} {...common} />
        <circle cx="62" cy="42" r="12" fill={secondary} {...common} />
        <path d="M46 39c1-4 3-4 4 0M22 38l-7-4M74 38l7-4" {...common} />
        <path d="M29 38c2-3 6-4 9-2M57 38c2-3 6-4 9-2" stroke={primary} strokeLinecap="round" strokeWidth="2" />
      </>
    ),
    medical: () => (
      <>
        <rect x="22" y="24" width="52" height="38" rx="9" fill={highlight} {...common} />
        <path d="M39 24v-5c0-3 2-5 5-5h8c3 0 5 2 5 5v5" {...common} />
        <path d="M48 32v22M37 43h22" stroke={primary} strokeLinecap="round" strokeWidth="6" />
      </>
    ),
    cosmetic: () => (
      <>
        <path d="M35 22h26l4 12v25c0 4-3 7-7 7H38c-4 0-7-3-7-7V34z" fill={highlight} {...common} />
        <path d="M35 22v-7h26v7M31 34h34" fill={secondary} {...common} />
        <path d="M48 42c-7 5-7 12 0 15 7-3 7-10 0-15Z" fill={primary} {...common} />
      </>
    ),
    bottle: () => (
      <>
        <path d="M38 20h20v9l7 9v22c0 4-3 7-7 7H38c-4 0-7-3-7-7V38l7-9z" fill={highlight} {...common} />
        <path d="M38 25h20M34 39h28" {...common} />
        <path d="M39 47h18M39 55h13" stroke={primary} strokeLinecap="round" strokeWidth="3" />
        <path d="M42 14h12v6H42z" fill={secondary} {...common} />
      </>
    ),
    diaper: () => (
      <>
        <path d="M23 22h50l-6 36c-11 10-27 10-38 0z" fill={highlight} {...common} />
        <path d="M24 28h16l-4 14-10-5m46-9H56l4 14 10-5" fill={secondary} {...common} />
        <path d="M38 55c6-5 14-5 20 0" stroke={primary} strokeLinecap="round" strokeWidth="4" />
      </>
    ),
    bath: () => (
      <>
        <path d="M19 38h58l-6 18c-2 6-7 10-14 10H39c-7 0-12-4-14-10z" fill={highlight} {...common} />
        <path d="M25 38c4-8 11-13 20-13h8c9 0 15 5 18 13" fill={secondary} {...common} />
        <path d="M30 44c5 3 10 3 15 0s10-3 15 0 8 3 12 0" stroke={primary} strokeLinecap="round" strokeWidth="3" />
      </>
    ),
    hygiene: () => (
      <>
        <path d="M24 58 58 24l10 10-34 34z" fill={secondary} {...common} />
        <path d="m56 22 6-6m0 12 9-6m-3 13 8-1" stroke={primary} strokeLinecap="round" strokeWidth="3" />
        <path d="m28 53 11 11" {...common} />
        <path d="M26 22c0 7-5 11-10 11S6 29 6 22c0-6 10-15 10-15s10 9 10 15Z" fill={highlight} {...common} />
      </>
    ),
    laundry: () => (
      <>
        <path d="M22 56h52L49 33z" fill={highlight} {...common} />
        <path d="M49 33v-8c0-5 5-8 10-6" {...common} />
        <path d="M29 56h40" stroke={primary} strokeLinecap="round" strokeWidth="4" />
        <circle cx="28" cy="27" r="6" fill={secondary} {...common} />
        <circle cx="18" cy="34" r="3" fill={primary} stroke="none" />
      </>
    ),
    clothing: () => (
      <>
        <path d="m31 24 11-6c2 7 10 7 12 0l11 6 11 13-11 9-5-6v27H36V40l-5 6-11-9z" fill={primary} {...common} />
        <path d="M42 18c1 8 11 8 12 0" stroke={highlight} strokeLinecap="round" strokeWidth="4" />
        <path d="M41 53h14" stroke={secondary} strokeLinecap="round" strokeWidth="4" />
      </>
    ),
    footwear: () => (
      <>
        <path d="M16 47c10 0 15-5 20-16l10 6c-2 13-9 23-25 23-6 0-9-3-9-7 0-3 1-5 4-6Z" fill={secondary} {...common} />
        <path d="M50 45c8 0 13-4 17-12l10 6c-2 12-8 20-22 20-5 0-8-3-8-7 0-3 1-5 3-7Z" fill={highlight} {...common} />
        <path d="M20 51h20M55 49h15" stroke={primary} strokeLinecap="round" strokeWidth="3" />
      </>
    ),
    textile: () => (
      <>
        <path d="M22 25c13 5 28-4 49 3L65 64c-18-7-31 3-49-3z" fill={highlight} {...common} />
        <path d="m28 31-6 24m17-22-6 26m18-26-5 26m17-24-4 21" stroke={secondary} strokeWidth="3" />
        <path d="M22 43c13 5 28-4 46 2" stroke={primary} strokeLinecap="round" strokeWidth="3" />
      </>
    ),
    bedding: () => (
      <>
        <path d="M19 35h58v27H19z" fill={secondary} {...common} />
        <path d="M19 35V23h21c8 0 13 5 13 12" fill={highlight} {...common} />
        <path d="M53 35h24v-5c0-5-4-9-9-9H53z" fill={primary} {...common} />
        <path d="M25 62v6M71 62v6" {...common} />
      </>
    ),
    furniture: () => (
      <>
        <path d="M21 22h54v38H21z" fill={highlight} {...common} />
        <path d="M21 34h54M29 22v38m38-38v38M21 52h54" {...common} />
        <path d="M27 60v8m42-8v8" {...common} />
        <path d="M36 43h24" stroke={primary} strokeLinecap="round" strokeWidth="4" />
      </>
    ),
    transport: () => (
      <>
        <path d="m23 38 6-17h31l10 17 7 6v15H17V44z" fill={primary} {...common} />
        <path d="M30 38h33l-7-12H34z" fill={highlight} {...common} />
        <circle cx="29" cy="61" r="7" fill={ink} stroke={highlight} strokeWidth="3" />
        <circle cx="65" cy="61" r="7" fill={ink} stroke={highlight} strokeWidth="3" />
        <path d="M22 46h11m29 0h10" stroke={secondary} strokeLinecap="round" strokeWidth="4" />
      </>
    ),
    food: () => (
      <>
        <path d="M25 29h42v23c0 10-8 17-17 17h-8c-9 0-17-7-17-17z" fill={highlight} {...common} />
        <path d="M67 36h5c7 0 9 6 7 11-2 4-5 6-12 6" {...common} />
        <path d="M35 17c0 6 6 6 6 12m10-12c0 6 6 6 6 12" stroke={primary} strokeLinecap="round" strokeWidth="3" />
        <path d="M34 53h24" stroke={secondary} strokeLinecap="round" strokeWidth="4" />
      </>
    ),
    bag: () => (
      <>
        <path d="M34 27v-6c0-8 6-13 14-13s14 5 14 13v6" {...common} />
        <rect x="18" y="25" width="60" height="43" rx="10" fill={primary} {...common} />
        <path d="M18 42h60" stroke={highlight} strokeWidth="4" />
        <path d="m39 54 7 6 13-15" stroke={secondary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      </>
    ),
    sleep: () => (
      <>
        <path d="M60 59C40 64 24 48 30 29c3-9 9-15 17-18-7 18 8 35 27 29-2 9-7 15-14 19Z" fill={secondary} {...common} />
        <path d="m69 17 2 6 6 2-6 2-2 6-2-6-6-2 6-2zm9 25 1 4 4 1-4 2-1 4-2-4-4-2 4-1z" fill={primary} stroke="none" />
      </>
    ),
    "baby-care": () => (
      <>
        <circle cx="48" cy="40" r="25" fill={highlight} {...common} />
        <path d="M34 26c1-8 9-13 16-11 6 1 10 6 10 12" fill={secondary} {...common} />
        <circle cx="39" cy="39" r="2.5" fill={ink} stroke="none" />
        <circle cx="57" cy="39" r="2.5" fill={ink} stroke="none" />
        <path d="M41 51c5 4 10 4 15 0" {...common} />
        <path d="M48 43c-3 2-3 5 0 6" stroke={primary} strokeLinecap="round" strokeWidth="3" />
      </>
    ),
    home: () => (
      <>
        <path d="m14 38 34-28 34 28-8 7-26-22-26 22z" fill={primary} {...common} />
        <path d="M23 40v28h50V40L48 19z" fill={highlight} {...common} />
        <path d="M41 49h14v19H41z" fill={secondary} {...common} />
        <path d="M28 45h9v9h-9zm31 0h9v9h-9z" fill={primary} stroke="none" />
      </>
    ),
    task: () => (
      <>
        <rect x="25" y="17" width="48" height="53" rx="7" fill={highlight} {...common} />
        <path d="M39 17v-3c0-4 3-7 7-7h5c4 0 7 3 7 7v3" {...common} />
        <path d="m34 34 5 5 9-11M34 52l5 5 9-11M54 35h11M54 53h11" stroke={primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      </>
    ),
    package: () => (
      <>
        <path d="m17 28 31-17 31 17-31 17z" fill={primary} {...common} />
        <path d="M17 28v31l31 17V45zm62 0v31L48 76V45z" fill={secondary} {...common} />
        <path d="M48 45v31" {...common} />
        <path d="m62 20-31 17" stroke={highlight} strokeWidth="4" />
      </>
    ),
  };

  return <g>{art[family]()}</g>;
}

function IllustrationFingerprint({
  descriptor,
}: {
  descriptor: ChecklistIllustrationDescriptor;
}) {
  const digits = [
    descriptor.markerCode % 6,
    Math.floor(descriptor.markerCode / 6) % 6,
    Math.floor(descriptor.markerCode / 36) % 6,
  ];

  return (
    <g aria-hidden="true" opacity="0.72">
      {digits.map((digit, index) => (
        <path
          d={`M${80 + index * 4} 70v-${2 + digit * 1.2}`}
          key={`${index}-${digit}`}
          stroke={descriptor.palette.ink}
          strokeLinecap="round"
          strokeWidth="2"
        />
      ))}
    </g>
  );
}

function IllustrationVariantDecoration({
  descriptor,
}: {
  descriptor: ChecklistIllustrationDescriptor;
}) {
  const { highlight, ink, primary, secondary } = descriptor.palette;
  const common = {
    stroke: ink,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  switch (descriptor.variant) {
    case 0:
      return (
        <g opacity="0.7">
          <path d="m10 58 15-15m-10 21 18-18m-10 20 13-13" stroke={primary} strokeLinecap="round" strokeWidth="2.6" />
        </g>
      );
    case 1:
      return (
        <g opacity="0.78">
          <circle cx="15" cy="51" fill={primary} r="4" />
          <circle cx="25" cy="58" fill={secondary} r="3.2" />
          <circle cx="31" cy="48" fill={primary} r="2.4" />
        </g>
      );
    case 2:
      return (
        <path
          d="M19 62C7 54 12 43 20 49c8-6 13 5 1 13l-1 .7z"
          fill={primary}
          opacity="0.72"
          {...common}
        />
      );
    case 3:
      return (
        <g opacity="0.76" stroke={primary} strokeLinecap="round" strokeWidth="3">
          <path d="M14 51v12M8 57h12" />
          <path d="M27 45v8M23 49h8" />
        </g>
      );
    case 4:
      return (
        <g opacity="0.82">
          <path d="M10 62c13 0 19-7 20-19-12 1-20 7-20 19Z" fill={secondary} {...common} />
          <path d="M12 61c5-5 10-9 17-16" stroke={primary} strokeLinecap="round" strokeWidth="2" />
          <path d="M19 54c-4 0-6-2-7-5m11 1c0 4 2 6 4 7" stroke={primary} strokeLinecap="round" strokeWidth="1.5" />
        </g>
      );
    case 5:
      return (
        <g opacity="0.78">
          <path d="m8 48 15-7 10 10-15 14-10-3z" fill={highlight} {...common} />
          <circle cx="17" cy="50" fill={primary} r="2.6" />
          <path d="m22 55 5-5" stroke={secondary} strokeLinecap="round" strokeWidth="2.5" />
        </g>
      );
    case 6:
      return (
        <g fill={primary} opacity="0.78">
          <path d="m18 43 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
          <path d="m29 56 1.5 3.5L34 61l-3.5 1.5L29 66l-1.5-3.5L24 61l3.5-1.5z" />
          <circle cx="10" cy="61" fill={secondary} r="2.2" />
        </g>
      );
    case 7:
      return (
        <g fill="none" opacity="0.78" strokeLinecap="round" strokeWidth="2.6">
          <path d="M7 50c5-5 10-5 15 0s10 5 15 0" stroke={primary} />
          <path d="M7 59c5-5 10-5 15 0s10 5 15 0" stroke={secondary} />
          <path d="M8 67c4-3 8-3 12 0" stroke={primary} />
        </g>
      );
    default:
      return (
        <g opacity="0.7">
          <path d="M8 59c3 8 16 12 28 5" fill="none" stroke={primary} strokeDasharray="3 3" strokeLinecap="round" strokeWidth="2.4" />
          <circle cx="11" cy="58" fill={highlight} r="3" {...common} />
          <circle cx="35" cy="64" fill={secondary} r="3" {...common} />
        </g>
      );
  }
}

function IllustrationCompositionFrame({
  descriptor,
}: {
  descriptor: ChecklistIllustrationDescriptor;
}) {
  const { ink, primary, secondary, wash } = descriptor.palette;

  switch (descriptor.compositionFrame) {
    case "arch":
      return (
        <path
          d="M17 65V42c0-21 14-33 31-33s31 12 31 33v23"
          fill="none"
          opacity="0.5"
          stroke={secondary}
          strokeLinecap="round"
          strokeWidth="5"
        />
      );
    case "pedestal":
      return (
        <g opacity="0.68">
          <ellipse cx="48" cy="66" fill={secondary} rx="31" ry="8" />
          <path d="M25 64h46" stroke={primary} strokeLinecap="round" strokeWidth="2.5" />
        </g>
      );
    case "orbit":
      return (
        <g fill="none" opacity="0.58" strokeLinecap="round">
          <ellipse cx="48" cy="40" rx="40" ry="24" stroke={secondary} strokeDasharray="5 5" strokeWidth="3" />
          <circle cx="14" cy="28" fill={primary} r="4" stroke={ink} strokeWidth="1.5" />
          <circle cx="80" cy="54" fill={wash} r="3" stroke={primary} strokeWidth="2" />
        </g>
      );
    default:
      return (
        <g opacity="0.52">
          <rect x="20" y="13" width="59" height="54" rx="13" fill={secondary} transform="rotate(5 49.5 40)" />
          <rect x="16" y="12" width="59" height="54" rx="13" fill={wash} stroke={primary} strokeWidth="2" transform="rotate(-4 45.5 39)" />
        </g>
      );
  }
}

function IllustrationCompositionSymbol({
  descriptor,
}: {
  descriptor: ChecklistIllustrationDescriptor;
}) {
  const { highlight, ink, primary, secondary } = descriptor.palette;
  const placement = {
    "lower-left": "translate(7 53)",
    "lower-right": "translate(70 53)",
    "upper-right": "translate(70 8)",
  }[descriptor.symbolPlacement];
  const common = {
    stroke: ink,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
  };

  const symbols = {
    bow: (
      <>
        <path d="M9 9C4 3 1 5 2 10c1 4 5 4 7 0 2 4 6 4 7 0 1-5-2-7-7-1Z" fill={secondary} {...common} />
        <circle cx="9" cy="9" fill={primary} r="3" {...common} />
        <path d="m7 12-2 5 4-2 4 2-2-5" fill={primary} {...common} />
      </>
    ),
    check: (
      <>
        <circle cx="9" cy="9" fill={highlight} r="8" {...common} />
        <path d="m5 9 3 3 6-7" stroke={primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
      </>
    ),
    cross: (
      <>
        <rect x="1" y="1" width="16" height="16" rx="5" fill={highlight} {...common} />
        <path d="M9 5v8M5 9h8" stroke={primary} strokeLinecap="round" strokeWidth="3" />
      </>
    ),
    drop: (
      <path d="M9 1C7 5 2 9 2 12a7 7 0 0 0 14 0c0-3-5-7-7-11Z" fill={secondary} {...common} />
    ),
    flower: (
      <>
        <circle cx="9" cy="4" fill={secondary} r="4" {...common} />
        <circle cx="14" cy="9" fill={primary} r="4" {...common} />
        <circle cx="9" cy="14" fill={secondary} r="4" {...common} />
        <circle cx="4" cy="9" fill={primary} r="4" {...common} />
        <circle cx="9" cy="9" fill={highlight} r="3" {...common} />
      </>
    ),
    heart: (
      <path d="M9 16C-2 10 2 1 9 6c7-5 11 4 0 10Z" fill={primary} {...common} />
    ),
    leaf: (
      <>
        <path d="M2 16C3 6 8 1 17 1c0 9-5 14-15 15Z" fill={secondary} {...common} />
        <path d="M3 15 14 4M8 10 5 7m5 1 2 4" stroke={primary} strokeLinecap="round" strokeWidth="1.5" />
      </>
    ),
    moon: (
      <path d="M15 14A8 8 0 0 1 6 2a8 8 0 1 0 9 12Z" fill={secondary} {...common} />
    ),
    shield: (
      <>
        <path d="m9 1 7 3v5c0 5-3 7-7 9-4-2-7-4-7-9V4z" fill={highlight} {...common} />
        <path d="m5 9 3 3 5-6" stroke={primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
      </>
    ),
    sparkle: (
      <>
        <path d="m8 1 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={primary} {...common} />
        <path d="m15 12 .8 2.2L18 15l-2.2.8L15 18l-.8-2.2L12 15l2.2-.8z" fill={secondary} />
      </>
    ),
    star: (
      <path d="m9 1 2.5 5.2L17 7l-4 4 1 6-5-2.8L4 17l1-6-4-4 5.5-.8z" fill={primary} {...common} />
    ),
    sun: (
      <>
        <circle cx="9" cy="9" fill={primary} r="5" {...common} />
        <path d="M9 0v3m0 12v3M0 9h3m12 0h3M2.5 2.5l2 2m9 9 2 2m0-13-2 2m-9 9-2 2" stroke={secondary} strokeLinecap="round" strokeWidth="2" />
      </>
    ),
  } satisfies Record<ChecklistIllustrationDescriptor["compositionSymbol"], ReactNode>;

  return (
    <g opacity="0.96" transform={placement}>
      {symbols[descriptor.compositionSymbol]}
    </g>
  );
}

/** Inline, offline-safe illustration for a checklist item. */
export function ChecklistItemIllustration({
  className,
  item,
}: {
  className?: string;
  item: ChecklistIllustrationItem;
}) {
  const descriptor = getChecklistIllustrationDescriptor(item);
  const rotation = (descriptor.variant - 4) * 0.55;
  const dotX = 13 + (descriptor.markerCode % 7) * 2.4;
  const dotY = 13 + (Math.floor(descriptor.markerCode / 7) % 5) * 2.2;

  return (
    <svg
      aria-hidden="true"
      className={cn("h-20 w-24", className)}
      data-art-key={descriptor.artKey}
      data-composition-key={descriptor.compositionKey}
      data-illustration-family={descriptor.family}
      data-illustration-signature={descriptor.signature}
      fill="none"
      focusable="false"
      viewBox="0 0 96 80"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="48"
        cy="43"
        fill={descriptor.palette.wash}
        opacity="0.62"
        rx="40"
        ry="29"
      />
      <IllustrationCompositionFrame descriptor={descriptor} />
      <circle
        cx={dotX}
        cy={dotY}
        fill={descriptor.palette.secondary}
        opacity="0.9"
        r="3.5"
      />
      <circle
        cx={83 - (descriptor.markerCode % 5) * 2}
        cy={16 + (descriptor.variant % 3) * 3}
        fill={descriptor.palette.primary}
        opacity="0.58"
        r="2.5"
      />
      <IllustrationVariantDecoration descriptor={descriptor} />
      <g transform={`rotate(${rotation} 48 40) scale(.76) translate(15 10)`}>
        <IllustrationObject family={descriptor.family} palette={descriptor.palette} />
      </g>
      <IllustrationCompositionSymbol descriptor={descriptor} />
      <IllustrationFingerprint descriptor={descriptor} />
    </svg>
  );
}
