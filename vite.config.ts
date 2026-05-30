/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// GitHub Pages serves project sites under /<repo-name>/. The deploy workflow
// sets BASE_PATH so assets resolve on the subpath; local dev/test stays at "/".
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  build: { outDir: "dist", emptyOutDir: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
