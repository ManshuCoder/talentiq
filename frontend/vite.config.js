import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  preview: {
    host: "0.0.0.0",
    port: 3000,
    // allow all hosts (for Render)
    strictPort: true,
  },

  server: {
    host: true, // allow access from any network host
  },
});
