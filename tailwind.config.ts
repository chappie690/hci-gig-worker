import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        moss: "#2563eb",
        limewash: "#eef2ff",
        apricot: "#7c3aed",
        cloud: "#f8fafc"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 33, 29, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
