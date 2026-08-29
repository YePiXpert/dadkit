import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  // 触屏设备不再触发 hover 样式：去掉点按后的粘滞 hover 重绘，点按即响应。
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1120px",
      },
    },
    extend: {
      screens: {
        xs: "360px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "surface-art": "hsl(var(--surface-art) / <alpha-value>)",
        "surface-growth": "hsl(var(--surface-growth) / <alpha-value>)",
        "tile-mom-bg": "hsl(var(--tile-mom-bg) / <alpha-value>)",
        "tile-mom-fg": "hsl(var(--tile-mom-fg) / <alpha-value>)",
        "tile-baby-bg": "hsl(var(--tile-baby-bg) / <alpha-value>)",
        "tile-baby-fg": "hsl(var(--tile-baby-fg) / <alpha-value>)",
        "tile-docs-bg": "hsl(var(--tile-docs-bg) / <alpha-value>)",
        "tile-docs-fg": "hsl(var(--tile-docs-fg) / <alpha-value>)",
        "tile-dad-bg": "hsl(var(--tile-dad-bg) / <alpha-value>)",
        "tile-dad-fg": "hsl(var(--tile-dad-fg) / <alpha-value>)",
        "tile-car-bg": "hsl(var(--tile-car-bg) / <alpha-value>)",
        "tile-car-fg": "hsl(var(--tile-car-fg) / <alpha-value>)",
        "tile-lastminute-bg": "hsl(var(--tile-lastminute-bg) / <alpha-value>)",
        "tile-lastminute-fg": "hsl(var(--tile-lastminute-fg) / <alpha-value>)",
        "on-highlight":
          "hsl(var(--checklist-hero-foreground) / <alpha-value>)",
      },
      borderRadius: {
        card: "1.5rem",
        inset: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0.5rem)",
        sm: "calc(var(--radius) - 0.75rem)",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(64 45 31 / 0.04), 0 10px 28px -12px rgb(64 45 31 / 0.10)",
        md: "0 2px 6px rgb(64 45 31 / 0.05), 0 20px 44px -16px rgb(64 45 31 / 0.14)",
        lg: "0 4px 10px rgb(64 45 31 / 0.06), 0 28px 60px -20px rgb(64 45 31 / 0.18)",
        nav: "0 -8px 28px -12px rgb(64 45 31 / 0.10)",
        glow: "0 6px 20px -6px hsl(var(--primary) / 0.28)",
        illustration:
          "inset 0 0 0 1px hsl(var(--illustration-outline) / 0.08)",
      },
      fontFamily: {
        sans: [
          "MiSans",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  // animate-in/out 等工具类来自该插件，dialog 与 select 的进出场动画依赖它。
  plugins: [tailwindcssAnimate],
};

export default config;
