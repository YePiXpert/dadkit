import type { ReactNode } from "react";

import type { GrowthIllustrationKind } from "@/lib/growth";

type GrowthAnalogyIllustrationProps = {
  analogy: string;
  kind: GrowthIllustrationKind;
  week: number;
};

export function GrowthAnalogyIllustration({
  analogy,
  kind,
  week,
}: GrowthAnalogyIllustrationProps) {
  const gradientId = `growth-analogy-${week}`;

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
          <stop offset="0" stopColor="#f8c7ba" />
          <stop offset="1" stopColor="#d88971" />
        </linearGradient>
      </defs>
      <rect fill="#fffaf4" height="180" rx="34" width="250" x="5" y="5" />
      <circle cx="39" cy="37" fill="#f7e9d4" r="7" />
      <circle cx="223" cy="47" fill="#f5ddd7" r="11" />
      <path
        d="M28 153c33 15 70 22 105 20 39-2 73-12 101-31"
        fill="none"
        opacity=".65"
        stroke="#ead9c7"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <g transform="translate(40 14)">
        <AnalogyShape gradientId={gradientId} kind={kind} />
      </g>
      <g aria-hidden="true" fill="#b57867" opacity=".8">
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
}: {
  gradientId: string;
  kind: GrowthIllustrationKind;
}) {
  const common = {
    fill: `url(#${gradientId})`,
    stroke: "#a95e4d",
    strokeWidth: 3,
  };
  let shape: ReactNode = null;

  switch (kind) {
    case "berry":
      shape = (
        <g {...common}>
          <circle cx="75" cy="70" r="23" />
          <circle cx="104" cy="70" r="23" />
          <circle cx="89" cy="94" r="24" />
          <circle cx="72" cy="109" r="20" />
          <circle cx="106" cy="109" r="20" />
        </g>
      );
      break;
    case "round":
      shape = (
        <>
          <circle {...common} cx="90" cy="91" r="55" />
          <path d="M91 36c5-18 19-25 34-20-8 14-19 21-34 20Z" fill="#7f9e70" />
          <path d="M89 41c0-13 3-22 9-29" fill="none" stroke="#6e7f5f" strokeWidth="4" />
        </>
      );
      break;
    case "pear":
      shape = (
        <>
          <path
            {...common}
            d="M89 31c-13 0-17 14-19 28-2 13-12 22-22 35-23 31-5 62 41 62s64-31 41-62c-10-13-20-22-22-35-2-14-6-28-19-28Z"
          />
          <path d="M91 34c8-14 18-20 31-18-5 12-16 19-31 18Z" fill="#809d70" />
        </>
      );
      break;
    case "citrus":
      shape = (
        <>
          <circle {...common} cx="90" cy="91" r="55" />
          <circle cx="90" cy="91" fill="none" opacity=".55" r="44" stroke="#fff7e8" strokeWidth="3" />
          <path d="m90 47 0 88M49 91h82M59 60l62 62M121 60l-62 62" opacity=".5" stroke="#fff7e8" strokeWidth="2" />
        </>
      );
      break;
    case "pepper":
      shape = (
        <>
          <path
            {...common}
            d="M90 42c-12-13-36-7-43 13-5 15 1 30 5 44 6 23 11 50 29 54 9 2 13-7 16-7s7 9 16 7c18-4 23-31 29-54 4-14 10-29 5-44-7-20-31-26-43-13-4 4-10 4-14 0Z"
          />
          <path d="M93 42c-2-14 2-24 11-31" fill="none" stroke="#71895f" strokeLinecap="round" strokeWidth="7" />
        </>
      );
      break;
    case "banana":
      shape = (
        <path
          {...common}
          d="M41 48c4 53 46 90 98 78 23-5 36-21 39-41-33 19-67 18-91-1-14-11-24-26-31-44-4 4-9 6-15 8Z"
        />
      );
      break;
    case "root":
      shape = (
        <>
          <path
            {...common}
            d="M75 37c30-5 57 12 51 39-7 33-37 61-62 79-5 4-11-1-8-7 14-28 4-46-3-68-7-22 1-39 22-43Z"
          />
          <path d="M79 38c-15-11-18-20-14-30M87 36c0-15 7-24 20-29M95 40c13-9 25-10 36-4" fill="none" stroke="#799267" strokeLinecap="round" strokeWidth="7" />
        </>
      );
      break;
    case "corn":
      shape = (
        <>
          <rect {...common} height="116" rx="39" width="69" x="56" y="28" />
          <path d="M58 61c-18 18-18 49 2 86M122 61c18 18 18 49-2 86" fill="none" stroke="#82a16e" strokeLinecap="round" strokeWidth="15" />
          <path d="M69 53h42M66 76h48M65 99h50M70 122h40M78 31v110M101 31v110" opacity=".45" stroke="#fff8ea" strokeWidth="2" />
        </>
      );
      break;
    case "squash":
      shape = (
        <>
          <path
            {...common}
            d="M88 25c-17 0-23 15-18 32 3 11-2 18-13 28-22 20-26 54-4 68 20 13 55 12 75-1 22-15 17-48-5-67-11-10-16-17-13-28 5-17-5-32-22-32Z"
          />
          <path d="M89 27c0-10 4-17 12-22" fill="none" stroke="#708b5e" strokeLinecap="round" strokeWidth="7" />
        </>
      );
      break;
    case "stalk":
      shape = (
        <>
          <path d="M63 151C70 110 75 66 72 22M90 151c2-46 2-89-2-130M117 151c-6-46-7-89-2-130" fill="none" stroke="#8eaa73" strokeLinecap="round" strokeWidth="16" />
          <path d="M73 56C44 44 36 27 42 10M89 69c-25-18-27-39-19-56M112 60c25-15 31-32 28-50" fill="none" stroke="#779665" strokeLinecap="round" strokeWidth="11" />
        </>
      );
      break;
    case "crown":
      shape = (
        <>
          <path d="M65 144c9-32 11-55 11-72h29c0 22 4 47 13 72" fill="#8fa777" stroke="#6d865d" strokeWidth="3" />
          <g {...common}>
            <circle cx="62" cy="68" r="32" />
            <circle cx="91" cy="48" r="36" />
            <circle cx="122" cy="70" r="34" />
            <circle cx="91" cy="83" r="39" />
          </g>
        </>
      );
      break;
    case "leaf":
      shape = (
        <>
          <path d="M89 151C83 108 83 68 92 24" fill="none" stroke="#6e8e62" strokeLinecap="round" strokeWidth="9" />
          <path
            {...common}
            d="M91 26C48 21 28 51 47 81c-26 18-21 55 14 62 10 2 22-2 30-11 9 9 21 13 31 11 35-7 40-44 14-62 19-30-2-60-45-55Z"
          />
          <path d="M91 35v97M91 70 59 51M91 91l39-24M91 111l-31 19" fill="none" opacity=".45" stroke="#fff8ea" strokeLinecap="round" strokeWidth="3" />
        </>
      );
      break;
  }

  return <g>{shape}</g>;
}
