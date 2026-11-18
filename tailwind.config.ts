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
        paper: {
          DEFAULT: "#F7F4EE",
          warm: "#FAF8F5",
          card: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#14181F",
          muted: "#4A5260",
          subtle: "#717B8A",
        },
        hairline: {
          DEFAULT: "#E3DDD1",
          subtle: "#EFECE4",
          dark: "#CFC7B8",
        },
        accent: {
          DEFAULT: "#7B1E22", // deep editorial oxblood
          hover: "#64181B",
          tint: "#FDF5F5",
          border: "#E8BFC1",
        },
        status: {
          verified: {
            text: "#1B6E42",
            bg: "#E8F5EE",
            border: "#A3D9BD",
          },
          corpus: {
            text: "#8A5B00",
            bg: "#FFF8E6",
            border: "#F0D597",
          },
          unverified: {
            text: "#A61C1C",
            bg: "#FDE8E8",
            border: "#F8B4B4",
          },
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Fraunces", "Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["IBM Plex Sans", "Geist", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["IBM Plex Mono", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(20, 24, 31, 0.04), 0 1px 3px rgba(20, 24, 31, 0.06)",
        raised: "0 2px 4px rgba(20, 24, 31, 0.05), 0 4px 8px rgba(20, 24, 31, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
