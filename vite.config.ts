import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["robots.txt", "placeholder.svg"],
      manifest: {
        name: "OJTify",
        short_name: "OJTify",
        description: "Track OJT hours and monitor student progress in real time.",
        theme_color: "#0d1117",
        background_color: "#0a0e1a",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
