import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // GitHub Pages serves project sites below /IQtesting/. Keep the development
  // server at the origin root while emitting production asset URLs for that path.
  base: command === "build" ? "/IQtesting/" : "/",
  plugins: [react()],
  server: {
    port: 5190,
    watch: {
      // The agent's atomic file writes create transient .tmpdir folders that
      // disappear before chokidar can attach, crashing the watcher with EBUSY.
      ignored: ["**/.*.tmpdir/**", "**/*.tmp", "**/dist/**"],
    },
  },
}));
