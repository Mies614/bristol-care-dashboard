import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fef9f4",
        blush: "#ffece6",
        roseSoft: "#f2b8aa",
        lilac: "#f0ebff",
        skySoft: "#ecf5ff",
        butter: "#fff8e8",
        warmGray: "#8c7b73",
        cocoa: "#5f4b44",
        sage: "#8ea89b",
        mist: "#f5efe8",
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(95, 75, 68, 0.06), 0 1px 3px rgba(95, 75, 68, 0.04)",
        float: "0 12px 40px rgba(95, 75, 68, 0.08), 0 2px 6px rgba(95, 75, 68, 0.03)",
        glow: "0 0 20px rgba(232, 169, 155, 0.25)",
        card: "0 2px 12px rgba(95, 75, 68, 0.04), 0 0.5px 2px rgba(95, 75, 68, 0.03)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.96)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "heart-float": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "30%": { transform: "translateY(-24px) scale(1.15)", opacity: "0.9" },
          "60%": { transform: "translateY(-48px) scale(0.9)", opacity: "0.5" },
          "100%": { transform: "translateY(-72px) scale(0.6)", opacity: "0" },
        },
        "heart-float-left": {
          "0%": { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "30%": { transform: "translate(-16px, -20px) scale(1.1)", opacity: "0.85" },
          "60%": { transform: "translate(-28px, -44px) scale(0.85)", opacity: "0.45" },
          "100%": { transform: "translate(-40px, -68px) scale(0.55)", opacity: "0" },
        },
        "heart-float-right": {
          "0%": { transform: "translate(0, 0) scale(1)", opacity: "1" },
          "30%": { transform: "translate(16px, -20px) scale(1.1)", opacity: "0.85" },
          "60%": { transform: "translate(28px, -44px) scale(0.85)", opacity: "0.45" },
          "100%": { transform: "translate(40px, -68px) scale(0.55)", opacity: "0" },
        },
        "heart-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.3)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0.85" },
        },
        "heart-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(232, 169, 155, 0.15)" },
          "50%": { boxShadow: "0 0 20px rgba(232, 169, 155, 0.35)" },
        },
        "count-bump": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.25)" },
          "60%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.35s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "heart-float": "heart-float 1.2s ease-out forwards",
        "heart-float-left": "heart-float-left 1.3s ease-out forwards",
        "heart-float-right": "heart-float-right 1.3s ease-out forwards",
        "heart-pop": "heart-pop 0.4s ease-out forwards",
        "heart-glow": "heart-glow 2s ease-in-out infinite",
        "count-bump": "count-bump 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;