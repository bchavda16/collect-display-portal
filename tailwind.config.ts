import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#F0A3BC",
          hover:   "#E88BAA",
          dark:    "#C4638A",
          light:   "#FDE8EF",
        },
        teal: {
          DEFAULT: "#5CC8C5",
          hover:   "#48B5B2",
          dark:    "#3A9E9B",
          light:   "#E8F8F7",
        },
        bg: {
          base:     "#FFFFFF",
          surface:  "#FAFBFC",
          elevated: "#F4F5F7",
          overlay:  "#EDF0F2",
        },
        border: {
          DEFAULT: "rgba(0,0,0,0.09)",
          subtle:  "rgba(0,0,0,0.05)",
          strong:  "rgba(0,0,0,0.16)",
        },
        text: {
          primary:   "#1A1A2E",
          secondary: "#4A4A6A",
          muted:     "#8888AA",
          disabled:  "#BBBBCC",
        },
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
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        card:        "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        "card-hover":"0 4px 24px rgba(0,0,0,0.10)",
        brand:       "0 4px 16px rgba(240,163,188,0.3)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #F0A3BC 0%, #5CC8C5 100%)",
      },
      keyframes: {
        fadeIn:     { from: { opacity: "0" }, to: { opacity: "1" } },
        slideInRight: { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        slideUp:    { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "fade-in":        "fadeIn 0.2s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-up":       "slideUp 0.3s ease-out",
      },
    },
  },
  plugins: [],
}

export default config
