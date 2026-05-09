/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#dde1e9",
          300: "#bcc3d0",
          400: "#8a93a6",
          500: "#5d667a",
          600: "#3f4858",
          700: "#2a3140",
          800: "#1a1f2c",
          900: "#0f131c",
          950: "#070a12",
        },
        accent: {
          400: "#7aa2ff",
          500: "#5483ff",
          600: "#3a66e8",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(122,162,255,0.25), 0 8px 30px -10px rgba(122,162,255,0.35)",
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
