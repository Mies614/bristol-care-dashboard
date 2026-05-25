import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fff8f0",
        blush: "#ffe8e2",
        roseSoft: "#f7b6a6",
        lilac: "#eee7ff",
        skySoft: "#e9f5ff",
        butter: "#fff3cf",
        warmGray: "#8a7b73",
        cocoa: "#5f4b44",
        sage: "#8ea89b"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(95, 75, 68, 0.10)",
        float: "0 24px 70px rgba(95, 75, 68, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
