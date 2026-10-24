import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Life RPG",
        short_name: "Life RPG",
        display: "standalone",
        background_color: "#111827",
        theme_color: "#111827",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
    }),
  ],
  server: { proxy: { "/api": { target: "http://127.0.0.1:3000", rewrite: (p) => p.replace(/^\/api/, "") } } },
});
