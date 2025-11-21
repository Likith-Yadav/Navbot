import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-geist-sans)", "system-ui"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d6e9ff",
          200: "#b6d7ff",
          300: "#86bdff",
          400: "#569dff",
          500: "#2f7bff",
          600: "#1c5fe5",
          700: "#164dcc",
          800: "#153fa7",
          900: "#153783",
        },
      },
      boxShadow: {
        floating: "0 20px 45px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
