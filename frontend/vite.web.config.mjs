// A plain Vite config for building the renderer as a standalone static site,
// independent of electron-vite (see electron.vite.config.mjs for the desktop
// build). Kept separate so the web build doesn't need Electron installed at
// all.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/renderer",
  plugins: [react()],
  build: {
    outDir: "../../dist-web",
    emptyOutDir: true
  }
});
