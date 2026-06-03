/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      colors: {
        ink: "#0f172a",
        accent: "#0ea5e9",
        warm: "#f97316",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
