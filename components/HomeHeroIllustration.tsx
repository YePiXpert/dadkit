type HomeHeroIllustrationProps = {
  className?: string;
};

/** 首页 hero 区的主题插画：奶瓶 + 勾选清单，与 App 图标同一套扁平语言。 */
export function HomeHeroIllustration({ className }: HomeHeroIllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="home-hero-board" x1="52" x2="98" y1="28" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff7d92" />
          <stop offset="1" stopColor="#f9536f" />
        </linearGradient>
        <linearGradient id="home-hero-milk" x1="28" x2="46" y1="52" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3d4" />
          <stop offset="1" stopColor="#ffe3a8" />
        </linearGradient>
      </defs>

      <circle cx="104" cy="22" r="4" fill="#ffd9e1" />
      <path
        d="M14 20c1 4 2.6 5.5 6.5 6.5-3.9 1-5.5 2.6-6.5 6.5-1-4-2.6-5.5-6.5-6.5 3.9-1 5.5-2.6 6.5-6.5Z"
        fill="#ffc94d"
      />

      {/* 奶瓶 */}
      <g transform="rotate(-8 36 64)">
        <path
          d="M36 22c-5.5 0-8.5 4.6-6 9.7l3 6.4h6l3-6.4c2.5-5.1-.5-9.7-6-9.7Z"
          fill="#ffd98e"
          stroke="#e8a54b"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <rect
          x="21"
          y="36.5"
          width="30"
          height="12"
          rx="6"
          fill="#ff9fb2"
          stroke="#e5708a"
          strokeWidth="3"
        />
        <rect
          x="17"
          y="47"
          width="38"
          height="66"
          rx="10"
          fill="#fffdf6"
          stroke="#e8c9a3"
          strokeWidth="3"
        />
        <path
          d="M20 76h32v27c0 5.5-4.5 10-10 10h-12c-5.5 0-10-4.5-10-10V76Z"
          fill="url(#home-hero-milk)"
        />
        <path
          d="M26 58h8M26 66h8M26 86h8"
          stroke="#e8c9a3"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </g>

      {/* 勾选清单 */}
      <g transform="rotate(4 80 68)">
        <rect
          x="52"
          y="34"
          width="56"
          height="72"
          rx="9"
          fill="url(#home-hero-board)"
          stroke="#d94f68"
          strokeWidth="3.5"
        />
        <rect
          x="67"
          y="27"
          width="26"
          height="13"
          rx="5.5"
          fill="#ffc94d"
          stroke="#e8a54b"
          strokeWidth="3"
        />
        <rect x="58" y="42" width="44" height="58" rx="6" fill="#fffdf8" />
        <rect
          x="63"
          y="48"
          width="9"
          height="9"
          rx="2.5"
          fill="#fff"
          stroke="#f0b7c2"
          strokeWidth="2"
        />
        <path
          d="m65 52.5 2.4 2.4 4-4.6"
          fill="none"
          stroke="#4caf7d"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />
        <path d="M76 53h21" stroke="#f3cdd4" strokeLinecap="round" strokeWidth="3.4" />
        <rect
          x="63"
          y="63"
          width="9"
          height="9"
          rx="2.5"
          fill="#fff"
          stroke="#f0b7c2"
          strokeWidth="2"
        />
        <path
          d="m65 67.5 2.4 2.4 4-4.6"
          fill="none"
          stroke="#4caf7d"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />
        <path d="M76 68h15" stroke="#f3cdd4" strokeLinecap="round" strokeWidth="3.4" />
        <path
          d="M63 82h34M63 90h24"
          stroke="#f7dfe4"
          strokeLinecap="round"
          strokeWidth="3.4"
        />
      </g>

      <path
        d="M101 106c2.4-4.2 9-2.7 9 2.7 0 5.7-9 10.2-9 10.2s-9-4.5-9-10.2c0-5.4 6.6-6.9 9-2.7Z"
        fill="#ff8fa3"
        stroke="#e5708a"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
