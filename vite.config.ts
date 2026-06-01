import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { resolve } from "node:path";

/**
 * Builds the React UI (in `ui/`) into `resources/ui/` as fully static, self-contained
 * assets (relative paths, inlined where small) so the local Electron server can serve
 * them offline on Windows. The dev server proxies /api and /shot to the running app.
 */
export default defineConfig({
  root: resolve(__dirname, "ui"),
  base: "./",
  plugins: [react(), tailwind()],
  build: {
    outDir: resolve(__dirname, "resources/ui"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4321",
      "/shot": "http://localhost:4321",
    },
  },
});
