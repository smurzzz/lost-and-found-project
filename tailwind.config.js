/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#172554",
          dark: "#0F172A",
        },
        navyDark: "#0F172A",
        emerald: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
        },
        amber: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
        },
        mint: "#D1FAE5",
        "amber-light": "#FEF3C7",
        "soft-blue": "#EAF2FF",
        surface: "#FFFFFF",
        background: "#F5F7F8",
        muted: "#64748B",
        "muted-gray": "#94A3B8",
        border: "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter"],
      },
    },
  },
  plugins: [],
};
