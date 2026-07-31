import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
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
      },
      borderRadius: {
        card: "1.75rem",
        inset: "1.35rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(64 45 31 / 0.05), 0 8px 24px rgb(64 45 31 / 0.07)",
        md: "0 10px 30px rgb(64 45 31 / 0.18)",
        nav: "0 -10px 30px rgb(64 45 31 / 0.05)",
        glow: "0 5px 15px hsl(var(--primary) / 0.18)",
        illustration:
          "inset 0 0 0 1px hsl(var(--illustration-outline) / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
