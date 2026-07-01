import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // C&D Brand — pulled from collectanddisplay.com
        brand: {
          DEFAULT: "#F0A3BC",   // bubblegum pink (header)
          hover:   "#E88BAA",   // slightly deeper on hover
          dark:    "#D4708E",   // for active states / badges
          light:   "#FDE8EF",   // tinted bg (chips, tags)
          muted:   "rgba(240,163,188,0.15)",
        },
        teal: {
          DEFAULT: "#5CC8C5",   // hero teal
          hover:   "#48B5B2",
          dark:    "#3A9E9B",
          light:   "#E8F8F7",   // tinted bg
          muted:   "rgba(92,200,197,0.15)",
        },
        // Backgrounds (light theme)
        bg: {
          base:     "#FFFFFF",   // pure white page bg
          surface:  "#FAFBFC",   // cards / panels (barely-there grey)
          elevated: "#F4F5F7",   // inputs, hover states
          overlay:  "#EDF0F2",   // deeper: table stripes etc
        },
        // Borders
        border: {
          subtle:  "rgba(0,0,0,0.05)",
          DEFAULT: "rgba(0,0,0,0.09)",
          strong:  "rgba(0,0,0,0.16)",
        },
        // Text
        text: {
          primary:   "#1A1A2E",   // near-black
          secondary: "#4A4A6A",   // body text
          muted:     "#8888AA",   // labels, hints
          disabled:  "#BBBBCC",
        },
        // Semantic accents (light versions for light bg)
        emerald: {
          DEFAULT: "#0EA572",
          light:   "#EAFAF3",
        },
        amber: {
          DEFAULT: "#D97706",
          light:   "#FEF3C7",
        },
        rose: {
          DEFAULT: "#E11D48",
          light:   "#FFF1F4",
        },
        violet: {
          DEFAULT: "#7C3AED",
          light:   "#F3EEFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm:    "6px",
        DEFAULT:"10px",
        md:    "12px",
        lg:    "16px",
        xl:    "20px",
        "2xl": "24px",
      },
      boxShadow: {
        brand:       "0 0 0 1px rgba(240,163,188,0.35), 0 4px 20px rgba(240,163,188,0.20)",
        teal:        "0 0 0 1px rgba(92,200,197,0.35), 0 4px 20px rgba(92,200,197,0.20)",
        card:        "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover":"0 4px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.07)",
        "pink-glow":  "0 8px 32px rgba(240,163,188,0.25)",
        "teal-glow":  "0 8px 32px rgba(92,200,197,0.25)",
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand":    "linear-gradient(135deg, #F0A3BC 0%, #5CC8C5 100%)",
        "gradient-pink":     "linear-gradient(135deg, #F9C5D7 0%, #F0A3BC 100%)",
        "gradient-teal":     "linear-gradient(135deg, #8DE3E0 0%, #5CC8C5 100%)",
        "gradient-surface":  "linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)",
      },
      animation: {
        "fade-in":       "fadeIn 0.2s ease-out",
        "slide-in-right":"slideInRight 0.3s ease-out",
        "slide-up":      "slideUp 0.3s ease-out",
        pulse:           "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
        slideUp: {
          from: { transform: "translateY(8px)", opacity: "0" },
          to:   { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
