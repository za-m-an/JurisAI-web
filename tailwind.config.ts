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
        navy: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          700: "#102a43",
          800: "#0b1f33",
          900: "#061423",
        },
        parchment: {
          50: "#fdfbf7",
          100: "#f7f3e9",
          200: "#efe8d8",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
