import type { ReactNode } from "react";

import type { GrowthIllustrationKind } from "@/lib/growth";

type GrowthAnalogyIllustrationProps = {
  analogy: string;
  kind: GrowthIllustrationKind;
  week: number;
};

type ArtPalette = {
  from: string;
  to: string;
  ink: string;
  leaf: string;
  leafInk: string;
  detail?: "coconut" | "watermelon";
};

type IllustrationShape = GrowthIllustrationKind | "pineapple";

const LEAF_GREEN = { leaf: "#7fae62", leafInk: "#5f8c47" } as const;

const KIND_PALETTES: Record<GrowthIllustrationKind, ArtPalette> = {
  // 覆盆子 / 樱桃 / 草莓
  berry: { from: "#f87d96", to: "#dd4f6e", ink: "#b23a55", ...LEAF_GREEN },
  // 无花果 / 牛油果 / 梨
  pear: { from: "#e8d879", to: "#b8bc52", ink: "#94933c", ...LEAF_GREEN },
  // 李子 / 桃子 / 苹果
  round: { from: "#f4745f", to: "#d84a3d", ink: "#b03a30", ...LEAF_GREEN },
  // 柠檬
  citrus: { from: "#ffd964", to: "#f0b236", ink: "#cf9426", ...LEAF_GREEN },
  // 甜椒
  pepper: { from: "#f26b57", to: "#d94a3a", ink: "#b03a2e", ...LEAF_GREEN },
  // 香蕉
  banana: { from: "#ffd95e", to: "#f0b53a", ink: "#cf9526", ...LEAF_GREEN },
  // 胡萝卜
  root: { from: "#f89a4e", to: "#e8762e", ink: "#c05f1f", ...LEAF_GREEN },
  // 玉米
  corn: { from: "#ffd35e", to: "#f0af36", ink: "#cf8f26", ...LEAF_GREEN },
  // 奶油南瓜 / 南瓜
  squash: { from: "#eec27c", to: "#d99a4e", ink: "#b97f3c", ...LEAF_GREEN },
  // 小葱 / 芹菜 / 大葱
  stalk: { from: "#8cc06f", to: "#65a04c", ink: "#508140", ...LEAF_GREEN },
  // 花椰菜
  crown: { from: "#82bb63", to: "#5e9a48", ink: "#4a7a3a", ...LEAF_GREEN },
  // 罗马生菜 / 甜菜叶
  leaf: { from: "#8cc476", to: "#67a852", ink: "#508641", ...LEAF_GREEN },
};

const WEEK_PALETTES: Partial<Record<number, ArtPalette>> = {
  // 芒果
  19: { from: "#ffd36b", to: "#f5a83d", ink: "#cf7f2a", ...LEAF_GREEN },
  // 红薯
  22: { from: "#cf8b72", to: "#a85a4a", ink: "#8a463a", ...LEAF_GREEN },
  // 西柚
  23: { from: "#ffb08a", to: "#f27f5f", ink: "#cf5f43", ...LEAF_GREEN },
  // 西葫芦
  25: { from: "#9cc773", to: "#74a84f", ink: "#5c8a3d", ...LEAF_GREEN },
  // 茄子
  28: { from: "#b48ac7", to: "#8a5aa8", ink: "#6c4386", ...LEAF_GREEN },
  // 圆白菜
  30: { from: "#a9cf7f", to: "#7fb35c", ink: "#5f9147", ...LEAF_GREEN },
  // 椰子
  31: {
    from: "#bd9166",
    to: "#8a5f3f",
    ink: "#6e4a30",
    detail: "coconut",
    ...LEAF_GREEN,
  },
  // 哈密瓜 / 蜜瓜
  32: { from: "#cfe08b", to: "#a4c264", ink: "#86a04b", ...LEAF_GREEN },
  34: { from: "#cfe08b", to: "#a4c264", ink: "#86a04b", ...LEAF_GREEN },
  // 小西瓜
  39: {
    from: "#62ad64",
    to: "#3d8347",
    ink: "#2f6b3a",
    detail: "watermelon",
    ...LEAF_GREEN,
  },
};

const WEEK_SHAPES: Partial<Record<number, IllustrationShape>> = {
  // 菠萝
  35: "pineapple",
};

export function GrowthAnalogyIllustration({
  analogy,
  kind,
  week,
}: GrowthAnalogyIllustrationProps) {
  const gradientId = `growth-analogy-${week}`;
  const palette = WEEK_PALETTES[week] ?? KIND_PALETTES[kind];
  const shape = WEEK_SHAPES[week] ?? kind;

  return (
    <svg
      aria-label={`${analogy}大小的原创示意图`}
      className="h-auto w-full"
      role="img"
      viewBox="0 0 260 190"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{`${analogy}大小的原创示意图`}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={palette.from} />
          <stop offset="1" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <rect
        height="180"
        rx="34"
        style={{ fill: "hsl(var(--card))" }}
        width="250"
        x="5"
        y="5"
      />
      <circle
        cx="39"
        cy="37"
        r="7"
        style={{ fill: "hsl(var(--secondary))" }}
      />
      <circle
        cx="223"
        cy="47"
        r="11"
        style={{ fill: "hsl(var(--muted))" }}
      />
      <path
        d="M28 153c33 15 70 22 105 20 39-2 73-12 101-31"
        fill="none"
        opacity=".65"
        strokeLinecap="round"
        strokeWidth="3"
        style={{ stroke: "hsl(var(--border))" }}
      />
      <g transform="translate(40 14)">
        <AnalogyShape
          gradientId={gradientId}
          kind={shape}
          palette={palette}
        />
      </g>
      <g
        aria-hidden="true"
        opacity=".55"
        style={{ fill: "hsl(var(--muted-foreground))" }}
      >
        <circle cx="58" cy="160" r="2.5" />
        <circle cx="78" cy="160" r="2.5" />
        <circle cx="98" cy="160" r="2.5" />
        <circle cx="118" cy="160" r="2.5" />
        <circle cx="138" cy="160" r="2.5" />
        <circle cx="158" cy="160" r="2.5" />
        <circle cx="178" cy="160" r="2.5" />
        <circle cx="198" cy="160" r="2.5" />
      </g>
    </svg>
  );
}

function AnalogyShape({
  gradientId,
  kind,
  palette,
}: {
  gradientId: string;
  kind: IllustrationShape;
  palette: ArtPalette;
}) {
  const body = {
    fill: `url(#${gradientId})`,
    stroke: palette.ink,
    strokeLinejoin: "round" as const,
    strokeWidth: 3.5,
  };
  const greens = {
    fill: palette.leaf,
    stroke: palette.leafInk,
    strokeLinejoin: "round" as const,
    strokeWidth: 3,
  };
  let shape: ReactNode = null;

  switch (kind) {
    case "berry":
      shape = (
        <>
          <path
            d="M90 40c-1-12 4-21 13-27"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path d="M92 42c10-12 24-14 34-8-7 9-20 12-34 8Z" {...greens} />
          <path d="M88 42c-10-12-24-14-34-8 7 9 20 12 34 8Z" {...greens} />
          <g {...body}>
            <circle cx="73" cy="66" r="17" />
            <circle cx="107" cy="66" r="17" />
            <circle cx="90" cy="86" r="18" />
            <circle cx="68" cy="101" r="15" />
            <circle cx="112" cy="101" r="15" />
            <circle cx="90" cy="114" r="15" />
          </g>
          <g fill="#ffffff" opacity=".38" stroke="none">
            <circle cx="67" cy="60" r="4" />
            <circle cx="84" cy="79" r="4" />
            <circle cx="63" cy="96" r="3.4" />
          </g>
        </>
      );
      break;
    case "round":
      shape = (
        <>
          <path
            d="M90 45c0-14 4-24 12-31"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path d="M94 46c11-13 26-15 37-8-8 10-22 13-37 8Z" {...greens} />
          <path
            {...body}
            d="M90 47c-9-8-24-10-34-2-12 9-17 24-15 39 3 26 22 46 49 46s46-20 49-46c2-15-3-30-15-39-10-8-25-6-34 2Z"
          />
          {palette.detail === "coconut" ? (
            <g fill={palette.ink} stroke="none">
              <circle cx="79" cy="82" r="5" />
              <circle cx="101" cy="82" r="5" />
              <circle cx="90" cy="99" r="5" />
            </g>
          ) : null}
          {palette.detail === "watermelon" ? (
            <g
              fill="none"
              opacity=".55"
              stroke={palette.ink}
              strokeLinecap="round"
              strokeWidth="6"
            >
              <path d="M63 54c-8 21-6 45 6 66" />
              <path d="M90 50c-6 25-6 52 0 76" />
              <path d="M117 54c8 21 6 45-6 66" />
            </g>
          ) : null}
          <path
            d="M58 66c4-8 11-13 19-15"
            fill="none"
            opacity=".4"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeWidth="6"
          />
        </>
      );
      break;
    case "pear":
      shape = (
        <>
          <path
            d="M90 34c0-10 4-17 11-22"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path d="M93 35c10-11 23-13 33-7-7 9-19 12-33 7Z" {...greens} />
          <path
            {...body}
            d="M90 35c-11 0-15 12-17 24-2 12-11 19-19 30-18 25-3 55 36 55s54-30 36-55c-8-11-17-18-19-30-2-12-6-24-17-24Z"
          />
          <path
            d="M60 96c3-8 9-14 16-17"
            fill="none"
            opacity=".4"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeWidth="6"
          />
        </>
      );
      break;
    case "citrus":
      shape = (
        <>
          <circle {...body} cx="90" cy="91" r="54" />
          <circle
            cx="90"
            cy="91"
            fill="none"
            opacity=".55"
            r="42"
            stroke="#fff7e8"
            strokeWidth="3"
          />
          <path
            d="m90 49 0 84M49 91h82M61 62l58 58M119 62l-58 58"
            opacity=".5"
            stroke="#fff7e8"
            strokeWidth="2"
          />
          <path d="M90 37c9-11 22-13 32-7-7 9-18 12-32 7Z" {...greens} />
        </>
      );
      break;
    case "pepper":
      shape = (
        <>
          <path
            d="M93 44c-2-14 2-24 11-31"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="7"
          />
          <path
            {...body}
            d="M90 44c-12-13-36-7-43 13-5 15 1 30 5 44 6 23 11 48 29 52 9 2 13-6 16-6s7 8 16 6c18-4 23-29 29-52 4-14 10-29 5-44-7-20-31-26-43-13-4 4-10 4-14 0Z"
          />
          <path
            d="M90 58c-6 25-6 52 0 76M66 60c-8 24-7 49 3 72M114 60c8 24 7 49-3 72"
            fill="none"
            opacity=".3"
            stroke={palette.ink}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      );
      break;
    case "banana":
      shape = (
        <>
          <path
            {...body}
            d="M44 44c2 6 3 12 3 18 6 38 40 66 82 60 20-3 34-14 41-31 2-5-3-9-8-7-28 14-58 11-80-8-13-11-22-26-27-42-1-5-5-8-9-7-3 1-4 5-2 17Z"
          />
          <path
            d="M60 62c12 30 40 48 72 46M69 52c10 26 34 44 64 47"
            fill="none"
            opacity=".45"
            stroke={palette.ink}
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M41 44c-3-8 0-15 7-17 6-2 11 1 12 7"
            fill="none"
            stroke="#8a6a3a"
            strokeLinecap="round"
            strokeWidth="6"
          />
        </>
      );
      break;
    case "root":
      shape = (
        <>
          <path
            d="M86 40c-14-8-20-18-18-30M94 38c-1-14 5-24 16-30M100 44c12-8 24-9 34-4"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            {...body}
            d="M72 42c22-6 44 4 46 24 2 19-12 44-28 62-7 8-13 15-17 21-2 4-8 3-9-2-3-13-8-27-12-41-5-19-4-38 6-51 3-5 8-11 14-13Z"
          />
          <path
            d="M70 76h28M66 96h24M68 116h18"
            fill="none"
            opacity=".45"
            stroke={palette.ink}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      );
      break;
    case "corn":
      shape = (
        <>
          <path
            d="M64 146C50 118 50 82 64 52c4-9 12-14 18-14s14 5 18 14c14 30 14 66 0 94"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="13"
          />
          <rect {...body} height="112" rx="32" width="62" x="59" y="26" />
          <path
            d="M68 52h44M66 74h48M66 96h48M68 118h44M82 30v104M98 30v104"
            fill="none"
            opacity=".45"
            stroke="#fff8ea"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </>
      );
      break;
    case "squash":
      shape = (
        <>
          <path
            d="M89 30c0-10 4-17 12-22"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="7"
          />
          <path
            {...body}
            d="M88 28c-16 0-22 14-17 30 3 11-2 17-12 26-20 19-24 50-4 63 18 12 52 11 71-1 20-13 16-44-4-62-10-9-15-15-12-26 5-16-6-30-22-30Z"
          />
          <path
            d="M74 40c-8 30-8 64 2 98M104 40c8 30 8 64-2 98"
            fill="none"
            opacity=".3"
            stroke={palette.ink}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      );
      break;
    case "stalk":
      shape = (
        <>
          <path
            d="M63 151C70 110 75 66 72 22M90 151c2-46 2-89-2-130M117 151c-6-46-7-89-2-130"
            fill="none"
            stroke={palette.leaf}
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path
            d="M73 56C44 44 36 27 42 10M89 69c-25-18-27-39-19-56M112 60c25-15 31-32 28-50"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="11"
          />
          <path
            d="M63 151C70 110 75 66 72 22M90 151c2-46 2-89-2-130M117 151c-6-46-7-89-2-130"
            fill="none"
            opacity=".35"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </>
      );
      break;
    case "crown":
      shape = (
        <>
          <path
            d="M72 146c6-26 8-44 8-58h20c0 16 3 36 9 58"
            fill="#b7cf9a"
            stroke="#8aa870"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <g {...body}>
            <circle cx="60" cy="72" r="26" />
            <circle cx="90" cy="52" r="30" />
            <circle cx="120" cy="72" r="26" />
            <circle cx="74" cy="92" r="24" />
            <circle cx="106" cy="92" r="24" />
          </g>
          <g fill="#ffffff" opacity=".3" stroke="none">
            <circle cx="52" cy="64" r="5" />
            <circle cx="82" cy="42" r="5" />
            <circle cx="112" cy="64" r="5" />
          </g>
        </>
      );
      break;
    case "pineapple":
      shape = (
        <>
          <path
            d="M90 44c-2-16 2-28 12-36M90 44c-12-10-16-22-12-34M90 44c12-10 16-22 12-34M90 44c-16-4-26-12-30-24M90 44c16-4 26-12 30-24"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="7"
          />
          <ellipse {...body} cx="90" cy="98" rx="42" ry="52" />
          <path
            d="M58 66l64 64M122 66l-64 64M52 92h76M56 118h68"
            fill="none"
            opacity=".4"
            stroke={palette.ink}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </>
      );
      break;
    case "leaf":
      shape = (
        <>
          <path
            d="M89 151C83 108 83 68 92 24"
            fill="none"
            stroke={palette.leafInk}
            strokeLinecap="round"
            strokeWidth="9"
          />
          <path
            {...body}
            d="M91 26C48 21 28 51 47 81c-26 18-21 55 14 62 10 2 22-2 30-11 9 9 21 13 31 11 35-7 40-44 14-62 19-30-2-60-45-55Z"
          />
          <path
            d="M91 35v97M91 70 59 51M91 91l39-24M91 111l-31 19"
            fill="none"
            opacity=".45"
            stroke="#fff8ea"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </>
      );
      break;
  }

  return <g>{shape}</g>;
}
